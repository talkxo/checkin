import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { requestId, action, adminId, rejectionReason } = await req.json();

    if (!requestId || !action || !adminId) {
      return NextResponse.json({ 
        error: 'requestId, action, and adminId are required' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'action must be either "approve" or "reject"' 
      }, { status: 400 });
    }

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabaseAdmin
      .from('leave_requests')
      .select(`
        *,
        employees!leave_requests_employee_id_fkey(full_name),
        leave_types!leave_requests_leave_type_id_fkey(name)
      `)
      .eq('id', requestId)
      .single();

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Leave request is not in pending status' 
      }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the leave request status
    const updateData: any = {
      status: newStatus,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Only set approved_by if it's a valid UUID (not the default one)
    if (adminId && adminId !== '00000000-0000-0000-0000-000000000000') {
      updateData.approved_by = adminId;
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('leave_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating leave request:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If approved, update the leave balance
    if (action === 'approve') {
      // Get current leave balance
      const { data: leaveBalance, error: balanceError } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', leaveRequest.employee_id)
        .eq('leave_type_id', leaveRequest.leave_type_id)
        .eq('year', year)
        .single();

      if (balanceError) {
        console.error('Error fetching leave balance:', balanceError);
        return NextResponse.json({ error: 'Failed to fetch leave balance' }, { status: 500 });
      }

      if (!leaveBalance) {
        return NextResponse.json({ error: 'Leave balance not found' }, { status: 404 });
      }

      // Update leave balance
      const { error: balanceUpdateError } = await supabaseAdmin
        .from('leave_balances')
        .update({
          used_leaves: leaveBalance.used_leaves + leaveRequest.total_days,
          pending_leaves: Math.max(0, leaveBalance.pending_leaves - leaveRequest.total_days),
          updated_at: new Date().toISOString()
        })
        .eq('id', leaveBalance.id);

      if (balanceUpdateError) {
        console.error('Error updating leave balance:', balanceUpdateError);
        return NextResponse.json({ error: 'Failed to update leave balance' }, { status: 500 });
      }
    } else {
      // If rejected, just remove from pending
      const { data: leaveBalance, error: balanceError } = await supabaseAdmin
        .from('leave_balances')
        .select('*')
        .eq('employee_id', leaveRequest.employee_id)
        .eq('leave_type_id', leaveRequest.leave_type_id)
        .eq('year', year)
        .single();

      if (!balanceError && leaveBalance) {
        const { error: balanceUpdateError } = await supabaseAdmin
          .from('leave_balances')
          .update({
            pending_leaves: Math.max(0, leaveBalance.pending_leaves - leaveRequest.total_days),
            updated_at: new Date().toISOString()
          })
          .eq('id', leaveBalance.id);

        if (balanceUpdateError) {
          console.error('Error updating leave balance after rejection:', balanceUpdateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      leaveRequest: {
        ...leaveRequest,
        status: newStatus,
        approved_by: adminId,
        approved_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in process leave request API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
