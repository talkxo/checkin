import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export async function GET() {
  try {
    const now = nowIST();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Get total employees
    const { count: totalEmployees } = await supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Get today's sessions
    const { data: todaySessions } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .gte('checkin_ts', start.toISOString())
      .lte('checkin_ts', end.toISOString());

    // Calculate stats
    const activeToday = todaySessions?.length || 0;
    const officeToday = todaySessions?.filter(s => s.mode === 'office').length || 0;
    const remoteToday = todaySessions?.filter(s => s.mode === 'remote').length || 0;

    // Calculate average work hours for today
    let totalWorkMinutes = 0;
    let completedSessions = 0;

    if (todaySessions) {
      for (const session of todaySessions) {
        if (session.checkout_ts) {
          const checkin = new Date(session.checkin_ts);
          const checkout = new Date(session.checkout_ts);
          const diffMs = checkout.getTime() - checkin.getTime();
          totalWorkMinutes += Math.round(diffMs / 60000);
          completedSessions++;
        }
      }
    }

    const avgWorkHours = completedSessions > 0 ? Math.round(totalWorkMinutes / completedSessions / 60 * 10) / 10 : 0;

    return NextResponse.json({
      totalEmployees: totalEmployees || 0,
      activeToday,
      officeToday,
      remoteToday,
      avgWorkHours
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
