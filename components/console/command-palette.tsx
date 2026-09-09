"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CONSOLE_MODULES } from "./nav";
import { isExperimentalEnabled } from "./experimental";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ⌘K palette — navigation across all ten modules plus a few console-wide
 * actions. Opened from the sidebar, the top bar, or the keyboard.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  // Planned modules show up in the palette only when experimental mode is on —
  // re-read each time the palette opens so the Settings toggle applies live.
  const [experimental, setExperimental] = useState(false);

  useEffect(() => {
    if (open) setExperimental(isExperimentalEnabled());
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    // Console-scoped custom event from the sidebar "Search…" button.
    const onOpenRequest = () => onOpenChange(true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("console:open-palette", onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("console:open-palette", onOpenRequest);
    };
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">Console search</DialogTitle>
        <Command label="Console search" className="outline-none">
          <div className="border-b border-border/50">
            <Command.Input
              autoFocus
              placeholder="Jump to a module or run an action…"
              className="w-full bg-transparent px-5 py-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto overflow-x-hidden p-2 scrollbar-hide">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              Nothing matches that.
            </Command.Empty>

            <Command.Group
              heading="Modules"
              className="[&_[cmdk-group-heading]]:card-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
            >
              {CONSOLE_MODULES.filter((mod) => mod.status === "live" || experimental).map((mod) => {
                const Icon = mod.icon;
                return (
                  <Command.Item
                    key={mod.id}
                    value={`${mod.num} ${mod.label} ${mod.group}`}
                    onSelect={() => go(mod.href)}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/90 transition-colors data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{mod.label}</span>
                    <span className="text-xs text-muted-foreground">{mod.group}</span>
                  </Command.Item>
                );
              })}
            </Command.Group>

            <Command.Group
              heading="Actions"
              className="[&_[cmdk-group-heading]]:card-label [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2"
            >
              <Command.Item
                value="add new user create employee"
                onSelect={() => go("/console/people?new=1")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/90 transition-colors data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10"
              >
                <span className="flex-1">Add new user</span>
              </Command.Item>
              <Command.Item
                value="mark attendance today export"
                onSelect={() => go("/console/attendance")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/90 transition-colors data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10"
              >
                <span className="flex-1">Today&apos;s attendance log</span>
              </Command.Item>
              <Command.Item
                value="approve leave requests pending"
                onSelect={() => go("/console/leave")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/90 transition-colors data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10"
              >
                <span className="flex-1">Pending leave queue</span>
              </Command.Item>
              <Command.Item
                value="legacy admin panel old"
                onSelect={() => go("/admin")}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/90 transition-colors data-[selected=true]:bg-black/5 dark:data-[selected=true]:bg-white/10"
              >
                <span className="flex-1">Open legacy admin panel</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
