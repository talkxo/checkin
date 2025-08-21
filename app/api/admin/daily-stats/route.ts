import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'week';
    
    const now = nowIST();
    let startDate = new Date(now);
    
    // Calculate start date based on range
    switch (range) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'fortnight':
        startDate.setDate(now.getDate() - 14);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get all employees
    const { data: employees } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .order('full_name');

    // Get all sessions in the date range
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', now.toISOString())
      .order('checkin_ts', { ascending: true });

    // Calculate user stats for charts
    const userStats = employees?.map(emp => {
      const userSessions = sessions?.filter(s => s.employee_id === emp.id) || [];
      const officeDays = new Set();
      const remoteDays = new Set();
      let officeHours = 0;
      let remoteHours = 0;

      for (const session of userSessions) {
        const sessionDate = new Date(session.checkin_ts).toISOString().split('T')[0];
        
        const checkin = new Date(session.checkin_ts);
        const checkout = session.checkout_ts ? new Date(session.checkout_ts) : now;
        const diffMs = checkout.getTime() - checkin.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (session.mode === 'office') {
          officeDays.add(sessionDate);
          officeHours += diffHours;
        } else if (session.mode === 'remote') {
          remoteDays.add(sessionDate);
          remoteHours += diffHours;
        }
      }

      return {
        name: emp.full_name,
        officeDays: officeDays.size,
        remoteDays: remoteDays.size,
        totalDays: officeDays.size + remoteDays.size,
        officeHours: Math.round(officeHours * 10) / 10,
        remoteHours: Math.round(remoteHours * 10) / 10
      };
    }) || [];

    // Create chart data
    const officeVsRemoteData = {
      labels: userStats.map(u => u.name),
      datasets: [
        {
          label: 'Office Days',
          data: userStats.map(u => u.officeDays),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'Remote Days',
          data: userStats.map(u => u.remoteDays),
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgb(147, 51, 234)',
          borderWidth: 1,
        }
      ],
    };

    const timeSpentData = {
      labels: userStats.map(u => u.name),
      datasets: [
        {
          label: 'Office Hours',
          data: userStats.map(u => u.officeHours),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
        {
          label: 'Remote Hours',
          data: userStats.map(u => u.remoteHours),
          backgroundColor: 'rgba(147, 51, 234, 0.8)',
          borderColor: 'rgb(147, 51, 234)',
          borderWidth: 1,
        }
      ],
    };

    return NextResponse.json({
      officeVsRemote: officeVsRemoteData,
      timeSpent: timeSpentData
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json({ error: 'Failed to fetch daily stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
