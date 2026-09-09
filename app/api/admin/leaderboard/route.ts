import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getUserSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Team leaderboard — top 5 by current streak and by Deep Score over the
// same 14-day IST window (and scoring formula) as /api/stats/punctuality.

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated() && !getUserSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const fourteenDaysAgo = new Date(istNow);
    fourteenDaysAgo.setDate(istNow.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);
    const todayEnd = new Date(istNow);
    todayEnd.setHours(23, 59, 59, 999);
    const start = new Date(fourteenDaysAgo.toLocaleString('en-US', { timeZone: 'UTC' }));
    const end = new Date(todayEnd.toLocaleString('en-US', { timeZone: 'UTC' }));

    const [empRes, sessRes] = await Promise.all([
      supabaseAdmin.from('employees').select('id, full_name, slug').eq('active', true).order('full_name'),
      supabaseAdmin
        .from('sessions')
        .select('employee_id, checkin_ts, checkout_ts, mode')
        .gte('checkin_ts', start.toISOString())
        .lte('checkin_ts', end.toISOString())
        .order('checkin_ts', { ascending: true }),
    ]);

    if (empRes.error) return NextResponse.json({ error: empRes.error.message }, { status: 500 });

    interface DayScore {
      baseScore: number;
      checkinTime: number;
      checkoutTime: number | null;
      hoursWorked: number;
      mode: string;
      totalScore: number;
    }

    const byEmployee = new Map<string, Map<string, DayScore>>();

    (sessRes.data ?? []).forEach((session: any) => {
      const checkin = new Date(session.checkin_ts);
      const istCheckin = new Date(checkin.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const checkinTime = istCheckin.getHours() * 60 + istCheckin.getMinutes();
      const dateKey = istCheckin.toISOString().split('T')[0];

      let checkoutTime: number | null = null;
      let hoursWorked = 0;
      if (session.checkout_ts) {
        const istCheckout = new Date(new Date(session.checkout_ts).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        checkoutTime = istCheckout.getHours() * 60 + istCheckout.getMinutes();
        hoursWorked = (checkoutTime - checkinTime) / 60;
      }

      const existing = byEmployee.get(session.employee_id);
      if (!existing) byEmployee.set(session.employee_id, new Map());
      const days = byEmployee.get(session.employee_id)!;

      // Earliest check-in per day wins the base score; later checkouts still count
      const day = days.get(dateKey);
      if (!day) {
        let baseScore = 0;
        if (checkinTime < 615) baseScore = 3;
        else if (checkinTime < 645) baseScore = 2;
        else if (checkinTime < 1020) baseScore = 1;
        else baseScore = 0.5;

        let hoursBonus = 0;
        if (hoursWorked >= 8) hoursBonus = 0.5;
        else if (hoursWorked >= 6) hoursBonus = 0.3;
        else if (hoursWorked >= 4) hoursBonus = 0.1;

        let checkoutBonus = 0;
        if (checkoutTime !== null) {
          if (checkoutTime >= 1020) checkoutBonus = 0.3;
          else if (checkoutTime >= 960) checkoutBonus = 0.2;
          else if (checkoutTime >= 900) checkoutBonus = 0.1;
        }

        const modeBonus = session.mode === 'office' ? 0.2 : 0.1;
        days.set(dateKey, {
          baseScore,
          checkinTime,
          checkoutTime,
          hoursWorked,
          mode: session.mode || 'remote',
          totalScore: Math.min(3, baseScore + hoursBonus + checkoutBonus + modeBonus),
        });
      } else if (checkoutTime !== null && (day.checkoutTime === null || checkoutTime > day.checkoutTime)) {
        day.checkoutTime = checkoutTime;
        const hours = (checkoutTime - day.checkinTime) / 60;
        day.hoursWorked = hours > 0 ? hours : day.hoursWorked;
      }
    });

    const streaks: Array<{ name: string; slug: string; streak: number }> = [];
    const deepScores: Array<{ name: string; slug: string; score: number }> = [];

    (empRes.data ?? []).forEach((emp: any) => {
      const days = byEmployee.get(emp.id);
      const sortedDays = days
        ? Array.from(days.values()).sort((a, b) => a.checkinTime - b.checkinTime)
        : [];

      // Current streak: consecutive on-time days (walk from the most recent)
      let streak = 0;
      for (let i = sortedDays.length - 1; i >= 0; i--) {
        if (sortedDays[i].baseScore >= 3) streak += 1;
        else break;
      }

      const deepScore = sortedDays.reduce((sum, d) => sum + d.totalScore, 0);

      streaks.push({ name: emp.full_name, slug: emp.slug, streak });
      deepScores.push({ name: emp.full_name, slug: emp.slug, score: Math.round(deepScore * 10) / 10 });
    });

    const topByStreak = streaks.sort((a, b) => b.streak - a.streak).slice(0, 5);
    const topByScore = deepScores.sort((a, b) => b.score - a.score).slice(0, 5);

    return NextResponse.json({
      topByStreak: topByStreak.map((r, i) => ({ rank: i + 1, ...r })),
      topByDeepScore: topByScore.map((r, i) => ({ rank: i + 1, ...r })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
