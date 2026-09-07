"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Cake, Plane, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

type PersonState = "in-office" | "remote" | "late" | "missing" | "on-leave" | "done";

interface PersonTile {
  name: string;
  detail: string;
  state: PersonState;
}

const STATE_META: Record<PersonState, { label: string; dot: string }> = {
  "in-office": { label: "In office", dot: "bg-success-500" },
  remote: { label: "Remote", dot: "bg-primary" },
  late: { label: "Late", dot: "bg-amber-500" },
  missing: { label: "Not checked in", dot: "bg-destructive" },
  "on-leave": { label: "On leave", dot: "bg-sky-500" },
  done: { label: "Done for the day", dot: "bg-success-700" },
};

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

  const todayKey = useMemo(() => formatISTDateKey(new Date()), []);

  const onLeaveFirstNames = useMemo(() => {
    const set = new Set<string>();
    for (const leave of upcomingLeaves) {
      if (leave.start_date <= todayKey && leave.end_date >= todayKey) {
        const employee = Array.isArray(leave.employees) ? leave.employees[0] : leave.employees;
        const first = employee?.full_name?.split(" ")[0];
        if (first) set.add(first);
      }
    }
    return set;
  }, [upcomingLeaves, todayKey]);

  // The whole team, one tile each — problems highlighted in place
  const teamTiles = useMemo<PersonTile[]>(() => {
    return todayData.map((person) => {
      const firstName = person.name.split(" ")[0];
      const [hour, minute] = (person.firstIn || "").split(":").map(Number);
      const isLate =
        person.status !== "Not Started" &&
        !Number.isNaN(hour) &&
        hour * 60 + minute >= ADMIN_LATE_CUTOFF_MINUTES;

      if (onLeaveFirstNames.has(firstName)) {
        return { name: person.name, detail: "Approved leave", state: "on-leave" as PersonState };
      }
      if (person.status === "Not Started") {
        return { name: person.name, detail: "No check-in yet", state: "missing" as PersonState };
      }
      if (isLate) {
        return { name: person.name, detail: `In at ${person.firstIn} · late`, state: "late" as PersonState };
      }
      if (person.status === "Complete") {
        return { name: person.name, detail: `Out ${person.lastOut !== "N/A" ? person.lastOut : ""}`.trim(), state: "done" as PersonState };
      }
      return {
        name: person.name,
        detail: `In at ${person.firstIn}${person.mode === "remote" ? " · remote" : ""}`,
        state: (person.mode === "remote" ? "remote" : "in-office") as PersonState,
      };
    });
  }, [todayData, onLeaveFirstNames]);

  const tileOrder: Record<PersonState, number> = { missing: 0, late: 1, "in-office": 2, remote: 2, done: 3, "on-leave": 4 };
  const sortedTiles = useMemo(
    () => [...teamTiles].sort((a, b) => tileOrder[a.state] - tileOrder[b.state]),
    [teamTiles]
  );

  const problemCount = teamTiles.filter((t) => t.state === "missing" || t.state === "late").length;

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

  const officeCount = todayData.filter((p) => p.mode === "office" && p.status !== "Not Started").length;
  const remoteCount = todayData.filter((p) => p.mode === "remote" && p.status !== "Not Started").length;
  const presentCount = todayData.filter((p) => p.status !== "Not Started").length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr] xl:items-start">
      {/* ── LEFT COLUMN: everything scoped to today ── */}
      <div className="space-y-4">
        <section className="glass rounded-3xl px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="card-label">Today</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {officeCount} in office · {remoteCount} remote · {presentCount} of {todayData.length} present
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Updated {lastUpdatedLabel}</p>
            </div>
            <div className="flex items-center gap-2">
              {pendingLeaveCount > 0 ? (
                <Button variant="outline" size="sm" onClick={onOpenLeave} className="rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400">
                  {pendingLeaveCount} approval{pendingLeaveCount > 1 ? "s" : ""} pending
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={onRefresh} className="rounded-xl">
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </section>

        {/* Present — the master number, with its breakdown as a segmented bar */}
        <section className="glass rounded-3xl p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="card-label">Present today</p>
              <p className="mt-2 text-[44px] font-bold leading-none tabular-nums text-foreground" style={{ fontFamily: 'Funnel Display, system-ui, sans-serif' }}>
                {presentCount}
                <span className="ml-1 text-xl font-medium text-muted-foreground">of {todayData.length}</span>
              </p>
            </div>
            <button
              onClick={() => onOpenAttendance({ status: problemCount > 0 ? "attention" : "all" })}
              className="glass glass-hover rounded-2xl px-4 py-3 text-left"
            >
              <p className="card-label">Attention</p>
              <p className={`mt-1 text-[28px] font-bold leading-none tabular-nums ${problemCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`} style={{ fontFamily: 'Funnel Display, system-ui, sans-serif' }}>{problemCount}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">missing or late — review</p>
            </button>
          </div>
          <div className="mt-4">
            <div className="flex h-2 overflow-hidden rounded-full bg-muted">
              <div className="bg-primary" style={{ width: `${todayData.length ? (officeCount / todayData.length) * 100 : 0}%` }} title="In office" />
              <div className="bg-sky-500" style={{ width: `${todayData.length ? (remoteCount / todayData.length) * 100 : 0}%` }} title="Remote" />
              <div className="bg-destructive/50" style={{ width: `${todayData.length ? ((todayData.length - presentCount) / todayData.length) * 100 : 0}%` }} title="No check-in" />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {officeCount} in office</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> {remoteCount} remote</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-destructive/50" /> {todayData.length - presentCount} no check-in</span>
            </div>
          </div>
        </section>

        <section className="glass rounded-3xl">
          <div className="flex items-center justify-between border-b border-glass-border px-5 py-3.5">
            <p className="card-label">Team</p>
            {problemCount > 0 ? (
              <button onClick={() => onOpenAttendance({ status: "attention" })} className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                {problemCount} need{problemCount > 1 ? "" : "s"} attention — review
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">All clear</span>
            )}
          </div>
          <div className="max-h-[430px] overflow-y-auto px-1.5">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-glass-border bg-background/95 text-left text-xs uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Check in</th>
                  <th className="px-5 py-2.5 font-medium">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {sortedTiles.map((tile) => {
                  const meta = STATE_META[tile.state];
                  const source = todayData.find((p) => p.name === tile.name);
                  const highlight = tile.state === "missing" || tile.state === "late";
                  return (
                    <tr
                      key={tile.name}
                      onClick={() => onOpenAttendance({ status: tile.state === "missing" ? "missing" : highlight ? "attention" : "all" })}
                      className={`cursor-pointer transition-colors hover:bg-muted/20 ${highlight ? "bg-destructive/[0.04]" : ""}`}
                    >
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                            {tile.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                          <span className="font-medium text-foreground">{tile.name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`flex items-center gap-2 whitespace-nowrap ${
                          tile.state === "missing"
                            ? "text-destructive"
                            : tile.state === "late"
                              ? "text-amber-600 dark:text-amber-400"
                              : tile.state === "on-leave"
                                ? "text-sky-600 dark:text-sky-400"
                                : "text-success-700 dark:text-success-400"
                        } ${highlight ? "font-medium" : ""}`}>
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground [font-variant-numeric:tabular-nums]">
                        {source && source.status !== "Not Started" ? source.firstIn : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-muted-foreground capitalize">
                        {source && source.status !== "Not Started" ? source.mode : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ── RIGHT COLUMN: longer horizons (week/month/future) ── */}
      <div className="space-y-4">
        <div className="glass rounded-3xl p-5">
          <p className="card-label">Upcoming</p>
          <div className="mt-3 space-y-3">
            {birthdays.map((b) => (
              <div key={`bd-${b.name}-${b.date}`} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"><Cake className="h-4 w-4 text-primary" /></span>
                <span className="min-w-0 truncate">
                  <span className="block truncate text-sm font-medium leading-tight text-foreground">{b.name}</span>
                  <span className="block text-xs text-muted-foreground">{b.date}</span>
                </span>
              </div>
            ))}
            {upcomingLeaves.map((leave) => {
              const employee = Array.isArray(leave.employees) ? leave.employees[0] : leave.employees;
              const leaveType = Array.isArray(leave.leave_types) ? leave.leave_types[0] : leave.leave_types;
              const firstName = employee?.full_name?.split(" ")[0] || "Unknown";
              const isOngoing = leave.start_date <= todayKey && leave.end_date >= todayKey;
              return (
                <div key={leave.id} className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10"><Plane className="h-4 w-4 text-sky-500" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight text-foreground">{firstName}</span>
                    <span className="block truncate text-xs text-muted-foreground">{leaveType?.name || "Leave"} · {leave.start_date.slice(5)}</span>
                  </span>
                  {isOngoing ? <span className="ml-auto shrink-0 text-xs font-semibold uppercase tracking-wide text-sky-500">now</span> : null}
                </div>
              );
            })}
            {birthdays.length === 0 && upcomingLeaves.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing upcoming.</p>
            ) : null}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="card-label">Team mood</p>
            <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-0.5">
              {(["week", "month"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setMoodRange(range)}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize transition-colors ${
                    moodRange === range ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-3 flex h-14 items-end gap-2">
            {moodStats.rows.map((row) => (
              <div key={`bar-${row.bucket}`} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-full items-end rounded bg-muted">
                  <div className={`w-full rounded ${bucketColorMap[row.bucket]}`} style={{ height: `${Math.max(row.pct, row.count > 0 ? 16 : 4)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground">{row.label}</span>
              </div>
            ))}
          </div>
          {(() => {
            const lead = moodStats.rows.reduce((a, b) => (b.count > a.count ? b : a), moodStats.rows[0]);
            return (
              <p className="mt-2 text-sm font-medium text-foreground">
                {moodStats.total
                  ? `${lead.label} — ${lead.count} ${lead.count === 1 ? "entry" : "entries"} (${lead.pct}%)`
                  : "No data yet"}
              </p>
            );
          })()}
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="card-label">Plan coverage</p>
          <div className="mt-3 max-h-[110px] space-y-2 overflow-y-auto pr-1">
            {teamPlanEntries.length ? (
              teamPlanEntries.slice(0, 6).map((entry) => {
                const employee = Array.isArray(entry.employees) ? entry.employees[0] : entry.employees;
                const name = employee?.full_name?.split(" ")[0] || "Unknown";
                return (
                  <div key={entry.employee_id} className="flex items-center gap-2">
                    <span className="w-14 truncate text-sm font-medium text-foreground">{name}</span>
                    <div className="grid flex-1 grid-cols-5 gap-1">
                      {WEEK_DAYS.map((day) => (
                        <div key={day} className={`h-1.5 rounded-full ${entry.wfh_days?.includes(day) ? "bg-primary" : "bg-muted"}`} />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground">No plans for this week yet.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <p className="card-label">Broadcast to Basecamp</p>
          <Textarea
            value={announcementDraft}
            onChange={(event) => setAnnouncementDraft(event.target.value)}
            placeholder="Write your announcement for the team…"
            className="mt-3 min-h-[64px] rounded-xl bg-background/70"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{announcementDraft.length}/2500</p>
            <Button onClick={handleSendAnnouncement} disabled={isSendingAnnouncement || !announcementDraft.trim()} size="sm" className="rounded-xl">
              {isSendingAnnouncement ? "Sending…" : "Send"}
            </Button>
          </div>
          {announcementFeedback ? (
            <p className={`mt-1.5 text-xs ${announcementFeedback.type === "success" ? "text-success-600 dark:text-success-400" : "text-destructive"}`}>
              {announcementFeedback.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
