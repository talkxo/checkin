import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET - Get all users
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, email, slug, active, created_at, pin_hash, pin_change_required')
      .order('full_name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Add new user
export async function POST(req: NextRequest) {
  try {
    const { fullName, email } = await req.json();

    if (!fullName) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existing } = await supabaseAdmin
      .from('employees')
      .select('id')
      .ilike('full_name', fullName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Create new user
    const { data, error } = await supabaseAdmin
      .from('employees')
      .insert({ full_name: fullName, email })
      .select('id, full_name, email, slug, active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Initialize leave balances for the new employee
    try {
      // Get all active leave types
      const { data: leaveTypes, error: typeError } = await supabaseAdmin
        .from('leave_types')
        .select('id, name')
        .eq('is_active', true);

      if (!typeError && leaveTypes && leaveTypes.length > 0) {
        const currentYear = new Date().getFullYear();
        
        // Prepare leave balance records
        const leaveBalances = leaveTypes.map(leaveType => {
          let defaultEntitlement = 0;
          
          // Set default entitlements based on leave type
          switch (leaveType.name) {
            case 'Privilege Leave':
              defaultEntitlement = 15; // 15 days per year
              break;
            case 'Sick Leave':
              defaultEntitlement = 10; // 10 days per year
              break;
            case 'Bonus Leave':
              defaultEntitlement = 0; // Starts at 0, earned through attendance
              break;
            default:
              defaultEntitlement = 0;
          }

          return {
            employee_id: data.id,
            leave_type_id: leaveType.id,
            year: currentYear,
            total_entitlement: defaultEntitlement,
            used_leaves: 0,
            pending_leaves: 0
          };
        });

        // Insert all leave balances
        const { error: balanceError } = await supabaseAdmin
          .from('leave_balances')
          .insert(leaveBalances);

        if (balanceError) {
          console.error('Error initializing leave balances:', balanceError);
          // Don't fail the employee creation, just log the error
          // The admin can manually set up leaves if needed
        } else {
          console.log(`Successfully initialized leave balances for ${data.full_name}`);
        }
      }
    } catch (leaveError) {
      // Log but don't fail the employee creation
      console.error('Error in leave balance initialization:', leaveError);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(req: NextRequest) {
  try {
    const { id, fullName, email, active } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (fullName !== undefined) updateData.full_name = fullName;
    if (email !== undefined) updateData.email = email;
    if (active !== undefined) updateData.active = active;

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select('id, full_name, email, slug, active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Deactivate user (soft delete)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Soft delete by setting active to false
    const { data, error } = await supabaseAdmin
      .from('employees')
      .update({ active: false })
      .eq('id', id)
      .select('id, full_name, email, slug, active, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
