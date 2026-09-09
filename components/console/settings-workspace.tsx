"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown";
import { apiAddHoliday, apiAddHolidays, apiDeleteHoliday, useHolidays } from "./data";
import { HOLIDAY_TEMPLATES, type HolidayTemplate } from "./holiday-templates";
import { isExperimentalEnabled, setExperimentalEnabled } from "./experimental";
import { cn } from "@/lib/utils";
import type { Holiday } from "./types";

/**
 * Module 10 — Settings. Holiday management is live (new /api/admin/holidays);
 * teams/designations and the roles matrix stay out until there's a real
 * permissions model — the access card says so honestly.
 */
export function SettingsWorkspace() {
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-5">
        <HolidayManager />
        {/* Two independent columns — natural card heights, no grid-stretch holes. */}
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <ExperimentalCard />
            <AccessCard />
          </div>
          <div className="flex flex-col gap-5">
            <IntegrationsCard />
            <TeamsCard />
          </div>
        </div>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">See what&apos;s coming.</span>{" "}
          Turns on the not-yet-built modules — Payroll, Recruitment, Onboarding, Performance. A lot
          won&apos;t work yet; feedback shapes what ships.
        </p>
        <Switch checked={on} onCheckedChange={toggle} aria-label="Experimental features" />
      </div>
    </SectionCard>
  );
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

/**
 * All holiday management in one card — templates, add options, and the
 * configured list. Splitting them across separate cards hid the connection:
 * applying a template updates the list in the other box.
 */
function HolidayManager() {
  const holidays = useHolidays();
  const [viewYear, setViewYear] = useState(() => {
    const n = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    return n.getFullYear();
  });
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [configuredOpen, setConfiguredOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(true);

  const all = holidays.data?.holidays ?? [];
  const yearHolidays = useMemo(
    () =>
      all
        .filter((h) => h.date.startsWith(String(viewYear)))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [all, viewYear]
  );

  const reload = async () => {
    await holidays.refresh();
  };

  const add = async () => {
    if (!date) return;
    setBusy(true);
    setNotice(null);
    try {
      await apiAddHoliday({ name: name.trim(), date });
      setName("");
      setDate("");
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
    <div className="mb-5">
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

      <SectionCard
        label="Holidays"
        action={<CalendarPlus className="h-3.5 w-3.5 text-muted-foreground/60" />}
      >
        {holidays.loading && !holidays.data ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted/50" />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <button
                  onClick={() => setTemplatesOpen((v) => !v)}
                  className="flex h-7 w-full items-center gap-2 text-left"
                  aria-expanded={templatesOpen}
                >
                  <span className="card-label">Apply a template</span>
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[12px] font-bold tabular-nums text-muted-foreground">
                    {HOLIDAY_TEMPLATES.length}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                      templatesOpen && "rotate-180"
                    )}
                  />
                </button>
                {templatesOpen ? (
                  <>
                    <ul className="mt-2 divide-y divide-border/40">
                      {HOLIDAY_TEMPLATES.map((t) => (
                        <li key={t.key} className="flex items-center gap-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <span className="truncate">{t.label}</span>
                              {t.preferred ? <Chip tone="warning">Preferred</Chip> : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{t.holidays.length} holidays</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 shrink-0 rounded-lg"
                            onClick={() => applyTemplate(t)}
                            disabled={busy}
                          >
                            Apply
                          </Button>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Applying adds only the holidays not already on the calendar.
                    </p>
                  </>
                ) : null}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setNotice(null);
                    }}
                    aria-label="Holiday date"
                    className="h-9 w-40 rounded-lg border-border/60"
                  />
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Holiday name"
                    className="h-9 min-w-36 flex-1 rounded-lg border-border/60"
                  />
                  <Button
                    className="h-9 rounded-lg button-press"
                    onClick={add}
                    disabled={!date || !name.trim() || busy}
                  >
                    {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9 rounded-lg"
                    onClick={() => setShowBulk(true)}
                    disabled={busy}
                  >
                    Paste from Excel…
                  </Button>
                </div>

                <div className="mt-4 border-t border-border/50 pt-3">
                  <div className="flex h-7 items-center justify-between gap-2">
                    <button
                      onClick={() => setConfiguredOpen((v) => !v)}
                      className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                      aria-expanded={configuredOpen}
                    >
                      <span className="card-label">
                        Configured · {yearHolidays.length} in {viewYear}
                      </span>
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[12px] font-bold tabular-nums text-muted-foreground">
                        {yearHolidays.length}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                          configuredOpen && "rotate-180"
                        )}
                      />
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        onClick={() => setViewYear((y) => y - 1)}
                        aria-label="Previous year"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="min-w-10 text-center text-sm font-semibold tabular-nums text-foreground">
                        {viewYear}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 rounded-lg p-0"
                        onClick={() => setViewYear((y) => y + 1)}
                        aria-label="Next year"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {configuredOpen ? (
                    yearHolidays.length === 0 ? (
                      <p className="py-2 text-sm text-muted-foreground">No holidays configured for {viewYear}.</p>
                    ) : (
                      <ul className="max-h-72 divide-y divide-border/40 overflow-y-auto scrollbar-hide">
                        {yearHolidays.map((holiday) => (
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
                    )
                  ) : null}
                </div>
              </div>
            </div>
          </>
        )}
      </SectionCard>

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
    </div>
  );
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
