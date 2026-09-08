"use client";

import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const variants = {
  info: {
    icon: Info,
    className: "border-primary/20 bg-primary/5 text-foreground",
  },
  success: {
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-emerald-500/10 text-foreground",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-amber-500/25 bg-amber-500/10 text-foreground",
  },
  error: {
    icon: AlertCircle,
    className: "border-destructive/25 bg-destructive/10 text-foreground",
  },
} as const;

interface StatusBannerProps {
  title?: string;
  message: string;
  variant?: keyof typeof variants;
  className?: string;
  action?: React.ReactNode;
}

export function StatusBanner({
  title,
  message,
  variant = "info",
  className,
  action,
}: StatusBannerProps) {
  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-2xl border px-4 py-3", config.className, className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
