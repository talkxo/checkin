import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    // Build date range for the month in IST
    const startIST = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endIST = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // Convert to UTC for Supabase query
    const startUTC = new Date(startIST.toLocaleString('en-US', { timeZone: 'UTC' }));
    const endUTC = new Date(endIST.toLocaleString('en-US', { timeZone: 'UTC' }));

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('checkin_ts', startUTC.toISOString())
      .lte('checkin_ts', endUTC.toISOString())
      .order('checkin_ts', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process sessions into a day-by-day map
    const attendanceMap: Record<string, any> = {};
    
    sessions?.forEach(session => {
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

    return NextResponse.json({ attendance: attendanceMap });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
