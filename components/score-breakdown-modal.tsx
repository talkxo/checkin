'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, TrendingUp, TrendingDown, Minus, Zap, Building2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DayBreakdown {
  date: string;
  checkinTime: string;
  checkoutTime: string | null;
  hoursWorked: number;
  mode: string;
  baseScore: number;
  hoursBonus: number;
  checkoutBonus: number;
  modeBonus: number;
  totalScore: number;
}

interface ScoreBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  type: 'deepScore' | 'noFill';
  punctualityScore?: number;
  maxScore?: number;
  noFillDays?: number;
  dayBreakdown?: DayBreakdown[];
  consistencyBonus?: number;
  streakBonus?: number;
  windowDates?: string[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isWeekend(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.getDay() === 0 || d.getDay() === 6;
}

// Catmull-Rom smooth path through SVG points
function smoothCurve(pts: [number, number][]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function linearTrend(values: number[]) {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  const sumX = values.reduce((s, _, i) => s + i, 0);
  const sumY = values.reduce((s, v) => s + v, 0);
  const sumXY = values.reduce((s, v, i) => s + i * v, 0);
  const sumX2 = values.reduce((s, _, i) => s + i * i, 0);
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function ScoreHistoryChart({
  dayBreakdown,
  windowDates,
  currentScore,
  maxScore,
}: {
  dayBreakdown: DayBreakdown[];
  windowDates: string[];
  currentScore: number;
  maxScore: number;
}) {
  const [started, setStarted] = useState(false);
  const [dotsVisible, setDotsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStarted(true), 60);
    const t2 = setTimeout(() => setDotsVisible(true), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const scoreMap = new Map(dayBreakdown.map(d => [d.date, d.totalScore]));

  const dates = windowDates.length > 0 ? windowDates : Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 13 + i);
    return d.toISOString().split('T')[0];
  });

  // Build per-day scores (0 if no check-in, weekends also 0)
  const dayValues = dates.map(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const score = scoreMap.get(dateStr) ?? 0;
    const hasCheckin = scoreMap.has(dateStr);
    return { dateStr, score, weekend, isFuture, isToday, hasCheckin };
  });

  const W = 280; const H = 72; const PX = 8; const PY = 8;

  const xOf = (i: number) => PX + (i / (dates.length - 1)) * (W - PX * 2);
  const yOf = (v: number) => H - PY - (v / 3) * (H - PY * 2); // daily scores out of 3

  // Only past/today points for the line
  const linePts: [number, number][] = dayValues
    .map((d, i) => [xOf(i), yOf(d.score)] as [number, number]);

  const curvePath = smoothCurve(linePts);
  const areaPath = curvePath +
    ` L${xOf(dates.length - 1).toFixed(1)},${H} L${xOf(0).toFixed(1)},${H} Z`;

  // Trend line (linear regression on past days only)
  const pastScores = dayValues.filter(d => !d.isFuture).map(d => d.score);
  const { slope, intercept } = linearTrend(pastScores);
  const trendStart: [number, number] = [xOf(0), yOf(Math.max(0, Math.min(3, intercept)))];
  const trendEnd: [number, number] = [
    xOf(pastScores.length - 1),
    yOf(Math.max(0, Math.min(3, intercept + slope * (pastScores.length - 1)))),
  ];

  // Trend label
  const trendLabel = slope > 0.05 ? 'Trending up' : slope < -0.05 ? 'Trending down' : 'Holding steady';
  const TrendIcon = slope > 0.05 ? TrendingUp : slope < -0.05 ? TrendingDown : Minus;
  const trendColor = slope > 0.05 ? 'text-primary' : slope < -0.05 ? 'text-red-400' : 'text-muted-foreground';

  // Today index
  const todayIdx = dates.indexOf(todayStr);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Last 14 days
        </p>
        <AnimatePresence>
          {dotsVisible && (
            <motion.span
              initial={{ opacity: 0, x: 6 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn('flex items-center gap-1 text-[10px] font-semibold', trendColor)}
            >
              <TrendIcon className="w-3 h-3" />
              {trendLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[72px]" preserveAspectRatio="none">
        <defs>
          <linearGradient id="hist-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow-hist">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <clipPath id="hist-reveal">
            <motion.rect
              x={0} y={0} height={H}
              initial={{ width: 0 }}
              animate={{ width: started ? W : 0 }}
              transition={{ duration: 1.3, ease: [0.33, 1, 0.68, 1] }}
            />
          </clipPath>
        </defs>

        {/* Subtle grid lines at 1pt and 2pt */}
        {[1, 2].map(v => (
          <line key={v}
            x1={PX} y1={yOf(v)} x2={W - PX} y2={yOf(v)}
            stroke="hsl(var(--border))" strokeWidth="0.5" strokeOpacity="0.5"
          />
        ))}

        {/* Revealed: area + lines */}
        <g clipPath="url(#hist-reveal)">
          {/* Area fill */}
          <motion.path d={areaPath} fill="url(#hist-grad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: started ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          />
          {/* Trend line — dashed */}
          <line
            x1={trendStart[0]} y1={trendStart[1]}
            x2={trendEnd[0]} y2={trendEnd[1]}
            stroke="hsl(var(--muted-foreground))" strokeWidth="1"
            strokeDasharray="4 3" strokeOpacity="0.45"
          />
          {/* Glow halo */}
          <path d={curvePath} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="5"
            strokeLinecap="round" strokeLinejoin="round"
            strokeOpacity="0.15" filter="url(#glow-hist)"
          />
          {/* Main score curve */}
          <path d={curvePath} fill="none"
            stroke="hsl(var(--primary))" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
          />
        </g>

        {/* Today marker */}
        {todayIdx >= 0 && (
          <line
            x1={xOf(todayIdx)} y1={PY}
            x2={xOf(todayIdx)} y2={H - PY}
            stroke="hsl(var(--primary))" strokeWidth="1"
            strokeOpacity="0.35" strokeDasharray="2 3"
          />
        )}

        {/* Per-day dots — staggered pop-in after line finishes */}
        {dotsVisible && dayValues.map((d, i) => {
          if (d.isFuture) return null;
          const cx = xOf(i); const cy = yOf(d.score);
          const dotColor = !d.hasCheckin && !d.weekend
            ? 'hsl(var(--destructive))'
            : d.score >= 2.8 ? 'hsl(var(--primary))'
            : d.score >= 2   ? 'hsl(198 93% 60%)'   // sky
            : d.score >= 0.5 ? 'hsl(38 92% 50%)'    // amber
            : 'hsl(var(--muted-foreground))';
          return (
            <motion.circle key={d.dateStr}
              cx={cx} cy={cy} r={d.isToday ? 3.5 : 2.5}
              fill={dotColor}
              stroke="hsl(var(--card))" strokeWidth="1.2"
              initial={{ r: 0, opacity: 0 }}
              animate={{ r: d.isToday ? 3.5 : 2.5, opacity: 1 }}
              transition={{ delay: i * 0.055, duration: 0.3, type: 'spring', stiffness: 320 }}
            />
          );
        })}

        {/* Pulse on today's dot */}
        {dotsVisible && todayIdx >= 0 && (
          <motion.circle
            cx={xOf(todayIdx)} cy={yOf(dayValues[todayIdx]?.score ?? 0)}
            fill="none" stroke="hsl(var(--primary))" strokeWidth="1"
            initial={{ r: 4, opacity: 0 }}
            animate={{ r: [4, 12, 18], opacity: [0, 0.5, 0] }}
            transition={{ delay: 0, duration: 1.4, repeat: Infinity, repeatDelay: 1.2, ease: 'easeOut' }}
          />
        )}
      </svg>

      {/* X-axis */}
      <div className="relative flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">{dates[0] ? new Date(dates[0] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
        {todayIdx >= 0 && (
          <span className="absolute text-[9px] font-semibold text-primary -translate-x-1/2"
            style={{ left: `${(todayIdx / (dates.length - 1)) * 100}%` }}>
            Today
          </span>
        )}
        <span className="text-[9px] text-muted-foreground">{dates[dates.length - 1] ? new Date(dates[dates.length - 1] + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
      </div>
    </motion.div>
  );
}

function WindowBarChart({
  dayBreakdown,
  windowDates,
  currentScore,
  maxScore,
}: {
  dayBreakdown: DayBreakdown[];
  windowDates: string[];
  currentScore: number;
  maxScore: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const scoreMap = new Map(dayBreakdown.map(d => [d.date, d.totalScore]));

  // Build the 14 dates if windowDates not supplied
  const dates = windowDates.length > 0 ? windowDates : Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 13 + i);
    return d.toISOString().split('T')[0];
  });

  const MAX_H = 56;

  const entries = dates.map(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay();
    const weekend = dow === 0 || dow === 6;
    const isFuture = dateStr > todayStr;
    const isToday = dateStr === todayStr;
    const score = scoreMap.get(dateStr) ?? 0;
    const hasCheckin = scoreMap.has(dateStr);
    return { dateStr, score, weekend, isFuture, isToday, hasCheckin };
  });

  const todayIdx = entries.findIndex(e => e.isToday);

  // Count potential remaining pts
  const remainingPts = entries.reduce((sum, e) => {
    if ((e.isFuture || (e.isToday && !e.hasCheckin)) && !e.weekend) return sum + 3;
    return sum;
  }, 0);
  const bestPossible = Math.min(maxScore, currentScore + remainingPts);
  const gap = +(bestPossible - currentScore).toFixed(2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2.5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">14-day window</p>
        {gap > 0
          ? <p className="text-[10px] font-semibold text-primary">+{gap} pts still possible</p>
          : <p className="text-[10px] font-semibold text-primary">🏆 Window maxed</p>}
      </div>

      {/* Bar chart */}
      <div className="relative" style={{ height: MAX_H }}>
        <div className="flex items-end gap-[3px] h-full">
          {entries.map((entry, i) => {
            let targetH: number;
            let barClass: string;

            if (entry.weekend) {
              targetH = 3;
              barClass = 'rounded-t-sm bg-muted/30';
            } else if (entry.isFuture || (entry.isToday && !entry.hasCheckin)) {
              // Opportunity — ghost bar at 40% height, dashed border
              targetH = Math.round(MAX_H * 0.38);
              barClass = 'rounded-t-sm border border-dashed border-primary/35 bg-primary/8';
            } else if (!entry.hasCheckin) {
              // Missed weekday
              targetH = 5;
              barClass = 'rounded-t-sm bg-red-500/35';
            } else {
              targetH = Math.max(6, Math.round((entry.score / 3) * MAX_H));
              if (entry.score >= 2.8)      barClass = 'rounded-t-sm bg-primary';
              else if (entry.score >= 2.0) barClass = 'rounded-t-sm bg-sky-500';
              else                         barClass = 'rounded-t-sm bg-amber-500';
            }

            return (
              <motion.div
                key={entry.dateStr}
                className={`flex-1 ${barClass}`}
                initial={{ height: 0 }}
                animate={{ height: targetH }}
                transition={{
                  delay: 0.06 + i * 0.055,
                  duration: 0.5,
                  type: 'spring',
                  stiffness: 260,
                  damping: 22,
                }}
              />
            );
          })}
        </div>

        {/* Today vertical tick */}
        {todayIdx >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-primary/50 pointer-events-none"
            style={{ left: `calc(${((todayIdx + 0.5) / entries.length) * 100}% - 0.5px)` }}
          />
        )}
      </div>

      {/* X-axis: start · TODAY · end */}
      <div className="relative flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">{formatDate(dates[0])}</span>
        {todayIdx >= 0 && (
          <span
            className="absolute text-[9px] font-semibold text-primary -translate-x-1/2"
            style={{ left: `${((todayIdx + 0.5) / entries.length) * 100}%` }}
          >
            Today
          </span>
        )}
        <span className="text-[9px] text-muted-foreground">{formatDate(dates[dates.length - 1])}</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap pt-0.5">
        {[
          { color: 'bg-primary', label: 'On time' },
          { color: 'bg-sky-500', label: 'Good' },
          { color: 'bg-amber-500', label: 'Late' },
          { color: 'bg-red-500/35', label: 'Missed' },
          { color: 'border border-dashed border-primary/35 bg-primary/8', label: 'Opportunity' },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-sm inline-block ${color}`} />
            {label}
          </span>
        ))}
      </div>

      {/* Motivational callout */}
      {gap > 0 && remainingPts > 0 && (
        <p className="text-[11px] text-foreground leading-relaxed border-t border-border/40 pt-2">
          Nail the remaining days and you could reach{' '}
          <span className="font-semibold text-primary">{bestPossible.toFixed(1)} / {maxScore}</span>.
        </p>
      )}
    </motion.div>
  );
}

export default function ScoreBreakdownModal({
  open,
  onClose,
  type,
  punctualityScore = 0,
  maxScore = 42,
  noFillDays = 0,
  dayBreakdown = [],
  consistencyBonus = 0,
  streakBonus = 0,
  windowDates = [],
}: ScoreBreakdownModalProps) {

  // Build a set of dates that have check-ins for quick lookup
  const checkedInDates = new Set(dayBreakdown.map(d => d.date));

  // No-fill dates: windowDates that are weekdays and have no check-in
  const noFillDates = windowDates.filter(d => !checkedInDates.has(d) && !isWeekend(d));
  const weekendDates = windowDates.filter(d => !checkedInDates.has(d) && isWeekend(d));

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl border border-border/50 bg-card p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {type === 'deepScore' ? 'Deep Score Breakdown' : 'No-Fill Days — Last 14 Days'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {type === 'deepScore'
                ? `${punctualityScore.toFixed(2)} out of ${maxScore} points across the last 14 days`
                : `${noFillDates.length} weekday${noFillDates.length !== 1 ? 's' : ''} with no check-in recorded`}
            </p>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto max-h-[60vh] p-5 space-y-4">
          {type === 'deepScore' && (
            <>
              {/* Per-day rows */}
              <div className="space-y-1.5">
                {dayBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No check-in data in the last 14 days.</p>
                ) : (
                  dayBreakdown.map((day, i) => (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5"
                    >
                      {/* Date */}
                      <div className="w-[72px] shrink-0">
                        <p className="text-[11px] font-medium text-foreground leading-tight">{formatDate(day.date)}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          {day.mode === 'office'
                            ? <><Building2 className="w-2.5 h-2.5" />Office</>
                            : <><Home className="w-2.5 h-2.5" />Remote</>}
                        </p>
                      </div>

                      {/* Check-in time */}
                      <div className="w-10 shrink-0 text-center">
                        <p className="text-xs font-semibold text-foreground leading-none">{day.checkinTime}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">in</p>
                      </div>

                      {/* Score bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[9px] text-muted-foreground">Base {day.baseScore}</span>
                            {day.hoursBonus > 0 && <span className="text-[9px] text-primary/80">+{day.hoursBonus}h</span>}
                            {day.checkoutBonus > 0 && <span className="text-[9px] text-primary/80">+{day.checkoutBonus}co</span>}
                            {day.modeBonus > 0 && <span className="text-[9px] text-primary/80">+{day.modeBonus}m</span>}
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold tabular-nums ml-1 shrink-0",
                            day.totalScore >= 3 ? "text-primary" : day.totalScore >= 2 ? "text-foreground" : "text-muted-foreground"
                          )}>{day.totalScore.toFixed(2)}</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              day.totalScore >= 3 ? "bg-primary" : day.totalScore >= 2 ? "bg-sky-500" : "bg-amber-500"
                            )}
                            style={{ width: `${(day.totalScore / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Bonus breakdown */}
              {(consistencyBonus > 0 || streakBonus > 0) && (
                <div className="rounded-xl border border-border/50 bg-muted/10 divide-y divide-border/50">
                  {consistencyBonus > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-foreground">Consistency bonus</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">+{consistencyBonus}</span>
                    </div>
                  )}
                  {streakBonus > 0 && (
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs text-foreground">Streak bonus</p>
                      </div>
                      <span className="text-xs font-semibold text-primary">+{streakBonus}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <p className="text-xs font-semibold text-foreground">Total Deep Score</p>
                <p className="text-sm font-bold text-primary tabular-nums">{punctualityScore.toFixed(2)} / {maxScore}</p>
              </div>

              {/* History chart — the hero visual */}
              <ScoreHistoryChart
                dayBreakdown={dayBreakdown}
                windowDates={windowDates}
                currentScore={punctualityScore}
                maxScore={maxScore}
              />

              {/* Improvement tips */}
              <div className="rounded-xl bg-muted/20 p-3 space-y-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">How to improve in 1–2 weeks</p>
                {[
                  { icon: '⏰', tip: 'Check in earlier in the morning — consistency matters more than the odd early day.' },
                  { icon: '📅', tip: 'Don\'t skip days. Every missed weekday drags the score down more than a late check-in.' },
                  { icon: '🏢', tip: 'Mix in a few office days — being on-site gives a small but steady edge.' },
                  { icon: '🚪', tip: 'Remember to check out properly at the end of the day, every day.' },
                  { icon: '🔥', tip: 'Build a streak — consecutive on-time days unlock a bonus that compounds quickly.' },
                ].map(({ icon, tip }) => (
                  <div key={tip} className="flex items-start gap-2">
                    <span className="text-sm mt-px shrink-0">{icon}</span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>

            </>
          )}

          {type === 'noFill' && (
            <>
              {noFillDates.length === 0 ? (
                <div className="text-center py-6">
                  <Check className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Perfect attendance!</p>
                  <p className="text-xs text-muted-foreground mt-1">All weekdays in the last 14 days have a check-in.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {noFillDates.map((dateStr, i) => (
                    <motion.div
                      key={dateStr}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2.5"
                    >
                      <p className="text-sm text-foreground">{formatDate(dateStr)}</p>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">No check-in</span>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Context note */}
              <div className="rounded-xl bg-muted/20 p-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  No-fill days are weekdays in the last 14 calendar days where no check-in was recorded. Weekends are excluded.
                  {weekendDates.length > 0 && ` (${weekendDates.length} weekend day${weekendDates.length > 1 ? 's' : ''} in this window are not counted.)`}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
