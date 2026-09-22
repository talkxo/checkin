'use client';

import { useEffect, useState } from 'react';
import { bestStreak, currentStreak } from '@/lib/streak';

interface StreakInfo {
  /** Consecutive most-recent workdays with a check-in. */
  current: number;
  /** Longest consecutive-workday run in the available history. */
  best: number;
}

const empty: StreakInfo = { current: 0, best: 0 };

/**
 * Streak stats from recent check-ins: the current consecutive-workday run and
 * the personal-best run across a year of history.
 */
export function useStreak(enabled: boolean, slug: string | null | undefined): StreakInfo {
  const [streak, setStreak] = useState<StreakInfo>(empty);

  useEffect(() => {
    if (!enabled) {
      setStreak(empty);
      return;
    }

    const activeSlug =
      slug ||
      (typeof window !== 'undefined' ? localStorage.getItem('userSlug') : null);

    if (!activeSlug) {
      setStreak(empty);
      return;
    }

    const fetchStreak = async () => {
      try {
        const response = await fetch(`/api/admin/recent-activity?range=year&slug=${encodeURIComponent(activeSlug)}`);
        if (!response.ok) {
          setStreak(empty);
          return;
        }

        const data = await response.json();
        const uniqueKeys = Array.from(
          new Set<string>(
            (data.recentActivity || []).map((item: any) =>
              new Date(item.checkinTime).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
            )
          )
        ).sort();

        if (uniqueKeys.length === 0) {
          setStreak(empty);
          return;
        }

        // Both walks come from lib/streak.ts — the same math the team
        // leaderboard uses, so personal tile and leaderboard always agree.
        const current = currentStreak(uniqueKeys);
        const best = bestStreak(uniqueKeys);

        setStreak({ current, best: Math.max(best, current) });
      } catch {
        setStreak(empty);
      }
    };

    fetchStreak();
  }, [enabled, slug]);

  return streak;
}
