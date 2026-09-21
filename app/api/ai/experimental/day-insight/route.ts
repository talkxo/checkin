import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { askJev, isTypeSafeConfigured } from '@/lib/typesafe';

export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;

function hhmmIST(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata',
  });
}

export async function POST(_req: NextRequest) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isTypeSafeConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }

  // Build the observed window here — the model judges what actually happened.
  const start = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('checkin_ts, checkout_ts')
    .eq('employee_id', session.id)
    .gte('checkin_ts', start.toISOString())
    .not('checkin_ts', 'is', null)
    .order('checkin_ts', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byDay = new Map<string, { checkIn: string | null; checkOut: string | null; hours: number | null }>();
  for (const s of sessions ?? []) {
    const day = new Date(s.checkin_ts).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const entry = byDay.get(day) ?? { checkIn: null, checkOut: null, hours: null };
    if (!entry.checkIn) entry.checkIn = hhmmIST(s.checkin_ts);
    if (s.checkout_ts) {
      entry.checkOut = hhmmIST(s.checkout_ts);
      const hrs = (new Date(s.checkout_ts).getTime() - new Date(s.checkin_ts).getTime()) / 3600000;
      // ignore corrupt negative/near-zero spans (same exclusion as averages)
      if (hrs > 0.1) entry.hours = Math.round(hrs * 10) / 10;
    }
    byDay.set(day, entry);
  }

  const days = Array.from(byDay.entries()).map(([date, v]) => ({ date, ...v }));
  if (days.length === 0) {
    return NextResponse.json({ error: 'No attendance data in the last 14 days' }, { status: 400 });
  }

  const result = await askJev(
    {
      recentDays: days,
      timezone: 'Asia/Kolkata',
    },
    {
      weeklyPattern: {
        type: 'choice',
        instructions:
          'Based on these workdays (times are IST, HH:MM), which statement best describes this person\'s attendance pattern?',
        criteria: {
          steady: 'Check-ins happen around the same time each day with consistent hours',
          drifting_late: 'Check-ins have been getting progressively later across the days',
          erratic: 'Check-in times vary widely from day to day with no clear rhythm',
          sparse: 'Several expected workdays are missing or very short',
        },
      },
      rhythmScore: {
        type: 'score',
        instructions: 'Score the consistency of this person\'s daily work rhythm over these days.',
        criteria: [
          'No usable data or almost no worked days',
          'Highly erratic — times and hours swing unpredictably',
          'Somewhat irregular — a rough pattern exists but with frequent exceptions',
          'Mostly consistent — minor day-to-day variation only',
          'Very consistent — steady check-in times and hours throughout',
        ],
      },
      lateStartRisk: {
        type: 'noul',
        instructions:
          'Given the trend across these days, is there a meaningful risk that this person starts notably late on their next workday?',
        criteria: {
          true: 'The trend or variance suggests a late start is likely',
          false: 'The pattern suggests a normal start time',
        },
      },
    }
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ answers: result.data.answers, dayCount: days.length });
}
