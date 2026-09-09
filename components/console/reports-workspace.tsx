"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "./console-shell";
import { SectionCard, Chip } from "./ui/bento";
import { SegmentedControl } from "./ui/segmented";
import { Button } from "@/components/ui/button";
import {
  apiAiInsights,
  apiAiReport,
  apiAiSentiment,
  getHistoricalData,
  getMoodData,
  useToday,
} from "./data";

type RangeKey = "today" | "week" | "month" | "lastMonth" | "custom";
type ReportKind = "summary" | "insights" | "sentiment";

const RANGE_LABEL: Record<Exclude<RangeKey, "custom">, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  lastMonth: "Last Month",
};

const KIND_LABEL: Record<ReportKind, string> = {
  summary: "Attendance summary",
  insights: "Insights & patterns",
  sentiment: "Mood & sentiment",
};

interface Suggestion {
  prompt: string;
  kind: ReportKind;
  range: RangeKey;
}

const SUGGESTIONS: Suggestion[] = [
  { prompt: "How did we do this week?", kind: "summary", range: "week" },
  { prompt: "Who's trending down, and why might that be?", kind: "insights", range: "month" },
  { prompt: "How is the team feeling lately?", kind: "sentiment", range: "week" },
  { prompt: "Break down office vs remote attendance.", kind: "summary", range: "month" },
];

interface GeneratedReport {
  id: number;
  kind: ReportKind;
  rangeLabel: string;
  meta: { records: number; people: number };
  content: string;
}

export function ReportsWorkspace() {
  const today = useToday();
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<ReportKind>("summary");
  const [range, setRange] = useState<RangeKey>("week");
  const [custom, setCustom] = useState<{ startDate: string; endDate: string }>(() => {
    const key = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    return { startDate: key, endDate: key };
  });
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const timeRangeLabel =
    range === "custom" ? `${custom.startDate} → ${custom.endDate}` : RANGE_LABEL[range];

  const applySuggestion = (s: Suggestion) => {
    setPrompt(s.prompt);
    setKind(s.kind);
    setRange(s.range);
  };

  const generate = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const mockRange = range === "lastMonth" ? "previousMonth" : range;
      const customArg = range === "custom" ? custom : undefined;
      let content = "";
      let meta = { records: 0, people: 0 };

      if (kind === "sentiment") {
        const moodData = await getMoodData(mockRange, customArg);
        meta = {
          records: moodData.length,
          people: new Set(moodData.map((e: any) => e?.employee_id || e?.slug || e?.name).filter(Boolean)).size,
        };
        const data = await apiAiSentiment({ moodData, timeRange: timeRangeLabel });
        content = data.sentiment ?? "";
      } else {
        const attendanceData =
          range === "today" ? (today.data?.attendance ?? []) : await getHistoricalData(mockRange, customArg);
        meta = {
          records: attendanceData.length,
          people: new Set(attendanceData.map((e: any) => e?.employee_id || e?.slug || e?.name).filter(Boolean)).size,
        };
        const payload = { attendanceData, timeRange: timeRangeLabel, prompt: prompt.trim() || undefined };
        const data = kind === "summary" ? await apiAiReport(payload) : await apiAiInsights(payload);
        content = (kind === "summary" ? data.report : data.insights) ?? "";
      }

      if (!content) throw new Error("AI returned nothing for this range.");
      setReports((prev) => [
        { id: Date.now(), kind, rangeLabel: timeRangeLabel, meta, content },
        ...prev.slice(0, 4),
      ]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The report could not be generated.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async (report: GeneratedReport) => {
    try {
      await navigator.clipboard.writeText(report.content);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard blocked — text stays selectable
    }
  };

  const canGenerate = range !== "custom" || (custom.startDate && custom.endDate);

  return (
    <>
      <PageHeader title="Reports" />

      {/* Composer hero — ask first, context inline */}
      <section className="glass-strong rounded-3xl p-5 sm:p-7">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
          }}
          rows={3}
          placeholder="Ask about your team's attendance — trends, outliers, mood…"
          className="w-full resize-none bg-transparent text-[17px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
          autoFocus
        />

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.prompt}
              onClick={() => applySuggestion(s)}
              className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
            >
              {s.prompt}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border/50 pt-4">
          <SegmentedControl
            size="md"
            value={kind}
            onChange={(v) => setKind(v as ReportKind)}
            options={[
              { value: "summary", label: "Summary" },
              { value: "insights", label: "Insights" },
              { value: "sentiment", label: "Mood" },
            ]}
          />
          <SegmentedControl
            size="md"
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            options={[
              { value: "today", label: "Today" },
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "lastMonth", label: "Last month" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {range === "custom" ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={custom.startDate}
                onChange={(e) => setCustom((p) => ({ ...p, startDate: e.target.value }))}
                className="h-9 rounded-lg border border-border/60 bg-transparent px-2.5 text-[13px] outline-none"
              />
              <span className="text-[13px] text-muted-foreground">→</span>
              <input
                type="date"
                value={custom.endDate}
                onChange={(e) => setCustom((p) => ({ ...p, endDate: e.target.value }))}
                className="h-9 rounded-lg border border-border/60 bg-transparent px-2.5 text-[13px] outline-none"
              />
            </div>
          ) : null}

          <Button
            className="ml-auto h-10 rounded-xl px-5 text-[15px] button-press"
            onClick={generate}
            disabled={loading || !canGenerate}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
      </section>

      {/* Session thread — newest report first */}
      {reports.length > 0 ? (
        <div className="mt-5 space-y-4">
          {reports.map((report) => (
            <SectionCard
              key={report.id}
              label={KIND_LABEL[report.kind]}
              action={
                <>
                  <Chip tone="info">{report.rangeLabel}</Chip>
                  <Chip tone="neutral">
                    {report.meta.records} records · {report.meta.people} people
                  </Chip>
                  <Button variant="outline" size="sm" className="h-7 rounded-lg px-2.5" onClick={() => copy(report)}>
                    {copiedId === report.id ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                    {copiedId === report.id ? "Copied" : "Copy"}
                  </Button>
                </>
              }
            >
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <ReactMarkdown>{report.content}</ReactMarkdown>
              </div>
            </SectionCard>
          ))}
          <p className="px-1 text-xs text-muted-foreground">Reports live for this session only.</p>
        </div>
      ) : !loading ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Generated reports stack up here — newest first.
        </p>
      ) : null}
    </>
  );
}
