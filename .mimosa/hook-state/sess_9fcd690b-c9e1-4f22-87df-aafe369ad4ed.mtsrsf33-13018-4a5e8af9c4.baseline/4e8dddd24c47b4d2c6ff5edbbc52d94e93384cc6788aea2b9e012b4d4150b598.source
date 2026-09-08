import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const EXPECTED_OFFICE_DAYS = 12;
const YEARLY_BONUS_CAP = 15;
const IST_TIME_ZONE = 'Asia/Kolkata';

type EmployeeRecord = {
  id: string;
  full_name: string;
};

type LeaveAccrualRecord = {
  employee_id: string;
  month: number;
  accrued_leaves: number;
};

type LeaveBalanceRecord = {
  employee_id: string;
  total_entitlement: number;
  used_leaves: number;
  pending_leaves: number;
};

function getLastCompletedMonth(reference = new Date()) {
  const year = reference.getMonth() === 0 ? reference.getFullYear() - 1 : reference.getFullYear();
  const month = reference.getMonth() === 0 ? 12 : reference.getMonth();
  return { year, month };
}

function getMonthRangeInIST(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+05:30`;
  return { start, end };
}

function getISTDateKey(value: string) {
  return new Date(value).toLocaleDateString('en-CA', { timeZone: IST_TIME_ZONE });
}

function getCalculationDateKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TIME_ZONE });
}

function calculateBonusLeaves(extraOfficeDays: number, earnedEarlierThisYear: number) {
  const monthlyBonus = Math.floor(Math.max(extraOfficeDays, 0) / 3);
  const remainingCap = Math.max(YEARLY_BONUS_CAP - earnedEarlierThisYear, 0);
  return Math.min(monthlyBonus, remainingCap);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const fallback = getLastCompletedMonth();
    const targetYear = Number(body.year || fallback.year);
    const targetMonth = Number(body.month || fallback.month);

    if (!Number.isInteger(targetYear) || !Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return NextResponse.json({ error: 'Invalid target month/year' }, { status: 400 });
    }

    const [{ data: employees, error: employeeError }, { data: leaveTypes, error: leaveTypeError }] = await Promise.all([
      supabaseAdmin.from('employees').select('id, full_name').eq('active', true).order('full_name'),
      supabaseAdmin.from('leave_types').select('id, name').eq('name', 'Bonus Leave').maybeSingle(),
    ]);

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 500 });
    }

    if (leaveTypeError || !leaveTypes?.id) {
      return NextResponse.json({ error: leaveTypeError?.message || 'Bonus Leave type not found' }, { status: 500 });
    }

    const activeEmployees = (employees || []) as EmployeeRecord[];
    if (activeEmployees.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active employees found for accrual processing',
        year: targetYear,
        month: targetMonth,
        summary: [],
      });
    }

    const { start, end } = getMonthRangeInIST(targetYear, targetMonth);

    const [{ data: sessions, error: sessionError }, { data: accrualRows, error: accrualError }, { data: balanceRows, error: balanceError }] = await Promise.all([
      supabaseAdmin
        .from('sessions')
        .select('employee_id, checkin_ts')
        .eq('mode', 'office')
        .not('checkout_ts', 'is', null)
        .gte('checkin_ts', start)
        .lt('checkin_ts', end),
      supabaseAdmin
        .from('leave_accruals')
        .select('employee_id, month, accrued_leaves')
        .eq('year', targetYear),
      supabaseAdmin
        .from('leave_balances')
        .select('employee_id, total_entitlement, used_leaves, pending_leaves')
        .eq('year', targetYear)
        .eq('leave_type_id', leaveTypes.id),
    ]);

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (accrualError) {
      return NextResponse.json({ error: accrualError.message }, { status: 500 });
    }

    if (balanceError) {
      return NextResponse.json({ error: balanceError.message }, { status: 500 });
    }

    const officeDaysByEmployee = new Map<string, Set<string>>();
    for (const session of sessions || []) {
      const sessionDateKey = getISTDateKey(session.checkin_ts as string);
      if (!officeDaysByEmployee.has(session.employee_id as string)) {
        officeDaysByEmployee.set(session.employee_id as string, new Set<string>());
      }
      officeDaysByEmployee.get(session.employee_id as string)?.add(sessionDateKey);
    }

    const accrualsByEmployee = new Map<string, LeaveAccrualRecord[]>();
    for (const row of (accrualRows || []) as LeaveAccrualRecord[]) {
      const existing = accrualsByEmployee.get(row.employee_id) || [];
      existing.push(row);
      accrualsByEmployee.set(row.employee_id, existing);
    }

    const balancesByEmployee = new Map(
      ((balanceRows || []) as LeaveBalanceRecord[]).map((row) => [row.employee_id, row])
    );

    const calculationDate = getCalculationDateKey();
    const summary: Array<{ employee_id: string; full_name: string; extra_office_days: number; accrued_leaves: number }> = [];

    for (const employee of activeEmployees) {
      const actualOfficeDays = officeDaysByEmployee.get(employee.id)?.size || 0;
      const extraOfficeDays = Math.max(actualOfficeDays - EXPECTED_OFFICE_DAYS, 0);
      const employeeAccruals = accrualsByEmployee.get(employee.id) || [];
      const currentMonthAccrual = employeeAccruals.find((row) => row.month === targetMonth)?.accrued_leaves || 0;
      const earnedEarlierThisYear = employeeAccruals
        .filter((row) => row.month !== targetMonth)
        .reduce((total, row) => total + (row.accrued_leaves || 0), 0);
      const accruedLeaves = calculateBonusLeaves(extraOfficeDays, earnedEarlierThisYear);
      const delta = accruedLeaves - currentMonthAccrual;

      const { error: upsertAccrualError } = await supabaseAdmin
        .from('leave_accruals')
        .upsert(
          {
            employee_id: employee.id,
            leave_type_id: leaveTypes.id,
            year: targetYear,
            month: targetMonth,
            extra_office_days: extraOfficeDays,
            accrued_leaves: accruedLeaves,
            calculation_date: calculationDate,
          },
          { onConflict: 'employee_id,leave_type_id,year,month' }
        );

      if (upsertAccrualError) {
        return NextResponse.json({ error: upsertAccrualError.message }, { status: 500 });
      }

      const existingBalance = balancesByEmployee.get(employee.id);
      if (existingBalance) {
        const nextEntitlement = Math.max(
          existingBalance.total_entitlement + delta,
          existingBalance.used_leaves + existingBalance.pending_leaves
        );

        const { error: updateBalanceError } = await supabaseAdmin
          .from('leave_balances')
          .update({
            total_entitlement: nextEntitlement,
            updated_at: new Date().toISOString(),
          })
          .eq('employee_id', employee.id)
          .eq('leave_type_id', leaveTypes.id)
          .eq('year', targetYear);

        if (updateBalanceError) {
          return NextResponse.json({ error: updateBalanceError.message }, { status: 500 });
        }

        balancesByEmployee.set(employee.id, {
          ...existingBalance,
          total_entitlement: nextEntitlement,
        });
      } else if (accruedLeaves > 0) {
        const { data: insertedBalance, error: insertBalanceError } = await supabaseAdmin
          .from('leave_balances')
          .insert({
            employee_id: employee.id,
            leave_type_id: leaveTypes.id,
            year: targetYear,
            total_entitlement: accruedLeaves,
            used_leaves: 0,
            pending_leaves: 0,
          })
          .select('employee_id, total_entitlement, used_leaves, pending_leaves')
          .single();

        if (insertBalanceError) {
          return NextResponse.json({ error: insertBalanceError.message }, { status: 500 });
        }

        balancesByEmployee.set(employee.id, insertedBalance as LeaveBalanceRecord);
      }

      if (accruedLeaves > 0) {
        summary.push({
          employee_id: employee.id,
          full_name: employee.full_name,
          extra_office_days: extraOfficeDays,
          accrued_leaves: accruedLeaves,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Leave accrual processed successfully',
      year: targetYear,
      month: targetMonth,
      summary,
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
