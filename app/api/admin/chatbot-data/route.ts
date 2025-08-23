import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const now = nowIST();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    // Get all employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug, active')
      .eq('active', true)
      .order('full_name');

    // Get today's sessions
    const { data: todaySessions } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
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
      .gte('checkin_ts', todayStart.toISOString())
      .lte('checkin_ts', now.toISOString())
      .order('checkin_ts', { ascending: false });

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

    // Get recent activity (last 20 check-ins)
    const { data: recentSessions } = await supabaseAdmin
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
      .gte('checkin_ts', weekStart.toISOString())
      .lte('checkin_ts', now.toISOString())
      .order('checkin_ts', { ascending: false })
      .limit(20);

    // Debug time information
    console.log('=== TIME DEBUG ===');
    console.log('Current time (now):', now.toISOString());
    console.log('Current time (IST):', now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    if (recentSessions && recentSessions.length > 0) {
      const latestSession = recentSessions[0];
      console.log('Latest session checkin_ts (raw):', latestSession.checkin_ts);
      console.log('Latest session checkin_ts (parsed):', new Date(latestSession.checkin_ts).toISOString());
      console.log('Latest session checkin_ts (IST):', new Date(latestSession.checkin_ts).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    }
    console.log('=== END TIME DEBUG ===');

    // Process the data
    const processedData = {
      summary: {
        totalEmployees: employees?.length || 0,
        activeToday: todaySessions?.length || 0,
        currentlyCheckedIn: openSessions?.length || 0,
        recentActivity: recentSessions?.length || 0
      },
      
      currentlyCheckedIn: openSessions?.map(session => {
        const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
        const checkinTime = new Date(session.checkin_ts);
        return {
          name: employee?.full_name || 'Unknown',
          checkinTime: checkinTime.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
          mode: session.mode,
          timeAgo: getTimeAgo(checkinTime, now)
        };
      }) || [],

      recentActivity: recentSessions?.map(session => {
        const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
        const checkinTime = new Date(session.checkin_ts);
        
        return {
          name: employee?.full_name || 'Unknown',
          checkinTime: checkinTime.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
          mode: session.mode,
          isOpen: !session.checkout_ts,
          timeAgo: getTimeAgo(checkinTime, now)
        };
      }) || [],

      todayStats: {
        officeCount: todaySessions?.filter(s => s.mode === 'office').length || 0,
        remoteCount: todaySessions?.filter(s => s.mode === 'remote').length || 0,
        totalSessions: todaySessions?.length || 0
      },

      employees: employees?.map(emp => ({
        name: emp.full_name,
        slug: emp.slug,
        active: emp.active
      })) || [],

      moodData: todaySessions?.filter(s => s.mood).map(session => {
        const employee = Array.isArray(session.employees) ? session.employees[0] : session.employees;
        return {
          name: employee?.full_name || 'Unknown',
          mood: session.mood,
          comment: session.mood_comment || ''
        };
      }) || []
    };

    return NextResponse.json(processedData);

  } catch (error) {
    console.error('Chatbot data error:', error);
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
