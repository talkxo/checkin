import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export const dynamic = 'force-dynamic';

interface EmployeeSummary {
  employee_id: string;
  name: string;
  slug: string;
  daysPresent: number;
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

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

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
        mood_comment,
        employees (
          id,
          full_name,
          slug
        )
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

    // Group sessions by employee
    const employeeGroups = new Map<string, any[]>();
    sessions?.forEach(session => {
      const employeeId = session.employee_id;
      if (!employeeGroups.has(employeeId)) {
        employeeGroups.set(employeeId, []);
      }
      employeeGroups.get(employeeId)?.push(session);
    });

    // Calculate employee summaries
    const employeeSummaries: EmployeeSummary[] = [];
    let totalHours = 0;
    let totalOfficeHours = 0;
    let totalRemoteHours = 0;
    let totalEmployees = 0;

    employeeGroups.forEach((employeeSessions, empId) => {
      const employee = employeeSessions[0].employees;
      const employeeName = employee?.full_name || 'Unknown';
      const employeeSlug = employee?.slug || '';

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
        const dateStr = checkinTime.toISOString().split('T')[0];
        
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

      const averageHoursPerDay = daysPresent > 0 ? empTotalHours / daysPresent : 0;
      const attendanceRate = daysPresent > 0 ? (daysPresent / getWorkingDaysInRange(startDate, endDate)) * 100 : 0;

      employeeSummaries.push({
        employee_id: empId,
        name: employeeName,
        slug: employeeSlug,
        daysPresent,
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
      totalEmployees++;
    });

    // Calculate team summary
    const totalWorkingDays = getWorkingDaysInRange(startDate, endDate);
    const averageAttendanceRate = totalEmployees > 0 ? 
      employeeSummaries.reduce((sum, emp) => sum + emp.attendanceRate, 0) / totalEmployees : 0;
    const officePercentage = totalHours > 0 ? (totalOfficeHours / totalHours) * 100 : 0;
    const remotePercentage = totalHours > 0 ? (totalRemoteHours / totalHours) * 100 : 0;

    const teamSummary: TeamSummary = {
      totalEmployees,
      totalWorkingDays,
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
