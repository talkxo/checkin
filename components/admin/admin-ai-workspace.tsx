"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Bot, Brain, Lightbulb, Loader2, MessageSquareText, RefreshCw, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type AiFeature = "insights" | "report" | "sentiment";
type AiRange = "today" | "week" | "month" | "lastMonth" | "custom";

interface AdminAiWorkspaceProps {
  aiTimeRange: AiRange;
  selectedAiFeature: AiFeature;
  customPrompt: string;
  onCustomPromptChange: (value: string) => void;
  onAiTimeRangeChange: (range: AiRange) => void;
  aiCustomRange: { startDate: string; endDate: string };
  onAiCustomRangeChange: (range: { startDate: string; endDate: string }) => void;
  onSelectedAiFeatureChange: (feature: AiFeature) => void;
  onGenerate: () => void;
  isLoading: boolean;
  result: string;
  resultMeta: {
    recordsAnalyzed: number;
    uniquePeople: number;
    officeCount: number;
    remoteCount: number;
    moodEntries: number;
  };
}

const promptPresets: Record<AiFeature, string> = {
  insights:
    "Analyze attendance behavior and surface the top operational signals for People Ops. Return: (1) top 5 risks ranked by impact/urgency, (2) notable outliers and pattern shifts, (3) likely root causes, (4) immediate follow-ups for today/this week, and (5) one preventive policy recommendation. Keep it specific, evidence-based, and action-first.",
  report:
    "Produce a manager-ready weekly brief with clear sections: Executive Summary, What's Improving, What's At Risk, Team/Individual Outliers, Leave & Capacity Pressure, and Recommended Actions. Include concrete numbers/trends where available, then end with a prioritized action list (Now / Next / Later) and owner suggestions.",
  sentiment:
    "Assess mood + attendance together to identify engagement and well-being risk. Highlight sentiment shifts, clusters by team/time, potential burnout indicators, and employees/teams needing supportive check-ins. End with empathetic interventions: recognition opportunities, manager talking points, and HR actions for the next 7 days.",
};

const reportTypeHighlights: Record<AiFeature, string> = {
  insights: "Top risks • Pattern shifts • Root causes • Immediate follow-ups",
  report: "Executive summary • What changed • Outliers • Prioritized actions",
  sentiment: "Engagement signals • Burnout flags • Support opportunities • 7-day interventions",
};

const chatPromptPool = [
  "Who is trending late this week, and what follow-up should happen first?",
  "Which teams are over-indexed on remote vs office in the last month?",
  "Show attendance anomalies that could indicate burnout risk.",
  "What people-ops action items should we prioritize before Friday?",
  "Which employees have repeated no-fill patterns this month?",
  "Are leave requests clustering around certain teams or dates?",
  "What is the top managerial risk from current attendance behavior?",
  "Suggest one concrete attendance policy tweak based on current trends.",
  "Who might need a supportive check-in based on mood + attendance?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ReportQueueItem {
  id: string;
  feature: AiFeature;
  rangeLabel: string;
  promptPreview: string;
  requestedAt: number;
  status: "pending" | "ready" | "failed";
  content?: string;
  meta?: {
    recordsAnalyzed: number;
    uniquePeople: number;
    officeCount: number;
    remoteCount: number;
    moodEntries: number;
  };
}

