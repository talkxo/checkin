"use client";

import { ModuleStub } from "@/components/console/module-stub";
import { Wallet } from "lucide-react";

export default function ConsolePayrollPage() {
  return (
    <ModuleStub
      moduleId="payroll"
      title="Payroll"
      icon={Wallet}
      dek="Own the data, don't rebuild the engine — INSYDE keeps salary structures and exports; the engine stays with the payroll partner."
      note="No salary schema exists yet — design the tables with the team before this module is built."
    />
  );
}
