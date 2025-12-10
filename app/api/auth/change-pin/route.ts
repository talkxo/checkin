import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const BCRYPT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const { employeeId, currentPin, newPin } = await req.json();

    if (!employeeId || !currentPin || !newPin) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, current PIN, and new PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin)) {
      return NextResponse.json(
        { success: false, error: 'PINs must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Check if new PIN is different from current PIN
    if (currentPin === newPin) {
      return NextResponse.json(
        { success: false, error: 'New PIN must be different from current PIN' },
        { status: 400 }
      );
    }

    // Get employee and verify current PIN
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, pin_hash, pin_change_required')
      .eq('id', employeeId)
      .maybeSingle();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (!employee.pin_hash) {
      return NextResponse.json(
        { success: false, error: 'PIN not set' },
        { status: 400 }
      );
    }

    // Verify current PIN
    const isValid = await bcrypt.compare(currentPin, employee.pin_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Current PIN is incorrect' },
        { status: 401 }
      );
    }

    // Hash new PIN
    const newPinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

    // Update PIN and clear pin_change_required flag
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ 
        pin_hash: newPinHash,
        pin_change_required: false 
      })
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
      message: 'PIN changed successfully'
    });

  } catch (error) {
    console.error('Change PIN error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}



