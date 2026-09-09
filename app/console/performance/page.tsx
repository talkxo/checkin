"use client";

import { ModuleStub } from "@/components/console/module-stub";
import { Target } from "lucide-react";

export default function ConsolePerformancePage() {
  return (
    <ModuleStub
      moduleId="performance"
      title="Performance"
      icon={Target}
      dek="Optional module — toggle it off if the team isn't running a formal review cycle yet."
      note="Last phase of the rollout (06 & 08 last) — cycles, reviews, goals, and 1:1 notes."
    />
  );
}
