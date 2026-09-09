"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarHeart,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  KeyRound,
  Loader2,
  Plug,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip } from "./ui/bento";
import { Switch } from "./ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiAddHoliday, apiAddHolidays, apiDeleteHoliday, useHolidays } from "./data";
import { HOLIDAY_TEMPLATES, type HolidayTemplate } from "./holiday-templates";
import { MonthGrid } from "./ui/month-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isExperimentalEnabled, setExperimentalEnabled } from "./experimental";
import type { Holiday } from "./types";

/**
 * Module 10 — Settings. Holiday calendar is live (new /api/admin/holidays);
 * teams/designations and the roles matrix stay out until there's a real
 * permissions model — the access card says so honestly.
 */
export function SettingsWorkspace() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-5">
        <ExperimentalCard />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <HolidayCalendarCard />
        <IntegrationsCard />
        <TeamsCard />
        <AccessCard />
      </div>
    </>
  );
}

function ExperimentalCard() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isExperimentalEnabled());
  }, []);

  const toggle = (value: boolean) => {
    setOn(value);
    setExperimentalEnabled(value);
  };

  return (
    <SectionCard label="Experimental features" action={<FlaskConical className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-foreground">See what&apos;s coming</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Turns on Payroll, Recruitment, Onboarding, and Performance in the menu — modules still
            being designed. A lot in them won&apos;t work yet, but you get an early look at the
            direction, and your feedback shapes what ships. Off by default: the console stays
            focused on workspace management.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <Switch checked={on} onCheckedChange={toggle} aria-label="Experimental features" />
          <Chip tone={on ? "warning" : "neutral"}>{on ? "On" : "Off"}</Chip>
        </div>
      </div>
    </SectionCard>
  );
}

