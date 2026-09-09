"use client";

import { motion } from "framer-motion";
import { Info, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BLUEPRINT_IA, BUILD_ORDER_NOTE } from "./blueprint";
import type { ModuleId } from "./nav";
import { Chip, bentoRise } from "./ui/bento";

interface ModuleStubProps {
  moduleId: ModuleId;
  title: string;
  icon: LucideIcon;
  dek: string;
  /** Optional per-module note, e.g. "waiting on schema design". */
  note?: string;
}

/**
 * Placeholder for modules whose backend doesn't exist yet. Renders the
 * module's planned structure straight from the blueprint so the IA is
 * visible and honest — nothing here is clickable-by-accident.
 */
export function ModuleStub({ moduleId, title, icon: Icon, dek, note }: ModuleStubProps) {
  const sections = BLUEPRINT_IA[moduleId];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } }}
      className="space-y-4"
    >
      <motion.div
        variants={bentoRise}
        className="relative overflow-hidden rounded-3xl bg-gradient-brand p-5 shadow-primary"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/15 blur-2xl"
        />
        <div className="relative z-10 flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/15">
            <Icon className="h-[18px] w-[18px] text-white" />
          </span>
          <div>
            <h2 className="font-cal-sans text-lg text-white">{title}</h2>
            <p className="mt-0.5 max-w-lg text-sm text-white/80">{dek}</p>
          </div>
          <Chip tone="onDark" className="ml-auto mt-1">
            Planned
          </Chip>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <motion.section
            key={section.name}
            variants={bentoRise}
            className="glass rounded-3xl p-4 sm:p-5"
          >
            <h3 className="card-label">{section.name}</h3>
            <ul className="mt-3 space-y-2.5">
              {section.items.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {item.ai ? (
                      <Chip tone="warning">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI
                      </Chip>
                    ) : null}
                    {item.permission ? (
                      <Chip tone="neutral">
                        <Info className="h-2.5 w-2.5" />
                        Role-gated
                      </Chip>
                    ) : null}
                    <Chip tone="neutral">Planned</Chip>
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>

      <motion.p variants={bentoRise} className="px-1 text-xs text-muted-foreground">
        {note ? `${note} ` : ""}
        {BUILD_ORDER_NOTE}
      </motion.p>
    </motion.div>
  );
}
