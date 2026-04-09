import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export async function GET(req: NextRequest) {
  try {
    const now = nowIST();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Get active employees only (exclude disabled/inactive users)
    const { data: employees, error: empError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug')
      .eq('active', true)
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
    const attendance = employees?.map(emp => {
      const empSessions = sessions?.filter(s => s.employee_id === emp.id) || [];
      
      let workedMs = 0;
      let firstIn: string | null = null;
      let lastOut: string | null = null;
      let open = false;
      let mode = '';
      let sessionCount = 0;

      for (const session of empSessions) {
        sessionCount++;
        if (!firstIn) {
          firstIn = session.checkin_ts;
        }
        
        mode = session.mode;
        const out = session.checkout_ts ? new Date(session.checkout_ts) : now;
        if (!session.checkout_ts) open = true;
        else {
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
        id: emp.id,
        name: emp.full_name,
        slug: emp.slug,
        firstIn: firstIn ? new Date(firstIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'N/A',
        lastOut: lastOut ? new Date(lastOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'N/A',
        totalHours: `${hours}h ${minutes}m`,
        mode: mode || 'N/A',
        status: open ? 'Active' : (firstIn ? 'Complete' : 'Not Started'),
        sessions: sessionCount
      };
    }) || [];

    return NextResponse.json({ attendance });

  } catch (error) {
    console.error('Today attendance error:', error);
    return NextResponse.json({ error: 'Failed to fetch today\'s attendance' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
