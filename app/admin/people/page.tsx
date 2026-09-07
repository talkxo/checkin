"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BadgeCheck, ExternalLink, Loader2, Plus, ShieldAlert, Trash2 } from 'lucide-react';

interface EmployeeProfile {
  id: string;
  full_name: string;
  slug: string;
  email: string | null;
  active: boolean;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  emergency_contact: string | null;
  created_at: string;
}

interface DocLink {
  id: string;
  label: string;
  url: string;
  created_at: string;
}

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function EmployeeProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get('id');

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [documents, setDocuments] = useState<DocLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // About form
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Document form
  const [docLabel, setDocLabel] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docNotice, setDocNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean | undefined>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/admin/employees/${employeeId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to load profile');
      setEmployee(data.employee);
      setDocuments(data.documents ?? []);
      setFullName(data.employee.full_name ?? '');
      setDateOfBirth(data.employee.date_of_birth ?? '');
      setGender(data.employee.gender ?? '');
      setPhone(data.employee.phone ?? '');
      setEmergencyContact(data.employee.emergency_contact ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveAbout = async () => {
    setIsSaving(true);
    setSavedNotice('');
    try {
      const r = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, dateOfBirth, gender, phone, emergencyContact }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to save');
      setEmployee((prev) => (prev ? { ...prev, ...data.employee } : prev));
      setSavedNotice('Saved');
      setTimeout(() => setSavedNotice(''), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const verifyLink = async (docId: string, url: string) => {
    setVerifyingId(docId);
    try {
      const r = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await r.json();
      setVerifiedDocs((prev) => ({ ...prev, [docId]: !!data.reachable }));
    } catch {
      setVerifiedDocs((prev) => ({ ...prev, [docId]: false }));
    } finally {
      setVerifyingId(null);
    }
  };

  const addDocument = async () => {
    setIsAddingDoc(true);
    setDocNotice(null);
    try {
      const r = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: docLabel, url: docUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to add document');
      setDocuments((prev) => [data.document, ...prev]);
      setVerifiedDocs((prev) => ({ ...prev, [data.document.id]: !!data.reachable }));
      setDocLabel('');
      setDocUrl('');
      setDocNotice(
        data.reachable
          ? { ok: true, message: 'Link verified (HTTP 200).' }
          : { ok: false, message: 'Saved, but the link did not respond with 200 — check its sharing settings.' }
      );
    } catch (e) {
      setDocNotice({ ok: false, message: e instanceof Error ? e.message : 'Failed to add document' });
    } finally {
      setIsAddingDoc(false);
    }
  };

  const removeDocument = async (documentId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    await fetch(`/api/admin/employees/${employeeId}?documentId=${documentId}`, { method: 'DELETE' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="glass rounded-2xl p-6 text-center text-sm text-destructive">{error}</div>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Identity header */}
      <div className="glass flex flex-wrap items-center gap-4 rounded-3xl p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-brand text-lg font-semibold text-white">
          {initials(employee.full_name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">{employee.full_name}</h1>
          <p className="text-xs text-muted-foreground">
            @{employee.slug} · {employee.active ? 'Active' : 'Inactive'} · joined {formatDate(employee.created_at)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/admin?tab=people')} className="rounded-lg">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          People
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* About */}
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="card-label">About</p>
            {savedNotice && <span className="text-xs font-medium text-success-600 dark:text-success-400">{savedNotice}</span>}
          </div>
          <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-9 rounded-lg bg-background/70" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="gender" className="text-xs text-muted-foreground">Gender</Label>
              <Select value={gender || undefined} onValueChange={setGender}>
                <SelectTrigger id="gender" className="h-9 rounded-lg bg-background/70">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="dob" className="text-xs text-muted-foreground">Birthday 🎂</Label>
              <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="h-9 rounded-lg bg-background/70" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className="h-9 rounded-lg bg-background/70" />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="emergency" className="text-xs text-muted-foreground">Emergency contact</Label>
              <Input id="emergency" value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} placeholder="Name · number" className="h-9 rounded-lg bg-background/70" />
            </div>
          </div>

          {/* Employment facts — read-only */}
          <div className="mt-4 grid gap-x-4 gap-y-3 border-t border-glass-border pt-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="text-sm text-foreground">{employee.email || '—'}</p>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Slug</Label>
              <p className="font-mono text-sm text-foreground">{employee.slug}</p>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={saveAbout} disabled={isSaving} size="sm" className="rounded-lg">
              {isSaving ? 'Saving…' : 'Save details'}
            </Button>
          </div>
        </section>

        {/* Documents */}
        <section className="glass rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <p className="card-label">Documents</p>
            <span className="text-[11px] text-muted-foreground">Links — Drive, Notion, anywhere</span>
          </div>

          <div className="mt-4 space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents linked yet. Paste a link below — it's verified with an HTTP check.</p>
            ) : (
              documents.map((doc) => {
                const verified = verifiedDocs[doc.id];
                return (
                  <div key={doc.id} className="glass-hover flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm">
                        <span className="truncate font-medium text-foreground">{doc.label}</span>
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                      </a>
                      {verified !== undefined ? (
                        <span className={`mt-0.5 flex items-center gap-1 text-[11px] ${verified ? 'text-success-600 dark:text-success-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {verified ? <BadgeCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                          {verified ? 'Reachable (HTTP 200)' : 'No 200 — link may be restricted'}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => verifyLink(doc.id, doc.url)}
                        disabled={verifyingId === doc.id}
                        className="h-7 rounded-lg px-2 text-xs text-muted-foreground"
                      >
                        {verifyingId === doc.id ? 'Checking…' : 'Verify'}
                      </Button>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={`Remove ${doc.label}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-glass-border pt-4">
            <Input value={docLabel} onChange={(e) => setDocLabel(e.target.value)} placeholder="Label — e.g. ID card" className="h-9 rounded-lg bg-background/70" />
            <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://drive.google.com/…" className="h-9 rounded-lg bg-background/70" />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Access is controlled by the link's own sharing settings.</p>
              <Button onClick={addDocument} disabled={isAddingDoc || !docLabel.trim() || !docUrl.trim()} size="sm" className="rounded-lg">
                <Plus className="mr-1 h-3.5 w-3.5" />
                {isAddingDoc ? 'Adding…' : 'Add & verify'}
              </Button>
            </div>
            {docNotice ? (
              <p className={`text-xs ${docNotice.ok ? 'text-success-600 dark:text-success-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {docNotice.message}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
