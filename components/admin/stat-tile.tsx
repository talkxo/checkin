"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
  tone?: "default" | "accent" | "warning";
}

const WIDGET_TITLE_CLASS = "text-xs font-semibold uppercase tracking-[0.2em] leading-none text-primary";

export function StatTile({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: StatTileProps) {
  const toneClass =
    tone === "accent"
      ? "bg-primary/10 text-primary"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-500"
        : "bg-muted/60 text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={WIDGET_TITLE_CLASS}>{label}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground [font-variant-numeric:tabular-nums]">{value}</p>
          {helper ? <p className="mt-1 text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <div className={cn("rounded-xl p-2", toneClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
