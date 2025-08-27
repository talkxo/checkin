import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    const email = url.searchParams.get('email') || '';
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());

    if (!slug && !email) {
      return NextResponse.json({ error: 'slug or email required' }, { status: 400 });
    }

    // Find employee
    let emp: any = null;
    if (email) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, slug')
        .eq('email', email)
        .maybeSingle();
      emp = data;
    }
    if (!emp && slug) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, slug')
        .eq('slug', slug)
        .maybeSingle();
      emp = data;
    }

    if (!emp) {
      return NextResponse.json({ error: 'employee not found' }, { status: 404 });
    }

    // Get leave balance using the database function
    const { data: leaveBalance, error } = await supabaseAdmin
      .rpc('get_employee_leave_balance', {
        emp_id: emp.id,
        target_year: year
      });

    if (error) {
      console.error('Error fetching leave balance:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    return NextResponse.json({
      employee: emp,
      year,
      leaveBalance: leaveBalance || [],
      accrualHistory: accrualHistory || [],
      pendingRequests: pendingRequests || []
    });

  } catch (error) {
    console.error('Error in leave balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
