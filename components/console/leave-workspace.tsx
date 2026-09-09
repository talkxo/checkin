"use client";

import { useCallback, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarRange, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip, bentoStagger } from "./ui/bento";
import { DataTable } from "./ui/data-table";
import { SegmentedControl } from "./ui/segmented";
import { MonthGrid, MonthGridLegend } from "./ui/month-grid";
import { InitialsAvatar } from "./ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import {
  apiProcessLeave,
  apiRunAccrual,
  apiUpdateLeaveBalance,
  useApiData,
  useHolidays,
  useLeaveRequests,
  useLeaveTypes,
  useUsers,
} from "./data";
import { leaveRequestPerson, leaveRequestType } from "./types";
import type { LeaveRequestRow } from "./types";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Tab = "queue" | "balances" | "calendar" | "policy";
type QueueFilter = "pending" | "all" | "approved" | "rejected";

interface BalanceRow {
  leave_type_name?: string;
  total_entitlement?: number;
  used_leaves?: number;
  pending_leaves?: number;
  available_leaves?: number;
}

interface LeaveBalanceResponse {
  employee: { id: string; full_name: string; slug: string };
  year: number;
  leaveBalance: BalanceRow[];
  accrualHistory: Array<{ month: number; extra_office_days: number; accrued_leaves: number }>;
}

const fmtDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const relativeDays = (dateISO: string) => {
  const days = Math.floor((Date.now() - new Date(dateISO).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
};

export function LeaveWorkspace() {
  const [tab, setTab] = useState<Tab>("queue");

  return (
    <>
      <PageHeader title="Leave" />
      <div className="mb-4">
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          options={[
            { value: "queue", label: "Approvals" },
            { value: "balances", label: "Balances" },
            { value: "calendar", label: "Team calendar" },
            { value: "policy", label: "Policy" },
          ]}
        />
      </div>
      {tab === "queue" ? <QueueTab /> : null}
      {tab === "balances" ? <BalancesTab /> : null}
      {tab === "calendar" ? <CalendarTab /> : null}
      {tab === "policy" ? <PolicyTab /> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// Approvals queue
// ---------------------------------------------------------------------------

function QueueTab() {
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const requests = useLeaveRequests(filter);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const process = useCallback(
    async (row: LeaveRequestRow, action: "approve" | "reject") => {
      setBusyId(row.id);
      setNotice(null);
      try {
        const result = await apiProcessLeave(row.id, action);
        setNotice({ tone: "success", text: result.message || `Request ${action}d.` });
        await requests.refresh();
      } catch (err) {
        setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not process the request." });
      } finally {
        setBusyId(null);
      }
    },
    [requests.refresh]
  );

  const rows = requests.data?.leaveRequests ?? [];

  const columns = useMemo<ColumnDef<LeaveRequestRow, any>[]>(
    () => [
      {
        id: "person",
        accessorFn: (row) => leaveRequestPerson(row).name,
        header: "Person",
        cell: ({ row }) => {
          const person = leaveRequestPerson(row.original);
          return (
            <div className="flex items-center gap-2.5">
              <InitialsAvatar name={person.name} size="sm" />
              <span className="font-medium text-foreground">{person.name}</span>
            </div>
          );
        },
      },
      {
        id: "type",
        accessorFn: (row) => leaveRequestType(row),
        header: "Type",
        cell: ({ getValue }) => <Chip tone="info">{getValue() as string}</Chip>,
      },
      {
        id: "duration",
        accessorFn: (row) => row.start_date,
        header: "Duration",
        cell: ({ row }) => (
          <div className="whitespace-nowrap tabular-nums">
            <span className="font-medium text-foreground">{row.original.total_days}d</span>
            <span className="text-muted-foreground">
              {" "}
              · {fmtDate(row.original.start_date)} → {fmtDate(row.original.end_date)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ getValue }) => {
          const reason = (getValue() as string | null)?.trim();
          return reason ? (
            <span className="block max-w-56 truncate text-muted-foreground" title={reason}>
              {reason}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Applied",
        cell: ({ row }) => {
          const req = row.original;
          const stuck = req.status === "pending" && Date.now() - new Date(req.created_at).getTime() > 3 * 86400000;
          return (
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-muted-foreground">{relativeDays(req.created_at)}</span>
              {stuck ? <Chip tone="warning">Stuck &gt;3d</Chip> : null}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const req = row.original;
          const busy = busyId === req.id;
          if (req.status !== "pending") {
            return (
              <Chip tone={req.status === "approved" ? "success" : req.status === "rejected" ? "danger" : "neutral"}>
                {req.status}
              </Chip>
            );
          }
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-8 rounded-xl bg-emerald-600 px-3 text-white hover:bg-emerald-700 button-press"
                onClick={() => process(req, "approve")}
                disabled={busy}
              >
                {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-xl border-red-500/40 px-3 text-red-600 hover:bg-red-500/10 hover:text-red-700 dark:text-red-400"
                onClick={() => process(req, "reject")}
                disabled={busy}
              >
                Reject
              </Button>
            </div>
          );
        },
      },
    ],
    [busyId, process]
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={bentoStagger} className="space-y-4">
      <SectionCard
        label={`Queue · ${rows.length}`}
        action={
          <SegmentedControl
            size="sm"
            value={filter}
            onChange={(v) => setFilter(v as QueueFilter)}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        {notice ? (
          <p
            className={
              notice.tone === "success"
                ? "mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
                : "mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
            }
          >
            {notice.text}
          </p>
        ) : null}

        {requests.loading && !requests.data ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/50" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            emptyTitle={filter === "pending" ? "Queue is clear" : "No requests in this filter"}
            emptyDescription={filter === "pending" ? "Nothing waiting on your call." : undefined}
          />
        )}
      </SectionCard>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

function BalancesTab() {
  const year = new Date().getFullYear();
  const users = useUsers();
  const active = users.data?.filter((u) => u.active) ?? [];
  const [slug, setSlug] = useState<string | null>(null);
  const selectedSlug = slug ?? active[0]?.slug ?? null;
  const balance = useApiData<LeaveBalanceResponse>(
    selectedSlug ? `/api/leave/balance?slug=${selectedSlug}&year=${year}` : null
  );
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Array<{ name: string; entitlement: number; used: number; pending: number }>>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const person = active.find((u) => u.slug === selectedSlug);

  const openEdit = () => {
    const source = balance.data?.leaveBalance ?? [];
    setRows(
      source.map((row) => ({
        name: row.leave_type_name ?? "Leave",
        entitlement: row.total_entitlement ?? 0,
        used: row.used_leaves ?? 0,
        pending: row.pending_leaves ?? 0,
      }))
    );
    setEditing(true);
  };

  const save = async () => {
    if (!balance.data || !person) return;
    setSaving(true);
    try {
      const leaveBalances: Record<string, { total_entitlement: number; used_leaves: number; pending_leaves: number }> = {};
      for (const row of rows) {
        leaveBalances[row.name] = {
          total_entitlement: Number(row.entitlement) || 0,
          used_leaves: Number(row.used) || 0,
          pending_leaves: Number(row.pending) || 0,
        };
      }
      await apiUpdateLeaveBalance({ employeeId: balance.data.employee.id, year, leaveBalances });
      setEditing(false);
      setNotice("Balances updated.");
      await balance.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not update balances.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={bentoStagger} className="space-y-4">
      <SectionCard
        label={`Balances · ${year}`}
        action={
          <Select
            value={selectedSlug ?? undefined}
            onValueChange={(v) => {
              setSlug(v);
              setNotice(null);
            }}
          >
            <SelectTrigger className="h-8 w-44 rounded-xl border-border/60 text-sm">
              <SelectValue placeholder="Person" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {active.map((u) => (
                <SelectItem key={u.id} value={u.slug}>
                  {u.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {notice ? <p className="mb-3 text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
        {balance.loading && !balance.data ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ) : balance.error ? (
          <EmptyState title="Balance unavailable" description={balance.error} />
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2.5">
              <InitialsAvatar name={balance.data?.employee.full_name ?? "?"} />
              <div>
                <p className="text-sm font-medium text-foreground">{balance.data?.employee.full_name}</p>
                <p className="text-xs text-muted-foreground">Year {year}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto rounded-xl" onClick={openEdit}>
                Edit balances
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="card-label px-3 py-2 text-left">Type</th>
                    <th className="card-label px-3 py-2 text-right">Entitlement</th>
                    <th className="card-label px-3 py-2 text-right">Used</th>
                    <th className="card-label px-3 py-2 text-right">Pending</th>
                    <th className="card-label px-3 py-2 text-right">Available</th>
                  </tr>
                </thead>
                <tbody>
                  {(balance.data?.leaveBalance ?? []).map((row) => (
                    <tr key={row.leave_type_name} className="border-b border-border/30 last:border-0">
                      <td className="px-4 py-3 font-medium text-foreground/90">{row.leave_type_name ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.total_entitlement ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.used_leaves ?? "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.pending_leaves ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                        {row.available_leaves ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(balance.data?.accrualHistory.length ?? 0) > 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Bonus accruals this year:{" "}
                {balance.data!.accrualHistory
                  .map((a) => `${new Date(Date.UTC(2000, a.month - 1, 1)).toLocaleDateString("en-IN", { month: "short" })} +${a.accrued_leaves}`)
                  .join(", ")}
              </p>
            ) : null}
          </>
        )}
      </SectionCard>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit balances — {person?.full_name}</DialogTitle>
            <DialogDescription>
              Used and pending are pre-filled from real requests — adjust entitlements and corrections only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={row.name} className="grid grid-cols-4 items-center gap-2">
                <span className="col-span-1 truncate text-sm font-medium text-foreground">{row.name}</span>
                {(["entitlement", "used", "pending"] as const).map((field) => (
                  <Input
                    key={field}
                    type="number"
                    min={0}
                    value={row[field]}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((r, idx) => (idx === i ? { ...r, [field]: Number(e.target.value) } : r))
                      )
                    }
                    className="h-9 rounded-xl border-border/60 text-sm"
                  />
                ))}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="button-press">
              {saving ? "Saving…" : "Save balances"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Team calendar
// ---------------------------------------------------------------------------

const pad2 = (n: number) => String(n).padStart(2, "0");

function CalendarTab() {
  const now = new Date();
  const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const [cursor, setCursor] = useState({ year: istNow.getFullYear(), month: istNow.getMonth() + 1 });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const prefix = `${cursor.year}-${pad2(cursor.month)}`;
  const last = new Date(Date.UTC(cursor.year, cursor.month, 0)).getUTCDate();
  const monthEnd = `${prefix}-${pad2(last)}`;

  const approved = useLeaveRequests("approved");
  const pending = useLeaveRequests("pending");
  const holidays = useHolidays();

  const monthData = useMemo(() => {
    const outByDay = new Map<string, { approved: string[]; pending: string[] }>();
    const collect = (rows: LeaveRequestRow[] | undefined, key: "approved" | "pending") => {
      for (const row of rows ?? []) {
        let cursorDay = new Date(`${row.start_date}T00:00:00Z`);
        const end = new Date(`${row.end_date}T00:00:00Z`);
        while (cursorDay <= end) {
          const key2 = cursorDay.toISOString().slice(0, 10);
          if (key2.startsWith(prefix)) {
            const entry = outByDay.get(key2) ?? { approved: [], pending: [] };
            const name = leaveRequestPerson(row).name;
            if (!entry[key].includes(name)) entry[key].push(name);
            outByDay.set(key2, entry);
          }
          cursorDay = new Date(cursorDay.getTime() + 86400000);
        }
      }
    };
    collect(approved.data?.leaveRequests, "approved");
    collect(pending.data?.leaveRequests, "pending");
    const monthHolidays = (holidays.data?.holidays ?? []).filter((h) => h.date.startsWith(prefix));
    return { outByDay, monthHolidays };
  }, [approved.data, pending.data, holidays.data, prefix]);

  const dayState = (key: string) => {
    const out = monthData.outByDay.get(key);
    const holiday = monthData.monthHolidays.find((h) => h.date === key);
    const approvedCount = out?.approved.length ?? 0;
    const pendingCount = out?.pending.length ?? 0;
    return {
      className: holiday ? "bg-violet-500/10 text-foreground/80" : undefined,
      dot: holiday ? ("holiday" as const) : approvedCount ? ("leave" as const) : pendingCount ? ("pending" as const) : undefined,
      meta: approvedCount || pendingCount ? `${approvedCount}${pendingCount ? `+${pendingCount}` : ""}` : undefined,
      title: holiday?.name ?? (approvedCount || pendingCount ? `${approvedCount} approved, ${pendingCount} pending` : undefined),
    };
  };

  const selectedOut = selectedDay ? monthData.outByDay.get(selectedDay) : null;
  const selectedHoliday = selectedDay ? monthData.monthHolidays.find((h) => h.date === selectedDay) : null;
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
    setSelectedDay(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <SectionCard
        label="Team calendar overlay"
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
        <MonthGrid
          year={cursor.year}
          month={cursor.month}
          dayState={dayState}
          selected={selectedDay}
          onDayClick={(key) => setSelectedDay(key === selectedDay ? null : key)}
        />
        <MonthGridLegend
          className="mt-4"
          items={[
            { dot: "leave", label: "Approved leave" },
            { dot: "pending", label: "Pending leave" },
            { dot: "holiday", label: "Holiday" },
            { label: "n+p = approved + pending" },
          ]}
        />
      </SectionCard>

      <SectionCard label={selectedDay ?? "Pick a day"} className="lg:col-span-2">
        {!selectedDay ? (
          <EmptyState title="No day selected" description="Click a day to see who's off and why." />
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground/80">Approved leave</p>
              <p className="text-muted-foreground">{selectedOut?.approved.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground/80">Pending</p>
              <p className="text-muted-foreground">{selectedOut?.pending.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-foreground/80">Holiday</p>
              <p className="text-muted-foreground">{selectedHoliday?.name ?? "—"}</p>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

function PolicyTab() {
  const types = useLeaveTypes();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAccrual = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiRunAccrual({ month, year: new Date().getFullYear() });
      setResult(
        data.message ||
          (typeof data.earnedCount === "number"
            ? `Processed — ${data.earnedCount} employee${data.earnedCount === 1 ? "" : "s"} earned bonus leave.`
            : "Accrual processed.")
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accrual failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <SectionCard label="Policy" action={<CalendarRange className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <div>
        <p className="mb-2 text-xs font-medium text-foreground/80">Leave types</p>
        {types.loading && !types.data ? (
          <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
        ) : (
          <ul className="divide-y divide-border/40">
            {(types.data?.leaveTypes ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  {t.description ? <p className="truncate text-xs text-muted-foreground">{t.description}</p> : null}
                </div>
                <Chip tone={t.is_active ? "success" : "neutral"}>{t.is_active ? "Active" : "Disabled"}</Chip>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Carry-forward rules come with the accrual engine.</p>
      </div>

      <div className="mt-5 border-t border-border/50 pt-4">
        <p className="text-xs font-medium text-foreground/80">Accrual &amp; carry-forward</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Run the monthly bonus-leave accrual — extra office days convert into Bonus Leave.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-9 w-36 rounded-lg border-border/60 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString("en-IN", { month: "long" })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="rounded-lg button-press" onClick={runAccrual} disabled={running}>
            {running ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
            Run accrual
          </Button>
        </div>
        {result ? <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{result}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      </div>
    </SectionCard>
  );
}
