'use client';
import { useEffect, useState } from 'react';

type Row = {
  id: number | string;
  name: string;
  state: 'office' | 'remote' | 'leave' | 'pending';
  time: string | null;
  sortKey: string | null;
};

const STATE_STYLES: Record<Row['state'], { dot: string; label: string }> = {
  office: { dot: 'bg-emerald-500', label: 'in office' },
  remote: { dot: 'bg-sky-500', label: 'remote' },
  leave: { dot: 'bg-amber-500', label: 'on leave' },
  pending: { dot: 'bg-muted-foreground/30', label: 'not in yet' },
};

const STATE_ORDER: Record<Row['state'], number> = { office: 0, remote: 0, pending: 1, leave: 2 };

// "09:12" (IST, from the API) -> "9:12 am"
function to12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const suffix = h < 12 ? 'am' : 'pm';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

// Disambiguate shared first names with a last initial: "Alex R."
function displayNames(people: { id: Row['id']; name: string }[]): Map<Row['id'], string> {
  const firstOf = (n: string) => n.split(' ')[0];
  const lastInitial = (n: string) => n.split(' ').slice(1).join(' ').charAt(0);
  const counts = new Map<string, number>();
  for (const p of people) counts.set(firstOf(p.name), (counts.get(firstOf(p.name)) || 0) + 1);
  const out = new Map<Row['id'], string>();
  for (const p of people) {
    const first = firstOf(p.name);
    out.set(p.id, counts.get(first)! > 1 && lastInitial(p.name) ? `${first} ${lastInitial(p.name)}.` : first);
  }
  return out;
}

export default function TodayPresenceCard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initial = true;
    const load = () => {
      fetch('/api/admin/today')
        .then(r => r.json())
        .then(data => {
          const rows: Row[] = (data.attendance || []).map((r: any) => {
            if (r.onLeave) return { id: r.id, name: r.name, state: 'leave' as const, time: null, sortKey: null };
            if (r.status === 'Not Started') return { id: r.id, name: r.name, state: 'pending' as const, time: null, sortKey: null };
            return {
              id: r.id,
              name: r.name,
              state: (r.mode === 'remote' ? 'remote' : 'office') as Row['state'],
              time: r.firstIn && r.firstIn !== 'N/A' ? to12h(r.firstIn) : null,
              sortKey: r.firstIn && r.firstIn !== 'N/A' ? r.firstIn : null,
            };
          });
          rows.sort((a, b) =>
            STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
            (a.sortKey && b.sortKey ? a.sortKey.localeCompare(b.sortKey) : 0) ||
            a.name.localeCompare(b.name)
          );
          setRows(rows);
        })
        .catch(() => {})
        .finally(() => {
          if (initial) {
            initial = false;
            setLoading(false);
          }
        });
    };

    // A left-open tab would otherwise freeze on the day it was opened —
    // refresh periodically and whenever the tab regains focus.
    load();
    const interval = setInterval(load, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (loading) return <div className="h-12 bg-muted/40 rounded-xl animate-pulse" />;

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground px-1">No team members yet.</p>;
  }

  const names = displayNames(rows);

  return (
    <div className="divide-y divide-border/40">
      {rows.map(row => {
        const { dot, label } = STATE_STYLES[row.state];
        return (
          <div key={row.id} className="flex items-center gap-3 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
              <span className="truncate text-sm font-medium text-foreground">{names.get(row.id)}</span>
            </div>
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
            <span className="w-[3.75rem] shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {row.time}
            </span>
          </div>
        );
      })}
    </div>
  );
}
