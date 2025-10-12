import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('=== HISTORICAL DATA DEBUG ===');
    
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || 'week';
    const customStartDate = searchParams.get('startDate');
    const customEndDate = searchParams.get('endDate');
    
    console.log('Time range requested:', timeRange);
    console.log('Custom dates:', customStartDate, customEndDate);

    const now = nowIST();
    console.log('Current IST time:', now.toISOString());
    console.log('Current IST time (local):', now.toString());
    
    let startDate: Date;
    let endDate: Date = new Date(now);

    // Handle custom date range
    if (customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Calculate date range based on parameter
      switch (timeRange) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'currentMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
          break;
        case 'previousMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        default:
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
      }
    }
    
    console.log('Date range:', startDate.toISOString(), 'to', endDate.toISOString());

    // Get all sessions in the date range
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        employee_id,
        checkin_ts,
        checkout_ts,
        mode,
        mood,
        mood_comment,
        employees (
          id,
          full_name,
          slug
        )
      `)
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', endDate.toISOString())
      .order('checkin_ts', { ascending: true });

    if (error) {
      console.log('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('Sessions found:', sessions?.length || 0);

    // Process sessions into attendance data
    const attendanceData = sessions?.map(session => {
      const checkinTime = new Date(session.checkin_ts);
      const checkoutTime = session.checkout_ts ? new Date(session.checkout_ts) : null;
      
      let workedHours = 'N/A';
      if (checkoutTime) {
        const diffMs = checkoutTime.getTime() - checkinTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        workedHours = `${hours}h ${minutes}m`;
      }

      // Handle employees data safely
      const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
      const employeeName = employee?.full_name || 'Unknown';
      const employeeSlug = employee?.slug || '';

      return {
        id: session.id,
        employee_id: session.employee_id,
        name: employeeName,
        slug: employeeSlug,
        date: checkinTime.toISOString().split('T')[0],
        firstIn: checkinTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }),
        lastOut: checkoutTime ? checkoutTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }) : 'N/A',
        totalHours: workedHours,
        mode: session.mode,
        status: checkoutTime ? 'Complete' : 'Active',
        open: !checkoutTime,
        mood: session.mood,
        mood_comment: session.mood_comment
      };
    }) || [];

    return NextResponse.json({ 
      attendanceData,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalSessions: attendanceData.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
