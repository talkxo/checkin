"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, StatTile, Chip, bentoStagger } from "./ui/bento";
import { DataTable } from "./ui/data-table";
import { InitialsAvatar } from "./ui/avatar";
import { SegmentedControl } from "./ui/segmented";
import { MonthGrid, MonthGridLegend } from "./ui/month-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { useAttendanceReport, useLeaveRequests } from "./data";
import type { EmployeeSummary } from "./types";
import { motion } from "framer-motion";

type ViewTab = "daily" | "monthly" | "signals";
type StatusFilter = "all" | "active" | "attention" | "missing";

const LATE_CUTOFF_MINUTES = 630; // 10:30 IST — same rule the legacy panel applies
const IST = "Asia/Kolkata";

function istDateKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: IST });
}

function computePresets(): Array<{ label: string; value: string }> {
  return [
    { label: "Today", value: "today" },
    { label: "Yesterday", value: "yesterday" },
    { label: "This week", value: "thisWeek" },
    { label: "Current month", value: "currentMonth" },
    { label: "Previous month", value: "previousMonth" },
    { label: "Last 7 days", value: "last7Days" },
    { label: "Last 30 days", value: "last30Days" },
    { label: "Custom", value: "custom" },
  ];
}

function presetToRange(preset: string, current: { startDate: string; endDate: string }) {
  const now = new Date();
  const todayKey = istDateKey(now);
  const [year, month] = todayKey.split("-").map(Number);
  const todayIST = new Date(`${todayKey}T12:00:00+05:30`);
  const range = { startDate: "", endDate: "" };

  switch (preset) {
    case "today":
      range.startDate = todayKey;
      range.endDate = todayKey;
      break;
    case "yesterday": {
      const y = new Date(todayIST);
      y.setDate(y.getDate() - 1);
      range.startDate = istDateKey(new Date(y.toLocaleString("en-US", { timeZone: IST })));
      range.endDate = range.startDate;
      break;
    }
    case "thisWeek": {
      const ws = new Date(todayIST);
      const dow = ws.getDay();
      ws.setDate(ws.getDate() + (dow === 0 ? -6 : 1 - dow));
      range.startDate = istDateKey(new Date(ws.toLocaleString("en-US", { timeZone: IST })));
      range.endDate = todayKey;
      break;
    }
    case "currentMonth":
      range.startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      range.endDate = todayKey;
      break;
    case "previousMonth": {
      const first = new Date(Date.UTC(year, month - 2, 1));
      const last = new Date(Date.UTC(year, month - 1, 0));
      range.startDate = first.toISOString().slice(0, 10);
      range.endDate = last.toISOString().slice(0, 10);
      break;
    }
    case "last7Days":
      range.startDate = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      range.endDate = todayKey;
      break;
    case "last30Days":
      range.startDate = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      range.endDate = todayKey;
      break;
    default:
      return current;
  }
  return range;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return -1;
  return h * 60 + (m || 0);
}

interface Flag {
  person: string;
  slug: string;
  signal: "Late" | "No punch" | "Attention";
  detail: string;
  date: string;
}

