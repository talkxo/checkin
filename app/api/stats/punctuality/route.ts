import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
import { computeDeepScore, deepScoreWindow } from '@/lib/deep-score';

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

    const now = nowIST();
    const win = deepScoreWindow(14, now);

    // Get all sessions in last 14 days with checkout and mode info
    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select('checkin_ts, checkout_ts, mode')
      .eq('employee_id', emp.id)
      .gte('checkin_ts', win.start.toISOString())
      .lte('checkin_ts', win.end.toISOString())
      .order('checkin_ts', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Canonical scoring — shared with the team leaderboard (lib/deep-score.ts)
    const { dayScores, punctualityScore, consistencyBonus, streakBonus, noFillDays, avgCheckinTimeMinutes } =
      computeDeepScore(sessions ?? [], { now });

    // Calculate average check-in time
    let avgCheckinTimeFormatted = '--:--';
    if (dayScores.length > 0) {
      const avgHours = Math.floor(avgCheckinTimeMinutes / 60);
      const avgMinutes = Math.floor(avgCheckinTimeMinutes % 60);
      avgCheckinTimeFormatted = `${avgHours.toString().padStart(2, '0')}:${avgMinutes.toString().padStart(2, '0')}`;
    }

    // Get today's check-in time for comparison
    const todayStartForQuery = new Date(win.istNow);
    todayStartForQuery.setHours(0, 0, 0, 0);
    const todayEndForQuery = new Date(win.istNow);
    todayEndForQuery.setHours(23, 59, 59, 999);

    const todayStartUTC = new Date(todayStartForQuery.toLocaleString('en-US', { timeZone: 'UTC' }));
    const todayEndUTC = new Date(todayEndForQuery.toLocaleString('en-US', { timeZone: 'UTC' }));

    const { data: todaySession } = await supabaseAdmin
      .from('sessions')
      .select('checkin_ts')
      .eq('employee_id', emp.id)
      .gte('checkin_ts', todayStartUTC.toISOString())
      .lte('checkin_ts', todayEndUTC.toISOString())
      .order('checkin_ts', { ascending: true })
      .limit(1)
      .maybeSingle();

    let todayCheckinTime: number | null = null;
    let checkinStatus: 'early' | 'late' | 'on-time' | null = null;

    if (todaySession?.checkin_ts) {
      const todayCheckin = new Date(todaySession.checkin_ts);
      const istTodayCheckin = new Date(todayCheckin.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      todayCheckinTime = istTodayCheckin.getHours() * 60 + istTodayCheckin.getMinutes();

      if (avgCheckinTimeMinutes > 0) {
        if (todayCheckinTime < avgCheckinTimeMinutes - 30) {
          checkinStatus = 'early';
        } else if (todayCheckinTime > avgCheckinTimeMinutes + 30) {
          checkinStatus = 'late';
        } else {
          checkinStatus = 'on-time';
        }
      }
    }

    const dayBreakdownSerialized = dayScores.map((d) => ({
      date: d.dateKey,
      checkinTime: `${Math.floor(d.checkinTime / 60).toString().padStart(2, '0')}:${(d.checkinTime % 60).toString().padStart(2, '0')}`,
      checkoutTime:
        d.checkoutTime !== null
          ? `${Math.floor(d.checkoutTime / 60).toString().padStart(2, '0')}:${(d.checkoutTime % 60).toString().padStart(2, '0')}`
          : null,
      hoursWorked: Math.round(d.hoursWorked * 10) / 10,
      mode: d.mode,
      baseScore: d.baseScore,
      hoursBonus: d.hoursBonus,
      checkoutBonus: d.checkoutBonus,
      modeBonus: d.modeBonus,
      totalScore: Math.round(d.totalScore * 100) / 100,
    }));

    const windowDates: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(win.windowStartIST);
      d.setDate(d.getDate() + i);
      windowDates.push(d.toISOString().split('T')[0]);
    }

    return NextResponse.json({
      punctualityScore,
      maxScore: 42, // 14 days * 3 points per day
      noFillDays,
      avgCheckinTime: avgCheckinTimeFormatted,
      avgCheckinTimeMinutes,
      todayCheckinTime: todayCheckinTime
        ? `${Math.floor(todayCheckinTime / 60).toString().padStart(2, '0')}:${(todayCheckinTime % 60).toString().padStart(2, '0')}`
        : null,
      checkinStatus,
      dayBreakdown: dayBreakdownSerialized,
      windowDates,
      consistencyBonus: Math.round(consistencyBonus * 100) / 100,
      streakBonus: Math.round(streakBonus * 100) / 100,
    });
  } catch (error) {
    console.error('Error in deep score stats API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
