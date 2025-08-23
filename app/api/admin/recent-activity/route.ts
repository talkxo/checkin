import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'today'; // today, week, month
    
    const now = nowIST();
    let startDate = new Date(now);
    
    // Calculate start date based on range
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
    }

    // Get recent check-ins with employee info
    const { data: recentSessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        checkin_ts,
        checkout_ts,
        mode,
        employees (
          id,
          full_name,
          slug
        )
      `)
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', now.toISOString())
      .order('checkin_ts', { ascending: false })
      .limit(20); // Get last 20 sessions

    if (error) {
      console.error('Error fetching recent activity:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process the data
    const recentActivity = recentSessions?.map(session => {
      const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
      const checkinTime = new Date(session.checkin_ts);
      
      return {
        id: session.id,
        employeeName: employee?.full_name || 'Unknown',
        employeeSlug: employee?.slug || '',
        checkinTime: checkinTime.toISOString(),
        checkinTimeIST: checkinTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }),
        date: checkinTime.toISOString().split('T')[0],
        mode: session.mode,
        isOpen: !session.checkout_ts,
        timeAgo: getTimeAgo(checkinTime, now)
      };
    }) || [];

    // Get current open sessions
    const { data: openSessions } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        checkin_ts,
        mode,
        employees (
          id,
          full_name,
          slug
        )
      `)
      .is('checkout_ts', null)
      .order('checkin_ts', { ascending: false });

    const currentlyCheckedIn = openSessions?.map(session => {
      const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
      const checkinTime = new Date(session.checkin_ts);
      
      return {
        employeeName: employee?.full_name || 'Unknown',
        employeeSlug: employee?.slug || '',
        checkinTime: checkinTime.toISOString(),
        checkinTimeIST: checkinTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }),
        mode: session.mode,
        timeAgo: getTimeAgo(checkinTime, now)
      };
    }) || [];

    return NextResponse.json({
      recentActivity,
      currentlyCheckedIn,
      range,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      totalRecentSessions: recentActivity.length,
      totalCurrentlyCheckedIn: currentlyCheckedIn.length
    });

  } catch (error) {
    console.error('Recent activity error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(checkinTime: Date, now: Date): string {
  const diffMs = now.getTime() - checkinTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}
