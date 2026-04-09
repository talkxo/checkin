import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { formatISTDateKey, nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

interface EmployeeSummary {
  employee_id: string;
  name: string;
  slug: string;
  daysPresent: number;
  missedDays: number;
  elapsedWorkingDays: number;
  approvedLeaveDays: number;
  pendingLeaveDays: number;
  officeDays: number;
  remoteDays: number;
  totalHours: number;
  officeHours: number;
  remoteHours: number;
  averageHoursPerDay: number;
  attendanceRate: number;
  sessions: Array<{
    id: string;
    date: string;
    checkinTime: string;
    checkoutTime: string;
    hoursWorked: string;
    mode: string;
    status: string;
    mood?: string;
    moodComment?: string;
  }>;
}

interface TeamSummary {
  totalEmployees: number;
  totalWorkingDays: number;
  elapsedWorkingDays: number;
  totalHours: number;
  averageAttendanceRate: number;
  officePercentage: number;
  remotePercentage: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const employeeId = searchParams.get('employeeId');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const startDate = parseISTBoundary(startDateParam, 'start');
    const endDate = parseISTBoundary(endDateParam, 'end');
    const today = nowIST();
    const effectiveEndDate = new Date(Math.min(endDate.getTime(), today.getTime()));
    effectiveEndDate.setHours(23, 59, 59, 999);

    // Get employees in scope first so attendance can include leave-only or missing employees too
    let employeeQuery = supabaseAdmin
      .from('employees')
      .select('id, full_name, slug, active')
      .order('full_name');

    if (employeeId) {
      employeeQuery = employeeQuery.eq('id', employeeId);
    }

    const { data: employees, error: employeesError } = await employeeQuery;

    if (employeesError) {
      return NextResponse.json({ error: employeesError.message }, { status: 500 });
    }

    // Get all sessions in the date range
    let query = supabaseAdmin
      .from('sessions')
      .select(`
        id,
        employee_id,
        checkin_ts,
        checkout_ts,
        mode,
        mood,
        mood_comment
      `)
      .gte('checkin_ts', startDate.toISOString())
      .lte('checkin_ts', endDate.toISOString())
      .order('checkin_ts', { ascending: true });

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get leave requests overlapping the selected range
    let leaveQuery = supabaseAdmin
      .from('leave_requests')
      .select('employee_id, start_date, end_date, status')
      .lte('start_date', endDateParam)
      .gte('end_date', startDateParam)
      .in('status', ['approved', 'pending']);

    if (employeeId) {
      leaveQuery = leaveQuery.eq('employee_id', employeeId);
    }

    const { data: leaveRequests, error: leaveError } = await leaveQuery;

    if (leaveError) {
      return NextResponse.json({ error: leaveError.message }, { status: 500 });
    }

    // Group sessions by employee
    const employeeGroups = new Map<string, any[]>();
    sessions?.forEach(session => {
      const currentEmployeeId = session.employee_id;
      if (!employeeGroups.has(currentEmployeeId)) {
        employeeGroups.set(currentEmployeeId, []);
      }
      employeeGroups.get(currentEmployeeId)?.push(session);
    });

    const leaveDaysByEmployee = new Map<string, { approved: number; pending: number }>();
    leaveRequests?.forEach((request) => {
      const overlapDays = getWorkingDaysOverlap(
        startDate,
        effectiveEndDate,
        parseDateOnly(request.start_date),
        parseDateOnly(request.end_date)
      );

      if (overlapDays <= 0) return;

      const entry = leaveDaysByEmployee.get(request.employee_id) || { approved: 0, pending: 0 };
      if (request.status === 'approved') {
        entry.approved += overlapDays;
      } else if (request.status === 'pending') {
        entry.pending += overlapDays;
      }
      leaveDaysByEmployee.set(request.employee_id, entry);
    });

    // Exclude employees who are both inactive and have no sessions in range.
    // Keep inactive employees if they have session history in the selected period.
    const scopedEmployees = (employees || []).filter((employee: any) => {
      const employeeSessions = employeeGroups.get(employee.id) || [];
      return employee.active !== false || employeeSessions.length > 0;
    });

    // Calculate employee summaries
    const employeeSummaries: EmployeeSummary[] = [];
    let totalHours = 0;
    let totalOfficeHours = 0;
    let totalRemoteHours = 0;
    const totalEmployees = scopedEmployees.length;

    scopedEmployees.forEach((employee: any) => {
      const employeeSessions = employeeGroups.get(employee.id) || [];
      const employeeName = employee.full_name || 'Unknown';
      const employeeSlug = employee.slug || '';

      let daysPresent = 0;
      let officeDays = 0;
      let remoteDays = 0;
      let empTotalHours = 0;
      let empOfficeHours = 0;
      let empRemoteHours = 0;
      const uniqueDays = new Set<string>();
      const officeDaysSet = new Set<string>();
      const remoteDaysSet = new Set<string>();

      const processedSessions = employeeSessions.map(session => {
        const checkinTime = new Date(session.checkin_ts);
        const checkoutTime = session.checkout_ts ? new Date(session.checkout_ts) : null;
        const dateStr = formatISTDateKey(checkinTime);
        
        uniqueDays.add(dateStr);
        if (session.mode === 'office') {
          officeDaysSet.add(dateStr);
        } else {
          remoteDaysSet.add(dateStr);
        }

        let hoursWorked = 'N/A';
        let hours = 0;
        if (checkoutTime) {
          const diffMs = checkoutTime.getTime() - checkinTime.getTime();
          hours = diffMs / (1000 * 60 * 60);
          const hoursInt = Math.floor(hours);
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          hoursWorked = `${hoursInt}h ${minutes}m`;
          empTotalHours += hours;
          if (session.mode === 'office') {
            empOfficeHours += hours;
          } else {
            empRemoteHours += hours;
          }
        }

        return {
          id: session.id,
          date: dateStr,
          checkinTime: checkinTime.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
          checkoutTime: checkoutTime ? checkoutTime.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Kolkata'
          }) : 'N/A',
          hoursWorked,
          mode: session.mode,
          status: checkoutTime ? 'Complete' : 'Active',
          mood: session.mood,
          moodComment: session.mood_comment
        };
      });

      daysPresent = uniqueDays.size;
      officeDays = officeDaysSet.size;
      remoteDays = remoteDaysSet.size;

      const elapsedWorkingDays = getWorkingDaysInRange(startDate, effectiveEndDate);
      const leaveDays = leaveDaysByEmployee.get(employee.id) || { approved: 0, pending: 0 };
      const adjustedWorkingDays = Math.max(0, elapsedWorkingDays - leaveDays.approved);
      const averageHoursPerDay = daysPresent > 0 ? empTotalHours / daysPresent : 0;
      const attendanceRate = adjustedWorkingDays > 0 ? (daysPresent / adjustedWorkingDays) * 100 : 100;
      const missedDays = Math.max(0, adjustedWorkingDays - daysPresent);

      employeeSummaries.push({
        employee_id: employee.id,
        name: employeeName,
        slug: employeeSlug,
        daysPresent,
        missedDays,
        elapsedWorkingDays,
        approvedLeaveDays: leaveDays.approved,
        pendingLeaveDays: leaveDays.pending,
        officeDays,
        remoteDays,
        totalHours: Math.round(empTotalHours * 100) / 100,
        officeHours: Math.round(empOfficeHours * 100) / 100,
        remoteHours: Math.round(empRemoteHours * 100) / 100,
        averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        sessions: processedSessions
      });

      totalHours += empTotalHours;
      totalOfficeHours += empOfficeHours;
      totalRemoteHours += empRemoteHours;
    });

    // Calculate team summary
    const totalWorkingDays = getWorkingDaysInRange(startDate, endDate);
    const elapsedWorkingDays = getWorkingDaysInRange(startDate, effectiveEndDate);
    const averageAttendanceRate = totalEmployees > 0 ? 
      employeeSummaries.reduce((sum, emp) => sum + emp.attendanceRate, 0) / totalEmployees : 0;
    const officePercentage = totalHours > 0 ? (totalOfficeHours / totalHours) * 100 : 0;
    const remotePercentage = totalHours > 0 ? (totalRemoteHours / totalHours) * 100 : 0;

    const teamSummary: TeamSummary = {
      totalEmployees,
      totalWorkingDays,
      elapsedWorkingDays,
      totalHours: Math.round(totalHours * 100) / 100,
      averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
      officePercentage: Math.round(officePercentage * 100) / 100,
      remotePercentage: Math.round(remotePercentage * 100) / 100,
      dateRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };

    return NextResponse.json({
      teamSummary,
      employeeSummaries,
      totalSessions: sessions?.length || 0
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function getWorkingDaysInRange(startDate: Date, endDate: Date): number {
  let workingDays = 0;
  const current = new Date(startDate);
  
  while (current <= endDate) {
    // Count weekdays (Monday = 1, Sunday = 0)
    const dayOfWeek = current.getDay();
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}

function getWorkingDaysOverlap(rangeStart: Date, rangeEnd: Date, leaveStart: Date, leaveEnd: Date): number {
  const start = new Date(Math.max(rangeStart.getTime(), leaveStart.getTime()));
  const end = new Date(Math.min(rangeEnd.getTime(), leaveEnd.getTime()));

  if (start > end) return 0;
  return getWorkingDaysInRange(start, end);
}

function parseISTBoundary(dateString: string, boundary: 'start' | 'end') {
  const time = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
  return new Date(`${dateString}T${time}+05:30`);
}

function parseDateOnly(dateString: string) {
  return new Date(`${dateString}T12:00:00+05:30`);
}
