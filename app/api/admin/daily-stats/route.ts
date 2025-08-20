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
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get all sessions in the date range
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', now.toISOString())
      .order('checkin_ts', { ascending: true });

    // Group sessions by date
    const dailyStats: { [key: string]: { office: number; remote: number; total: number } } = {};

    if (sessions) {
      for (const session of sessions) {
        const date = new Date(session.checkin_ts).toISOString().split('T')[0];
        
        if (!dailyStats[date]) {
          dailyStats[date] = { office: 0, remote: 0, total: 0 };
        }
        
        dailyStats[date].total++;
        if (session.mode === 'office') {
          dailyStats[date].office++;
        } else {
          dailyStats[date].remote++;
        }
      }
    }

    // Convert to array format and fill missing dates
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const stats = dailyStats[dateStr] || { office: 0, remote: 0, total: 0 };
      
      result.push({
        date: dateStr,
        office: stats.office,
        remote: stats.remote,
        total: stats.total
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    return NextResponse.json({ error: 'Failed to fetch daily stats' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
