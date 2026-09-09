"use client";

import { cn } from "@/lib/utils";
import { useMemo } from "react";

export interface DayCellState {
  /** tailwind classes for the cell background/text */
  className?: string;
  /** small dot under the day number */
  dot?: "office" | "remote" | "leave" | "holiday" | "pending";
  /** meta text inside the cell, e.g. "12/18" */
  meta?: string;
  title?: string;
}

interface MonthGridProps {
  year: number;
  month: number; // 1-12
  dayState?: (dateKey: string) => DayCellState | undefined;
  selected?: string | null;
  onDayClick?: (dateKey: string) => void;
  className?: string;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DOT_CLASS: Record<NonNullable<DayCellState["dot"]>, string> = {
  office: "bg-emerald-500",
  remote: "bg-sky-500",
  leave: "bg-amber-500",
  holiday: "bg-violet-400",
  pending: "bg-muted-foreground/40",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Shared Monday-first month calendar. Modules overlay their own state via
 * `dayState` — attendance marks presence, leave marks who's out, settings
 * marks holidays — so every calendar in the console reads the same.
 */
export function MonthGrid({ year, month, dayState, selected, onDayClick, className }: MonthGridProps) {
  const cells = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    // Monday-first offset: JS getDay() is Sunday-first.
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const leading = (firstDow + 6) % 7;
    const out: Array<{ key: string; day: number } | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({ key: dateKey(year, month, day), day });
    }
    return out;
  }, [year, month]);

  const todayKey = useMemo(() => {
    const now = new Date();
    // IST date key for "today" — the console's whole clock runs on IST.
    const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return `${ist.getFullYear()}-${pad(ist.getMonth() + 1)}-${pad(ist.getDate())}`;
  }, []);

  return (
    <div className={className}>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="card-label pb-1 text-center">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;
          const state = dayState?.(cell.key);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selected;
          const dow = new Date(`${cell.key}T00:00:00Z`).getUTCDay();
          const isWeekend = dow === 0 || dow === 6;
          return (
            <button
              key={cell.key}
              onClick={onDayClick ? () => onDayClick(cell.key) : undefined}
              title={state?.title}
              disabled={!onDayClick}
              className={cn(
                "relative flex h-10 sm:h-11 flex-col items-center justify-center rounded-lg border text-sm tabular-nums transition-colors",
                state?.className
                  ? state.className
                  : isWeekend
                  ? "border-transparent bg-muted/40 text-muted-foreground/60"
                  : "border-transparent text-foreground/80 hover:bg-glass-hover",
                isSelected && "ring-2 ring-ring",
                isToday && !isSelected && "ring-1 ring-foreground/30",
                onDayClick && "cursor-pointer"
              )}
            >
              <span className={cn("leading-none", isToday && "font-bold")}>{cell.day}</span>
              {state?.meta ? (
                <span className="mt-0.5 text-[9px] leading-none text-muted-foreground">{state.meta}</span>
              ) : null}
              {state?.dot ? (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    DOT_CLASS[state.dot]
                  )}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Standard legend row for month grids. */
export function MonthGridLegend({
  items,
  className,
}: {
  items: Array<{ dot?: DotColor; label: string }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          {item.dot ? <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASS[item.dot])} /> : null}
          {item.label}
        </span>
      ))}
    </div>
  );
}

type DotColor = "office" | "remote" | "leave" | "holiday" | "pending";
