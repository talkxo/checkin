import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { slug, email, leaveTypeId, startDate, endDate, reason } = await req.json();

    if (!slug && !email) {
      return NextResponse.json({ error: 'slug or email required' }, { status: 400 });
    }

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json({ error: 'leaveTypeId, startDate, and endDate are required' }, { status: 400 });
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

    // Calculate total days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let totalDays = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday (0) and Saturday (6)
        totalDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (totalDays <= 0) {
      return NextResponse.json({ error: 'Invalid date range or no working days selected' }, { status: 400 });
    }

    // Check if employee has sufficient leave balance
    const year = new Date().getFullYear();
    
    // First get the leave type name
    const { data: leaveType, error: typeError } = await supabaseAdmin
      .from('leave_types')
      .select('name')
      .eq('id', leaveTypeId)
      .single();

    if (typeError || !leaveType) {
      console.error('Error fetching leave type:', typeError);
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    const { data: leaveBalance, error: balanceError } = await supabaseAdmin
      .rpc('get_employee_leave_balance', {
        emp_id: emp.id,
        target_year: year
      });

    if (balanceError) {
      console.error('Error fetching leave balance:', balanceError);
      return NextResponse.json({ error: 'Failed to check leave balance' }, { status: 500 });
    }

    // Find the specific leave type balance by name
    const leaveTypeBalance = leaveBalance?.find((lb: any) => lb.leave_type_name === leaveType.name);
    if (!leaveTypeBalance || leaveTypeBalance.available_leaves < totalDays) {
      return NextResponse.json({ 
        error: 'Insufficient leave balance',
        available: leaveTypeBalance?.available_leaves || 0,
        requested: totalDays
      }, { status: 400 });
    }

    // Create leave request
    const { data: leaveRequest, error } = await supabaseAdmin
      .from('leave_requests')
      .insert({
        employee_id: emp.id,
        leave_type_id: leaveTypeId,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason || null,
        status: 'pending'
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating leave request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update pending leaves count in leave balance
    const { error: updateError } = await supabaseAdmin
      .from('leave_balances')
      .update({
        pending_leaves: leaveTypeBalance.pending_leaves + totalDays,
        updated_at: new Date().toISOString()
      })
      .eq('employee_id', emp.id)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', year);

    if (updateError) {
      console.error('Error updating leave balance:', updateError);
    }

    return NextResponse.json({
      success: true,
      leaveRequest,
      message: 'Leave request submitted successfully'
    });

  } catch (error) {
    console.error('Error in leave request API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug') || '';
    const email = url.searchParams.get('email') || '';
    const status = url.searchParams.get('status') || 'all';

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

    // Build query
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        created_at,
        approved_at,
        leave_types(name),
        employees!leave_requests_approved_by_fkey(full_name)
      `)
      .eq('employee_id', emp.id)
      .order('created_at', { ascending: false });

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: leaveRequests, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      employee: emp,
      leaveRequests: leaveRequests || []
    });

  } catch (error) {
    console.error('Error in leave requests API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
