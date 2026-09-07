"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Cake, RefreshCw, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { formatISTDateKey, getMondayOfWeek } from "@/lib/time";
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

interface AttentionItem {
  name: string;
  reason: string;
  status: "missing" | "late";
}

export function AdminOverviewWorkspace({
  todayData,
  pendingLeaveCount,
  lastUpdatedLabel,
  loading = false,
  onRefresh,
  onOpenAttendance,
  onOpenLeave,
}: AdminOverviewWorkspaceProps) {
  const [teamPlanEntries, setTeamPlanEntries] = useState<TeamPlanEntry[]>([]);
  const [moodRange, setMoodRange] = useState<MoodRange>("week");
  const [moodEntries, setMoodEntries] = useState<MoodDataEntry[]>([]);
  const [activeMoodBucket, setActiveMoodBucket] = useState<MoodBucket>("positive");
  const [announcementDraft, setAnnouncementDraft] = useState("");
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [announcementFeedback, setAnnouncementFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [upcomingLeaves, setUpcomingLeaves] = useState<LeaveRequestEntry[]>([]);
  const [birthdays, setBirthdays] = useState<Array<{ name: string; date: string }>>([]);

  useEffect(() => {
    const loadTeamPlan = async () => {
      try {
        const weekStart = getMondayOfWeek(new Date());
        const response = await fetch(`/api/wfh-schedule?week=${weekStart}`);
        const payload = await response.json();
        setTeamPlanEntries(Array.isArray(payload?.data) ? payload.data : []);
      } catch {
        setTeamPlanEntries([]);
      }
    };
    const loadMoodData = async () => {
      try {
        const response = await fetch(`/api/admin/mood-data?range=${moodRange}`);
        const payload = await response.json();
        setMoodEntries(Array.isArray(payload?.moodData) ? payload.moodData : []);
      } catch {
        setMoodEntries([]);
      }
    };
    const loadUpcomingLeaves = async () => {
      try {
        const response = await fetch("/api/admin/leave-requests?status=approved");
        const payload = await response.json();
        const todayKey = formatISTDateKey(new Date());
        const filtered = (Array.isArray(payload?.leaveRequests) ? payload.leaveRequests : [])
          .filter((leave: LeaveRequestEntry) => leave.end_date >= todayKey)
          .sort((a: LeaveRequestEntry, b: LeaveRequestEntry) => a.start_date.localeCompare(b.start_date))
          .slice(0, 5);
        setUpcomingLeaves(filtered);
      } catch {
        setUpcomingLeaves([]);
      }
    };
    const loadBirthdays = async () => {
      try {
        const response = await fetch("/api/admin/birthdays");
        const payload = await response.json();
        setBirthdays(Array.isArray(payload?.birthdays) ? payload.birthdays : []);
      } catch {
        setBirthdays([]);
      }
    };

    loadTeamPlan();
    loadMoodData();
    loadUpcomingLeaves();
    loadBirthdays();
  }, [moodRange]);

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

  const activeMoodStat = useMemo(
    () => moodStats.rows.find((row) => row.bucket === activeMoodBucket) || moodStats.rows[0],
    [activeMoodBucket, moodStats.rows]
  );

  const todayKey = useMemo(() => formatISTDateKey(new Date()), []);

  const handleSendAnnouncement = async () => {
    setAnnouncementFeedback(null);
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
      setAnnouncementFeedback({ type: "success", message: "Announcement sent to Basecamp." });
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

  // Attention queue — missing first, then late
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const person of todayData) {
      const [hour, minute] = (person.firstIn || "").split(":").map(Number);
      const isLate =
        person.status !== "Not Started" &&
        !Number.isNaN(hour) &&
        hour * 60 + minute >= ADMIN_LATE_CUTOFF_MINUTES;
      if (person.status === "Not Started") {
        items.push({ name: person.name, reason: "No check-in yet", status: "missing" });
      } else if (isLate) {
        items.push({ name: person.name, reason: `Checked in at ${person.firstIn}`, status: "late" });
      }
    }
    return items.sort((a, b) => (a.status === "missing" ? -1 : 1));
  }, [todayData]);

  const presentCount = todayData.filter((p) => p.status !== "Not Started").length;
  const officeCount = todayData.filter((p) => p.mode === "office" && p.status !== "Not Started").length;
  const remoteCount = todayData.filter((p) => p.mode === "remote" && p.status !== "Not Started").length;
  const plannedCount = new Set(teamPlanEntries.map((e) => e.employee_id)).size;

  return (
    <div className="space-y-5">
      {/* Status sentence */}
      <section className="glass rounded-3xl px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="card-label">Today</p>
            <p className="mt-1.5 text-lg font-semibold text-foreground">
              {officeCount} in office · {remoteCount} remote · {presentCount} of {todayData.length} present
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Updated {lastUpdatedLabel}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-xl">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        {/* Attention queue */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="card-label">Needs attention</p>
            {attentionItems.length > 0 ? (
              <Badge variant="secondary" className="rounded-full">{attentionItems.length}</Badge>
            ) : null}
          </div>
          <div className="mt-4 space-y-2">
            {attentionItems.length === 0 ? (
              <EmptyState title="All clear" description="Everyone checked in on time." />
            ) : (
              attentionItems.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onOpenAttendance({ status: item.status === "missing" ? "missing" : "attention" })}
                  className="glass-hover flex w-full items-center justify-between gap-3 rounded-2xl bg-muted/20 px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <UserMinus className={`h-4 w-4 ${item.status === "missing" ? "text-destructive" : "text-amber-500"}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>

          {/* Upcoming leaves + birthdays */}
          <div className="mt-5 space-y-2 border-t border-glass-border pt-4">
            {birthdays.map((b) => (
              <div key={`bd-${b.name}-${b.date}`} className="flex items-center gap-2 text-sm">
                <Cake className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{b.name}</span>
                <span className="text-muted-foreground">· {b.date}</span>
              </div>
            ))}
            {upcomingLeaves.map((leave) => {
              const employee = Array.isArray(leave.employees) ? leave.employees[0] : leave.employees;
              const leaveType = Array.isArray(leave.leave_types) ? leave.leave_types[0] : leave.leave_types;
              const firstName = employee?.full_name?.split(" ")[0] || "Unknown";
              const isOngoing = leave.start_date <= todayKey && leave.end_date >= todayKey;
              return (
                <div key={leave.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-foreground">{firstName}</span>
                    <span className="text-muted-foreground"> · {leaveType?.name || "Leave"} · {leave.start_date}</span>
                  </span>
                  {isOngoing ? <Badge className="rounded-full">ongoing</Badge> : null}
                </div>
              );
            })}
            {birthdays.length === 0 && upcomingLeaves.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming leaves or birthdays.</p>
            ) : null}
          </div>
        </div>

        {/* Mood + plan + broadcast */}
        <div className="space-y-5">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-start justify-between">
              <p className="card-label">Team mood</p>
              <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1">
                {(["week", "month"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setMoodRange(range)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                      moodRange === range ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex h-20 items-end gap-2">
              {moodStats.rows.map((row) => (
                <button
                  key={`bar-${row.bucket}`}
                  onClick={() => setActiveMoodBucket(row.bucket)}
                  className="flex flex-1 flex-col items-center gap-1 focus-visible:outline-none"
                >
                  <div className={`relative flex h-14 w-full items-end rounded-md bg-muted transition-all ${
                    activeMoodBucket === row.bucket ? "ring-2 ring-primary/40" : ""
                  }`}>
                    <div
                      className={`w-full rounded-md ${bucketColorMap[row.bucket]}`}
                      style={{ height: `${Math.max(row.pct, row.count > 0 ? 14 : 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{row.label}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {moodStats.total
                ? `${moodStats.total} check-in${moodStats.total > 1 ? "s" : ""} this ${moodRange} · ${activeMoodStat?.label ?? "—"} leads`
                : `No mood check-ins this ${moodRange}.`}
            </p>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="card-label">Plan coverage</p>
            <div className="mt-3 max-h-[120px] space-y-2 overflow-y-auto pr-1">
              {teamPlanEntries.length ? (
                teamPlanEntries.slice(0, 6).map((entry) => {
                  const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
                  const name = employee?.full_name?.split(" ")[0] || "Unknown";
                  return (
                    <div key={entry.employee_id} className="flex items-center gap-2">
                      <span className="w-16 truncate text-xs font-medium text-foreground">{name}</span>
                      <div className="grid flex-1 grid-cols-5 gap-1">
                        {WEEK_DAYS.map((day) => (
                          <div key={day} className={`h-1.5 rounded-full ${entry.wfh_days?.includes(day) ? "bg-primary" : "bg-muted"}`} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">No plans submitted for this week.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {plannedCount} of {todayData.length} planned this week
            </p>
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="card-label">Broadcast to Basecamp</p>
            <Textarea
              value={announcementDraft}
              onChange={(event) => setAnnouncementDraft(event.target.value)}
              placeholder="Write your announcement for the team…"
              className="mt-3 min-h-[80px] rounded-xl bg-background/70"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{announcementDraft.length}/2500</p>
              <Button
                onClick={handleSendAnnouncement}
                disabled={isSendingAnnouncement || !announcementDraft.trim()}
                size="sm"
                className="rounded-xl"
              >
                {isSendingAnnouncement ? "Sending…" : "Send"}
              </Button>
            </div>
            {announcementFeedback ? (
              <p className={`mt-2 text-xs ${announcementFeedback.type === "success" ? "text-success-600 dark:text-success-400" : "text-destructive"}`}>
                {announcementFeedback.message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {pendingLeaveCount > 0 ? (
        <button
          onClick={onOpenLeave}
          className="glass glass-hover flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
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
  );
}
