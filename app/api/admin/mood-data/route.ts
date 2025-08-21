import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('range') || 'week';

    const now = nowIST();
    let startDate: Date;
    let endDate: Date = new Date(now);

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
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
    }

    // Get sessions with mood data in the date range
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        checkin_ts,
        checkout_ts,
        mood,
        mood_comment,
        mode,
        employees (
          id,
          full_name,
          slug
        )
      `)
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', endDate.toISOString())
      .not('mood', 'is', null)
      .order('checkin_ts', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process sessions into mood data
    const moodData = sessions?.map(session => {
      const checkinTime = new Date(session.checkin_ts);
      const checkoutTime = session.checkout_ts ? new Date(session.checkout_ts) : null;
      
      let workedHours = 'N/A';
      if (checkoutTime) {
        const diffMs = checkoutTime.getTime() - checkinTime.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        workedHours = `${hours}h ${minutes}m`;
      }

      return {
        id: session.id,
        name: session.employees.full_name,
        slug: session.employees.slug,
        date: checkinTime.toISOString().split('T')[0],
        checkinTime: checkinTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }),
        checkoutTime: checkoutTime ? checkoutTime.toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: 'Asia/Kolkata'
        }) : 'N/A',
        workedHours: workedHours,
        mood: session.mood,
        moodComment: session.mood_comment || '',
        mode: session.mode,
        dayOfWeek: checkinTime.toLocaleDateString('en-US', { weekday: 'long' })
      };
    }) || [];

    return NextResponse.json({ 
      moodData,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalMoodEntries: moodData.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