function HolidayCalendarCard() {
  const holidays = useHolidays();
  const [cursor, setCursor] = useState(() => {
    const n = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return { year: n.getFullYear(), month: n.getMonth() + 1 };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const all = holidays.data?.holidays ?? [];
  const byDate = useMemo(() => new Map(all.map((h) => [h.date, h])), [all]);
  const prefix = `${cursor.year}-${pad2(cursor.month)}`;
  const monthHolidays = all.filter((h) => h.date.startsWith(prefix));
  const yearCount = all.filter((h) => h.date.startsWith(String(cursor.year))).length;

  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const d = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
    });
    setSelectedDay(null);
  };

  const dayState = (key: string) => {
    const holiday = byDate.get(key);
    return holiday
      ? { className: "bg-violet-500/10 text-foreground/80", dot: "holiday" as const, title: holiday.name }
      : undefined;
  };

  const reload = async () => {
    await holidays.refresh();
  };

  const add = async () => {
    if (!selectedDay) return;
    setBusy(true);
    setNotice(null);
    try {
      await apiAddHoliday({ name: name.trim(), date: selectedDay });
      setName("");
      setSelectedDay(null);
      setNotice({ tone: "success", text: "Holiday added — it now tints the team calendars." });
      await reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not add the holiday." });
    } finally {
      setBusy(false);
    }
  };

  const applyTemplate = async (template: HolidayTemplate) => {
    setNotice(null);
    const existing = new Set(all.map((h) => `${h.name}|${h.date}`));
    const items = template.holidays.filter((h) => !existing.has(`${h.name}|${h.date}`));
    if (items.length === 0) {
      setNotice({ tone: "success", text: "Calendar already has everything in that template." });
      return;
    }
    setBusy(true);
    try {
      const res = await apiAddHolidays(items);
      setNotice({
        tone: "success",
        text: `${res.added} of ${res.submitted} added from "${template.label}". Review dates — floating festivals shift yearly.`,
      });
      await reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not apply the template." });
    } finally {
      setBusy(false);
    }
  };

  const bulkItems = useMemo(() => parseBulkHolidays(bulkText), [bulkText]);

  const applyBulk = async () => {
    if (!bulkItems.length) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiAddHolidays(bulkItems);
      setBulkText("");
      setShowBulk(false);
      setNotice({ tone: "success", text: `${res.added} of ${res.submitted} pasted holidays added.` });
      await reload();
    } catch (err) {
      setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Bulk add failed." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      label="Holiday calendar"
      action={<CalendarHeart className="h-3.5 w-3.5 text-muted-foreground/60" />}
    >
      {notice ? (
        <p
          className={
            notice.tone === "success"
              ? "mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
              : "mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
          }
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-32 text-center text-sm font-semibold text-foreground">{monthLabel}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 rounded-lg p-0"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {monthHolidays.length} this month · {yearCount} in {cursor.year}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-lg" disabled={busy}>
              Templates
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {HOLIDAY_TEMPLATES.map((t) => (
              <DropdownMenuItem key={t.key} onSelect={() => applyTemplate(t)}>
                {t.label}
                <span className="ml-auto text-xs text-muted-foreground">{t.holidays.length}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setShowBulk(true)}>
              Paste from Excel…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {holidays.loading && !holidays.data ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted/50" />
      ) : (
        <>
          <MonthGrid
            year={cursor.year}
            month={cursor.month}
            dayState={dayState}
            selected={selectedDay}
            onDayClick={(key) => {
              setSelectedDay(key === selectedDay ? null : key);
              setNotice(null);
            }}
          />
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> holiday
            </span>
          </div>

          {/* Constant-height slot — swapping hint for the form must not resize the card */}
          <div className="mt-3 flex min-h-[3.5rem] items-center">
            {selectedDay ? (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {new Date(`${selectedDay}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder="Holiday name"
                  className="h-9 min-w-36 flex-1 rounded-lg border-border/60"
                  autoFocus
                />
                <Button size="sm" className="h-8 rounded-lg button-press" onClick={add} disabled={!name.trim() || busy}>
                  {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                  Add
                </Button>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Click a day to add a holiday.</span>
            )}
          </div>

          <div className="mt-4 border-t border-border/50 pt-3">
            <p className="card-label mb-2">This month</p>
            {monthHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No holidays in {monthLabel}.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {monthHolidays.map((holiday) => (
                  <li key={holiday.id} className="group flex items-center gap-3 py-2.5 text-[15px]">
                    <span className="w-20 shrink-0 tabular-nums text-muted-foreground">
                      {new Date(`${holiday.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                    <span className="truncate text-foreground/90">{holiday.name}</span>
                    <button
                      onClick={() => removeHoliday(holiday, setNotice, reload)}
                      className="ml-auto rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-red-500/10 hover:text-red-600"
                      aria-label={`Remove ${holiday.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk add holidays</DialogTitle>
            <DialogDescription>
              Paste two columns straight from Excel — date and name, either order. Accepts
              2026-01-26 or 26/01/2026.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={7}
            placeholder={"26/01/2026\tRepublic Day\n2026-03-04, Holi"}
            className="w-full rounded-lg border border-border/60 bg-background/60 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {bulkItems.length} row{bulkItems.length === 1 ? "" : "s"} detected — duplicates are skipped.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button onClick={applyBulk} disabled={busy || !bulkItems.length} className="button-press">
              {busy ? "Adding…" : `Add ${bulkItems.length || ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

async function removeHoliday(
  holiday: Holiday,
  setNotice: (n: { tone: "success" | "danger"; text: string } | null) => void,
  reload: () => Promise<void>
) {
  setNotice(null);
  try {
    await apiDeleteHoliday(holiday.id);
    await reload();
  } catch (err) {
    setNotice({ tone: "danger", text: err instanceof Error ? err.message : "Could not remove the holiday." });
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function toISODate(value: string): string | null {
  const t = value.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${pad2(Number(m[2]))}-${pad2(Number(m[1]))}`;
  return null;
}

/** Excel paste: rows with a date cell (ISO or DD/MM/YYYY) and a name cell, any order. */
function parseBulkHolidays(text: string): Array<{ name: string; date: string }> {
  const out: Array<{ name: string; date: string }> = [];
  for (const line of text.split("\n")) {
    const cells = line.split(/\t|,/).map((c) => c.trim()).filter(Boolean);
    if (!cells.length) continue;
    let date: string | null = null;
    let name: string | null = null;
    for (const cell of cells) {
      const iso = toISODate(cell);
      if (iso && !date) {
        date = iso;
        continue;
      }
      if (!name) name = cell;
    }
    if (date && name) out.push({ name, date });
  }
  return out;
}

function TeamsCard() {
  return (
    <SectionCard label="Teams & designations" action={<Users className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Team grouping feeds directory filters, org chart, and per-team reports. Needs a teams schema first.
        </p>
        <Chip tone="neutral">Planned</Chip>
      </div>
    </SectionCard>
  );
}

function AccessCard() {
  return (
    <SectionCard label="Access" action={<KeyRound className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <div className="space-y-2 text-sm">
        <p className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Admin access</span>
          <Chip tone="success">Single admin key</Chip>
        </p>
        <p className="text-muted-foreground">
          One shared key signs the admin session. A roles &amp; permissions matrix arrives with a real
          permissions model — not before.
        </p>
      </div>
    </SectionCard>
  );
}

function IntegrationsCard() {
  return (
    <SectionCard label="Connected tools" action={<Plug className="h-3.5 w-3.5 text-muted-foreground/60" />}>
      <ul className="divide-y divide-border/40">
        <li className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Basecamp</p>
            <p className="text-xs text-muted-foreground">Announcements & chatbot — configured via server environment</p>
          </div>
          <Chip tone="success">Connected</Chip>
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">AI (OpenRouter)</p>
            <p className="text-xs text-muted-foreground">Powers the dashboard digest, Ask HR, and reports</p>
          </div>
          <Chip tone="success">Connected</Chip>
        </li>
        <li className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">Payroll partner</p>
            <p className="text-xs text-muted-foreground">Exports arrive with the Payroll module</p>
          </div>
          <Chip tone="neutral">Planned</Chip>
        </li>
      </ul>
    </SectionCard>
  );
}
