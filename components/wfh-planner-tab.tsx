'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { House } from 'lucide-react';
import { getMondayOfWeek } from '@/lib/time';
import { firePlanSavedConfetti } from '@/lib/use-reward';

interface WFHPlannerTabProps {
  employeeId?: string;
  onScheduleSaved?: (days: string[]) => void;
}

interface TeamRow {
  employee_id: string;
  full_name: string;
  slug: string;
  wfh_days: string[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MAX_REMOTE_DAYS = 2;

/**
 * One merged week-plan card: the whole team on a Mon–Fri grid, with the
 * logged-in user's own row pinned first and tappable to toggle remote days.
 * undeclared teammates still appear (empty row) so the card shows everyone,
 * not just the people who filled the form.
 */
export default function WFHPlannerTab({ employeeId, onScheduleSaved }: WFHPlannerTabProps) {
  const [rows, setRows] = useState<TeamRow[] | null>(null);
  const [wfhDays, setWfhDays] = useState<string[]>([]);
  const [savedDays, setSavedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const weekStart = getMondayOfWeek(new Date());

  useEffect(() => {
    fetch(`/api/wfh-schedule?week=${weekStart}`)
      .then(r => r.json())
      .then(({ data }) => {
        const list: TeamRow[] = data || [];
        setRows(list);
        const mine = employeeId ? list.find(r => r.employee_id === employeeId) : undefined;
        if (mine?.wfh_days?.length) {
          setWfhDays(mine.wfh_days);
          setSavedDays(mine.wfh_days);
          setSaved(true);
        }
      })
      .catch(() => setRows([]));
  }, [employeeId, weekStart]);

  const isEmployeeReady = Boolean(employeeId);
  const myName = rows?.find(r => r.employee_id === employeeId)?.full_name;

  const toggleDay = (day: string) => {
    if (!isEmployeeReady) return;
    setSaved(false);
    setError('');
    setWfhDays(prev => {
      if (prev.includes(day)) return prev.filter(d => d !== day);
      if (prev.length >= MAX_REMOTE_DAYS) return prev; // enforce max
      return [...prev, day];
    });
  };

  const saveSchedule = async () => {
    if (!employeeId) {
      setError('Your profile is still loading. Please wait a moment and try again.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/wfh-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, weekStart, wfhDays }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || 'Unable to save your plan right now.');
        return;
      }

      setSavedDays(wfhDays);
      setSaved(true);
      // Reflect the change in the grid immediately
      setRows(prev =>
        (prev ?? []).map(r => (r.employee_id === employeeId ? { ...r, wfh_days: wfhDays } : r))
      );
      firePlanSavedConfetti();
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      onScheduleSaved?.(wfhDays);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...wfhDays].sort()) !== JSON.stringify([...savedDays].sort());

  // Sort: me first, then teammates alphabetically
  const orderedRows = rows === null ? null : [
    ...rows.filter(r => r.employee_id === employeeId),
    ...rows
      .filter(r => r.employee_id !== employeeId)
      .sort((a, b) => a.full_name.localeCompare(b.full_name)),
  ];

  const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="glass rounded-2xl p-4 space-y-4">
        <div>
          <h3 className="card-label">Week Plan</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tap your row to set remote days. Max {MAX_REMOTE_DAYS}/week.
          </p>
        </div>

        {orderedRows === null ? (
          <div className="space-y-2" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header — today's column tinted to match the cells */}
            <div className="grid grid-cols-[minmax(72px,88px)_repeat(5,minmax(0,1fr))] items-center gap-2 text-xs font-medium text-muted-foreground">
              <div className="w-16 truncate" aria-label="Teammate name"></div>
              {DAYS.map(day => (
                <div key={day} className={`text-center ${day === todayName ? 'font-semibold text-primary' : ''}`}>{day}</div>
              ))}
            </div>

            {/* My row — editable */}
            {isEmployeeReady && orderedRows.some(r => r.employee_id === employeeId) ? (
              <div className="grid grid-cols-[minmax(72px,88px)_repeat(5,minmax(0,1fr))] items-center gap-2">
                <div className="w-16 truncate text-sm font-semibold text-primary">
                  {myName?.split(' ')[0] || 'You'}
                </div>
                {DAYS.map(day => {
                  const isWFH = wfhDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      aria-pressed={isWFH}
                      aria-label={`${day}: ${isWFH ? 'remote' : 'office'}. Tap to change.`}
                      className={`rounded h-9 flex items-center justify-center text-xs transition-all active:scale-95 border ${
                        isWFH
                          ? 'bg-primary/12 border-primary/30 text-primary'
                          : 'bg-muted/40 border-border/50 text-muted-foreground hover:border-border'
                      }`}
                    >
                      {isWFH && (
                        <>
                          <House className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">Remote</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Teammates — read-only */}
            {orderedRows
              .filter(r => r.employee_id !== employeeId)
              .map(member => (
                <div
                  key={member.employee_id}
                  className="grid grid-cols-[minmax(72px,88px)_repeat(5,minmax(0,1fr))] items-center gap-2"
                >
                  <div className="w-16 truncate text-foreground">
                    {member.full_name.split(' ')[0]}
                  </div>
                  {DAYS.map(day => {
                    const isWFH = member.wfh_days.includes(day);
                    return (
                      <div
                        key={day}
                        className={`rounded h-9 flex items-center justify-center text-xs border ${
                          isWFH
                            ? 'bg-primary/12 border-primary/30 text-primary'
                            : 'bg-muted/40 border-border/50 text-muted-foreground'
                        }`}
                      >
                        {isWFH && (
                          <>
                            <House className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Remote</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>
        )}

        {/* Legend + counter + save state */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>Remote</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted inline-block border border-border" />
              <span>Office</span>
            </div>
          </div>
          <span className={`text-[10px] font-medium ${wfhDays.length >= MAX_REMOTE_DAYS ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {wfhDays.length}/{MAX_REMOTE_DAYS} remote
          </span>
        </div>

        {!isEmployeeReady && (
          <p className="text-xs text-muted-foreground text-center">
            Loading your profile before saving this week&apos;s plan.
          </p>
        )}

        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            onClick={saveSchedule} disabled={saving || !isEmployeeReady}
            className="w-full py-2.5 rounded-xl text-sm font-medium bg-gradient-brand text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving\u2026' : 'Save plan'}
          </motion.button>
        )}

        {error && (
          <p className="text-xs text-destructive text-center">{error}</p>
        )}

        {saved && !hasChanges && (
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="text-[10px] text-primary text-center font-medium"
          >✓ Plan saved for this week</motion.p>
        )}
      </div>
    </motion.div>
  );
}
