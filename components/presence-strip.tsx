'use client';
import { useEffect, useState } from 'react';

interface Person { name: string; mode: 'office' | 'remote'; }

export default function PresenceStrip() {
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    fetch('/api/admin/today')
      .then(r => r.json())
      .then(data => {
        const active = (data.attendance || [])
          .filter((r: any) => r.status === 'In' || r.status === 'Active' || r.status === 'Complete')
          .map((r: any) => ({ name: r.name.split(' ')[0], mode: r.mode }));
        setPeople(active);
      })
      .catch(() => {});
  }, []);

  if (people.length === 0) return null;

  const inOffice = people.filter(p => p.mode === 'office');
  const remote = people.filter(p => p.mode === 'remote');

  return (
    <div className="rounded-2xl border border-border/50 bg-card px-4 py-3 shadow-sm dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Today&apos;s Presence
      </p>
      <div className="mt-2 space-y-2">
      {inOffice.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 px-3 py-2">
          <span className="mt-0.5 text-sm">&#x1F3E2;</span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              In Office
            </p>
            <p className="text-sm text-foreground leading-snug break-words">
              {inOffice.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}
      {remote.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 dark:bg-muted/20 px-3 py-2">
          <span className="mt-0.5 text-sm">&#x1F3E0;</span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Working Remotely
            </p>
            <p className="text-sm text-foreground leading-snug break-words">
              {remote.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
