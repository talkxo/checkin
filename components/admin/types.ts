export type AdminTab = "overview" | "attendance" | "people" | "ai" | "leave";

export interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  officeCount: number;
  remoteCount: number;
  averageHours: number;
}

export interface TodayData {
  id?: string;
  name: string;
  firstIn: string;
  lastOut: string;
  totalHours: string;
  mode: string;
  status: string;
  sessions: number;
}

export interface User {
  id: string;
  full_name: string;
  email: string | null;
  slug: string;
  active: boolean;
  created_at: string;
}

export interface AttendanceDateRange {
  startDate: string;
  endDate: string;
  preset: string;
}

export interface EmployeeSession {
  id: string;
  date: string;
  checkinTime: string;
  checkoutTime: string;
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
  sessions: EmployeeSession[];
}

export interface TeamSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
  totalHours: number;
  averageAttendanceRate: number;
  officePercentage: number;
  remotePercentage: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}
