import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date();
  if (today.getDay() !== 1) return NextResponse.json({ skipped: true });

  const weekStart = today.toISOString().split('T')[0];

  const { data: employees } = await supabaseAdmin.from('employees').select('id').eq('active', true);
  const { data: existing } = await supabaseAdmin
    .from('wfh_schedule').select('employee_id').eq('week_start', weekStart);

  const filledIds = new Set((existing || []).map((r: any) => r.employee_id));
  const needReminder = (employees || []).filter((e: any) => !filledIds.has(e.id));

  for (const emp of needReminder) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: emp.id,
        title: 'Plan your week',
        body: "Mark your remote days so the team knows where you'll be.",
        url: '/',
        tag: 'wfh-reminder',
      }),
    });
  }

  return NextResponse.json({ reminded: needReminder.length });
}
