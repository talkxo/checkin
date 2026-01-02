import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { employeeId, year, leaveBalances } = await req.json();

    if (!employeeId || !year || !leaveBalances) {
      return NextResponse.json({ error: 'employeeId, year, and leaveBalances are required' }, { status: 400 });
    }

    // Get leave types to map names to IDs
    const { data: leaveTypes, error: typeError } = await supabaseAdmin
      .from('leave_types')
      .select('id, name');

    if (typeError) {
      console.error('Error fetching leave types:', typeError);
      return NextResponse.json({ error: 'Failed to fetch leave types' }, { status: 500 });
    }

    // Update each leave balance
    for (const [leaveTypeName, balanceData] of Object.entries(leaveBalances)) {
      const leaveType = leaveTypes.find(lt => lt.name === leaveTypeName);
      if (!leaveType) {
        console.warn(`Leave type not found: ${leaveTypeName}`);
        continue;
      }

      const { total_entitlement, used_leaves, pending_leaves } = balanceData as any;

      // First, try to find existing record
      const { data: existingBalance, error: findError } = await supabaseAdmin
        .from('leave_balances')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('leave_type_id', leaveType.id)
        .eq('year', year)
        .maybeSingle();

      if (findError) {
        console.error(`Error finding leave balance for ${leaveTypeName}:`, findError);
        return NextResponse.json({ 
          error: `Failed to find leave balance for ${leaveTypeName}` 
        }, { status: 500 });
      }

      const balanceDataToSave = {
        employee_id: employeeId,
        leave_type_id: leaveType.id,
        year: year,
        total_entitlement: total_entitlement || 0,
        used_leaves: used_leaves || 0,
        pending_leaves: pending_leaves || 0,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingBalance) {
        // Update existing record
        const { error: updateError } = await supabaseAdmin
          .from('leave_balances')
          .update(balanceDataToSave)
          .eq('id', existingBalance.id);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabaseAdmin
          .from('leave_balances')
          .insert(balanceDataToSave);
        error = insertError;
      }

      if (error) {
        console.error(`Error ${existingBalance ? 'updating' : 'inserting'} leave balance for ${leaveTypeName}:`, error);
        return NextResponse.json({ 
          error: `Failed to ${existingBalance ? 'update' : 'create'} leave balance for ${leaveTypeName}: ${error.message}` 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Leave balance updated successfully' 
    });

  } catch (error) {
    console.error('Error in update leave balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
