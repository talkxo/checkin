'use client';

import { useEffect, useState } from 'react';
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
            { value: 'streak', label: '🔥 Streaks' },
            { value: 'deepScore', label: '⭐ Deep Score' },
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
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {board === 'streak' ? `🔥 ${row.streak}d` : `⭐ ${row.score}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
