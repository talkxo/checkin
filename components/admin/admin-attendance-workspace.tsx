"use client";

import { useMemo } from "react";
import { ArrowUpDown, Download, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatTile } from "./stat-tile";
import type { EmployeeSummary, TeamSummary } from "./types";

type AttendanceStatusFilter = "all" | "active" | "attention" | "missing";
type AttendanceModeFilter = "all" | "office" | "remote";

interface AdminAttendanceWorkspaceProps {
  teamSummary: TeamSummary | null;
  employees: EmployeeSummary[];
  filteredEmployees: EmployeeSummary[];
  loading: boolean;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter: AttendanceStatusFilter;
  onStatusFilterChange: (value: AttendanceStatusFilter) => void;
  modeFilter: AttendanceModeFilter;
  onModeFilterChange: (value: AttendanceModeFilter) => void;
  dateRange: { startDate: string; endDate: string; preset: string };
  onDateRangePresetChange: (preset: string) => void;
  onDateChange: (field: "startDate" | "endDate", value: string) => void;
  sortConfig: { key: string; direction: "asc" | "desc" };
  onSort: (key: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  onOpenEmployee: (employee: EmployeeSummary) => void;
  lastUpdatedLabel: string;
}

const statusChips: Array<{ id: AttendanceStatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "attention", label: "Late / Needs Review" },
  { id: "active", label: "Active Sessions" },
  { id: "missing", label: "No Attendance" },
];

const modeChips: Array<{ id: AttendanceModeFilter; label: string }> = [
  { id: "all", label: "All Modes" },
  { id: "office", label: "Office" },
  { id: "remote", label: "Remote" },
];

export function AdminAttendanceWorkspace({
  teamSummary,
  employees,
  filteredEmployees,
  loading,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  modeFilter,
  onModeFilterChange,
  dateRange,
  onDateRangePresetChange,
  onDateChange,
  sortConfig,
  onSort,
  onRefresh,
  onExport,
  onOpenEmployee,
  lastUpdatedLabel,
}: AdminAttendanceWorkspaceProps) {
  // Summary numbers reflect the CURRENT filter, not just the range
  const summaryStats = useMemo(() => {
    const count = filteredEmployees.length || 1;
    const attendance = Math.round(
      filteredEmployees.reduce((sum, e) => sum + e.attendanceRate, 0) / count
    );
    const avgHours = Math.round(
      (filteredEmployees.reduce((sum, e) => sum + e.averageHoursPerDay, 0) / count) * 10
    ) / 10;
    const hours = Math.round(filteredEmployees.reduce((sum, e) => sum + e.totalHours, 0) * 10) / 10;
    return { people: filteredEmployees.length, attendance, avgHours, hours };
  }, [filteredEmployees]);

  return (
    <div className="space-y-5">
      {/* Filter toolbar — compact, one line, sits with the list it filters */}
      <section className="glass-strong sticky top-[88px] z-10 rounded-2xl px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder="Search employees"
              className="h-9 rounded-lg bg-background/70 pl-9"
            />
          </div>

          <Select value={dateRange.preset} onValueChange={(v) => { if (v !== "custom") onDateRangePresetChange(v); }}>
            <SelectTrigger className="h-9 w-[150px] rounded-lg bg-background/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="currentMonth">This Month</SelectItem>
              <SelectItem value="previousMonth">Previous Month</SelectItem>
              <SelectItem value="last7Days">Last 7 Days</SelectItem>
              <SelectItem value="last30Days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom range…</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as any)}>
            <SelectTrigger className="h-9 w-[170px] rounded-lg bg-background/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              {statusChips.map((chip) => (
                <SelectItem key={chip.id} value={chip.id}>{chip.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={modeFilter} onValueChange={(v) => onModeFilterChange(v as any)}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg bg-background/70"><SelectValue /></SelectTrigger>
            <SelectContent>
              {modeChips.map((chip) => (
                <SelectItem key={chip.id} value={chip.id}>{chip.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {dateRange.preset === "custom" ? (
            <div className="flex items-center gap-1.5">
              <Input type="date" value={dateRange.startDate} onChange={(event) => onDateChange("startDate", event.target.value)} className="h-9 w-[140px] rounded-lg bg-background/70" />
              <span className="text-xs text-muted-foreground">→</span>
              <Input type="date" value={dateRange.endDate} onChange={(event) => onDateChange("endDate", event.target.value)} className="h-9 w-[140px] rounded-lg bg-background/70" />
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">{dateRange.startDate} → {dateRange.endDate}</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-lg">
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={onExport} className="rounded-lg">
              <Download className="mr-2 h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </div>
      </section>

      {/* Summary — computed live from the filtered roster */}
      <section className="grid gap-3 md:grid-cols-4">
        <StatTile label="People" value={summaryStats.people} helper={`${employees.length} in range`} icon={SlidersHorizontal} />
        <StatTile label="Avg attendance" value={`${summaryStats.attendance}%`} helper="Across matching people" icon={SlidersHorizontal} tone="accent" />
        <StatTile label="Avg hours / day" value={summaryStats.avgHours} helper="Per matching person" icon={SlidersHorizontal} />
        <StatTile label="Hours logged" value={summaryStats.hours} helper="Total in range" icon={SlidersHorizontal} />
      </section>

      {/* Roster */}
      <section className="glass rounded-3xl">
        <div className="flex items-center justify-between border-b border-glass-border px-5 py-3.5">
          <p className="card-label">Employee roster</p>
          <span className="text-xs text-muted-foreground">{filteredEmployees.length} matching</span>
        </div>

        {filteredEmployees.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-glass-border bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    ["name", "Employee"],
                    ["attendanceRate", "Attendance"],
                    ["daysPresent", "Present"],
                    ["missedDays", "Missed"],
                    ["officeDays", "Office"],
                    ["remoteDays", "Remote"],
                    ["averageHoursPerDay", "Avg hours / day"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-5 py-2.5 font-medium">
                      <button onClick={() => onSort(key)} className="flex items-center gap-1.5">
                        {label}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filteredEmployees.map((employee) => {
                  const latestSession = employee.sessions[employee.sessions.length - 1];
                  const initials = employee.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("");
                  return (
                    <tr
                      key={employee.employee_id}
                      className="cursor-pointer transition-colors hover:bg-muted/20"
                      onClick={() => onOpenEmployee(employee)}
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-[11px] font-semibold text-white">
                            {initials}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">{employee.name}</span>
                            {latestSession ? (
                              <span className="text-xs text-muted-foreground">
                                {latestSession.status}
                                {latestSession.mode ? ` · ${latestSession.mode}` : ""}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No sessions</span>
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-muted">
                            <span
                              className={`block h-full rounded-full ${employee.attendanceRate >= 75 ? "bg-success-500" : employee.attendanceRate >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                              style={{ width: `${Math.min(100, employee.attendanceRate)}%` }}
                            />
                          </span>
                          <span className="tabular-nums text-muted-foreground">{employee.attendanceRate}%</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-foreground">{employee.daysPresent}<span className="text-muted-foreground">/{employee.elapsedWorkingDays}</span></td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{employee.missedDays}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{employee.officeDays}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{employee.remoteDays}</td>
                      <td className="px-5 py-3 tabular-nums text-muted-foreground">{employee.averageHoursPerDay}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState
              title="No matching attendance records"
              description="Try another date range, search term, or filter."
            />
          </div>
        )}
      </section>
    </div>
  );
}
