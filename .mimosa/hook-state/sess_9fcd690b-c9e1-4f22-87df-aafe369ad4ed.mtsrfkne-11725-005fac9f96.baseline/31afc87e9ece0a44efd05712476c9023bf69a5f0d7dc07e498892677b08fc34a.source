import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export async function GET(req: NextRequest) {
  try {
    const session = getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // Expecting 1-12
    const year = searchParams.get('year');   // Expecting YYYY
    const employeeId = session.id;

    if (!month || !year) {
      return NextResponse.json({ error: 'month and year are required' }, { status: 400 });
    }

    // Month bounds as IST calendar instants (UTC for queries)
    const lastDay = new Date(Date.UTC(parseInt(year), parseInt(month), 0)).getUTCDate();
    const monthStartKey = `${year}-${pad(parseInt(month))}-01`;
    const monthEndKey = `${year}-${pad(parseInt(month))}-${pad(lastDay)}`;
    const startUTC = new Date(`${monthStartKey}T00:00:00+05:30`);
    const endUTC = new Date(`${monthEndKey}T23:59:59.999+05:30`);

    const [sessionsRes, leaveRes, holidaysRes] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('checkin_ts', startUTC.toISOString())
        .lte('checkin_ts', endUTC.toISOString())
        .order('checkin_ts', { ascending: true }),
      supabaseAdmin
        .from('leave_requests')
        .select('start_date, end_date')
        .eq('employee_id', employeeId)
        .eq('status', 'approved')
        .lte('start_date', monthEndKey)
        .gte('end_date', monthStartKey),
      supabaseAdmin
        .from('holidays')
        .select('name, date')
        .gte('date', monthStartKey)
        .lte('date', monthEndKey)
        .order('date', { ascending: true }),
    ]);

    if (sessionsRes.error) {
      return NextResponse.json({ error: sessionsRes.error.message }, { status: 500 });
    }

    // Process sessions into a day-by-day map
    const attendanceMap: Record<string, any> = {};

    sessionsRes.data?.forEach(session => {
      const dateKey = new Date(session.checkin_ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      if (!attendanceMap[dateKey]) {
        attendanceMap[dateKey] = {
          checkinTime: session.checkin_ts,
          checkoutTime: session.checkout_ts,
          mode: session.mode,
          sessions: [session]
        };
      } else {
        attendanceMap[dateKey].sessions.push(session);
        if (session.checkout_ts) {
          attendanceMap[dateKey].checkoutTime = session.checkout_ts;
        }
      }
    });

    // Expand approved leave ranges into individual IST date keys
    const leaveDates: string[] = [];
    for (const row of leaveRes.data ?? []) {
      const [sy, sm, sd] = String(row.start_date).split('-').map(Number);
      const [ey, em, ed] = String(row.end_date).split('-').map(Number);
      const start = new Date(Date.UTC(sy, sm - 1, sd));
      const end = new Date(Date.UTC(ey, em - 1, ed));
      for (const cursor = start; cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const key = `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`;
        if (key >= monthStartKey && key <= monthEndKey) leaveDates.push(key);
      }
    }

    return NextResponse.json({
      attendance: attendanceMap,
      leaveDates,
      holidays: (holidaysRes.data ?? []).map((h: any) => ({ date: h.date, name: h.name })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
