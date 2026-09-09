import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getUserSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
import { computeDeepScore, deepScoreWindow } from '@/lib/deep-score';
import { currentStreak, istDateKeyOf } from '@/lib/streak';

export const dynamic = 'force-dynamic';

// Team leaderboard — top 5 by current streak and by Deep Score. Both reuse the
// personal tile's math (lib/streak.ts walk + lib/deep-score.ts scoring) so the
// numbers match what each employee sees on their own Today tab.

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated() && !getUserSession()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const now = nowIST();
    const win = deepScoreWindow(14, now);
    const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const [empRes, deepRes, streakRes] = await Promise.all([
      supabaseAdmin.from('employees').select('id, full_name, slug').eq('active', true).order('full_name'),
      supabaseAdmin
        .from('sessions')
        .select('employee_id, checkin_ts, checkout_ts, mode')
        .gte('checkin_ts', win.start.toISOString())
        .lte('checkin_ts', win.end.toISOString()),
      // A year of check-ins per person, matching the personal streak's history span
      supabaseAdmin.from('sessions').select('employee_id, checkin_ts').gte('checkin_ts', yearAgo.toISOString()),
    ]);

    if (empRes.error) return NextResponse.json({ error: empRes.error.message }, { status: 500 });
    if (deepRes.error) return NextResponse.json({ error: deepRes.error.message }, { status: 500 });
    if (streakRes.error) return NextResponse.json({ error: streakRes.error.message }, { status: 500 });

    const sessionsByEmployee = new Map<string, any[]>();
    (deepRes.data ?? []).forEach((s: any) => {
      const list = sessionsByEmployee.get(s.employee_id);
      if (list) list.push(s);
      else sessionsByEmployee.set(s.employee_id, [s]);
    });

    const keysByEmployee = new Map<string, Set<string>>();
    (streakRes.data ?? []).forEach((s: any) => {
      const set = keysByEmployee.get(s.employee_id);
      if (set) set.add(istDateKeyOf(s.checkin_ts));
      else keysByEmployee.set(s.employee_id, new Set([istDateKeyOf(s.checkin_ts)]));
    });

    const streaks: Array<{ name: string; slug: string; streak: number }> = [];
    const deepScores: Array<{ name: string; slug: string; score: number }> = [];

    (empRes.data ?? []).forEach((emp: any) => {
      const deep = computeDeepScore(sessionsByEmployee.get(emp.id) ?? [], { now });
      const keys = Array.from(keysByEmployee.get(emp.id) ?? []).sort();
      streaks.push({ name: emp.full_name, slug: emp.slug, streak: currentStreak(keys) });
      deepScores.push({
        name: emp.full_name,
        slug: emp.slug,
        score: Math.round(deep.punctualityScore * 10) / 10,
      });
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
