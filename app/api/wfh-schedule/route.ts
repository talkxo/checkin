import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession, isAdminAuthenticated } from '@/lib/auth';

// GET ?week=2026-03-30 or ?week=2026-03-30&employeeId=xxx
// Without employeeId: returns EVERY active employee for the week, with
// wfh_days merged in (empty array when they haven't declared a plan) — so
// the team view can list people, not just declarations.
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

  if (employeeId) {
    const { data, error } = await supabaseAdmin
      .from('wfh_schedule')
      .select('*, employees(full_name, slug)')
      .eq('week_start', week)
      .eq('employee_id', employeeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  const [employeesRes, plansRes] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('active', true)
      .order('full_name'),
    supabaseAdmin
      .from('wfh_schedule')
      .select('employee_id, wfh_days')
      .eq('week_start', week),
  ]);

  if (employeesRes.error) return NextResponse.json({ error: employeesRes.error.message }, { status: 500 });
  if (plansRes.error) return NextResponse.json({ error: plansRes.error.message }, { status: 500 });

  const plansById = new Map(
    (plansRes.data ?? []).map((p) => [p.employee_id, p.wfh_days ?? []])
  );

  const data = (employeesRes.data ?? []).map((e) => ({
    employee_id: e.id,
    full_name: e.full_name,
    slug: e.slug,
    wfh_days: plansById.get(e.id) ?? [],
  }));

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
