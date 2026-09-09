"use client";

import { ModuleStub } from "@/components/console/module-stub";
import { GraduationCap } from "lucide-react";

export default function ConsoleOnboardingPage() {
  return (
    <ModuleStub
      moduleId="onboarding"
      title="Onboarding / Offboarding"
      icon={GraduationCap}
      dek="Checklists that fire themselves on hire — templates by role, a task tracker, and an AI-drafted welcome letter."
      note="Second phase of the rollout (07 & 09 next) — needs checklist templates + hire/exit events."
    />
  );
}
