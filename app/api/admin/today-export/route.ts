import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, hhmmIST } from '@/lib/time';

export async function GET(req: NextRequest) {
  try {
    const now = nowIST();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Get all employees
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .order('full_name');
    
    if (empError) return NextResponse.json({ error: empError.message }, { status: 500 });

    // Get all sessions for today
    const { data: sessions, error: sessError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .gte('checkin_ts', start.toISOString())
      .lte('checkin_ts', end.toISOString())
      .order('checkin_ts', { ascending: true });

    if (sessError) return NextResponse.json({ error: sessError.message }, { status: 500 });

    // Process each employee's data
    const todayData = employees?.map(emp => {
      const empSessions = sessions?.filter(s => s.employee_id === emp.id) || [];
      
      let workedMs = 0;
      let firstIn: string | null = null;
      let lastOut: string | null = null;
      let open = false;
      let mode = '';
      let sessionCount = 0;

      for (const session of empSessions) {
        sessionCount++;
        // Track first check-in of the day
        if (!firstIn) {
          firstIn = session.checkin_ts;
        }
        
        mode = session.mode;
        const out = session.checkout_ts ? new Date(session.checkout_ts) : now;
        if (!session.checkout_ts) open = true;
        else {
          // Track the latest check-out time
          if (!lastOut || new Date(session.checkout_ts) > new Date(lastOut)) {
            lastOut = session.checkout_ts;
          }
        }
        workedMs += new Date(out).getTime() - new Date(session.checkin_ts).getTime();
      }

      const workedMinutes = Math.max(0, Math.round(workedMs / 60000));
      const hours = Math.floor(workedMinutes / 60);
      const minutes = workedMinutes % 60;

      return {
        name: emp.full_name,
        firstIn: firstIn ? new Date(firstIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'N/A',
        lastOut: lastOut ? new Date(lastOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'N/A',
        totalHours: `${hours}h ${minutes}m`,
        mode: mode || 'N/A',
        status: open ? 'Active' : (firstIn ? 'Complete' : 'Not Started'),
        sessions: sessionCount
      };
    }) || [];

    // Generate CSV content
    const csvHeaders = ['Name', 'First In', 'Last Out', 'Total Hours', 'Mode', 'Status', 'Sessions'];
    const csvRows = todayData.map(row => [
      row.name,
      row.firstIn,
      row.lastOut,
      row.totalHours,
      row.mode,
      row.status,
      row.sessions
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create filename with current date
    const today = now.toISOString().split('T')[0];
    const filename = `attendance_${today}.csv`;

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
