"use client";

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Lightbulb, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBanner } from "@/components/ui/status-banner";

type AiFeature = "insights" | "report" | "sentiment";
type AiRange = "today" | "week" | "month";

interface AdminAiWorkspaceProps {
  aiTimeRange: AiRange;
  selectedAiFeature: AiFeature;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  onAiTimeRangeChange: (range: AiRange) => void;
  onSelectedAiFeatureChange: (feature: AiFeature) => void;
  onGenerate: () => void;
  isLoading: boolean;
  result: string;
}

const promptPresets: Record<AiFeature, string> = {
  insights: "Summarize the main attendance risks, workload patterns, and follow-ups an HR operator should act on first.",
  report: "Create a concise manager-ready report with notable changes, issues, and recommended actions.",
  sentiment: "Review mood signals and flag any well-being risks, team sentiment shifts, or follow-up opportunities.",
};

export function AdminAiWorkspace({
  aiTimeRange,
  selectedAiFeature,
  customPrompt,
  onCustomPromptChange,
  onAiTimeRangeChange,
  onSelectedAiFeatureChange,
  onGenerate,
  isLoading,
  result,
}: AdminAiWorkspaceProps) {
  const promptText = useMemo(() => customPrompt || promptPresets[selectedAiFeature], [customPrompt, selectedAiFeature]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/50 bg-card px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Assistive Analysis</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Ask for a useful answer, not just a generated blob</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep AI anchored to time range, dataset, and next action so operators can trust the output.</p>
          </div>
          <StatusBanner
            variant="info"
            title="Data Scope"
            message={`${aiTimeRange === "today" ? "Today" : aiTimeRange === "week" ? "This week" : "This month"} · ${selectedAiFeature === "insights" ? "Engagement insights" : selectedAiFeature === "report" ? "Executive report" : "Mood analysis"}`}
            className="max-w-md"
          />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-border/50 bg-card px-5 py-5">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Choose Dataset</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ["today", "Today"],
                  ["week", "This Week"],
                  ["month", "This Month"],
                ] as const).map(([range, label]) => (
                  <button
                    key={range}
                    onClick={() => onAiTimeRangeChange(range)}
                    className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                      aiTimeRange === range ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">Pick Output Type</h3>
              <div className="mt-3 space-y-2">
                {([
                  ["insights", "Risks & Attention Areas", Lightbulb],
                  ["report", "Executive Summary", Sparkles],
                  ["sentiment", "Mood & Well-being", MessageSquareText],
                ] as const).map(([feature, label, Icon]) => (
                  <button
                    key={feature}
                    onClick={() => onSelectedAiFeatureChange(feature)}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selectedAiFeature === feature
                        ? "border-primary/25 bg-primary/10"
                        : "border-border/60 bg-muted/10 hover:bg-muted/20"
                    }`}
                  >
                    <div className="rounded-xl bg-muted/70 p-2">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{promptPresets[feature]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Operator Prompt</label>
              <textarea
                value={promptText}
                onChange={(event) => onCustomPromptChange(event.target.value)}
                className="mt-2 min-h-[140px] w-full rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <Button onClick={onGenerate} disabled={isLoading} className="w-full rounded-xl">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              Generate Analysis
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border/50 bg-card px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Output</h3>
              <p className="text-sm text-muted-foreground">Every result should answer what happened, why it matters, and what to do next.</p>
            </div>
          </div>

          <div className="mt-5">
            {result ? (
              <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground dark:prose-invert">
                <ReactMarkdown>{result}</ReactMarkdown>
              </div>
            ) : (
              <EmptyState
                title="No analysis generated yet"
                description="Choose a dataset, refine the prompt if needed, and generate a scoped answer."
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
