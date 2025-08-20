import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, hhmmIST } from '@/lib/time';

export async function GET() {
  const now = nowIST();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  console.log('Today summary requested at:', now.toISOString());
  console.log('Date range:', start.toISOString(), 'to', end.toISOString());

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

  console.log('Found sessions for today:', sessions?.length || 0);

  // Process each employee's data
  const summary = employees?.map(emp => {
    const empSessions = sessions?.filter(s => s.employee_id === emp.id) || [];
    
    let workedMs = 0;
    let firstIn: string | null = null;
    let lastOut: string | null = null;
    let open = false;
    let mode = '';

    for (const session of empSessions) {
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
      id: emp.id,
      full_name: emp.full_name,
      slug: emp.slug,
      lastIn: firstIn ? hhmmIST(firstIn) : null,
      lastOut: lastOut ? hhmmIST(lastOut) : null,
      workedHours: `${hours}h ${minutes}m`,
      mode,
      open
    };
  }) || [];

  const response = NextResponse.json(summary);
  
  // Add cache-busting headers to ensure fresh data
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

export const dynamic = 'force-dynamic';
