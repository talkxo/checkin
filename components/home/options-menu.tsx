'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, Moon, Bell, BellOff, IdCard, Sun, Copy, BadgeCheck } from 'lucide-react';
import { useTheme, type Theme } from '@/components/theme-provider';

interface OptionsMenuProps {
  slug: string;
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
  slug,
  recordName,
  displayName,
  onDisplayNameChange,
  remindersEnabled,
  onToggleReminders,
  onLogout,
}: OptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — nothing visible changes
    }
  };
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  const themes: Array<{ value: Theme; label: string; icon?: typeof Sun; glyph?: string }> = [
    { value: 'auto', label: 'Auto', glyph: 'A' },
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
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{recordName}</p>
                <button
                  onClick={copySlug}
                  className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy slug"
                >
                  <span className="font-mono">{slug}</span>
                  {copied ? <BadgeCheck className="h-3 w-3 text-success-500" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-[11px] text-muted-foreground">What should we call you?</p>
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
              className="flex w-full items-start justify-between gap-3 rounded-lg px-1 py-2 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-start gap-2.5">
                {remindersEnabled ? <Bell className="mt-0.5 h-4 w-4" /> : <BellOff className="mt-0.5 h-4 w-4" />}
                <span className="flex flex-col items-start">
                  <span className="text-sm text-foreground">Timing reminders</span>
                  <span className="text-[11px] text-muted-foreground">10:00 AM & 6:30 PM IST</span>
                </span>
              </span>
              <span
                className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
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
                      {t.icon ? (
                        <t.icon className="h-3.5 w-3.5" />
                      ) : (
                        <span className="text-[11px] font-bold leading-none">{t.glyph}</span>
                      )}
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
