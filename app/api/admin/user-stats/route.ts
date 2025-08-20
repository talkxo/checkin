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
      .lte('checkin_ts', now.toISOString());

    // Calculate time spent for each user
    const userStats = employees?.map(emp => {
      const userSessions = sessions?.filter(s => s.employee_id === emp.id) || [];
      
      let officeMinutes = 0;
      let remoteMinutes = 0;
      let totalDays = 0;
      const daysWorked = new Set();

      for (const session of userSessions) {
        const sessionDate = new Date(session.checkin_ts).toISOString().split('T')[0];
        daysWorked.add(sessionDate);
        
        const checkin = new Date(session.checkin_ts);
        const checkout = session.checkout_ts ? new Date(session.checkout_ts) : now;
        const diffMs = checkout.getTime() - checkin.getTime();
        const diffMinutes = Math.round(diffMs / 60000);

        if (session.mode === 'office') {
          officeMinutes += diffMinutes;
        } else {
          remoteMinutes += diffMinutes;
        }
      }

      totalDays = daysWorked.size;

      return {
        id: emp.id,
        full_name: emp.full_name,
        totalHours: Math.round((officeMinutes + remoteMinutes) / 60 * 10) / 10,
        officeHours: Math.round(officeMinutes / 60 * 10) / 10,
        remoteHours: Math.round(remoteMinutes / 60 * 10) / 10,
        daysPresent: totalDays
      };
    }) || [];

    return NextResponse.json(userStats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
