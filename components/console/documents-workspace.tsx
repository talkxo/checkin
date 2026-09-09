"use client";

import { useMemo, useState } from "react";
import { FileText, Fingerprint, Hourglass } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip } from "./ui/bento";
import { InitialsAvatar } from "./ui/avatar";
import { DocumentManager } from "./ui/document-manager";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useEmployeeProfile, useUsers } from "./data";

/**
 * Module 09 — Documents. One repo, linked from every profile that needs it.
 * Document links are real (employee_documents); expiry tracking and e-sign
 * status stay marked planned until those fields exist.
 */
export function DocumentsWorkspace() {
  const users = useUsers();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data ?? []).filter(
      (u) => !q || u.full_name.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q)
    );
  }, [users.data, search]);

  const selected = selectedId ?? people[0]?.id ?? null;
  const profile = useEmployeeProfile(selected);

  return (
    <>
      <PageHeader
        title="Documents"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard label="People" className="lg:col-span-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search person…"
            className="mb-3 h-9 rounded-xl border-border/60"
          />
          <ul className="max-h-[26rem] space-y-0.5 overflow-y-auto scrollbar-hide">
            {people.map((person) => (
              <li key={person.id}>
                <button
                  onClick={() => setSelectedId(person.id)}
                  className={
                    person.id === selected
                      ? "flex w-full items-center gap-2.5 rounded-xl bg-gradient-brand px-2.5 py-2 text-left text-sm text-white shadow-primary"
                      : "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-muted-foreground glass-hover transition-colors hover:text-foreground"
                  }
                >
                  <InitialsAvatar name={person.full_name} size="sm" className={person.id === selected ? "bg-white/20 ring-white/30" : ""} />
                  <span className="truncate font-medium">{person.full_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          label="Employee documents"
          className="lg:col-span-2"
          action={<FileText className="h-3.5 w-3.5 text-muted-foreground/60" />}
        >
          {profile.data ? (
            <DocumentManager
              employeeId={selected!}
              documents={profile.data.documents}
              onChanged={profile.refresh}
            />
          ) : profile.loading ? (
            <div className="h-24 animate-pulse rounded-2xl bg-muted/50" />
          ) : (
            <EmptyState title="Select a person" />
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard label="Expiry tracker" action={<Hourglass className="h-3.5 w-3.5 text-muted-foreground/60" />}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Passport, visa, contract renewal dates — needs expiry fields on documents first.
            </p>
            <Chip tone="neutral">Planned</Chip>
          </div>
        </SectionCard>
        <SectionCard label="E-sign status" action={<Fingerprint className="h-3.5 w-3.5 text-muted-foreground/60" />}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Who&apos;s signed what — arrives with an e-sign integration.
            </p>
            <Chip tone="neutral">Planned</Chip>
          </div>
        </SectionCard>
      </div>
    </>
  );
}
