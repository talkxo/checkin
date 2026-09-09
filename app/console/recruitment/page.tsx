"use client";

import { ModuleStub } from "@/components/console/module-stub";
import { Briefcase } from "lucide-react";

export default function ConsoleRecruitmentPage() {
  return (
    <ModuleStub
      moduleId="recruitment"
      title="Recruitment"
      icon={Briefcase}
      dek="Simple enough a first-time HR hire runs it solo — open roles in, stage board through to offer."
      note="No candidates or roles tables exist yet — this ships in a later phase."
    />
  );
}
