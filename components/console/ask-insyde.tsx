"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
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
      className="glass-strong fixed inset-y-0 right-0 z-50 flex w-[26rem] max-w-full flex-col rounded-l-3xl"
    >
      <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4">
        <img src={BRAND_ICON} alt="" className="h-7 w-7 object-contain" />
        <div className="min-w-0 flex-1">
          <h2 className="font-cal-sans text-base leading-tight text-foreground">Ask Insyde</h2>
          <p className="text-xs text-muted-foreground">Answers from live attendance data</p>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label="Close Ask Insyde"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4 scrollbar-hide">
        {chat.messages.length === 0 && !chat.chatLoading ? (
          <div className="pt-4">
            <div className="mb-5 flex items-start gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-brand text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="pt-1 text-[15px] leading-snug text-foreground/80">
                Hi — ask me anything about your team's attendance, mood, or check-ins.
              </p>
            </div>
            <p className="card-label mb-2">Try asking</p>
            <div className="flex flex-col items-start gap-2">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  onClick={() => chat.sendChat(starter)}
                  className="rounded-2xl rounded-bl-md border border-border/50 bg-muted/40 px-3.5 py-2 text-left text-sm text-foreground/80 transition-colors hover:border-border hover:bg-muted/70"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {chat.messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === "user" ? "flex flex-col items-end" : "flex items-start gap-2.5"}
          >
            {msg.role === "assistant" ? (
              <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-brand text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            ) : null}
            <div className="min-w-0 max-w-[85%]">
              {msg.role === "user" ? (
                <div className="rounded-2xl rounded-br-md bg-gradient-brand px-3.5 py-2.5 text-[15px] text-white">
                  {msg.text}
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert text-[15px] text-foreground/90">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              )}
              <p
                className={cn(
                  "mt-1 text-[10px] tabular-nums text-muted-foreground/70",
                  msg.role === "user" && "text-right"
                )}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}

        {chat.chatLoading ? (
          <div className="flex items-start gap-2.5">
            <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-brand text-white">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border/50 bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        ) : null}

        {chat.chatError ? <p className="text-sm text-red-600 dark:text-red-400">{chat.chatError}</p> : null}

        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border/50 px-4 py-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          chat.sendChat();
        }}
      >
        <Input
          value={chat.chatInput}
          onChange={(e) => chat.setChatInput(e.target.value)}
          placeholder="Ask about attendance, mood, streaks…"
          className="h-10 rounded-xl border-border/60"
        />
        <Button
          type="submit"
          className="h-10 w-10 shrink-0 rounded-xl button-press"
          disabled={!chat.chatInput.trim() || chat.chatLoading}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </motion.aside>
  );
}
