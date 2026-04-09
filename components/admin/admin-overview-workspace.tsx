"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, RefreshCw, TriangleAlert, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "./stat-tile";
import { formatISTDateKey, formatISTTimeShort, getMondayOfWeek } from "@/lib/time";
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

type MoodRange = "week" | "month";
type MoodBucket = "positive" | "neutral" | "low" | "unknown";

interface TeamPlanEntry {
  employee_id: string;
  wfh_days?: string[];
  employees?: { full_name?: string | null; slug?: string | null } | Array<{ full_name?: string | null; slug?: string | null }>;
}

interface MoodDataEntry {
  mood?: string | null;
}

interface LeaveRequestEntry {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
  employees?: { full_name?: string | null } | Array<{ full_name?: string | null }>;
  leave_types?: { name?: string | null } | Array<{ name?: string | null }>;
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const WIDGET_TITLE_CLASS = "text-xs font-semibold uppercase tracking-[0.2em] leading-none text-primary";

const bucketLabelMap: Record<MoodBucket, string> = {
  positive: "Positive",
  neutral: "Neutral",
  low: "Low",
  unknown: "Unclear",
};

const bucketColorMap: Record<MoodBucket, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-sky-500",
  low: "bg-amber-500",
  unknown: "bg-muted-foreground",
};

