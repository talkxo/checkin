"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Cake,
  CalendarDays,
  CalendarHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Loader2,
  ShieldAlert,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { PageHeader } from "./console-shell";
import { HeroTile, StatTile, SectionCard, StateDot, Chip, bentoStagger, bentoRise } from "./ui/bento";
import { cn } from "@/lib/utils";
import { RowListSkeleton, TileSkeleton } from "./ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  useAttendanceReport,
  useBirthdays,
  useHolidays,
  useLeaveRequests,
  useLeaderboard,
  useStats,
  useToday,
} from "./data";
import { MonthGrid, MonthGridLegend } from "./ui/month-grid";
import { leaveRequestPerson } from "./types";
import type { LeaderboardRow } from "./types";

const BAR_COLORS = {
  office: "bg-emerald-500",
  remote: "bg-sky-500",
  notStarted: "bg-muted-foreground/30",
  leave: "bg-amber-500",
} as const;

function relativeDays(dateISO: string): string {
  const diffMs = Date.now() - new Date(dateISO).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function DashboardWorkspace() {
  const stats = useStats();
  const today = useToday();
  const pendingLeave = useLeaveRequests("pending");
  const birthdays = useBirthdays();
  const leaderboard = useLeaderboard();
  const holidays = useHolidays();

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const attendanceRows = today.data?.attendance ?? [];

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        stats.refresh(),
        today.refresh(),
        pendingLeave.refresh(),
        birthdays.refresh(),
        leaderboard.refresh(),
        holidays.refresh(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  const snapshot = useMemo(() => {
    const buckets = { office: 0, remote: 0, notStarted: 0, leave: 0 };
    for (const row of attendanceRows) {
      if (row.onLeave) buckets.leave += 1;
      else if (row.status === "Not Started") buckets.notStarted += 1;
      else if (row.mode === "remote") buckets.remote += 1;
      else buckets.office += 1;
    }
    const total = attendanceRows.length;
    const segments = [
      { key: "office" as const, count: buckets.office },
      { key: "remote" as const, count: buckets.remote },
      { key: "notStarted" as const, count: buckets.notStarted },
      { key: "leave" as const, count: buckets.leave },
    ].filter((s) => s.count > 0);
    return { buckets, total, segments };
  }, [attendanceRows]);

  const alerts = useMemo(() => {
    const missingPunch = attendanceRows.filter((r) => !r.onLeave && r.status === "Not Started");
    const stuckLeaves = (pendingLeave.data?.leaveRequests ?? []).filter(
      (r) => Date.now() - new Date(r.created_at).getTime() > 3 * 86400000
    );
    return { missingPunch, stuckLeaves };
  }, [attendanceRows, pendingLeave.data]);

  // Chronic-absence signal needs multi-day data — the month's attendance report.
  const istToday = useMemo(
    () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }),
    []
  );
  const monthStart = `${istToday.slice(0, 8)}01`;
  const monthAttendance = useAttendanceReport(monthStart, istToday);

  // Alert groups, most severe first. Zero-count groups are dropped entirely —
  // the card only ever shows things that need attention.
  const alertGroups = useMemo(() => {
    const absent = (monthAttendance.data?.employeeSummaries ?? [])
      .filter((e) => e.missedDays >= 3)
      .sort((a, b) => b.missedDays - a.missedDays)
      .map((e) => ({ id: e.employee_id, name: e.name, meta: `${e.missedDays} missed this month` }));
    const missing = [...alerts.missingPunch]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => ({ id: r.id, name: r.name, meta: "no check-in today" }));
    const stuck = [...alerts.stuckLeaves]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({ id: r.id, name: leaveRequestPerson(r).name, meta: `applied ${relativeDays(r.created_at)}` }));

    return [
      { key: "absent", label: "No check-in 3+ days", rows: absent },
      { key: "missing", label: "Missing punches today", rows: missing },
      { key: "stuck", label: "Leave stuck >3 days", rows: stuck },
    ]
      .map((g) => ({ ...g, count: g.rows.length }))
      .filter((g) => g.count > 0);
  }, [alerts, monthAttendance.data]);

  const [openAlerts, setOpenAlerts] = useState<Set<string>>(new Set());
  const toggleAlert = (key: string) =>
    setOpenAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });


  const lastUpdatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "just now";

  const inNow = snapshot.total - snapshot.buckets.notStarted - snapshot.buckets.leave;

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={<span>Updated {lastUpdatedLabel}</span>}
        actions={
          <Button variant="outline" size="sm" className="rounded-xl" onClick={refreshAll} disabled={refreshing}>
            {refreshing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Refresh
          </Button>
        }
      />

      <motion.div initial="hidden" animate="visible" variants={bentoStagger} className="space-y-4 pb-20">
        {/* Overview strip — every tile reads a different facet of the day */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.loading && !stats.data ? (
            <TileSkeleton className="col-span-2 lg:col-span-1" />
          ) : (
            <HeroTile
              label="Headcount today"
              value={stats.data?.totalEmployees ?? "—"}
              sub="active people on the roster"
              icon={Users}
              className="col-span-2 lg:col-span-1"
            />
          )}

          {/* Checked-in tile with the attendance snapshot as one stacked bar */}
          <motion.div variants={bentoRise} className="glass flex min-h-[7.5rem] flex-col rounded-3xl p-4">
            <div className="flex h-4 items-center justify-between">
              <span className="card-label">Checked in</span>
              <Timer className="h-3.5 w-3.5 text-muted-foreground/60" />
            </div>
            <div className="flex flex-1 items-center py-1.5">
              <p className="text-[32px] font-bold leading-none tabular-nums text-foreground">
                {today.loading && !today.data ? "…" : inNow}
              </p>
              <span className="card-label ml-2">of {snapshot.total}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                {snapshot.segments.map((s) => (
                  <div
                    key={s.key}
                    className={BAR_COLORS[s.key]}
                    style={{ width: `${(s.count / snapshot.total) * 100}%` }}
                    title={`${s.count} ${s.key}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><StateDot state="office" /> {snapshot.buckets.office}</span>
                <span className="inline-flex items-center gap-1.5"><StateDot state="remote" /> {snapshot.buckets.remote}</span>
                <span className="inline-flex items-center gap-1.5"><StateDot state="pending" /> {snapshot.buckets.notStarted}</span>
                <span className="inline-flex items-center gap-1.5"><StateDot state="leave" /> {snapshot.buckets.leave}</span>
              </div>
            </div>
          </motion.div>

          {stats.loading && !stats.data ? (
            <TileSkeleton />
          ) : (
            <StatTile
              label="Avg hours today"
              value={stats.data ? `${stats.data.averageHours.toFixed(1)}h` : "—"}
              sub="across completed sessions"
              icon={Timer}
            />
          )}
          <StatTile
            label="Leave pending"
            value={pendingLeave.loading && !pendingLeave.data ? "…" : pendingLeave.data?.leaveRequests.length ?? 0}
            sub={alerts.stuckLeaves.length ? `${alerts.stuckLeaves.length} stuck >3 days` : "awaiting your call"}
            footer={
              <Chip tone={pendingLeave.data?.leaveRequests.length ? "warning" : "neutral"}>
                Queue
              </Chip>
            }
          />
        </div>

        {/* Alerts + team pulse + birthdays */}
        <div className="grid gap-5 lg:grid-cols-3">
          <SectionCard label="Alerts" className="min-h-[16rem]" action={<ShieldAlert className="h-3.5 w-3.5 text-muted-foreground/60" />}>
            {alertGroups.length === 0 ? (
              <AllClear />
            ) : (
              <div className="space-y-4">
                {alertGroups.slice(0, 3).map((group) => (
                  <AlertBlock
                    key={group.key}
                    group={group}
                    open={openAlerts.has(group.key)}
                    onToggle={() => toggleAlert(group.key)}
                  />
                ))}
                {alertGroups.length > 3 ? (
                  <p className="text-xs text-muted-foreground">+{alertGroups.length - 3} more alert types</p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <TeamPulseCard leaderboard={leaderboard} />

          <SectionCard label="Birthdays" className="min-h-[8rem]" action={<Cake className="h-3.5 w-3.5 text-muted-foreground/60" />}>
            {birthdays.loading && !birthdays.data ? (
              <RowListSkeleton rows={3} />
            ) : (birthdays.data?.birthdays.length ?? 0) === 0 ? (
              <EmptyList text="None in the next 30 days." />
            ) : (
              <ul className="divide-y divide-border/40">
                {birthdays.data!.birthdays.map((b) => (
                  <li key={`${b.name}-${b.date}`} className="flex items-center gap-2.5 py-2.5 text-[15px]">
                    <span className="truncate font-medium text-foreground">{b.name}</span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{b.date}</span>
                    <Chip tone={b.inDays === 0 ? "success" : "neutral"}>
                      {b.inDays === 0 ? "Today" : b.inDays === 1 ? "Tomorrow" : `in ${b.inDays}d`}
                    </Chip>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Holiday calendar — read-only view; adds, templates and deletes live in Settings */}
        <div className="grid gap-5 lg:grid-cols-2">
          <HolidaysCard holidays={holidays} />
          <UpcomingHolidaysCard holidays={holidays} />
        </div>

      </motion.div>

    </>
  );
}

// ---------------------------------------------------------------------------
// Alerts building blocks
// ---------------------------------------------------------------------------

interface AlertRow {
  id: string;
  name: string;
  meta: string;
}

interface AlertGroupData {
  key: string;
  label: string;
  count: number;
  rows: AlertRow[];
}

/** One alert category: circle count, 2-row preview, accordion for the rest. */
function AlertBlock({
  group,
  open,
  onToggle,
}: {
  group: AlertGroupData;
  open: boolean;
  onToggle: () => void;
}) {
  const expandable = group.count > 2;
  const visible = open ? group.rows : group.rows.slice(0, 2);

  return (
    <div>
      <button
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        className={cn(
          "mb-1 flex h-7 w-full items-center justify-between gap-2 text-left",
          expandable && "cursor-pointer"
        )}
        aria-expanded={open}
      >
        <span className="text-[13px] font-medium text-foreground/80">{group.label}</span>
        <span className="flex items-center gap-1.5">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-red-500/10 text-[12px] font-bold tabular-nums text-red-600 dark:text-red-400">
            {group.count}
          </span>
          {expandable ? (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          ) : null}
        </span>
      </button>
      <ul className="divide-y divide-border/40">
        {visible.map((row) => (
          <li key={row.id} className="flex items-center gap-2.5 py-2.5 text-[15px]">
            <StateDot state="pending" />
            <span className="truncate text-foreground/90">{row.name}</span>
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{row.meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AllClear() {
  return (
    <div className="flex items-center gap-2.5 py-2.5 text-[15px] text-muted-foreground">
      <StateDot state="success" />
      All clear
    </div>
  );
}

function EmptyList({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 text-[15px] text-muted-foreground">
      <StateDot state="pending" />
      {text}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team pulse — dashboard widget, two ranked lists
// ---------------------------------------------------------------------------

function TeamPulseCard({ leaderboard }: { leaderboard: ReturnType<typeof useLeaderboard> }) {
  const streaks = leaderboard.data?.topByStreak ?? [];
  const scores = leaderboard.data?.topByDeepScore ?? [];

  return (
    <SectionCard label="Team pulse" className="min-h-[8rem]" action={<Flame className="h-3.5 w-3.5 text-amber-500" />}>
      {leaderboard.error ? (
        <EmptyList text={`Couldn't load — ${leaderboard.error}`} />
      ) : leaderboard.loading && !leaderboard.data ? (
        <RowListSkeleton rows={4} />
      ) : streaks.length === 0 && scores.length === 0 ? (
        <EmptyList text="Streaks and Deep Scores build up as the team checks in." />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 flex h-5 items-center gap-1.5 text-xs font-medium text-foreground/80">
              <Flame className="h-3.5 w-3.5 text-amber-500" /> Streaks
            </p>
            <ol className="divide-y divide-border/40">
              {streaks.slice(0, 4).map((row) => (
                <PulseRow key={row.slug} row={row} value={`${row.streak}d`} />
              ))}
            </ol>
          </div>
          <div>
            <p className="mb-1 flex h-5 items-center gap-1.5 text-xs font-medium text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" /> Deep Score
            </p>
            <ol className="divide-y divide-border/40">
              {scores.slice(0, 4).map((row) => (
                <PulseRow key={row.slug} row={row} value={`${row.score}`} />
              ))}
            </ol>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function PulseRow({ row, value }: { row: LeaderboardRow; value: string }) {
  return (
    <li className="flex items-center gap-2 py-2.5 text-[15px]">
      <span className="w-3.5 text-right font-mono text-[10px] tabular-nums text-muted-foreground/70">
        {row.rank}
      </span>
      <span className="truncate text-foreground/90">{row.name}</span>
      <span className="ml-auto shrink-0 font-semibold tabular-nums text-foreground">{value}</span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Holidays — read-only calendar + upcoming list; edits live in Settings
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Month calendar of configured holidays. No click targets — Settings mutates. */
function HolidaysCard({ holidays }: { holidays: ReturnType<typeof useHolidays> }) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });

  const byDate = useMemo(
    () => new Map((holidays.data?.holidays ?? []).map((h) => [h.date, h])),
    [holidays.data]
  );
  const monthCount = (holidays.data?.holidays ?? []).filter(
    (h) => h.date.startsWith(`${cursor.year}-${pad2(cursor.month)}`)
  ).length;

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
  };

  const dayState = (key: string) => {
    const holiday = byDate.get(key);
    return holiday
      ? { className: "bg-violet-500/10 text-foreground/80", dot: "holiday" as const, title: holiday.name }
      : undefined;
  };

  return (
    <SectionCard label="Holidays" action={<CalendarHeart className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-32 text-center text-sm font-semibold text-foreground">{monthLabel}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">{monthCount} this month</span>
      </div>

      {holidays.loading && !holidays.data ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
      ) : (
        <>
          <MonthGrid year={cursor.year} month={cursor.month} dayState={dayState} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <MonthGridLegend items={[{ dot: "holiday", label: "Holiday" }]} />
            <span className="text-xs text-muted-foreground">Read-only — manage in Settings.</span>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/** Next four configured holidays from today (IST) onward, birthday-row styling. */
function UpcomingHolidaysCard({ holidays }: { holidays: ReturnType<typeof useHolidays> }) {
  const upcoming = useMemo(() => {
    const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayMs = new Date(`${todayKey}T00:00:00`).getTime();
    return (holidays.data?.holidays ?? [])
      .filter((h) => h.date >= todayKey)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4)
      .map((h) => ({
        ...h,
        inDays: Math.round((new Date(`${h.date}T00:00:00`).getTime() - todayMs) / 86400000),
      }));
  }, [holidays.data]);

  return (
    <SectionCard label="Upcoming" action={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      {holidays.loading && !holidays.data ? (
        <RowListSkeleton rows={4} />
      ) : upcoming.length === 0 ? (
        <EmptyList text="No upcoming holidays on the calendar." />
      ) : (
        <ul className="divide-y divide-border/40">
          {upcoming.map((h) => (
            <li key={h.id} className="flex items-center gap-2.5 py-2.5 text-[15px]">
              <span className="truncate font-medium text-foreground">{h.name}</span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {new Date(`${h.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
              <Chip tone={h.inDays === 0 ? "success" : "neutral"}>
                {h.inDays === 0 ? "Today" : h.inDays === 1 ? "Tomorrow" : `in ${h.inDays}d`}
              </Chip>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
