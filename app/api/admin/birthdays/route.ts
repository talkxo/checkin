import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** Birthdays in the next 30 days (IST), for the Today command center. */
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { data: employees, error } = await supabaseAdmin
      .from('employees')
      .select('full_name, date_of_birth')
      .eq('active', true)
      .not('date_of_birth', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = new Date();
    const results: Array<{ name: string; date: string; inDays: number }> = [];

    for (const emp of employees ?? []) {
      const dob = new Date(`${emp.date_of_birth}T00:00:00Z`);
      if (Number.isNaN(dob.getTime())) continue;

      // Next occurrence of this birthday
      for (const year of [now.getUTCFullYear(), now.getUTCFullYear() + 1]) {
        const occurrence = new Date(Date.UTC(year, dob.getUTCMonth(), dob.getUTCDate()));
        const diffDays = Math.round((occurrence.getTime() - now.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 30) {
          results.push({
            name: emp.full_name,
            date: occurrence.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
            inDays: diffDays,
          });
        }
      }
    }

    results.sort((a, b) => a.inDays - b.inDays);
    return NextResponse.json({ birthdays: results.slice(0, 3) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
