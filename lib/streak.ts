// Current-streak walk over IST check-in date keys — mirrors hooks/use-streak.ts
// (the personal tile) so the team leaderboard shows the same streak numbers.

const toDateKey = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const isWorkday = (d: Date) => {
  const dow = d.getUTCDay();
  return dow >= 1 && dow <= 5;
};

function previousWorkday(date: Date): Date {
  const cursor = new Date(date);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (!isWorkday(cursor));
  return cursor;
}

/** IST date key ('YYYY-MM-DD') of a check-in instant — same derivation as the client hook. */
export const istDateKeyOf = (instant: string | Date) =>
  new Date(instant).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * Consecutive-workday run ending at the most recent check-in.
 * @param dateKeys IST 'YYYY-MM-DD' keys, sorted ascending (any check-in counts —
 * timeliness is Deep Score's business, not the streak's).
 */
export function currentStreak(dateKeys: string[]): number {
  if (dateKeys.length === 0) return 0;
  const [y, m, d] = dateKeys[dateKeys.length - 1].split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  let current = 0;
  for (let i = dateKeys.length - 1; i >= 0; i--) {
    if (dateKeys[i] !== toDateKey(cursor)) break;
    current += 1;
    cursor = previousWorkday(cursor);
  }
  return current;
}

/** Longest consecutive-workday run anywhere in the history (`dateKeys` ascending). */
export function bestStreak(dateKeys: string[]): number {
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of dateKeys) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (prev && toDateKey(nextWorkday(prev)) === key) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = date;
  }
  return best;
}

function nextWorkday(date: Date): Date {
  const cursor = new Date(date);
  do {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  } while (!isWorkday(cursor));
  return cursor;
}
