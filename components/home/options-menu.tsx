'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Bell, BellOff, IdCard, Sun } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider';

interface OptionsMenuProps {
  recordName: string;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  remindersEnabled: boolean;
  onToggleReminders: () => void;
  onLogout: () => void;
}

/**
 * The sandwich menu — notifications, theme (light/dark/auto), display-name
 * preference and logout, replacing the three loose header buttons.
 */
export default function OptionsMenu({
  recordName,
  displayName,
  onDisplayNameChange,
  remindersEnabled,
  onToggleReminders,
  onLogout,
}: OptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const themes: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: 'auto', label: 'Auto', icon: Sun },
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Options"
        aria-expanded={open}
        className="flex h-9 w-9 flex-col items-center justify-center gap-[3px] rounded-lg transition-colors hover:bg-muted/80"
      >
        <span className="h-0.5 w-4 rounded-full bg-foreground" />
        <span className="h-0.5 w-4 rounded-full bg-foreground" />
        <span className="h-0.5 w-4 rounded-full bg-foreground" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute right-0 top-11 z-50 w-72 rounded-2xl p-4 text-left">
            {/* Identity + display name */}
            <div className="flex items-center gap-2.5">
              <IdCard className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{recordName}</p>
                <p className="text-[11px] text-muted-foreground">Name on record</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] text-muted-foreground">Greeting calls you</p>
              <input
                value={displayName}
                onChange={(e) => onDisplayNameChange(e.target.value)}
                placeholder={recordName.split(' ')[0]}
                maxLength={24}
                className="h-8 w-full rounded-lg border border-glass-border bg-background/70 px-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="my-3 h-px bg-glass-border" />

            {/* Notifications */}
            <button
              onClick={onToggleReminders}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-2.5 text-sm text-foreground">
                {remindersEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                Reminders (10 AM & 6:30 PM)
              </span>
              <span
                className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                  remindersEnabled ? 'bg-success-500' : 'bg-muted-foreground/40'
                }`}
                role="switch"
                aria-checked={remindersEnabled}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
                    remindersEnabled ? 'left-[18px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>

            {/* Theme */}
            <div className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2">
              <span className="flex items-center gap-2.5 text-sm text-foreground">
                <Moon className="h-4 w-4" />
                Theme
              </span>
              <div className="flex items-center gap-0.5 rounded-lg bg-black/5 p-0.5 dark:bg-white/10">
                {themes.map((t) => {
                  const Icon = t.icon;
                  const active = theme === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setTheme(t.value)}
                      aria-pressed={active}
                      title={t.label}
                      className={`flex h-6 w-8 items-center justify-center rounded-md transition-colors ${
                        active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="my-3 h-px bg-glass-border" />

            {/* Logout */}
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-1 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
