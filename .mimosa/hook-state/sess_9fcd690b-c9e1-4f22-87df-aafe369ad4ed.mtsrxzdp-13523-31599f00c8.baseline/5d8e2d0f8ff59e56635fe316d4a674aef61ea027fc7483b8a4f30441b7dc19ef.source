'use client';

import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import type { PunctualityStats } from '@/hooks/use-dashboard-data';

const MICRO_LABEL = 'card-label';
const DISPLAY_NUMBER = 'text-[32px] font-bold leading-none tabular-nums text-foreground';

// Shared skeleton: label pinned top, value centered in a flexible middle,
// footer pinned bottom — so titles and values align across every card.
function StatCardShell({
  children,
  label,
  tooltip,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  tooltip: string;
  onClick?: () => void;
}) {
  const className = `glass flex flex-col rounded-3xl p-4 text-left transition-opacity ${
    onClick ? 'cursor-pointer hover:opacity-95' : 'cursor-default'
  }`;
  const header = (
    <div className="flex h-4 items-center justify-between">
      <span className={MICRO_LABEL}>{label}</span>
      <Info className="h-3 w-3 shrink-0 text-muted-foreground/60" />
    </div>
  );

  if (onClick) {
    return (
      <motion.button
        variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
        onClick={onClick}
        className={className}
        title={tooltip}
      >
        {header}
        {children}
      </motion.button>
    );
  }
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      className={className}
      title={tooltip}
    >
      {header}
      {children}
    </motion.div>
  );
}

/** Deep Score — the USP metric. Tap for the full breakdown. */
export function DeepScoreTile({
  stats,
  onOpen,
}: {
  stats: PunctualityStats | null;
  onOpen: () => void;
}) {
  const max = stats?.maxScore || 42;
  const pct = stats ? Math.max(0, Math.min(100, (stats.punctualityScore / max) * 100)) : 0;

  return (
    <StatCardShell
      label="Deep Score"
      tooltip="Your punctuality score this quarter. Higher = more on-time check-ins."
      onClick={stats?.dayBreakdown ? onOpen : undefined}
    >
      <div className="flex flex-1 items-center py-2">
        <p className={DISPLAY_NUMBER}>
          {stats ? stats.punctualityScore.toFixed(2) : '--'}
          <span className="ml-1 text-sm font-medium text-muted-foreground">/{max}</span>
        </p>
      </div>
      <div className="flex min-h-[16px] items-end">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-brand transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </StatCardShell>
  );
}

/** No-fill days — working days this month with no check-in. */
export function NoFillTile({
  stats,
  onOpen,
}: {
  stats: PunctualityStats | null;
  onOpen: () => void;
}) {
  return (
    <StatCardShell
      label="No-Fill"
      tooltip="Working days this month where no check-in was recorded."
      onClick={stats?.windowDates ? onOpen : undefined}
    >
      <div className="flex flex-1 items-center py-2">
        <p className={DISPLAY_NUMBER}>{stats ? stats.noFillDays : '--'}</p>
      </div>
      <div className="flex min-h-[16px] items-end">
        <p className="text-[11px] leading-tight text-muted-foreground">missed days this month</p>
      </div>
    </StatCardShell>
  );
}

/** Average check-in time — lives in the bento beside the streak. */
export function AvgInTile({ stats }: { stats: PunctualityStats | null }) {
  return (
    <StatCardShell
      label="Avg time"
      tooltip="Your average check-in time this month."
    >
      <div className="flex flex-1 items-center py-2">
        <p className={DISPLAY_NUMBER}>{stats?.avgCheckinTime || '--'}</p>
      </div>
      <div className="flex min-h-[16px] items-end justify-between">
        <p className="text-[11px] leading-tight text-muted-foreground">this month</p>
        {stats?.checkinStatus ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
              stats.checkinStatus === 'late'
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-success-500/15 text-success-600 dark:text-success-400'
            }`}
          >
            {stats.checkinStatus}
          </span>
        ) : null}
      </div>
    </StatCardShell>
  );
}
