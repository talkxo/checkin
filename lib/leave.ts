import { supabaseAdmin } from '@/lib/supabase';

export async function getEmployeeLeaveBalance(slug: string, year: number = new Date().getFullYear()) {
  try {
    // Find employee
    const { data: emp } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (!emp) {
      return { error: 'employee not found' };
    }

    // Get leave balance using the database function
    const { data: leaveBalance, error } = await supabaseAdmin
      .rpc('get_employee_leave_balance', {
        emp_id: emp.id,
        target_year: year
      });

    if (error) {
      console.error('Error fetching leave balance:', error);
      return { error: error.message };
    }

    // Get leave accrual history for bonus leaves
    const { data: accrualHistory, error: accrualError } = await supabaseAdmin
      .from('leave_accruals')
      .select(`
        month,
        extra_office_days,
        accrued_leaves,
        calculation_date
      `)
      .eq('employee_id', emp.id)
      .eq('year', year)
      .order('month', { ascending: true });

    if (accrualError) {
      console.error('Error fetching accrual history:', accrualError);
    }

    // Get pending leave requests
    const { data: pendingRequests, error: requestsError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        created_at,
        leave_types(name)
      `)
      .eq('employee_id', emp.id)
      .in('status', ['pending', 'approved'])
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching pending requests:', requestsError);
    }

    return {
      employee: emp,
      year,
      leaveBalance: leaveBalance || [],
      accrualHistory: accrualHistory || [],
      pendingRequests: pendingRequests || []
    };

  } catch (error) {
    console.error('Error in getEmployeeLeaveBalance:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
