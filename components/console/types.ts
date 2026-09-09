// Console types — mirrors of the existing /api/admin/* response shapes.
// Kept console-local (components/console) so the legacy admin's types in
// components/admin/types.ts stay untouched while both keep compiling.

export interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  officeCount: number;
  remoteCount: number;
  averageHours: number;
}

export interface TodayRow {
  id: string;
  name: string;
  slug: string;
  firstIn: string; // "09:12" IST or "N/A"
  lastOut: string; // "18:05" IST or "N/A"
  totalHours: string; // "7h 42m"
  mode: string; // "office" | "remote" | "N/A"
  status: string; // "Active" | "Complete" | "Not Started"
  onLeave: boolean;
  sessions: number;
}

export interface ConsoleUser {
  id: string;
  full_name: string;
  email: string | null;
  slug: string;
  active: boolean;
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  date: string; // IST date key "YYYY-MM-DD"
  checkinTime: string; // "HH:MM"
  checkoutTime: string; // "HH:MM"
  hoursWorked: string;
  mode: string;
  status: string;
  mood?: string;
  moodComment?: string;
}

export interface EmployeeSummary {
  employee_id: string;
  name: string;
  slug: string;
  daysPresent: number;
  missedDays: number;
  elapsedWorkingDays: number;
  approvedLeaveDays: number;
  pendingLeaveDays: number;
  officeDays: number;
  remoteDays: number;
  totalHours: number;
  officeHours: number;
  remoteHours: number;
  averageHoursPerDay: number;
  attendanceRate: number;
  sessions: AttendanceSession[];
}

export interface TeamSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
  totalHours: number;
  averageAttendanceRate: number;
  officePercentage: number;
  remotePercentage: number;
  dateRange: { startDate: string; endDate: string };
}

export interface AttendanceReport {
  employeeSummaries: EmployeeSummary[];
  teamSummary: TeamSummary | null;
}

/** Supabase embeds the fk hint as an object; guard against array form anyway. */
export interface LeaveRequestJoined {
  full_name: string;
  email: string | null;
}

export interface LeaveRequestRow {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  employees: LeaveRequestJoined | LeaveRequestJoined[] | null;
  leave_types: { name: string } | { name: string }[] | null;
}

export function leaveRequestPerson(
  row: LeaveRequestRow
): { name: string; email: string | null } {
  const emp = Array.isArray(row.employees) ? row.employees[0] : row.employees;
  const type = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
  return {
    name: emp?.full_name ?? "Unknown",
    email: emp?.email ?? null,
  };
}

export function leaveRequestType(row: LeaveRequestRow): string {
  const type = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
  return type?.name ?? "Leave";
}

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Birthday {
  name: string;
  date: string;
  inDays: number;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  slug: string;
  streak?: number;
  score?: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
}

export interface DocumentLink {
  id: string;
  label: string;
  url: string;
  created_at: string;
}

export interface EmployeeProfileData {
  employee: {
    id: string;
    full_name: string;
    slug: string;
    email: string | null;
    active: boolean;
    date_of_birth: string | null;
    phone: string | null;
    emergency_contact: string | null;
    created_at: string;
  };
  documents: DocumentLink[];
}
