"use client";

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
  return (
    <div className="space-y-5">
      {/* Summary — big numbers, restored to their stage */}
      <section className="grid gap-3 md:grid-cols-4">
        <StatTile label="People" value={teamSummary?.totalEmployees ?? employees.length} helper="In current range" icon={SlidersHorizontal} />
        <StatTile label="Attendance" value={`${teamSummary?.averageAttendanceRate ?? 0}%`} helper="Team average" icon={SlidersHorizontal} tone="accent" />
        <StatTile label="Hours Logged" value={teamSummary?.totalHours ?? 0} helper="Across all sessions" icon={SlidersHorizontal} />
        <StatTile label="Working Days" value={teamSummary?.totalWorkingDays ?? 0} helper="In current range" icon={SlidersHorizontal} />
      </section>

      {/* Filter builder */}
      <section className="glass-strong sticky top-[88px] z-10 rounded-3xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Attendance Analysis</h2>
              <p className="text-sm text-muted-foreground">{filteredEmployees.length} of {employees.length} matching · updated {lastUpdatedLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={onRefresh} className="rounded-xl">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={onExport} className="rounded-xl">
                <Download className="mr-2 h-4 w-4" />
                Export Current View
              </Button>
            </div>
          </div>

          {/* Structured filters: one row, labeled fields */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_repeat(4, minmax(0,1fr))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search employees"
                className="h-10 rounded-xl bg-background/70 pl-9"
              />
            </div>

            <div className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Range</span>
              <Select value={dateRange.preset} onValueChange={(v) => { if (v !== "custom") onDateRangePresetChange(v); }}>
                <SelectTrigger className="h-10 rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="currentMonth">This Month</SelectItem>
                  <SelectItem value="previousMonth">Previous Month</SelectItem>
                  <SelectItem value="last7Days">Last 7 Days</SelectItem>
                  <SelectItem value="last30Days">Last 30 Days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Status</span>
              <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as any)}>
                <SelectTrigger className="h-10 rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusChips.map((chip) => (
                    <SelectItem key={chip.id} value={chip.id}>{chip.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Mode</span>
              <Select value={modeFilter} onValueChange={(v) => onModeFilterChange(v as any)}>
                <SelectTrigger className="h-10 rounded-xl bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {modeChips.map((chip) => (
                    <SelectItem key={chip.id} value={chip.id}>{chip.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dates {dateRange.preset === "custom" ? "" : "(custom only)"}</span>
              {dateRange.preset === "custom" ? (
                <div className="flex gap-2">
                  <Input type="date" value={dateRange.startDate} onChange={(event) => onDateChange("startDate", event.target.value)} className="h-10 rounded-xl bg-background/70" />
                  <Input type="date" value={dateRange.endDate} onChange={(event) => onDateChange("endDate", event.target.value)} className="h-10 rounded-xl bg-background/70" />
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-xl border border-dashed border-glass-border px-3 text-xs text-muted-foreground/60">
                  {dateRange.startDate} → {dateRange.endDate}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl">
        <div className="flex items-center justify-between border-b border-glass-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Employee Roster</h3>
            <p className="text-sm text-muted-foreground">{filteredEmployees.length} matching employees</p>
          </div>
        </div>

        {filteredEmployees.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-glass-border bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  {[
                    ["name", "Employee"],
                    ["attendanceRate", "Attendance"],
                    ["daysPresent", "Days"],
                    ["missedDays", "Missed"],
                    ["averageHoursPerDay", "Avg / Day"],
                    ["remoteDays", "Remote"],
                    ["officeDays", "Office"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-5 py-3 font-medium">
                      <button onClick={() => onSort(key)} className="flex items-center gap-1.5">
                        {label}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {filteredEmployees.map((employee) => {
                  const latestSession = employee.sessions[employee.sessions.length - 1];
                  return (
                    <tr
                      key={employee.employee_id}
                      className="cursor-pointer transition-colors hover:bg-muted/20"
                      onClick={() => onOpenEmployee(employee)}
                    >
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-foreground">{employee.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {latestSession ? (
                              <Badge variant={latestSession.status === "Active" ? "default" : "secondary"}>
                                {latestSession.status}
                              </Badge>
                            ) : (
                              <Badge variant="outline">No sessions</Badge>
                            )}
                            {latestSession?.mode ? <Badge variant="outline">{latestSession.mode}</Badge> : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium [font-variant-numeric:tabular-nums]">{employee.attendanceRate}%</td>
                      <td className="px-5 py-4 [font-variant-numeric:tabular-nums]">{employee.daysPresent}/{employee.elapsedWorkingDays}</td>
                      <td className="px-5 py-4 [font-variant-numeric:tabular-nums]">{employee.missedDays}</td>
                      <td className="px-5 py-4 [font-variant-numeric:tabular-nums]">{employee.averageHoursPerDay}</td>
                      <td className="px-5 py-4 [font-variant-numeric:tabular-nums]">{employee.remoteDays}</td>
                      <td className="px-5 py-4 [font-variant-numeric:tabular-nums]">{employee.officeDays}</td>
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
              description="Try another date range, search term, or filter chip."
            />
          </div>
        )}
      </section>
    </div>
  );
}
