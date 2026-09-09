import type { ModuleId } from "./nav";

// The blueprint's information architecture, encoded once. Module stub pages
// render their module's tree from here; live modules may render "planned"
// sections for items their backend doesn't cover yet.
export interface BlueprintItem {
  name: string;
  ai?: boolean;
  permission?: boolean;
}

export interface BlueprintSection {
  name: string;
  items: BlueprintItem[];
}

export const BLUEPRINT_IA: Record<ModuleId, BlueprintSection[]> = {
  dashboard: [
    {
      name: "Overview strip",
      items: [
        { name: "Headcount today" },
        { name: "Attendance snapshot" },
        { name: "Leave pending count" },
        { name: "Birthdays & anniversaries" },
      ],
    },
    {
      name: "Alerts",
      items: [
        { name: "Missing punches" },
        { name: "Docs expiring" },
        { name: "Leave stuck >3 days" },
      ],
    },
    {
      name: "Assistant",
      items: [{ name: "Ask Insyde (policy Q&A)", ai: true }],
    },
  ],
  // Not in the original blueprint — our addition. AI generation lives here so
  // the dashboard stays deterministic.
  reports: [
    {
      name: "Generated reports",
      items: [
        { name: "Attendance summary", ai: true },
        { name: "Insights & patterns", ai: true },
        { name: "Mood & sentiment", ai: true },
        { name: "Custom prompt", ai: true },
      ],
    },
  ],
  people: [
    {
      name: "Directory",
      items: [{ name: "Employee list" }, { name: "Filters: team / status / role" }, { name: "Bulk import" }],
    },
    {
      name: "Profile",
      items: [
        { name: "Details & documents" },
        { name: "Salary band", permission: true },
        { name: "Timeline: joins, promos" },
      ],
    },
    { name: "Structure", items: [{ name: "Org chart" }] },
  ],
  attendance: [
    { name: "Logs", items: [{ name: "Daily log" }, { name: "Monthly view" }] },
    { name: "Requests", items: [{ name: "Regularization queue" }] },
    {
      name: "Signals",
      items: [{ name: "Anomaly flags: late, absent, no-punch" }, { name: "GPS check-in map" }],
    },
  ],
  leave: [
    { name: "Balances", items: [{ name: "Summary by type" }] },
    {
      name: "Requests",
      items: [{ name: "Approve / reject queue" }, { name: "Team calendar overlay" }],
    },
    { name: "Policy", items: [{ name: "Accrual & carry-forward" }, { name: "Leave types" }] },
  ],
  payroll: [
    { name: "Structure", items: [{ name: "Salary structure" }, { name: "PF / ESI / TDS fields" }] },
    { name: "Run", items: [{ name: "Payslip generator" }, { name: "Export to payroll partner" }] },
  ],
  recruitment: [
    { name: "Roles", items: [{ name: "Open roles" }] },
    {
      name: "Pipeline",
      items: [{ name: "Stage board: applied → offer" }, { name: "Candidate profile" }],
    },
  ],
  onboarding: [
    {
      name: "New hire",
      items: [
        { name: "Checklist templates by role" },
        { name: "Task tracker" },
        { name: "Welcome / offer letter draft", ai: true },
      ],
    },
    { name: "Exit", items: [{ name: "Offboarding checklist" }] },
  ],
  performance: [
    { name: "Cycles", items: [{ name: "Cycle status" }, { name: "Self + manager review" }] },
    { name: "Growth", items: [{ name: "Goals" }, { name: "1:1 notes" }] },
  ],
  documents: [
    { name: "Library", items: [{ name: "Policy docs" }, { name: "Employee documents" }] },
    { name: "Tracking", items: [{ name: "Expiry tracker" }, { name: "E-sign status" }] },
  ],
  settings: [
    { name: "Access", items: [{ name: "Roles & permissions" }] },
    { name: "Structure", items: [{ name: "Teams & designations" }, { name: "Holiday calendar" }] },
    { name: "Integrations", items: [{ name: "Connected tools" }] },
  ],
};

// Phased rollout footer from the blueprint: 01–04 first (daily core),
// 07 & 09 next, 06 & 08 last.
export const BUILD_ORDER_NOTE =
  "Phased rollout — 01–04 first (daily core), 07 & 09 next, 06 & 08 last.";
