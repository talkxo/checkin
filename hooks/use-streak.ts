'use client';

import { useEffect, useState } from 'react';

interface StreakInfo {
  /** Consecutive most-recent workdays with a check-in. */
  current: number;
  /** Longest consecutive-workday run in the available history. */
  best: number;
}

const empty: StreakInfo = { current: 0, best: 0 };

function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWorkday(date: Date): boolean {
  const dow = date.getUTCDay();
  return dow >= 1 && dow <= 5;
}

/** Next workday strictly after `date`. */
function nextWorkday(date: Date): Date {
  const cursor = new Date(date);
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (!isWorkday(cursor));
  return cursor;
}

function previousWorkday(date: Date): Date {
  const cursor = new Date(date);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (!isWorkday(cursor));
  return cursor;
}

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

        // Current streak — walk backwards from the newest check-in.
        const [newestYear, newestMonth, newestDay] = uniqueKeys[uniqueKeys.length - 1].split('-').map(Number);
        let cursor = new Date(Date.UTC(newestYear, newestMonth - 1, newestDay));
        let current = 0;
        for (let i = uniqueKeys.length - 1; i >= 0; i--) {
          if (uniqueKeys[i] !== toDateKey(cursor)) break;
          current += 1;
          cursor = previousWorkday(cursor);
        }

        // Personal best — longest consecutive-workday run.
        let best = 0;
        let run = 0;
        let prev: Date | null = null;
        for (const key of uniqueKeys) {
          const [y, m, d] = key.split('-').map(Number);
          const date = new Date(Date.UTC(y, m - 1, d));
          if (prev && toDateKey(nextWorkday(prev)) === key) {
            run += 1;
          } else {
            run = 1;
          }
          best = Math.max(best, run);
          prev = date;
        }

        setStreak({ current, best: Math.max(best, current) });
      } catch {
        setStreak(empty);
      }
    };

    fetchStreak();
  }, [enabled, slug]);

  return streak;
}
