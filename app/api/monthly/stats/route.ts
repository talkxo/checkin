import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    
    if (!slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }

    // Find employee
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (!emp) {
      return NextResponse.json({ error: 'employee not found' }, { status: 404 });
    }

    // Get current month start and end in IST
    const now = nowIST();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const monthStart = new Date(istNow.getFullYear(), istNow.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(istNow.getFullYear(), istNow.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);

    // Convert IST boundaries to UTC for querying
    const start = new Date(monthStart.toLocaleString('en-US', { timeZone: 'UTC' }));
    const end = new Date(monthEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    // Get all sessions for this month
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('checkin_ts, checkout_ts')
      .eq('employee_id', emp.id)
      .gte('checkin_ts', start.toISOString())
      .lte('checkin_ts', end.toISOString())
      .order('checkin_ts', { ascending: true });

    if (error) {
      console.error('Error fetching monthly sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate days on time (check-ins before 10 AM IST)
    let daysOnTime = 0;
    const uniqueDays = new Set<string>();
    let totalHours = 0;

    sessions?.forEach((session) => {
      const checkinTime = new Date(session.checkin_ts);
      const istCheckin = new Date(checkinTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const checkinHour = istCheckin.getHours();
      const checkinMinute = istCheckin.getMinutes();
      const checkinTimeMinutes = checkinHour * 60 + checkinMinute;

      // Get date string for unique day tracking
      const dateKey = istCheckin.toISOString().split('T')[0];
      
      // Count unique days
      if (!uniqueDays.has(dateKey)) {
        uniqueDays.add(dateKey);
        
        // Count as "on time" if check-in is before 10:15 AM (includes early)
        if (checkinTimeMinutes < 615) {
          daysOnTime++;
        }
      }

      // Calculate total hours worked
      const checkoutTime = session.checkout_ts 
        ? new Date(session.checkout_ts) 
        : now; // Use current time if session is still open
      const diffMs = checkoutTime.getTime() - checkinTime.getTime();
      totalHours += diffMs / (1000 * 60 * 60);
    });

    return NextResponse.json({
      daysOnTime,
      totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
      totalDays: uniqueDays.size
    });

  } catch (error) {
    console.error('Error in monthly stats API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

