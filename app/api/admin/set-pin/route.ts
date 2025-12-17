import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminAuthenticated } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    // Check admin authentication
    if (!isAdminAuthenticated()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { employeeId, pin } = await req.json();

    if (!employeeId || !pin) {
      return NextResponse.json(
        { success: false, error: 'Employee ID and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Hash PIN
    const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

    // Update employee PIN
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ pin_hash: pinHash })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error updating PIN:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `PIN set successfully for ${employee.full_name}`
    });

  } catch (error) {
    console.error('Set PIN error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to reset/clear PIN
export async function DELETE(req: NextRequest) {
  try {
    // Check admin authentication
    if (!isAdminAuthenticated()) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Clear PIN hash
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ pin_hash: null })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error clearing PIN:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to clear PIN' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `PIN reset successfully for ${employee.full_name}`
    });

  } catch (error) {
    console.error('Reset PIN error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}




