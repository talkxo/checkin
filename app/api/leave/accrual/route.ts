import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { year, month, force = false } = await req.json();
    
    // Use current year/month if not provided
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    // Note: We don't check for existing accruals here because:
    // 1. The database function process_monthly_leave_accrual uses ON CONFLICT to handle duplicates per employee
    // 2. Checking for ANY accrual would prevent processing for employees who haven't had accruals processed yet
    // 3. The force flag allows re-processing if needed

    // Call the database function to process accrual
    const { error } = await supabaseAdmin
      .rpc('process_monthly_leave_accrual', {
        target_year: targetYear,
        target_month: targetMonth
      });

    if (error) {
      console.error('Error processing leave accrual:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get summary of processed accruals
    const { data: accrualSummary, error: summaryError } = await supabaseAdmin
      .from('leave_accruals')
      .select(`
        employee_id,
        extra_office_days,
        accrued_leaves,
        employees(full_name)
      `)
      .eq('year', targetYear)
      .eq('month', targetMonth)
      .gt('accrued_leaves', 0);

    if (summaryError) {
      console.error('Error fetching accrual summary:', summaryError);
    }

    return NextResponse.json({
      success: true,
      message: 'Leave accrual processed successfully',
      year: targetYear,
      month: targetMonth,
      summary: accrualSummary || []
    });

  } catch (error) {
    console.error('Error in leave accrual API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