export function AttendanceWorkspace() {
  const todayKey = istDateKey(new Date());
  const [preset, setPreset] = useState("currentMonth");
  const [range, setRange] = useState(() => presetToRange("currentMonth", { startDate: "", endDate: "" }));
  const [tab, setTab] = useState<ViewTab>("daily");

  const report = useAttendanceReport(range.startDate, range.endDate);
  const approvedLeaves = useLeaveRequests("approved");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Monthly tab state
  const [monthCursor, setMonthCursor] = useState(() => {
    const [y, m] = todayKey.split("-").map(Number);
    return { year: y, month: m };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const monthRange = useMemo(() => {
    const last = new Date(Date.UTC(monthCursor.year, monthCursor.month, 0)).getUTCDate();
    return {
      startDate: `${monthCursor.year}-${String(monthCursor.month).padStart(2, "0")}-01`,
      endDate: `${monthCursor.year}-${String(monthCursor.month).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
    };
  }, [monthCursor]);
  const monthReport = useAttendanceReport(monthRange.startDate, monthRange.endDate);

  const employees = report.data?.employeeSummaries ?? [];
  const team = report.data?.teamSummary ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (q && !emp.name.toLowerCase().includes(q)) return false;
      const hasActive = emp.sessions.some((s) => s.status === "Active");
      const hasLate = emp.sessions.some((s) => toMinutes(s.checkinTime) >= LATE_CUTOFF_MINUTES);
      const needsAttention =
        emp.elapsedWorkingDays >= 3
          ? emp.missedDays >= 2 || emp.attendanceRate < 75
          : emp.missedDays >= 1;
      if (statusFilter === "active" && !hasActive) return false;
      if (statusFilter === "attention" && !(hasLate || needsAttention)) return false;
      if (statusFilter === "missing" && !(emp.daysPresent === 0 && emp.missedDays > 0)) return false;
      return true;
    });
  }, [employees, search, statusFilter]);

  const columns = useMemo<ColumnDef<EmployeeSummary, any>[]>(() => {
    const activeNow = new Set(
      employees.filter((e) => e.sessions.some((s) => s.status === "Active")).map((e) => e.slug)
    );
    return [
      {
        accessorKey: "name",
        header: "Person",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <InitialsAvatar name={row.original.name} size="sm" />
            <span className="font-medium text-foreground">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "attendanceRate",
        header: "Rate",
        cell: ({ getValue }) => {
          const rate = getValue() as number;
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-brand"
                  style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                />
              </div>
              <span className="tabular-nums text-foreground/80">{rate}%</span>
            </div>
          );
        },
      },
      {
        id: "present",
        header: "Present",
        accessorFn: (row) => row.daysPresent,
        cell: ({ row }) => (
          <span className="tabular-nums text-foreground/80">
            {row.original.daysPresent}/{row.original.elapsedWorkingDays}d
          </span>
        ),
      },
      {
        accessorKey: "averageHoursPerDay",
        header: "Avg hrs",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-foreground/80">{(getValue() as number).toFixed(1)}h</span>
        ),
      },
      {
        accessorKey: "officeDays",
        header: "Office",
        cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{getValue() as number}</span>,
      },
      {
        accessorKey: "remoteDays",
        header: "Remote",
        cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{getValue() as number}</span>,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const emp = row.original;
          if (activeNow.has(emp.slug)) return <Chip tone="success">Active now</Chip>;
          const hasLate = emp.sessions.some((s) => toMinutes(s.checkinTime) >= LATE_CUTOFF_MINUTES);
          if (emp.daysPresent === 0 && emp.missedDays > 0) return <Chip tone="danger">No punches</Chip>;
          if (hasLate) return <Chip tone="warning">Late punch</Chip>;
          return <Chip tone="neutral">On track</Chip>;
        },
      },
    ];
  }, [employees]);

  const handleExport = () => {
    if (!filtered.length) return;
    const headers = ["Employee", "Attendance Rate", "Days Present", "Avg Hours/Day", "Office Days", "Remote Days"];
    const csv = [
      headers.join(","),
      ...filtered.map((e) =>
        [`"${e.name}"`, e.attendanceRate, e.daysPresent, e.averageHoursPerDay, e.officeDays, e.remoteDays].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `attendance-${range.startDate}-to-${range.endDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  // Signals — late punches, no-punch days, attention cases.
  const signals = useMemo(() => {
    const flags: Flag[] = [];
    for (const emp of employees) {
      for (const s of emp.sessions) {
        if (toMinutes(s.checkinTime) >= LATE_CUTOFF_MINUTES) {
          flags.push({
            person: emp.name,
            slug: emp.slug,
            signal: "Late",
            detail: `Checked in at ${s.checkinTime}`,
            date: s.date,
          });
        }
      }
      if (emp.daysPresent === 0 && emp.missedDays > 0) {
        flags.push({
          person: emp.name,
          slug: emp.slug,
          signal: "No punch",
          detail: `${emp.missedDays} working day${emp.missedDays === 1 ? "" : "s"} without a check-in`,
          date: range.endDate,
        });
      }
    }
    return flags;
  }, [employees, range.endDate]);

  const lateCount = signals.filter((f) => f.signal === "Late").length;
  const noPunchCount = signals.filter((f) => f.signal === "No punch").length;
  const attentionCount = employees.filter(
    (e) => (e.elapsedWorkingDays >= 3 ? e.missedDays >= 2 || e.attendanceRate < 75 : e.missedDays >= 1)
  ).length;

  // Monthly grid state per day
  const monthData = useMemo(() => {
    const byDay = new Map<string, { office: string[]; remote: string[] }>();
    for (const emp of monthReport.data?.employeeSummaries ?? []) {
      for (const s of emp.sessions) {
        if (!s.date.startsWith(monthRange.startDate.slice(0, 7))) continue;
        const entry = byDay.get(s.date) ?? { office: [], remote: [] };
        const list = s.mode === "remote" ? entry.remote : entry.office;
        if (!list.includes(emp.name)) list.push(emp.name);
        byDay.set(s.date, entry);
      }
    }
    // Approved leave ranges expanded into the month
    const leaveByDay = new Map<string, string[]>();
    const prefix = monthRange.startDate.slice(0, 7);
    for (const row of approvedLeaves.data?.leaveRequests ?? []) {
      let cursor = new Date(`${row.start_date}T00:00:00Z`);
      const end = new Date(`${row.end_date}T00:00:00Z`);
      while (cursor <= end) {
        const key = cursor.toISOString().slice(0, 10);
        if (key.startsWith(prefix)) {
          const list = leaveByDay.get(key) ?? [];
          const name = Array.isArray(row.employees) ? row.employees[0]?.full_name : row.employees?.full_name;
          if (name && !list.includes(name)) list.push(name);
          leaveByDay.set(key, list);
        }
        cursor = new Date(cursor.getTime() + 86400000);
      }
    }
    return { byDay, leaveByDay };
  }, [monthReport.data, approvedLeaves.data, monthRange.startDate]);

  const dayState = (key: string) => {
    const present = monthData.byDay.get(key);
    const out = monthData.leaveByDay.get(key);
    const presentCount = present ? present.office.length + present.remote.length : 0;
    const meta = presentCount || out?.length ? `${presentCount}${out?.length ? ` · ${out.length}L` : ""}` : undefined;
    return {
      meta,
      title: presentCount ? `${presentCount} checked in${out?.length ? `, ${out.length} on leave` : ""}` : undefined,
    };
  };

  const selectedPresent = selectedDay ? monthData.byDay.get(selectedDay) : null;
  const selectedLeave = selectedDay ? monthData.leaveByDay.get(selectedDay) : null;

  const monthLabel = new Date(Date.UTC(monthCursor.year, monthCursor.month - 1, 1)).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric" }
  );

  const shiftMonth = (delta: number) => {
    setMonthCursor((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
    setSelectedDay(null);
  };

  return (
    <>
      <PageHeader
        title="Attendance"
        meta={
          team ? (
            <span>
              Team rate <strong className="tabular-nums">{team.averageAttendanceRate}%</strong> ·{" "}
              {team.totalHours.toFixed(0)}h logged in range
            </span>
          ) : null
        }
        actions={
          <>
            <Select
              value={preset}
              onValueChange={(value) => {
                setPreset(value);
                if (value !== "custom") setRange(presetToRange(value, range));
              }}
            >
              <SelectTrigger className="h-9 w-40 rounded-xl border-border/60 text-sm">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {computePresets().map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset === "custom" ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  value={range.startDate}
                  onChange={(e) => setRange((p) => ({ ...p, startDate: e.target.value }))}
                  className="h-9 w-36 rounded-xl border-border/60 text-sm"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={range.endDate}
                  onChange={(e) => setRange((p) => ({ ...p, endDate: e.target.value }))}
                  className="h-9 w-36 rounded-xl border-border/60 text-sm"
                />
              </div>
            ) : null}
            <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport} disabled={!filtered.length}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as ViewTab)}
          options={[
            { value: "daily", label: "Daily log" },
            { value: "monthly", label: "Monthly" },
            { value: "signals", label: "Signals" },
          ]}
        />
      </div>

      {tab === "daily" ? (
        <SectionCard label={`Daily log · ${range.startDate} → ${range.endDate}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search person…"
              className="h-9 w-full max-w-xs rounded-xl border-border/60"
            />
            <SegmentedControl
              size="sm"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "attention", label: "Attention" },
                { value: "missing", label: "Missing" },
              ]}
            />
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            loading={report.loading}
            initialSorting={[{ id: "attendanceRate", desc: true }]}
            emptyTitle="No attendance in this range"
            emptyDescription="Widen the range or clear the filters."
          />
        </SectionCard>
      ) : null}

      {tab === "monthly" ? (
        <div className="grid gap-4 lg:grid-cols-5">
          <SectionCard
            label="Monthly view"
            className="lg:col-span-3"
            action={
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-28 text-center text-sm font-medium text-foreground">{monthLabel}</span>
                <Button variant="ghost" size="sm" className="h-7 w-7 rounded-lg p-0" onClick={() => shiftMonth(1)} aria-label="Next month">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            }
          >
            {monthReport.loading && !monthReport.data ? (
              <div className="animate-pulse space-y-2">
                <div className="h-40 rounded-2xl bg-muted/60" />
              </div>
            ) : (
              <>
                <MonthGrid
                  year={monthCursor.year}
                  month={monthCursor.month}
                  dayState={dayState}
                  selected={selectedDay}
                  onDayClick={(key) => setSelectedDay(key === selectedDay ? null : key)}
                />
                <MonthGridLegend
                  className="mt-4"
                  items={[{ label: "Number in cell = checked in (· n = on leave)" }, { label: "Click a day for detail" }]}
                />
              </>
            )}
          </SectionCard>

          <SectionCard label={selectedDay ?? "Pick a day"} className="lg:col-span-2">
            {!selectedDay ? (
              <EmptyState
                title="No day selected"
                description="Click a day in the calendar to see who was in, remote, or on leave."
              />
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> In office ({selectedPresent?.office.length ?? 0})
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPresent?.office.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Remote ({selectedPresent?.remote.length ?? 0})
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPresent?.remote.join(", ") || "—"}</p>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> On leave ({selectedLeave?.length ?? 0})
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedLeave?.join(", ") || "—"}</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === "signals" ? (
        <motion.div initial="hidden" animate="visible" variants={bentoStagger} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Late punches" value={lateCount} sub={`after 10:30 am IST`} />
            <StatTile label="No-punch people" value={noPunchCount} sub="zero check-ins, days elapsed" />
            <StatTile label="Needs attention" value={attentionCount} sub="rate or misses breaching" />
          </div>

          <SectionCard
            label="Anomaly flags"
            action={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground/60" />}
          >
            <SignalTable flags={signals} loading={report.loading} />
          </SectionCard>

          <SectionCard label="Regularization queue">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Employees raising &ldquo;I forgot to punch&rdquo; requests for admin correction.
              </p>
              <Chip tone="neutral">Planned</Chip>
            </div>
          </SectionCard>
        </motion.div>
      ) : null}
    </>
  );
}

function SignalTable({ flags, loading }: { flags: Flag[]; loading: boolean }) {
  const columns = useMemo<ColumnDef<Flag, any>[]>(
    () => [
      { accessorKey: "person", header: "Person" },
      {
        accessorKey: "signal",
        header: "Signal",
        cell: ({ getValue }) => {
          const signal = getValue() as Flag["signal"];
          const tone = signal === "Late" ? "warning" : signal === "No punch" ? "danger" : "info";
          return <Chip tone={tone}>{signal}</Chip>;
        },
      },
      { accessorKey: "detail", header: "Detail", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() as string}</span> },
      { accessorKey: "date", header: "Date", cell: ({ getValue }) => <span className="tabular-nums text-muted-foreground">{getValue() as string}</span> },
    ],
    []
  );
  return (
    <DataTable
      columns={columns}
      data={flags}
      loading={loading}
      initialSorting={[{ id: "date", desc: true }]}
      emptyTitle="No anomalies in this range"
      emptyDescription="Late punches and missing check-ins will be flagged here."
    />
  );
}
