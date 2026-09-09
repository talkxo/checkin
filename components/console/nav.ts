import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarCheck,
  FileText,
  Gauge,
  GraduationCap,
  Plane,
  Settings,
  Target,
  Users,
  Wallet,
  Briefcase,
} from "lucide-react";

// The console's information architecture — mirrors the HRMS panel blueprint
// (10 modules in real nav order) plus Reports, our AI-analysis addition.
// Single source for the sidebar, the command palette, and the module stubs.
export type ModuleId =
  | "dashboard"
  | "reports"
  | "people"
  | "attendance"
  | "leave"
  | "payroll"
  | "recruitment"
  | "onboarding"
  | "performance"
  | "documents"
  | "settings";

export type ModuleStatus = "live" | "planned";

export interface ConsoleModule {
  id: ModuleId;
  num: string; // "01"… "10" as in the blueprint
  label: string;
  href: string;
  icon: LucideIcon;
  group: string;
  description: string;
  status: ModuleStatus;
}

export const CONSOLE_MODULES: ConsoleModule[] = [
  {
    id: "dashboard",
    num: "01",
    label: "Dashboard",
    href: "/console",
    icon: Gauge,
    group: "Overview",
    description: "Landing screen. One glance, no digging.",
    status: "live",
  },
  {
    id: "reports",
    num: "AI",
    label: "Reports",
    href: "/console/reports",
    icon: BarChart3,
    group: "Overview",
    description: "AI-written analysis from live attendance and mood data.",
    status: "live",
  },
  {
    id: "people",
    num: "02",
    label: "People",
    href: "/console/people",
    icon: Users,
    group: "Workforce",
    description: "The directory. Everything else links back here.",
    status: "live",
  },
  {
    id: "attendance",
    num: "03",
    label: "Attendance",
    href: "/console/attendance",
    icon: CalendarCheck,
    group: "Workforce",
    description: "Daily-use logs, monthly view, and signals.",
    status: "live",
  },
  {
    id: "leave",
    num: "04",
    label: "Leave",
    href: "/console/leave",
    icon: Plane,
    group: "Workforce",
    description: "Balance, request, approve, in one thread.",
    status: "live",
  },
  {
    id: "payroll",
    num: "05",
    label: "Payroll",
    href: "/console/payroll",
    icon: Wallet,
    group: "Operations",
    description: "Own the data, don't rebuild the engine.",
    status: "planned",
  },
  {
    id: "recruitment",
    num: "06",
    label: "Recruitment",
    href: "/console/recruitment",
    icon: Briefcase,
    group: "Operations",
    description: "Simple enough a first-time HR hire runs it solo.",
    status: "planned",
  },
  {
    id: "onboarding",
    num: "07",
    label: "Onboarding",
    href: "/console/onboarding",
    icon: GraduationCap,
    group: "Operations",
    description: "Checklists that fire themselves on hire.",
    status: "planned",
  },
  {
    id: "performance",
    num: "08",
    label: "Performance",
    href: "/console/performance",
    icon: Target,
    group: "Operations",
    description: "Optional module. Toggle off if no formal cycle yet.",
    status: "planned",
  },
  {
    id: "documents",
    num: "09",
    label: "Documents",
    href: "/console/documents",
    icon: FileText,
    group: "Operations",
    description: "One repo, linked from every profile that needs it.",
    status: "live",
  },
  {
    id: "settings",
    num: "10",
    label: "Settings",
    href: "/console/settings",
    icon: Settings,
    group: "System",
    description: "Where the rules of every module above live.",
    status: "live",
  },
];

export const CONSOLE_GROUPS = ["Overview", "Workforce", "Operations", "System"];

export function moduleByHref(pathname: string | null | undefined): ConsoleModule {
  if (!pathname) return CONSOLE_MODULES[0];
  const exact = CONSOLE_MODULES.find((m) => m.href === pathname);
  if (exact) return exact;
  // /console/people/[id] should still highlight People.
  const prefix = CONSOLE_MODULES.filter(
    (m) => m.href !== "/console" && pathname.startsWith(m.href)
  ).sort((a, b) => b.href.length - a.href.length);
  return prefix[0] ?? CONSOLE_MODULES[0];
}
