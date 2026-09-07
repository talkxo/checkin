"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, Loader2, Plus, Trash2 } from 'lucide-react';

interface EmployeeProfile {
  id: string;
  full_name: string;
  slug: string;
  email: string | null;
  active: boolean;
  date_of_birth: string | null;
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

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
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
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Document form
  const [docLabel, setDocLabel] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

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
        body: JSON.stringify({ fullName, dateOfBirth, phone, emergencyContact }),
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

  const addDocument = async () => {
    setIsAddingDoc(true);
    try {
      const r = await fetch(`/api/admin/employees/${employeeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: docLabel, url: docUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Failed to add document');
      setDocuments((prev) => [data.document, ...prev]);
      setDocLabel('');
      setDocUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add document');
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.push('/admin?tab=people')} aria-label="Back to people">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{employee.full_name}</h1>
            <p className="text-xs text-muted-foreground">
              @{employee.slug} · {employee.active ? 'Active' : 'Inactive'} · joined {formatDate(employee.created_at)}
            </p>
          </div>
        </div>
        <Link href={`/admin/pin-management`}>
          <Button variant="outline" size="sm">PIN</Button>
        </Link>
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
            <div className="grid gap-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <p className="flex h-9 items-center text-sm text-foreground">{employee.email || '—'}</p>
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
          <p className="card-label">Documents</p>

          <div className="mt-4 space-y-2">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents linked yet. Paste a Drive or Dropbox link below.</p>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="glass-hover flex items-center justify-between gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <span className="truncate font-medium text-foreground">{doc.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </a>
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`Remove ${doc.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-glass-border pt-4">
            <div className="flex gap-2">
              <Input value={docLabel} onChange={(e) => setDocLabel(e.target.value)} placeholder="Label — e.g. ID card" className="h-9 flex-1 rounded-lg bg-background/70" />
              <Input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="https://drive.google.com/…" className="h-9 flex-[1.4] rounded-lg bg-background/70" />
              <Button onClick={addDocument} disabled={isAddingDoc || !docLabel.trim() || !docUrl.trim()} size="sm" className="h-9 rounded-lg">
                {isAddingDoc ? '…' : 'Add'}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
