export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface LeaveBalance {
  leave_type_name: string;
  total_entitlement: number;
  used_leaves: number;
  pending_leaves: number;
  available_leaves: number;
}

export interface LeaveAccrual {
  id: string;
  employee_id: string;
  leave_type_id: string;
  year: number;
  month: number;
  extra_office_days: number;
  accrued_leaves: number;
  calculation_date: string;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  leave_types?: {
    name: string;
  };
  employees?: {
    full_name: string;
  };
}

export interface Employee {
  id: string;
  full_name: string;
  slug: string;
  email?: string;
}

export interface LeaveBalanceResponse {
  employee: Employee;
  year: number;
  leaveBalance: LeaveBalance[];
  accrualHistory: LeaveAccrual[];
  pendingRequests: LeaveRequest[];
}

export interface LeaveRequestFormData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveAccrualSummary {
  employee_id: string;
  extra_office_days: number;
  accrued_leaves: number;
  employees: {
    full_name: string;
  };
}
