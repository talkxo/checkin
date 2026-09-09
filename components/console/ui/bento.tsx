"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Bento vocabulary shared with the main app: glass tiles, card-label micro
// headers, big tabular-nums values, footer chips, semantic state dots.

/** Parent wrapper that staggers its bento children in, like the home Today tab. */
export const bentoStagger = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const bentoRise = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

interface StatTileProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

/** Standard bento stat tile: label pinned top, value centered, footer pinned bottom. */
export function StatTile({ label, value, sub, footer, icon: Icon, onClick, className }: StatTileProps) {
  const inner = (
    <>
      <div className="flex h-4 items-center justify-between">
        <span className="card-label">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" /> : null}
      </div>
      <div className="flex flex-1 flex-col justify-center py-2">
        <p className="text-3xl font-bold leading-none tabular-nums text-foreground">{value}</p>
        {sub ? <p className="mt-2 text-xs text-muted-foreground">{sub}</p> : null}
      </div>
      {footer ? <div className="flex h-6 items-center">{footer}</div> : null}
    </>
  );

  const classes = cn(
    "glass flex min-h-[8rem] flex-col rounded-3xl p-4 sm:p-5",
    onClick && "glass-hover cursor-pointer",
    className
  );

  if (onClick) {
    return (
      <motion.button
        variants={bentoRise}
        onClick={onClick}
        className={cn(classes, "text-left transition-opacity hover:opacity-95")}
      >
        {inner}
      </motion.button>
    );
  }
  return (
    <motion.div variants={bentoRise} className={classes}>
      {inner}
    </motion.div>
  );
}

interface HeroTileProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/** The one loud tile per view — solid brand gradient, like the streak tile. */
export function HeroTile({ label, value, sub, footer, icon: Icon, className }: HeroTileProps) {
  return (
    <motion.div
      variants={bentoRise}
      className={cn(
        "relative flex min-h-[8rem] flex-col overflow-hidden rounded-3xl bg-gradient-brand p-4 sm:p-5 shadow-primary",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl"
      />
      <div className="relative z-10 flex h-4 items-center justify-between">
        <span className="card-label text-white/80">{label}</span>
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 text-white/70" /> : null}
      </div>
      <div className="relative z-10 flex flex-1 flex-col justify-center py-2">
        <p className="text-3xl font-bold leading-none tabular-nums text-white">{value}</p>
        {sub ? <p className="mt-2 text-xs text-white/80">{sub}</p> : null}
      </div>
      {footer ? <div className="relative z-10 flex h-6 items-center">{footer}</div> : null}
    </motion.div>
  );
}

interface SectionCardProps {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

/** Glass section card with the standard micro-label header + action slot. */
export function SectionCard({ label, action, children, className, contentClassName }: SectionCardProps) {
  return (
    <motion.section variants={bentoRise} className={cn("glass flex flex-col rounded-3xl p-4 sm:p-5", className)}>
      <div className="flex min-h-4 items-center justify-between gap-3">
        <span className="card-label">{label}</span>
        {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
      </div>
      <div className={cn("mt-3 flex-1", contentClassName)}>{children}</div>
    </motion.section>
  );
}

export type DotState = "office" | "remote" | "leave" | "pending" | "success" | "danger";

const DOT_STYLES: Record<DotState, string> = {
  office: "bg-emerald-500",
  remote: "bg-sky-500",
  leave: "bg-amber-500",
  pending: "bg-muted-foreground/30",
  success: "bg-emerald-500",
  danger: "bg-red-500",
};

/** Presence-style state dot — same colors as the home Who's-in list. */
export function StateDot({ state, className }: { state: DotState; className?: string }) {
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", DOT_STYLES[state], className)} />;
}

interface ChipProps {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "onDark";
  className?: string;
}

const CHIP_TONES: Record<NonNullable<ChipProps["tone"]>, string> = {
  neutral: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  danger: "bg-red-500/10 text-red-600 dark:text-red-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  onDark: "bg-white/15 text-white/90",
};

/** Micro pill for statuses/meta — matches the streak tile's best-chip styling. */
export function Chip({ children, tone = "neutral", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        CHIP_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
