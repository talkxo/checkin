import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'all';

    // Build query
    let query = supabaseAdmin
      .from('leave_requests')
      .select(`
        id,
        employee_id,
        leave_type_id,
        start_date,
        end_date,
        total_days,
        reason,
        status,
        approved_by,
        approved_at,
        created_at,
        updated_at,
        employees!leave_requests_employee_id_fkey(full_name, email),
        leave_types!leave_requests_leave_type_id_fkey(name)
      `)
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
      leaveRequests: leaveRequests || []
    });

  } catch (error) {
    console.error('Error in admin leave requests API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
