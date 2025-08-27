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

      // Update or insert leave balance
      const { error: upsertError } = await supabaseAdmin
        .from('leave_balances')
        .upsert({
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          year: year,
          total_entitlement: total_entitlement || 0,
          used_leaves: used_leaves || 0,
          pending_leaves: pending_leaves || 0,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'employee_id,leave_type_id,year'
        });

      if (upsertError) {
        console.error(`Error updating leave balance for ${leaveTypeName}:`, upsertError);
        return NextResponse.json({ 
          error: `Failed to update leave balance for ${leaveTypeName}` 
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