function normalizeMoodBucket(moodValue: string | null | undefined): MoodBucket {
  const value = (moodValue || "").toLowerCase();
  if (!value) return "unknown";
  if (["great", "good", "happy", "excellent", "energized", "productive"].some((term) => value.includes(term))) return "positive";
  if (["ok", "okay", "neutral", "fine", "normal"].some((term) => value.includes(term))) return "neutral";
  if (["bad", "sad", "stressed", "tired", "exhausted", "low", "angry"].some((term) => value.includes(term))) return "low";
  return "unknown";
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
  const [teamPlanLoading, setTeamPlanLoading] = useState(false);
  const [teamPlanEntries, setTeamPlanEntries] = useState<TeamPlanEntry[]>([]);
  const [moodRange, setMoodRange] = useState<MoodRange>("week");
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodEntries, setMoodEntries] = useState<MoodDataEntry[]>([]);
  const [activeMoodBucket, setActiveMoodBucket] = useState<MoodBucket>("positive");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [announcementFeedback, setAnnouncementFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [announcementPreview, setAnnouncementPreview] = useState("");
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRequestEntry[]>([]);
  const [upcomingLeavesLoading, setUpcomingLeavesLoading] = useState(false);

  useEffect(() => {
    const loadTeamPlan = async () => {
      setTeamPlanLoading(true);
      try {
        const weekStart = getMondayOfWeek(new Date());
        const response = await fetch(`/api/wfh-schedule?week=${weekStart}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load team plan.");
        setTeamPlanEntries(Array.isArray(payload?.data) ? payload.data : []);
      } catch {
        setTeamPlanEntries([]);
      } finally {
        setTeamPlanLoading(false);
      }
    };

    loadTeamPlan();
  }, []);

  useEffect(() => {
    const loadMoodData = async () => {
      setMoodLoading(true);
      try {
        const response = await fetch(`/api/admin/mood-data?range=${moodRange}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load mood data.");
        setMoodEntries(Array.isArray(payload?.moodData) ? payload.moodData : []);
      } catch {
        setMoodEntries([]);
      } finally {
        setMoodLoading(false);
      }
    };

    loadMoodData();
  }, [moodRange]);

  useEffect(() => {
    const loadUpcomingLeaves = async () => {
      setUpcomingLeavesLoading(true);
      try {
        const response = await fetch("/api/admin/leave-requests?status=approved");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Could not load leave requests.");

        const todayKey = formatISTDateKey(new Date());
        const filtered = (Array.isArray(payload?.leaveRequests) ? payload.leaveRequests : [])
          .filter((leave: LeaveRequestEntry) => leave.end_date >= todayKey)
          .sort((a: LeaveRequestEntry, b: LeaveRequestEntry) => a.start_date.localeCompare(b.start_date))
          .slice(0, 5);

        setUpcomingLeaves(filtered);
      } catch {
        setUpcomingLeaves([]);
      } finally {
        setUpcomingLeavesLoading(false);
      }
    };

    loadUpcomingLeaves();
  }, []);

  const moodStats = useMemo(() => {
    const base: Record<MoodBucket, number> = { positive: 0, neutral: 0, low: 0, unknown: 0 };
    for (const mood of moodEntries) {
      base[normalizeMoodBucket(mood.mood)] += 1;
    }
    const total = moodEntries.length;
    return {
      total,
      rows: (Object.keys(base) as MoodBucket[]).map((bucket) => ({
        bucket,
        label: bucketLabelMap[bucket],
        count: base[bucket],
        pct: total ? Math.round((base[bucket] / total) * 100) : 0,
      })),
    };
  }, [moodEntries]);

  const activeMoodStat = useMemo(() => {
    const fallback = moodStats.rows[0];
    return moodStats.rows.find((row) => row.bucket === activeMoodBucket) || fallback;
  }, [activeMoodBucket, moodStats.rows]);

  const todayKey = useMemo(() => formatISTDateKey(new Date()), []);

  const handleSendAnnouncement = async () => {
    setAnnouncementFeedback(null);
    setAnnouncementPreview("");
    const content = announcementDraft.trim();

    if (!content) {
      setAnnouncementFeedback({ type: "error", message: "Write an announcement before sending." });
      return;
    }

    setIsSendingAnnouncement(true);
    try {
      const response = await fetch("/api/admin/basecamp-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Failed to send announcement.");

      setAnnouncementPreview(payload?.formattedMessage || "");
      setAnnouncementFeedback({ type: "success", message: "Announcement sent to Basecamp successfully." });
      setAnnouncementDraft("");
    } catch (error) {
      setAnnouncementFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Announcement failed to send.",
      });
    } finally {
      setIsSendingAnnouncement(false);
    }
  };

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
            <p className={WIDGET_TITLE_CLASS}>Glance</p>
            <p className="mt-1 text-xs text-muted-foreground">Updated {lastUpdatedLabel}</p>
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
              className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{card.label}</p>
                <span className="text-xl font-semibold [font-variant-numeric:tabular-nums]">{card.count}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
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
        <div className="rounded-3xl border border-border/50 bg-card p-5 xl:col-span-1">
          <div>
            <p className={WIDGET_TITLE_CLASS}>Team&apos;s Plan</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="max-h-[170px] space-y-2 overflow-y-auto pr-1">
              {teamPlanLoading ? (
                <p className="text-sm text-muted-foreground">Loading team plan…</p>
              ) : teamPlanEntries.length ? (
                teamPlanEntries.slice(0, 8).map((entry) => {
                  const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
                  const name = employee?.full_name?.split(" ")[0] || "Unknown";
                  return (
                    <div key={entry.employee_id} className="flex items-center gap-2">
                      <span className="w-16 truncate text-xs font-medium text-foreground">{name}</span>
                      <div className="grid flex-1 grid-cols-5 gap-1">
                        {WEEK_DAYS.map((day) => {
                          const isWFH = entry.wfh_days?.includes(day);
                          return (
                            <div key={`${entry.employee_id}-${day}`} className={`h-2 rounded-full ${isWFH ? "bg-primary" : "bg-muted"}`} />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No weekly plan submitted yet.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card p-5 xl:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className={WIDGET_TITLE_CLASS}>Team Mood</p>
            </div>
            <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
              <button
                onClick={() => setMoodRange("week")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  moodRange === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setMoodRange("month")}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  moodRange === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {moodLoading ? (
            <p className="mt-6 text-sm text-muted-foreground">Loading mood trends…</p>
          ) : (
            <>
              <div className="mt-4 rounded-2xl border border-border/50 bg-muted/10 px-4 py-3">
                <div className="mb-3 rounded-xl border border-border/40 bg-background/70 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Selected mood</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {activeMoodStat?.label || "N/A"} ·{" "}
                    <span className="text-primary [font-variant-numeric:tabular-nums]">{activeMoodStat?.count ?? 0}</span>{" "}
                    {(activeMoodStat?.count ?? 0) === 1 ? "entry" : "entries"} ({activeMoodStat?.pct ?? 0}%)
                  </p>
                </div>

                <div className="flex h-24 items-end gap-2">
                  {moodStats.rows.map((row) => (
                    <button
                      key={`bar-${row.bucket}`}
                      onClick={() => setActiveMoodBucket(row.bucket)}
                      onMouseEnter={() => setActiveMoodBucket(row.bucket)}
                      className="flex flex-1 flex-col items-center gap-1 focus-visible:outline-none"
                    >
                      <div
                        className={`relative flex h-16 w-full items-end rounded-md bg-muted transition-all ${
                          activeMoodBucket === row.bucket ? "ring-2 ring-primary/40 ring-offset-1 ring-offset-background" : ""
                        }`}
                      >
                        <div
                          className={`w-full rounded-md transition-all ${bucketColorMap[row.bucket]}`}
                          style={{ height: `${Math.max(row.pct, row.count > 0 ? 12 : 4)}%` }}
                        />
                        <span className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold text-foreground [font-variant-numeric:tabular-nums]">
                          {row.count}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{row.label}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {moodStats.total
                    ? `${moodStats.total} mood check-in${moodStats.total > 1 ? "s" : ""} in this ${moodRange}.`
                    : `No mood check-ins found for this ${moodRange}.`}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-border/50 bg-card">
          <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
            <div>
              <p className={WIDGET_TITLE_CLASS}>Today&apos;s Roster</p>
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
          <p className={WIDGET_TITLE_CLASS}>Operational Mix</p>

          <div className="mt-5 space-y-4">
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

            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming Leaves</p>
              <p className="mt-2 text-sm text-foreground">Includes today and upcoming approved leaves.</p>
              <div className="mt-3 space-y-2">
                {upcomingLeavesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading upcoming leaves…</p>
                ) : upcomingLeaves.length ? (
                  upcomingLeaves.map((leave) => {
                    const employee = Array.isArray(leave.employees) ? leave.employees[0] : leave.employees;
                    const leaveType = Array.isArray(leave.leave_types) ? leave.leave_types[0] : leave.leave_types;
                    const firstName = employee?.full_name?.split(" ")[0] || "Unknown";
                    const isOngoing = leave.start_date <= todayKey && leave.end_date >= todayKey;
                    return (
                      <div key={leave.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-background/70 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{firstName}</p>
                          <p className="text-[11px] text-muted-foreground">{leaveType?.name || "Leave"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-medium text-foreground">
                            {leave.start_date} {leave.start_date !== leave.end_date ? `→ ${leave.end_date}` : ""}
                          </p>
                          {isOngoing ? (
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Today</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming approved leaves.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coverage</p>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Office</span>
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
                    <span className="text-muted-foreground">Remote</span>
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
              </div>
            </div>

            <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Broadcast to Basecamp HQ</p>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  alpha
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Write once, send cleanly formatted output to Campfire.
              </p>

              <div className="mt-3 space-y-3">
                <Textarea
                  value={announcementDraft}
                  onChange={(event) => setAnnouncementDraft(event.target.value)}
                  placeholder="Write your announcement for the team…"
                  className="min-h-[110px] rounded-xl border-border/60 bg-background/70"
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">{announcementDraft.length}/2500</p>
                  <Button
                    onClick={handleSendAnnouncement}
                    disabled={isSendingAnnouncement || !announcementDraft.trim()}
                    className="h-8 rounded-lg px-3 text-xs"
                  >
                    {isSendingAnnouncement ? "Sending…" : "Send to Basecamp"}
                  </Button>
                </div>
                {announcementFeedback ? (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      announcementFeedback.type === "success"
                        ? "border-emerald-500/25 bg-emerald-500/10 text-foreground"
                        : "border-destructive/25 bg-destructive/10 text-foreground"
                    }`}
                  >
                    {announcementFeedback.message}
                  </div>
                ) : null}
                {announcementPreview ? (
                  <div className="rounded-lg border border-border/50 bg-background/70 px-3 py-2">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Sent Preview</p>
                    <pre className="max-h-28 overflow-auto whitespace-pre-wrap text-xs text-foreground">{announcementPreview}</pre>
                  </div>
                ) : null}
              </div>
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
