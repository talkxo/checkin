'use client';
import { useEffect, useState } from 'react';

export default function TodayPresenceCard() {
  const [inOffice, setInOffice] = useState<string[]>([]);
  const [remote, setRemote] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/today')
      .then(r => r.json())
      .then(data => {
        const active = (data.attendance || []).filter((r: any) =>
          r.status === 'In' || r.status === 'Active' || r.status === 'Complete'
        );
        setInOffice(active.filter((r: any) => r.mode === 'office').map((r: any) => r.name.split(' ')[0]));
        setRemote(active.filter((r: any) => r.mode === 'remote').map((r: any) => r.name.split(' ')[0]));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />;

  if (inOffice.length === 0 && remote.length === 0) {
    return <p className="text-sm text-muted-foreground px-1">No one has checked in yet today.</p>;
  }

  return (
    <div className="rounded-xl bg-muted/30 dark:bg-muted/20 divide-y divide-border/30">
      {inOffice.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="text-base mt-0.5">&#x1F3E2;</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">In office</p>
            <p className="text-sm text-foreground">{inOffice.join(' \u00B7 ')}</p>
          </div>
        </div>
      )}
      {remote.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="text-base mt-0.5">&#x1F3E0;</span>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">Remote</p>
            <p className="text-sm text-foreground">{remote.join(' \u00B7 ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
