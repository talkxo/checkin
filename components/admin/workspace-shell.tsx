"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminTab } from "./types";

interface WorkspaceTab {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
  count?: number;
}

interface WorkspaceShellProps {
  title: string;
  subtitle: string;
  tabs: WorkspaceTab[];
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkspaceShell({
  title,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  children,
}: WorkspaceShellProps) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png"
              alt="INSYDE"
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <nav className="sticky top-0 z-20 -mx-4 border-y border-border/50 bg-background/90 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:px-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "border-primary/20 bg-primary/10 text-foreground"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] [font-variant-numeric:tabular-nums]",
                      isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
