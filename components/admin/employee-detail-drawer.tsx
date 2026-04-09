"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatISTDateLong } from "@/lib/time";
import type { EmployeeSummary } from "./types";

const ADMIN_LATE_CUTOFF_MINUTES = 630;

interface EmployeeDetailDrawerProps {
  employee: EmployeeSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LeaveBalanceResponse {
  leaveBalance?: Array<{
    leaveType?: { name?: string };
    leave_type?: string;
    leave_type_name?: string;
    name?: string;
    totalEntitlement?: number;
    total_entitlement?: number;
    usedLeaves?: number;
    used_leaves?: number;
    availableLeaves?: number;
    available_leaves?: number;
    remainingLeaves?: number;
    remaining_leaves?: number;
    pendingLeaves?: number;
    pending_leaves?: number;
  }>;
}

export function EmployeeDetailDrawer({
  employee,
  open,
  onOpenChange,
}: EmployeeDetailDrawerProps) {
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalanceResponse["leaveBalance"]>([]);

  useEffect(() => {
    const loadLeaveBalance = async () => {
      if (!employee?.slug || !open) return;
      setLeaveBalance([]);
      try {
        const response = await fetch(`/api/leave/balance?slug=${employee.slug}&year=${new Date().getFullYear()}`);
        if (!response.ok) return;
        const data = (await response.json()) as LeaveBalanceResponse;
        setLeaveBalance(data.leaveBalance || []);
      } catch {
        setLeaveBalance([]);
      }
    };

    loadLeaveBalance();
  }, [employee?.slug, open]);

  const anomalies = useMemo(() => {
    if (!employee) return [];

    const items: string[] = [];
    const lateSessions = employee.sessions.filter((session) => {
      const [hour, minute] = session.checkinTime.split(":").map(Number);
      return !Number.isNaN(hour) && hour * 60 + minute >= ADMIN_LATE_CUTOFF_MINUTES;
    }).length;

    if (employee.missedDays > 0) items.push(`${employee.missedDays} missed workday${employee.missedDays > 1 ? "s" : ""} in range`);
    if (employee.approvedLeaveDays > 0) items.push(`${employee.approvedLeaveDays} approved leave day${employee.approvedLeaveDays > 1 ? "s" : ""} in range`);
    if (employee.pendingLeaveDays > 0) items.push(`${employee.pendingLeaveDays} pending leave day${employee.pendingLeaveDays > 1 ? "s" : ""} in range`);
    if (employee.elapsedWorkingDays >= 3 && employee.attendanceRate < 75) items.push("Below expected attendance for elapsed period");
    if (employee.remoteDays > employee.officeDays) items.push("Remote-heavy period");
    if (lateSessions > 0) items.push(`${lateSessions} late arrival${lateSessions > 1 ? "s" : ""} after 10:30`);
    if (employee.sessions.some((session) => session.status === "Active")) items.push("Currently checked in");
    return items;
  }, [employee]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="right-0 top-0 h-screen max-w-xl translate-x-0 translate-y-0 rounded-none border-l border-border/60 p-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-right-full sm:left-auto sm:translate-x-0 sm:translate-y-0">
        {employee ? (
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b border-border/50 px-6 py-5">
              <DialogTitle className="text-xl">{employee.name}</DialogTitle>
              <DialogDescription>
                {employee.slug} · {employee.daysPresent}/{employee.elapsedWorkingDays} days present · {employee.attendanceRate}% attendance
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              <section className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours</p>
                  <p className="mt-2 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{employee.totalHours}</p>
                </div>
                <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Remote vs Office</p>
                  <p className="mt-2 text-2xl font-semibold [font-variant-numeric:tabular-nums]">
                    {employee.remoteDays}/{employee.officeDays}
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Attention Notes</h3>
                </div>
                {anomalies.length ? (
                  <div className="flex flex-wrap gap-2">
                    {anomalies.map((item) => (
                      <Badge key={item} variant="secondary" className="rounded-full px-3 py-1">
                        {item}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No notable exceptions"
                    description="This employee’s sessions look steady for the selected range."
                    className="py-5"
                  />
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Leave Balance</h3>
                {leaveBalance && leaveBalance.length > 0 ? (
                  <div className="space-y-2">
                    {leaveBalance.map((balance, index) => {
                      const leaveTypeName =
                        balance.leaveType?.name ||
                        balance.leave_type_name ||
                        balance.leave_type ||
                        balance.name ||
                        "Leave";
                      const pendingLeaves = Number(balance.pendingLeaves ?? balance.pending_leaves ?? 0);
                      const usedLeaves = Number(balance.usedLeaves ?? balance.used_leaves ?? 0);
                      const totalEntitlementValue = balance.totalEntitlement ?? balance.total_entitlement;
                      const totalEntitlement = typeof totalEntitlementValue === "number" ? totalEntitlementValue : Number(totalEntitlementValue ?? 0);
                      const explicitAvailableValue =
                        balance.availableLeaves ??
                        balance.available_leaves ??
                        balance.remainingLeaves ??
                        balance.remaining_leaves;
                      const explicitAvailable =
                        typeof explicitAvailableValue === "number"
                          ? explicitAvailableValue
                          : explicitAvailableValue !== undefined
                            ? Number(explicitAvailableValue)
                            : undefined;
                      const derivedAvailable =
                        totalEntitlement > 0 ? Math.max(totalEntitlement - usedLeaves - pendingLeaves, 0) : 0;
                      const availableLeaves = explicitAvailable ?? derivedAvailable;
                      const summaryTotal = totalEntitlement > 0 ? totalEntitlement : availableLeaves + usedLeaves + pendingLeaves;

                      return (
                      <div key={`${leaveTypeName}-${index}`} className="flex items-center justify-between rounded-2xl border border-border/50 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{leaveTypeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {usedLeaves} used · {pendingLeaves} pending · {summaryTotal} total
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold [font-variant-numeric:tabular-nums]">{availableLeaves}</p>
                          <p className="text-[11px] text-muted-foreground">Available</p>
                        </div>
                      </div>
                    )})}
                  </div>
                ) : (
                  <EmptyState title="No leave balance loaded" description="Leave balance data is unavailable for this employee." className="py-5" />
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Session Timeline</h3>
                <div className="space-y-2">
                  {employee.sessions.map((session) => (
                    <div key={session.id} className="rounded-2xl border border-border/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{formatISTDateLong(session.date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.checkinTime} - {session.checkoutTime} · {session.mode}
                          </p>
                        </div>
                        <Badge variant={session.status === "Active" ? "default" : "secondary"}>{session.status}</Badge>
                      </div>
                      {session.mood || session.moodComment ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Mood: {session.mood || "Shared"}{session.moodComment ? ` · ${session.moodComment}` : ""}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
