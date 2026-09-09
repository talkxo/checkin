"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, Eye, Import, Pencil, UserPlus, Users } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip } from "./ui/bento";
import { DataTable } from "./ui/data-table";
import { InitialsAvatar } from "./ui/avatar";
import { SegmentedControl } from "./ui/segmented";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown";
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
import {
  apiAddUser,
  apiDeactivateUser,
  apiUpdateUser,
  useUsers,
} from "./data";
import type { ConsoleUser } from "./types";

type StatusFilter = "all" | "active" | "inactive";

interface ImportOutcome {
  added: string[];
  failed: Array<{ line: string; error: string }>;
}

export function PeopleWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const users = useUsers();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null);

  const [editing, setEditing] = useState<ConsoleUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  // Command palette's "Add new user" lands on /console/people?new=1.
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setShowAdd(true);
      router.replace("/console/people", { scroll: false });
    }
  }, [searchParams, router]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      if (statusFilter === "active" && !u.active) return false;
      if (statusFilter === "inactive" && u.active) return false;
      if (!q) return true;
      return u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
    });
  }, [users.data, statusFilter, search]);

  const columns = useMemo<ColumnDef<ConsoleUser, any>[]>(
    () => [
      {
        accessorKey: "full_name",
        header: "Person",
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <InitialsAvatar name={row.original.full_name} size="sm" />
            <span className="font-medium text-foreground">{row.original.full_name}</span>
          </div>
        ),
      },
      { accessorKey: "email", header: "Email", cell: ({ getValue }) => <span className="text-muted-foreground">{(getValue() as string) || "—"}</span> },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ getValue }) =>
          getValue() ? <Chip tone="success">Active</Chip> : <Chip tone="neutral">Inactive</Chip>,
      },
      {
        accessorKey: "created_at",
        header: "Joined",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">
            {new Date(getValue() as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-muted-foreground">
                    <Ellipsis className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => router.push(`/console/people/${user.id}`)}>
                    <Eye className="h-3.5 w-3.5" /> View profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setEditing(user);
                      setEditName(user.full_name);
                      setEditEmail(user.email ?? "");
                      setEditActive(user.active);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    destructive
                    onSelect={() => handleToggleActive(user, !user.active)}
                  >
                    {user.active ? "Deactivate" : "Reactivate"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const created = await apiAddUser({ fullName: newName.trim(), email: newEmail.trim() || undefined });
      setShowAdd(false);
      setNewName("");
      setNewEmail("");
      setNotice({ tone: "success", text: `${created.full_name} is now on the roster, with leave balances initialized.` });
      await users.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Could not add the user.");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await apiUpdateUser({ id: editing.id, fullName: editName.trim(), email: editEmail.trim() || undefined, active: editActive });
      setEditing(null);
      setNotice({ tone: "success", text: `${editName.trim()} has been updated.` });
      await users.refresh();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not update the user." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: ConsoleUser, active: boolean) => {
    try {
      await apiUpdateUser({ id: user.id, active });
      setNotice({ tone: "success", text: `${user.full_name} is now ${active ? "active" : "inactive"}.` });
      await users.refresh();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not update the user." });
    }
  };

  const parseImport = (): Array<{ fullName: string; email?: string }> =>
    importText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [name, email] = line.split(",").map((part) => part?.trim());
        return { fullName: name, email: email || undefined };
      })
      .filter((row) => row.fullName);

  const handleImport = async () => {
    const rows = parseImport();
    if (!rows.length) return;
    setImporting(true);
    setImportOutcome(null);
    const outcome: ImportOutcome = { added: [], failed: [] };
    for (const row of rows) {
      try {
        await apiAddUser(row);
        outcome.added.push(row.fullName);
      } catch (err) {
        outcome.failed.push({ line: row.fullName, error: err instanceof Error ? err.message : "Failed" });
      }
    }
    setImportOutcome(outcome);
    setImporting(false);
    await users.refresh();
  };

  return (
    <>
      <PageHeader
        title="People"
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowImport(true)}>
              <Import className="mr-1.5 h-3.5 w-3.5" /> Import
            </Button>
            <Button size="sm" className="rounded-xl button-press" onClick={() => setShowAdd(true)}>
              <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Add user
            </Button>
          </>
        }
      />

      {notice ? (
        <p
          className={
            notice.tone === "success"
              ? "mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
              : "mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <SectionCard
        label="Directory"
        action={<Users className="h-3.5 w-3.5 text-muted-foreground/60" />}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-full max-w-xs rounded-xl border-border/60"
          />
          <SegmentedControl
            size="sm"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
            {(users.data ?? []).filter((u) => u.active).length} active · {(users.data ?? []).length} total
          </span>
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          loading={users.loading}
          initialSorting={[{ id: "full_name", desc: false }]}
          emptyTitle="No people match"
          emptyDescription="Adjust the search or filter, or add someone new."
          onRowClick={(user) => router.push(`/console/people/${user.id}`)}
        />
      </SectionCard>

      {/* Add user */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>
              Creates the employee record and initializes this year&apos;s leave balances.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="mt-1.5 rounded-xl border-border/60" placeholder="Priya Sharma" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email (optional)</label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1.5 rounded-xl border-border/60" placeholder="priya@talkxo.com" />
            </div>
            {addError ? <p className="text-sm text-red-600 dark:text-red-400">{addError}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newName.trim() || adding} className="button-press">
              {adding ? "Adding…" : "Add user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk import */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk import</DialogTitle>
            <DialogDescription>
              One person per line: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">Full Name, email@company.com</code> — email optional.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={7}
            placeholder={"Priya Sharma, priya@talkxo.com\nArjun Mehta"}
            className="w-full rounded-xl border border-border/60 bg-background/60 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {importOutcome ? (
            <div className="space-y-1 text-sm">
              <p className="text-emerald-600 dark:text-emerald-400">{importOutcome.added.length} added.</p>
              {importOutcome.failed.length ? (
                <ul className="space-y-0.5 text-red-600 dark:text-red-400">
                  {importOutcome.failed.map((f) => (
                    <li key={f.line}>
                      {f.line} — {f.error}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImport(false)}>Done</Button>
            <Button onClick={handleImport} disabled={importing || !parseImport().length} className="button-press">
              {importing ? "Importing…" : `Import ${parseImport().length || ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit user */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Basic details and active state.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full name</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1.5 rounded-xl border-border/60" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="mt-1.5 rounded-xl border-border/60" />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border/60 px-4 py-3">
              <input
                type="checkbox"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-foreground">Active user</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!editName.trim() || saving} className="button-press">
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
