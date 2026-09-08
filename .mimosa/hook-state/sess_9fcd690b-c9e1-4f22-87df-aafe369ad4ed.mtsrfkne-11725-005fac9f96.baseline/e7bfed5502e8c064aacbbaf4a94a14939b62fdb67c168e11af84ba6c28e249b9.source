"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
}

/**
 * The standard internal view switch — a connected segmented track (iOS style).
 * Pills are reserved for the main navigation; never use them here.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  className,
  fullWidth = false,
}: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg bg-black/5 p-0.5 dark:bg-white/10",
        size === "sm" ? "h-8" : "h-9",
        fullWidth && "flex w-full",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md px-3 font-medium transition-all",
              size === "sm" ? "h-7 text-xs" : "h-8 text-sm",
              fullWidth && "flex-1",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