export function AdminAiWorkspace({
  aiTimeRange,
  selectedAiFeature,
  customPrompt,
  onCustomPromptChange,
  onAiTimeRangeChange,
  aiCustomRange,
  onAiCustomRangeChange,
  onSelectedAiFeatureChange,
  onGenerate,
  isLoading,
  result,
  resultMeta,
}: AdminAiWorkspaceProps) {
  const promptText = useMemo(() => customPrompt || promptPresets[selectedAiFeature], [customPrompt, selectedAiFeature]);
  const [downloadReady, setDownloadReady] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatStyle, setChatStyle] = useState<"short" | "detailed" | "report">("detailed");
  const [activeView, setActiveView] = useState<"reports" | "chat">("chat");
  const [samplePrompts, setSamplePrompts] = useState<string[]>([]);
  const [reportQueue, setReportQueue] = useState<ReportQueueItem[]>([]);
  const [activeReportRequestId, setActiveReportRequestId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Ask me anything about attendance, anomalies, leave pressure, or team-level trends. I will answer using live admin data.",
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    refreshSamplePrompts();
  }, []);

  useEffect(() => {
    setDownloadReady(Boolean(result));
  }, [result]);

  const sendChat = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput("");
    setChatMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", content: message }]);
    setChatLoading(true);

    try {
      const response = await fetch("/api/admin-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, responseStyle: chatStyle }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Request failed (${response.status})`);
      }

      const payload = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          content: payload.response || "No response returned.",
        },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-e`,
          role: "assistant",
          content: `I couldn't complete that request right now. ${error instanceof Error ? error.message : "Please retry."}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const refreshSamplePrompts = () => {
    const shuffled = [...chatPromptPool].sort(() => Math.random() - 0.5);
    setSamplePrompts(shuffled.slice(0, 3));
  };

  const buildRangeLabel = () => {
    if (aiTimeRange === "today") return "Today";
    if (aiTimeRange === "week") return "This week";
    if (aiTimeRange === "month") return "This month";
    if (aiTimeRange === "lastMonth") return "Last month";
    return `${aiCustomRange.startDate} to ${aiCustomRange.endDate}`;
  };

  const formatQueueTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const getReportLabel = (feature: AiFeature) =>
    feature === "insights" ? "Risks & Attention Areas" : feature === "report" ? "Executive Summary" : "Mood & Well-being";

  const downloadReport = (item: ReportQueueItem) => {
    if (!item.content) return;
    const safeRange = item.rangeLabel.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-_]/g, "");
    const fileName = `insyde-${item.feature}-${safeRange || "report"}.md`.toLowerCase();
    const blob = new Blob([item.content], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async () => {
    const requestId = `rq-${Date.now()}`;
    const queueItem: ReportQueueItem = {
      id: requestId,
      feature: selectedAiFeature,
      rangeLabel: buildRangeLabel(),
      promptPreview: (promptText || "").trim().slice(0, 120),
      requestedAt: Date.now(),
      status: "pending",
      meta: resultMeta,
    };

    setReportQueue((prev) => [queueItem, ...prev]);
    setActiveReportRequestId(requestId);

    try {
      await Promise.resolve(onGenerate());
    } catch {
      // parent handles failures in its own state; queue status is finalized below
    }
  };

  useEffect(() => {
    if (!activeReportRequestId) return;
    if (!isLoading) {
      setReportQueue((prev) =>
        prev.map((item) =>
          item.id === activeReportRequestId
            ? {
                ...item,
                status: result ? "ready" : "failed",
                content: result || item.content,
              }
            : item
        )
      );
      setActiveReportRequestId(null);
    }
  }, [isLoading, result, activeReportRequestId]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/50 bg-card px-5 py-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Assistive Analysis</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Ask better questions. Get usable answers.</h2>
          </div>
        <div className="mt-2 w-full max-w-xl">
          <div className="relative flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
            <motion.div
              layout
              className={`absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-primary shadow-sm ${
                activeView === "chat" ? "left-1" : "left-[calc(50%)]"
              }`}
              transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            />
            <button
              onClick={() => setActiveView("chat")}
              className={`relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeView === "chat" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveView("reports")}
              className={`relative z-10 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeView === "reports" ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reports
            </button>
          </div>
        </div>
        </div>
      </section>

      {activeView === "reports" ? (
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
                  ["lastMonth", "Last Month"],
                  ["custom", "Custom Range"],
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
              {aiTimeRange === "custom" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input
                    type="date"
                    value={aiCustomRange.startDate}
                    onChange={(event) => onAiCustomRangeChange({ ...aiCustomRange, startDate: event.target.value })}
                    className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                  <input
                    type="date"
                    value={aiCustomRange.endDate}
                    onChange={(event) => onAiCustomRangeChange({ ...aiCustomRange, endDate: event.target.value })}
                    className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">Report Type</h3>
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
                      <p className="mt-1.5 text-xs text-muted-foreground">{reportTypeHighlights[feature]}</p>
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

            <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full rounded-xl">
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
            {reportQueue.length ? (
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/10">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <th className="px-4 py-3 text-left">Report Name</th>
                        <th className="px-4 py-3 text-left">Period</th>
                        <th className="px-4 py-3 text-left">Requested On</th>
                        <th className="px-4 py-3 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reportQueue.map((item, index) => (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.04 }}
                        >
                          <td className="min-w-[220px] px-4 py-3 align-middle">
                            <p className="text-sm font-semibold text-foreground">{getReportLabel(item.feature)}</p>
                            {item.promptPreview ? (
                              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{item.promptPreview}</p>
                            ) : null}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm text-muted-foreground">
                            {item.rangeLabel}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-left align-middle text-sm text-muted-foreground">
                            {formatQueueTime(item.requestedAt)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-left align-middle">
                            {item.status === "pending" ? (
                              <div className="inline-flex items-center gap-2">
                                <div className="relative h-2.5 w-12 overflow-hidden rounded-full bg-amber-500/15">
                                  <motion.div
                                    className="absolute inset-y-0 w-1/2 rounded-full bg-amber-400/60"
                                    animate={{ x: ["-110%", "220%"] }}
                                    transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                                  />
                                  <motion.div
                                    className="absolute inset-y-0 w-1/3 rounded-full bg-amber-300/70"
                                    animate={{ x: ["-140%", "260%"] }}
                                    transition={{ duration: 1.3, repeat: Infinity, ease: "linear", delay: 0.12 }}
                                  />
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300">
                                  Working
                                  <motion.span
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                                  >
                                    .
                                  </motion.span>
                                  <motion.span
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                                  >
                                    .
                                  </motion.span>
                                  <motion.span
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                                  >
                                    .
                                  </motion.span>
                                </span>
                              </div>
                            ) : item.status === "ready" && item.content ? (
                              <button
                                type="button"
                                onClick={() => downloadReport(item)}
                                className="text-sm font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                              >
                                Download
                              </button>
                            ) : (
                              <span className="text-xs font-medium text-destructive">Failed</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState
                title="No report requests yet"
                description="Generate a report and it will appear in this session queue."
              />
            )}
          </div>
        </div>
      </section>
      ) : null}

      {activeView === "chat" ? (
      <section className="h-[620px] rounded-3xl border border-border/50 bg-card px-5 py-5">
        <div className="flex h-full min-h-0 flex-col">
        <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Assistive Chat</h3>
            <p className="text-sm text-muted-foreground">Use prompts to explore attendance deeply.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshSamplePrompts}
              className="rounded-full bg-muted px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              title="Refresh prompt ideas"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            {(["short", "detailed", "report"] as const).map((style) => (
              <button
                key={style}
                onClick={() => setChatStyle(style)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  chatStyle === style ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {style === "short" ? "Short" : style === "detailed" ? "Detailed" : "Report"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
          {chatMessages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl border px-4 py-3 ${
                  message.role === "user"
                    ? "border-primary/20 bg-primary/10 text-foreground"
                    : "border-border/60 bg-muted/20 text-foreground"
                }`}
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {message.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                  <span>{message.role === "user" ? "You" : "Assistant"}</span>
                </div>
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h3 className="mb-2 text-base font-semibold text-foreground">{children}</h3>,
                        h2: ({ children }) => <h3 className="mb-2 text-base font-semibold text-foreground">{children}</h3>,
                        h3: ({ children }) => <h4 className="mb-2 text-sm font-semibold text-foreground">{children}</h4>,
                        p: ({ children }) => <p className="mb-2 text-sm leading-relaxed text-foreground">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 text-sm text-foreground">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 text-sm text-foreground">{children}</ol>,
                        li: ({ children }) => <li className="leading-relaxed text-foreground">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        em: ({ children }) => <em className="italic text-foreground">{children}</em>,
                        code: ({ children }) => (
                          <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">{children}</code>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {chatLoading ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking with live data...
              </div>
            </div>
          ) : null}
          <div ref={chatEndRef} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {samplePrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => setChatInput(prompt)}
              className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendChat();
              }
            }}
            placeholder="Ask about trends, outliers, leave pressure, or attendance risk..."
            className="h-11 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            disabled={chatLoading}
          />
          <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="h-11 rounded-xl px-4">
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
        </div>
      </section>
      ) : null}
    </div>
  );
}
