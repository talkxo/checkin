'use client';

import { motion } from 'framer-motion';
import { formatISTTimeShort } from '@/lib/time';

interface CheckInCardProps {
  mode: 'office' | 'remote';
  onModeChange: (mode: 'office' | 'remote') => void;
  hasOpen: boolean;
  checkinTs: string | null;
  checkInSuccess: boolean;
  lateCheckIn: boolean;
  isHolding: boolean;
  holdProgress: number;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  now: Date;
  elapsedSeconds: number;
}

function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * The hero check-in pod — one surface, everything on it. The entire card is
 * the hold target; holding fills it with colour from the bottom up (green
 * for check-in, red for checkout), completing as the hold does.
 */
export default function CheckInCard({
  mode,
  onModeChange,
  hasOpen,
  checkinTs,
  checkInSuccess,
  lateCheckIn,
  isHolding,
  holdProgress,
  onHoldStart,
  onHoldEnd,
  now,
  elapsedSeconds,
}: CheckInCardProps) {
  const covered = holdProgress > 40;
  const accent = hasOpen
    ? 'linear-gradient(180deg, var(--color-danger) 0%, var(--color-danger-deep) 100%)'
    : 'linear-gradient(180deg, var(--color-success) 0%, var(--color-success-deep) 100%)';

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
      role="button"
      aria-label={hasOpen ? 'Hold to check out' : 'Hold to check in'}
      tabIndex={0}
      onMouseDown={onHoldStart}
      onMouseUp={onHoldEnd}
      onMouseLeave={onHoldEnd}
      onTouchStart={onHoldStart}
      onTouchEnd={onHoldEnd}
      className={`relative flex min-h-[252px] w-full cursor-pointer select-none flex-col overflow-hidden rounded-3xl border p-4 transition-colors duration-200 ${
        checkInSuccess && !lateCheckIn
          ? 'border-success-400/60 glow-success'
          : checkInSuccess && lateCheckIn
            ? 'border-amber-400/60'
            : hasOpen
              ? 'border-danger/25'
              : 'border-glass-border'
      }`}
    >
      {/* Idle glow — static, subtle (a pulsing glow reads as blinking) */}
      {!hasOpen && !checkInSuccess && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ boxShadow: 'inset 0 -36px 48px rgba(var(--mint-rgb), 0.07)' }}
        />
      )}

      {/* Liquid fill — rises bottom → top while holding */}
      <div
        aria-hidden
        className={`absolute inset-x-0 bottom-0 z-0 ${hasOpen ? 'glow-danger' : 'glow-success'}`}
        style={{ height: `${holdProgress}%`, background: accent, transition: 'height 90ms linear' }}
      />

      {/* State caption */}
      <div className="relative z-10 flex h-4 items-center justify-between">
        <span
          className={`card-label transition-colors duration-150 ${
            covered ? 'text-white/85' : ''
          }`}
        >
          {hasOpen ? 'On the clock' : 'Check in'}
        </span>
        <span
          className={`h-2 w-2 rounded-full transition-colors duration-150 ${
            covered ? 'bg-white' : hasOpen ? 'animate-pulse bg-success-500' : 'bg-primary/50'
          }`}
        />
      </div>

      {/* Work mode — connected segmented control, icon-only, isolated from
          the hold gesture */}
      <div
        className="relative z-10 mt-2 flex w-fit items-center rounded-full bg-black/5 p-0.5 dark:bg-white/10"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {(['office', 'remote'] as const).map((m) => (
          <button
            key={m}
            title={m === 'office' ? 'Working from office' : 'Working remotely'}
            aria-label={m === 'office' ? 'Working from office' : 'Working remotely'}
            aria-pressed={mode === m}
            onClick={(e) => {
              e.stopPropagation();
              onModeChange(m);
            }}
            className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
              mode === m
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <i className={`fas ${m === 'office' ? 'fa-building' : 'fa-house'} text-[11px]`} />
          </button>
        ))}
      </div>

      {/* Hero metric — live clock as a casual sentence when idle, elapsed timer when on the clock */}
      <div className="relative z-10 flex flex-1 items-center">
        {hasOpen ? (
          <p
            className={`text-[28px] font-semibold leading-none tracking-tight tabular-nums transition-colors duration-150 ${
              covered ? 'text-white' : 'text-foreground'
            }`}
            style={{ fontFamily: 'Funnel Display, system-ui, sans-serif' }}
          >
            {formatElapsed(elapsedSeconds)}
          </p>
        ) : (
          <p
            className={`text-[15px] font-normal leading-snug transition-colors duration-150 ${
              covered ? 'text-white' : 'text-foreground/90'
            }`}
          >
            It's{' '}
            {now
              .toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
              })
              .toLowerCase()}
            <br />
            right now
          </p>
        )}
      </div>

      {/* Meta — pinned to the bottom edge */}
      <p
        className={`relative z-10 text-[11px] font-medium transition-colors duration-150 ${
          covered ? 'text-white/75' : 'text-muted-foreground'
        }`}
      >
        {isHolding
          ? `Keep holding · ${Math.round(holdProgress)}%`
          : hasOpen
            ? `since ${checkinTs ? formatISTTimeShort(checkinTs) : '--'}`
            : 'press & hold'}
      </p>
    </motion.div>
  );
}
