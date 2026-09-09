"use client";

import { useState } from "react";
import { ExternalLink, FileText, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
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
import { Chip } from "./bento";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown";
import { Ellipsis } from "lucide-react";
import { apiAddDocument, apiDeleteDocument, apiVerifyDocument } from "../data";
import type { DocumentLink } from "../types";

interface DocumentManagerProps {
  employeeId: string;
  documents: DocumentLink[];
  onChanged: () => Promise<void> | void;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Employee document links (Drive/Dropbox etc.) — shared by the People profile
 * and the Documents module. Links live in employee_documents; access control
 * is the linked folder's own sharing settings.
 */
export function DocumentManager({ employeeId, documents, onChanged }: DocumentManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<Record<string, boolean | "checking">>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await apiAddDocument(employeeId, { label: label.trim(), url: url.trim() });
      setShowAdd(false);
      setLabel("");
      setUrl("");
      await onChanged();
      if (result.reachable === false) {
        setError("Saved, but the link didn't respond — double-check sharing settings.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the document.");
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (doc: DocumentLink) => {
    setVerifyState((prev) => ({ ...prev, [doc.id]: "checking" }));
    try {
      const result = await apiVerifyDocument(employeeId, doc.url);
      setVerifyState((prev) => ({ ...prev, [doc.id]: result.reachable }));
    } catch {
      setVerifyState((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  const handleDelete = async (doc: DocumentLink) => {
    setDeletingId(doc.id);
    try {
      await apiDeleteDocument(employeeId, doc.id);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} link{documents.length === 1 ? "" : "s"} · stored where you shared them
        </p>
        <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setShowAdd(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add link
        </Button>
      </div>

      {error ? <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p> : null}

      {documents.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
          No documents linked yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {documents.map((doc) => {
            const verified = verifyState[doc.id];
            return (
              <li key={doc.id} className="flex items-center gap-3 py-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{doc.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{hostOf(doc.url)}</p>
                </div>
                {verified === true ? <Chip tone="success">Reachable</Chip> : null}
                {verified === false ? <Chip tone="danger">Unreachable</Chip> : null}
                {verified === "checking" ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg p-0 text-muted-foreground">
                      <Ellipsis className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => window.open(doc.url, "_blank", "noopener")}>
                      <ExternalLink className="h-3.5 w-3.5" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleVerify(doc)}>
                      <ShieldCheck className="h-3.5 w-3.5" /> Verify link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => handleDelete(doc)}>
                      {deletingId === doc.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Add document link</DialogTitle>
            <DialogDescription>
              Paste a Drive/Dropbox link — the file stays wherever it&apos;s shared from.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Label</label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5 rounded-xl border-border/60"
                placeholder="Offer letter"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">URL</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1.5 rounded-xl border-border/60"
                placeholder="https://drive.google.com/…"
                type="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!label.trim() || !/^https?:\/\//i.test(url.trim()) || saving} className="button-press">
              {saving ? "Saving…" : "Save link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
