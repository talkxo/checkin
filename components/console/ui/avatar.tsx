"use client";

import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-base",
} as const;

interface InitialsAvatarProps {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Neutral initials avatar — no photos in the system, so we never fake one. */
export function InitialsAvatar({ name, size = "md", className }: InitialsAvatarProps) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-muted font-semibold text-muted-foreground ring-1 ring-inset ring-border/60",
        SIZES[size],
        className
      )}
    >
      {initials || "?"}
    </span>
  );
}
