"use client";

import { Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { User } from "./types";

interface AdminPeopleWorkspaceProps {
  users: User[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onAddUser: () => void;
  onEditUser: (user: User) => void;
  onDeactivateUser: (user: User) => void;
}

export function AdminPeopleWorkspace({
  users,
  searchQuery,
  onSearchQueryChange,
  onAddUser,
  onEditUser,
  onDeactivateUser,
}: AdminPeopleWorkspaceProps) {
  const filteredUsers = users.filter((user) =>
    [user.full_name, user.email || "", user.slug].some((value) =>
      value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const activeUsers = users.filter((user) => user.active).length;

  return (
    <div className="space-y-5">
      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">People</p>
          <p className="mt-2 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{users.length}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{activeUsers}</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inactive</p>
          <p className="mt-2 text-2xl font-semibold [font-variant-numeric:tabular-nums]">{users.length - activeUsers}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/50 bg-card">
        <div className="flex flex-col gap-4 border-b border-border/50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">People & Access</h2>
            <p className="text-sm text-muted-foreground">Manage employee records without leaving the workspace.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Search people"
                className="w-[240px] rounded-xl border-border/60 bg-background pl-9"
              />
            </div>
            <Button onClick={onAddUser} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        </div>

        {filteredUsers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-border/50 bg-muted/20 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Email</th>
                  <th className="px-5 py-3 font-medium">Slug</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20">
                    <td className="px-5 py-4 font-semibold text-foreground">{user.full_name}</td>
                    <td className="px-5 py-4 text-muted-foreground">{user.email || "N/A"}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{user.slug}</td>
                    <td className="px-5 py-4">
                      <Badge variant={user.active ? "default" : "secondary"}>{user.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEditUser(user)} className="rounded-xl">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onDeactivateUser(user)}
                          disabled={!user.active}
                          className="rounded-xl text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState title="No people match this search" description="Try another name, email, or slug." />
          </div>
        )}
      </section>
    </div>
  );
}
