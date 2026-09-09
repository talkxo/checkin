"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ExternalLink, LogOut, RefreshCw, Search } from "lucide-react";
import DarkModeToggle from "@/components/dark-mode-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CONSOLE_MODULES, moduleByHref } from "./nav";
import type { ConsoleModule, ModuleId } from "./nav";
import { isExperimentalEnabled, onExperimentalChange } from "./experimental";

export interface ConsoleShellProps {
  children: React.ReactNode;
  /** Pending-leave style badges keyed by module id. */
  counts?: Partial<Record<ModuleId, number>>;
}

const BRAND_ICON =
  "https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png";

/**
 * Legacy-admin-style chrome: brand + actions on top, one sticky glass menu
 * bar of pills below. No grouping, no numbering — the modules are few enough
 * to read in one line.
 */
export function ConsoleShell({ children, counts }: ConsoleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const active = moduleByHref(pathname);
  // Planned modules (Payroll, Recruitment, …) only appear in experimental mode.
  const [experimental, setExperimental] = useState(false);
  const [paletteHint, setPaletteHint] = useState(false);

  useEffect(() => {
    setExperimental(isExperimentalEnabled());
    setPaletteHint(typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform));
    return onExperimentalChange(() => setExperimental(isExperimentalEnabled()));
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  };

  const visible = CONSOLE_MODULES.filter((m) => m.status === "live" || experimental);

  return (
    <div className="min-h-screen">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <header className="flex flex-col gap-4 pt-6 sm:pt-8 lg:flex-row lg:items-end lg:justify-between">
          <button onClick={() => router.push("/console")} className="flex items-center gap-3 text-left">
            <img src={BRAND_ICON} alt="INSYDE" className="h-9 w-9 object-contain" />
            <h1 className="font-cal-sans text-3xl text-foreground">Console</h1>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => window.dispatchEvent(new CustomEvent("console:open-palette"))}
            >
              <Search className="mr-1.5 h-3.5 w-3.5" />
              Search
              <kbd className="ml-1.5 hidden rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                {paletteHint ? "⌘K" : "Ctrl K"}
              </kbd>
            </Button>
            <Link
              href="/admin"
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-border/60 px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Legacy
            </Link>
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="rounded-xl text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </header>

        <nav className="glass-strong sticky top-3 z-20 mt-5 rounded-3xl px-4 py-3">
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
            {visible.map((mod) => {
              const Icon = mod.icon;
              const isActive = mod.id === active.id;
              const count = counts?.[mod.id];
              return (
                <Link
                  key={mod.id}
                  href={mod.href}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    isActive
                      ? "border-transparent text-white"
                      : "border-transparent text-muted-foreground glass-hover hover:text-foreground"
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="console-nav-active"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute inset-0 rounded-xl bg-gradient-brand shadow-primary"
                      aria-hidden
                    />
                  ) : null}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{mod.label}</span>
                  {typeof count === "number" && count > 0 ? (
                    <span
                      className={cn(
                        "relative z-10 rounded-full px-2 py-0.5 text-[11px] tabular-nums",
                        isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="pb-16 pt-5">{children}</main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

/** Standard module header — title left, actions right, meta line below. */
export function PageHeader({ title, actions, meta }: PageHeaderProps) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="font-cal-sans text-2xl leading-tight text-foreground">{title}</h2>
        {meta ? <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Standard "updated x" meta chip with a refresh action, for PageHeader meta. */
export function RefreshMeta({
  lastUpdatedLabel,
  refreshing,
  onRefresh,
}: {
  lastUpdatedLabel: string;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5">
        <RefreshCw className={cn("h-3 w-3", refreshing && "animate-spin")} />
        Updated {lastUpdatedLabel}
      </span>
      <button onClick={onRefresh} className="font-medium text-foreground/70 underline-offset-2 hover:underline">
        Refresh
      </button>
    </>
  );
}
