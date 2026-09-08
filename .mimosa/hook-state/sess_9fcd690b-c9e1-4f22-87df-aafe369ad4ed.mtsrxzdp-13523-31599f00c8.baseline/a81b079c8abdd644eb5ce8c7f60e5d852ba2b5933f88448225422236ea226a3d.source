import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession, isAdminAuthenticated } from '@/lib/auth';

// GET ?week=2026-03-30 or ?week=2026-03-30&employeeId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const week = searchParams.get('week');
  const employeeId = searchParams.get('employeeId');

  if (!isAdminAuthenticated() && !getUserSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!week) {
    return NextResponse.json({ error: 'Missing week query parameter' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('wfh_schedule')
    .select('*, employees(full_name, slug)')
    .eq('week_start', week);

  if (employeeId) query = query.eq('employee_id', employeeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  try {
    const { employeeId, weekStart, wfhDays } = await req.json();

    const session = getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (employeeId !== session.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!employeeId || !weekStart || !Array.isArray(wfhDays)) {
      return NextResponse.json(
        { error: 'Missing or invalid employeeId, weekStart, or wfhDays' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('wfh_schedule')
      .upsert(
        {
          employee_id: employeeId,
          week_start: weekStart,
          wfh_days: wfhDays,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'employee_id,week_start' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save WFH schedule' },
      { status: 500 }
    );
  }
}
