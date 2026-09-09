"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SegmentedControlProps {
  options: Array<{ value: string; label: ReactNode }>;
  value: string;
  onChange: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
}

/**
 * The standard internal view switch — a connected segmented track (iOS style).
 * Console-local copy of the established pattern; pills stay reserved for
 * primary navigation only.
 *
 * The active option is drawn by a shared-layout thumb (framer-motion layoutId,
 * namespaced per instance via useId) that slides between options, so state
 * changes animate instead of snapping.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  size = "md",
  className,
  fullWidth = false,
}: SegmentedControlProps) {
  const layoutId = useId();

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
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative isolate rounded-md font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/25",
              size === "sm" ? "h-7 px-3 text-[13px]" : "h-8 px-3.5 text-[13px]",
              fullWidth && "flex-1",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active ? (
              <motion.span
                layoutId={`segmented-thumb-${layoutId}`}
                aria-hidden="true"
                transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
                className="absolute inset-0 rounded-md bg-background shadow-sm"
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
