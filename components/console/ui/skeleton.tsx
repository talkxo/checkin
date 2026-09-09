"use client";

import { cn } from "@/lib/utils";

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/60", className)} style={style} />;
}

/** Skeleton for a bento StatTile / HeroTile. */
export function TileSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass min-h-[7.5rem] rounded-3xl p-4", className)}>
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="mt-5 h-8 w-20" />
      <Skeleton className="mt-3 h-2.5 w-24" />
    </div>
  );
}

/** Skeleton for a SectionCard body of stacked rows. */
export function RowListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-2 w-2 rounded-full" />
          <Skeleton className="h-3 flex-1" style={{ maxWidth: `${70 - (i % 3) * 12}%` }} />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-3 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-full rounded-lg" />
      ))}
    </div>
  );
}
