'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { House } from 'lucide-react';
import WeekStrip from './week-strip';
import { getMondayOfWeek } from '@/lib/time';
import { firePlanSavedConfetti } from '@/lib/use-reward';

interface WFHPlannerTabProps {
  employeeId?: string;
  onScheduleSaved?: (days: string[]) => void;
}

export default function WFHPlannerTab({ employeeId, onScheduleSaved }: WFHPlannerTabProps) {
  const [wfhDays, setWfhDays] = useState<string[]>([]);
  const [savedDays, setSavedDays] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const weekStart = getMondayOfWeek(new Date());

  useEffect(() => {
    if (!employeeId) return;
    fetch(`/api/wfh-schedule?week=${weekStart}&employeeId=${employeeId}`)
      .then(r => r.json())
      .then(({ data }) => {
        if (data?.length > 0) {
          setWfhDays(data[0].wfh_days || []);
          setSavedDays(data[0].wfh_days || []);
          setSaved(true);
        }
      })
      .catch(() => {});
  }, [employeeId, weekStart]);

  const MAX_REMOTE_DAYS = 2;
  const isEmployeeReady = Boolean(employeeId);

  const toggleDay = (day: string) => {
    if (!isEmployeeReady) return;
    setSaved(false);
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
      firePlanSavedConfetti();
      if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      onScheduleSaved?.(wfhDays);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...wfhDays].sort()) !== JSON.stringify([...savedDays].sort());

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Personal plan — Raised card */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm dark:shadow-none space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Plan</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tap the days you&apos;ll be remote. Max 2/week.</p>
        </div>

        <WeekStrip wfhDays={wfhDays} size="full" onToggle={toggleDay} />

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

      {/* Team plan — Raised card */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-sm dark:shadow-none space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Team&apos;s Plan</h3>
        <TeamWeekView weekStart={weekStart} />
      </div>
    </motion.div>
  );
}

function TeamWeekView({ weekStart }: { weekStart: string }) {
  const [team, setTeam] = useState<{ name: string; wfhDays: string[] }[]>([]);

  useEffect(() => {
    fetch(`/api/wfh-schedule?week=${weekStart}`)
      .then(r => r.json())
      .then(({ data }) => {
        setTeam((data || []).map((row: any) => ({
          name: row.employees?.full_name?.split(' ')[0] || '?',
          wfhDays: row.wfh_days || [],
        })));
      });
  }, [weekStart]);

  if (!team.length)
    return <p className="text-xs text-muted-foreground">No team members have set their plan yet.</p>;

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-[minmax(72px,88px)_repeat(5,minmax(0,1fr))] items-center gap-2 text-xs font-medium text-muted-foreground">
        <div className="w-16 truncate" aria-label="Teammate name"></div>
        {DAYS.map(day => (
          <div key={day} className="text-center">{day}</div>
        ))}
      </div>
      {/* Rows */}
      {team
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(member => (
          <div key={member.name} className="grid grid-cols-[minmax(72px,88px)_repeat(5,minmax(0,1fr))] items-center gap-2">
            {/* Name */}
            <div className="w-16 truncate text-foreground">{member.name}</div>
            {/* Weekday cells */}
            {DAYS.map(day => {
              const isWFH = member.wfhDays.includes(day);
              const today = new Date();
              const todayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()];
              const isToday = day === todayName;

              return (
                <div
                  key={day}
                  className={`rounded h-9 flex items-center justify-center text-xs ${
                    isWFH
                      ? 'bg-primary/12 border-primary/30 text-primary'
                      : 'bg-muted/40 border-border/50 text-muted-foreground'
                  } ${isToday ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background' : ''}`}
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
  );
}
