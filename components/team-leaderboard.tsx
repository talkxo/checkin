'use client';

import { useEffect, useState } from 'react';
import { Flame, Star } from 'lucide-react';
import { SegmentedControl } from '@/components/admin/segmented';

type Board = 'streak' | 'deepScore';

interface Row {
  rank: number;
  name: string;
  slug: string;
  streak?: number;
  score?: number;
}

/** Team leaderboard — top 5 by current streak or Deep Score this month. */
export default function TeamLeaderboard() {
  const [board, setBoard] = useState<Board>('streak');
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/leaderboard')
      .then((r) => r.json())
      .then((data) => {
        setRows(board === 'streak' ? data.topByStreak ?? [] : data.topByDeepScore ?? []);
      })
      .catch(() => setRows([]));
  }, [board]);

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="card-label">Leaderboard</h3>
        <SegmentedControl
          size="sm"
          value={board}
          onChange={(v) => setBoard(v as Board)}
          options={[
            {
              value: 'streak',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Streaks
                </span>
              ),
            },
            {
              value: 'deepScore',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Deep Score
                </span>
              ),
            },
          ]}
        />
      </div>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No check-ins in the last 14 days.</p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.slug}
              className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  row.rank === 1
                    ? 'bg-amber-400 text-black'
                    : row.rank === 2
                      ? 'bg-foreground/70 text-background'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {row.rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {row.name}
              </span>
              {board === 'streak' ? (
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                  <Flame className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.25} />
                  {row.streak}d
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums text-foreground">
                  <Star className="h-3.5 w-3.5 text-amber-500" strokeWidth={2.25} />
                  {row.score}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
