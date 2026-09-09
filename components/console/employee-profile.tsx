"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Cake, Mail, Pencil, Phone, History } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip } from "./ui/bento";
import { InitialsAvatar } from "./ui/avatar";
import { DocumentManager } from "./ui/document-manager";
import { RowListSkeleton } from "./ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { apiUpdateEmployee, useEmployeeProfile, useLeaveRequests } from "./data";
import { leaveRequestPerson, leaveRequestType } from "./types";
import type { LeaveRequestRow } from "./types";

const fmtDate = (iso: string | null | undefined) =>
  iso
    ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

export function EmployeeProfileView({ employeeId }: { employeeId: string }) {
  const profile = useEmployeeProfile(employeeId);
  const allLeaves = useLeaveRequests("all");
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", dateOfBirth: "", emergencyContact: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employee = profile.data?.employee;

  const myLeaves = (allLeaves.data?.leaveRequests ?? []).filter(
    (row) => row.employee_id === employeeId
  );

  const timeline = (() => {
    const events: Array<{ date: string; label: string; kind: string }> = [];
    if (employee?.created_at) {
      events.push({ date: employee.created_at, label: "Joined the roster", kind: "join" });
    }
    for (const doc of profile.data?.documents ?? []) {
      events.push({ date: doc.created_at, label: `Document added — ${doc.label}`, kind: "doc" });
    }
    return events.sort((a, b) => b.date.localeCompare(a.date));
  })();

  const openEdit = () => {
    if (!employee) return;
    setForm({
      fullName: employee.full_name,
      phone: employee.phone ?? "",
      dateOfBirth: employee.date_of_birth ?? "",
      emergencyContact: employee.emergency_contact ?? "",
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiUpdateEmployee(employeeId, {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth,
        emergencyContact: form.emergencyContact.trim(),
      });
      setShowEdit(false);
      await profile.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={employee?.full_name ?? "Profile"}
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-xl" asChild>
              <Link href="/console/people">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Directory
              </Link>
            </Button>
            <Button size="sm" className="rounded-xl button-press" onClick={openEdit} disabled={!employee}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard label="Details" action={employee ? (employee.active ? <Chip tone="success">Active</Chip> : <Chip tone="neutral">Inactive</Chip>) : null}>
          {profile.loading && !profile.data ? (
            <RowListSkeleton rows={4} />
          ) : employee ? (
            <dl className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <InitialsAvatar name={employee.full_name} size="lg" />
                <div>
                  <p className="font-semibold text-foreground">{employee.full_name}</p>
                  {employee.email ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" /> {employee.email}
                    </p>
                  ) : null}
                </div>
              </div>
              <Detail label="Phone" icon={<Phone className="h-3 w-3" />} value={employee.phone ?? "—"} />
              <Detail label="Date of birth" icon={<Cake className="h-3 w-3" />} value={fmtDate(employee.date_of_birth)} />
              <Detail label="Emergency contact" value={employee.emergency_contact ?? "—"} />
            </dl>
          ) : (
            <EmptyState title="Profile unavailable" description={profile.error ?? undefined} />
          )}
        </SectionCard>

        <SectionCard label="Documents">
          {profile.loading && !profile.data ? (
            <RowListSkeleton rows={3} />
          ) : profile.data ? (
            <DocumentManager
              employeeId={employeeId}
              documents={profile.data.documents}
              onChanged={profile.refresh}
            />
          ) : null}
        </SectionCard>

        <SectionCard label="Leave history">
          {allLeaves.loading && !allLeaves.data ? (
            <RowListSkeleton rows={3} />
          ) : myLeaves.length === 0 ? (
            <EmptyState title="No leave requests yet" />
          ) : (
            <ul className="divide-y divide-border/40">
              {myLeaves.slice(0, 8).map((row) => (
                <LeaveRow key={row.id} row={row} />
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard label="Timeline" action={<History className="h-3.5 w-3.5 text-muted-foreground/60" />}>
          {profile.loading && !profile.data ? (
            <RowListSkeleton rows={2} />
          ) : (
            <ol className="relative space-y-4 border-l border-border/50 pl-4">
              {timeline.map((event, i) => (
                <li key={`${event.date}-${i}`} className="relative">
                  <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-primary/60" />
                  <p className="text-sm text-foreground/90">{event.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </li>
              ))}
              {timeline.length === 0 ? <li className="text-sm text-muted-foreground">Nothing recorded yet.</li> : null}
            </ol>
          )}
        </SectionCard>
      </div>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Details feed birthdays, alerts, and the directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} className="mt-1.5 rounded-xl border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1.5 rounded-xl border-border/60" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Date of birth</label>
                <Input type="date" value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} className="mt-1.5 rounded-xl border-border/60" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Emergency contact</label>
              <Input value={form.emergencyContact} onChange={(e) => setForm((p) => ({ ...p, emergencyContact: e.target.value }))} className="mt-1.5 rounded-xl border-border/60" />
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.fullName.trim() || saving} className="button-press">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium text-foreground/90">{value}</dd>
    </div>
  );
}

const LEAVE_CHIP: Record<LeaveRequestRow["status"], "success" | "warning" | "danger" | "neutral"> = {
  approved: "success",
  pending: "warning",
  rejected: "danger",
  cancelled: "neutral",
};

function LeaveRow({ row }: { row: LeaveRequestRow }) {
  const person = leaveRequestPerson(row);
  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="truncate text-foreground/90">
        {leaveRequestType(row)} · {row.total_days}d
      </span>
      <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">
        {fmtDate(row.start_date)} → {fmtDate(row.end_date)}
      </span>
      <Chip tone={LEAVE_CHIP[row.status]}>{row.status}</Chip>
      <span className="sr-only">{person.name}</span>
    </li>
  );
}
