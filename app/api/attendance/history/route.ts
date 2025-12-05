import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, hhmmIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const dateParam = searchParams.get('date');

    if (!slug) {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    }

    if (!dateParam) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 });
    }

    // Get employee by slug
    const { data: employee, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (empError) {
      return NextResponse.json({ error: empError.message }, { status: 500 });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Parse the date parameter (expected format: YYYY-MM-DD)
    // Build IST boundaries for the target day, then convert to UTC for querying
    // Use the same approach as summary/me route
    const dateParts = dateParam.split('-');
    if (dateParts.length !== 3) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2], 10);
    
    // Create date object and interpret as IST
    const istDate = new Date(year, month, day);
    const istNow = new Date(istDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const istStart = new Date(istNow);
    istStart.setHours(0, 0, 0, 0);
    const istEnd = new Date(istNow);
    istEnd.setHours(23, 59, 59, 999);
    
    // Convert IST boundaries to UTC for querying stored UTC timestamps
    const start = new Date(istStart.toLocaleString('en-US', { timeZone: 'UTC' }));
    const end = new Date(istEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Get sessions for the selected date
    const { data: sessions, error: sessError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('employee_id', employee.id)
      .gte('checkin_ts', start.toISOString())
      .lte('checkin_ts', end.toISOString())
      .order('checkin_ts', { ascending: true });

    if (sessError) {
      return NextResponse.json({ error: sessError.message }, { status: 500 });
    }

    // Process session data
    let checkinTime: string | null = null;
    let checkoutTime: string | null = null;
    let totalHours = '0h 0m';
    let status: 'active' | 'complete' | 'not_started' = 'not_started';
    let mode: 'office' | 'remote' | undefined = undefined;

    if (sessions && sessions.length > 0) {
      // Get the first session of the day for check-in
      const firstSession = sessions[0];
      checkinTime = hhmmIST(firstSession.checkin_ts);
      mode = firstSession.mode as 'office' | 'remote';

      // Get the last session for check-out
      const lastSession = sessions[sessions.length - 1];
      if (lastSession.checkout_ts) {
        checkoutTime = hhmmIST(lastSession.checkout_ts);
        status = 'complete';
      } else {
        status = 'active';
      }

      // Calculate total hours worked
      let totalMs = 0;
      for (const session of sessions) {
        const checkin = new Date(session.checkin_ts);
        const checkout = session.checkout_ts ? new Date(session.checkout_ts) : nowIST();
        totalMs += checkout.getTime() - checkin.getTime();
      }

      const hours = Math.floor(totalMs / (1000 * 60 * 60));
      const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
      totalHours = `${hours}h ${minutes}m`;
    }

    return NextResponse.json({
      checkinTime,
      checkoutTime,
      totalHours,
      status,
      mode
    });
  } catch (error: any) {
    console.error('Error in attendance history API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

