"use client";

import { Activity, ArrowRight, RefreshCw, TriangleAlert, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "./stat-tile";
import { formatISTTimeShort } from "@/lib/time";
import type { AdminStats, TodayData } from "./types";

const ADMIN_LATE_CUTOFF_MINUTES = 630;

interface AdminOverviewWorkspaceProps {
  stats: AdminStats | null;
  todayData: TodayData[];
  pendingLeaveCount: number;
  lastUpdatedLabel: string;
  loading?: boolean;
  onRefresh: () => void;
  onOpenAttendance: (filters?: { status?: "all" | "active" | "attention" | "missing"; mode?: "all" | "office" | "remote" }) => void;
  onOpenLeave: () => void;
}

export function AdminOverviewWorkspace({
  stats,
  todayData,
  pendingLeaveCount,
  lastUpdatedLabel,
  loading = false,
  onRefresh,
  onOpenAttendance,
  onOpenLeave,
}: AdminOverviewWorkspaceProps) {
  const lateArrivals = todayData.filter((person) => {
    const [hour, minute] = person.firstIn.split(":").map(Number);
    return !Number.isNaN(hour) && hour * 60 + minute >= ADMIN_LATE_CUTOFF_MINUTES;
  }).length;
  const activeNow = todayData.filter((person) => person.status === "Active").length;
  const missing = todayData.filter((person) => person.status === "Not Started").length;

  const attentionCards = [
    {
      label: "Late Arrivals",
      count: lateArrivals,
      description: "Employees who checked in after 10:30 IST.",
      action: () => onOpenAttendance({ status: "attention" }),
    },
    {
      label: "Active Sessions",
      count: activeNow,
      description: "Employees currently checked in.",
      action: () => onOpenAttendance({ status: "active" }),
    },
    {
      label: "Missing Check-ins",
      count: missing,
      description: "Employees who have not started today.",
      action: () => onOpenAttendance({ status: "missing" }),
    },
  ];

  const officeNow = todayData.filter((person) => person.mode === "office" && person.status !== "Not Started");
  const remoteNow = todayData.filter((person) => person.mode === "remote" && person.status !== "Not Started");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/50 bg-card px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Needs Attention</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Run the team from one glance</h2>
            <p className="mt-1 text-sm text-muted-foreground">Last refreshed {lastUpdatedLabel}. Prioritize issues first, then move into drill-down.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh} className="rounded-xl">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button onClick={onOpenLeave} className="rounded-xl">
              Review Leave
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {attentionCards.map((card) => (
            <button
              key={card.label}
              onClick={card.action}
              className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{card.label}</p>
                <span className="text-xl font-semibold [font-variant-numeric:tabular-nums]">{card.count}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <StatTile label="Active Today" value={stats?.activeToday ?? 0} helper="Sessions started today" icon={Activity} tone="accent" />
        <StatTile label="Office Today" value={stats?.officeCount ?? 0} helper="In-person check-ins" icon={Users} />
        <StatTile label="Remote Today" value={stats?.remoteCount ?? 0} helper="Remote check-ins" icon={Users} />
        <StatTile label="Pending Leave" value={pendingLeaveCount} helper="Requests awaiting action" icon={TriangleAlert} tone={pendingLeaveCount > 0 ? "warning" : "default"} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border/50 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Today&apos;s Roster</h3>
              <p className="text-sm text-muted-foreground">Quickly scan who is active, late, remote, or missing.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full">Office {officeNow.length}</Badge>
              <Badge variant="secondary" className="rounded-full">Remote {remoteNow.length}</Badge>
            </div>
          </div>
          {todayData.length ? (
            <div className="divide-y divide-border/50">
              {todayData.slice(0, 8).map((person) => (
                <button
                  key={`${person.name}-${person.firstIn}`}
                  onClick={() => onOpenAttendance({ mode: person.mode === "remote" ? "remote" : person.mode === "office" ? "office" : "all" })}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
                      <Badge variant={person.status === "Active" ? "default" : person.status === "Not Started" ? "outline" : "secondary"}>
                        {person.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {person.mode === "remote" ? "Remote" : person.mode === "office" ? "Office" : "Unassigned"} · First in {person.firstIn}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground [font-variant-numeric:tabular-nums]">{person.totalHours}</p>
                    <p className="text-xs text-muted-foreground">{person.lastOut !== "N/A" ? `Last out ${person.lastOut}` : "Still active"}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5">
              <EmptyState title="No roster data yet" description="Refresh after the first check-ins land today." />
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/50 bg-card px-5 py-4">
          <h3 className="text-lg font-semibold text-foreground">Operational Mix</h3>
          <p className="mt-1 text-sm text-muted-foreground">Keep the team balanced across office, remote, and follow-ups.</p>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Office Coverage</span>
                <span className="font-medium text-foreground">{stats?.officeCount ?? 0} people</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${stats?.activeToday ? ((stats.officeCount / stats.activeToday) * 100).toFixed(0) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Remote Coverage</span>
                <span className="font-medium text-foreground">{stats?.remoteCount ?? 0} people</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-sky-500"
                  style={{
                    width: `${stats?.activeToday ? ((stats.remoteCount / stats.activeToday) * 100).toFixed(0) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operator Note</p>
              <p className="mt-2 text-sm text-foreground">
                {missing > 0
                  ? `${missing} people still have no check-in. Review missed starts before end of day.`
                  : `No missed starts right now. Focus on active sessions and leave follow-ups.`}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Snapshot generated at {formatISTTimeShort(new Date())}
              </p>
            </div>

            {pendingLeaveCount > 0 ? (
              <button
                onClick={onOpenLeave}
                className="flex w-full items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left transition-colors hover:bg-amber-500/15"
              >
                <div className="flex items-start gap-3">
                  <UserMinus className="mt-0.5 h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pending leave approvals</p>
                    <p className="text-sm text-muted-foreground">{pendingLeaveCount} request{pendingLeaveCount > 1 ? "s" : ""} need a decision.</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
