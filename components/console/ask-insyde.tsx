"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowUp,
  Check,
  Copy,
  Loader2,
  Plus,
  RotateCcw,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiAdminChat } from "./data";

export interface AskInsideMessage {
  role: "user" | "assistant";
  text: string;
  time: string;
}

export interface AskInsideChat {
  messages: AskInsideMessage[];
  chatInput: string;
  chatLoading: boolean;
  chatError: string | null;
  setChatInput: (v: string) => void;
  sendChat: (message?: string) => void;
}

const BRAND_ICON =
  "https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png";

const STARTERS = [
  "Who's running late this week?",
  "How is the team feeling lately?",
  "Any attendance patterns I should know?",
];


// Chat state + panel visibility — lives at the shell level so the nav-bar
// launcher works from any module and history survives page switches.
export function useAskInsyde() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [messages, setMessages] = useState<AskInsideMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const sendChat = async (override?: string) => {
    const message = (override ?? chatInput).trim();
    if (!message || chatLoading) return;
    setChatInput("");
    setChatError(null);
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, { role: "user", text: message, time }]);
    setChatLoading(true);
    try {
      const data = await apiAdminChat(message);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.response,
          time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Ask Insyde is unavailable right now.");
    } finally {
      setChatLoading(false);
    }
  };

  return { panelOpen, setPanelOpen, messages, chatInput, chatLoading, chatError, setChatInput, sendChat };
}

/**
 * The full-height chat panel — opened from the nav-bar pill.
 */
export function AskInsydePanel({
  open,
  onOpenChange,
  chat,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: AskInsideChat;
}) {
  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="ask-insyde-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              aria-hidden
            />
            <AskInsydePanelBody key="ask-insyde-panel" onOpenChange={onOpenChange} chat={chat} />
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function AskInsydePanelBody({
  onOpenChange,
  chat,
}: {
  onOpenChange: (open: boolean) => void;
  chat: AskInsideChat;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const [feedback, setFeedback] = useState<Record<number, "up" | "down">>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  // Auto-grow the composer with content, up to the max height.
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [chat.chatInput]);

  // Escape closes the panel
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  // Keep the newest message in view as the thread updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat.messages, chat.chatLoading, chat.chatError]);

  return (
    <motion.aside
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      role="dialog"
      aria-label="Ask Insyde"
      className="fixed inset-y-0 right-0 z-50 flex w-[30rem] max-w-full flex-col rounded-l-3xl border-l border-border/60 bg-white shadow-2xl dark:bg-card"
    >
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="font-cal-sans text-base text-foreground">Ask Insyde</h2>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label="Close Ask Insyde"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 scrollbar-hide">
        {chat.messages.length === 0 && !chat.chatLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-8 pb-10 text-center">
            <p className="font-cal-sans text-xl text-foreground">
              What do you want to know about the team?
            </p>
            <div className="flex w-full flex-col items-stretch gap-2.5">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => chat.sendChat(starter)}
                  className="rounded-full border border-border/70 px-4 py-2.5 text-sm text-foreground/85 transition-colors hover:border-foreground/30 hover:bg-muted/50"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            {chat.messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-muted px-4 py-3 text-[15px] leading-relaxed text-foreground">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-[15px] leading-relaxed text-foreground/90">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <div className="mt-2 flex items-center gap-0.5 text-muted-foreground/50">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(msg.text).catch(() => {});
                        setCopiedId(i);
                        setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="rounded-lg p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Copy reply"
                    >
                      {copiedId === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() =>
                        setFeedback((f) => {
                          const g = { ...f };
                          if (g[i] === "up") delete g[i];
                          else g[i] = "up";
                          return g;
                        })
                      }
                      className={cn(
                        "rounded-lg p-1.5 transition-colors hover:bg-muted hover:text-foreground",
                        feedback[i] === "up" && "text-emerald-600 dark:text-emerald-400"
                      )}
                      aria-label="Good reply"
                    >
                      <ThumbsUp className={cn("h-3.5 w-3.5", feedback[i] === "up" && "fill-current")} />
                    </button>
                    <button
                      onClick={() =>
                        setFeedback((f) => {
                          const g = { ...f };
                          if (g[i] === "down") delete g[i];
                          else g[i] = "down";
                          return g;
                        })
                      }
                      className={cn(
                        "rounded-lg p-1.5 transition-colors hover:bg-muted hover:text-foreground",
                        feedback[i] === "down" && "text-red-500"
                      )}
                      aria-label="Bad reply"
                    >
                      <ThumbsDown className={cn("h-3.5 w-3.5", feedback[i] === "down" && "fill-current")} />
                    </button>
                    <button
                      onClick={() => {
                        for (let j = i - 1; j >= 0; j--) {
                          if (chat.messages[j].role === "user") {
                            chat.sendChat(chat.messages[j].text);
                            return;
                          }
                        }
                      }}
                      className="rounded-lg p-1.5 transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Regenerate reply"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            )}

            {chat.chatLoading ? (
              <div className="flex items-center gap-1.5 py-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground/70"
                    style={{ animationDelay: `${i * 180}ms` }}
                  />
                ))}
              </div>
            ) : null}

            {chat.chatError ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
                {chat.chatError}
              </p>
            ) : null}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="px-4 pb-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          chat.sendChat();
        }}
      >
        {toolsOpen ? (
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                onClick={() => {
                  setToolsOpen(false);
                  chat.sendChat(starter);
                }}
                className="rounded-full border border-border/70 bg-muted/40 px-3.5 py-2 text-left text-sm text-foreground/85 transition-colors hover:border-foreground/25 hover:bg-muted/70"
              >
                {starter}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[1.75rem] border border-border bg-white p-2 shadow-sm transition-colors focus-within:border-foreground/30 dark:bg-card">
          <textarea
            ref={composerRef}
            value={chat.chatInput}
            onChange={(e) => {
              chat.setChatInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                chat.sendChat();
              }
            }}
            rows={1}
            placeholder="Ask anything"
            className="max-h-40 min-h-9 flex-1 resize-none self-center border-0 bg-transparent px-3 py-2 text-[15px] leading-relaxed text-foreground shadow-none outline-none ring-0 focus:border-0 focus:ring-0 placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            aria-expanded={toolsOpen}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 self-center rounded-full px-3 text-sm transition-colors",
              toolsOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Plus className="h-4 w-4" />
            Tools
          </button>
          <Button
            type="submit"
            className="ml-auto h-9 w-9 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 button-press"
            disabled={!chat.chatInput.trim() || chat.chatLoading}
          >
            {chat.chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
        <p className="pt-2 text-center text-[10px] text-muted-foreground/60">
          Live check-ins · history · mood — Ask Insyde can make mistakes.
        </p>
      </form>
    </motion.aside>
  );
}
