import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
import { getUserSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = getUserSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized: No valid session found' }, { status: 401 });
  }

  const { mode } = await req.json();
  
  // Use session data for identity
  const { id: employeeId, slug, fullName } = session;
  
  console.log('=== CHECKIN API DEBUG ===');
  console.log('Received request data:', { employeeId: session.id, mode });
  
  if (!mode || !['office', 'remote'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be office|remote' }, { status: 400 });
  }
  
  // Verify the employee still exists/is active
  const { data: emp, error: empError } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('id', employeeId)
    .eq('active', true)
    .maybeSingle();
  
  if (!emp || empError) {
    return NextResponse.json({ error: 'employee not found or inactive' }, { status: 404 });
  }
  
  const ip = req.headers.get('x-forwarded-for') || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  
  // Check for existing open session
  const { data: existingSession, error: sessionError } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('employee_id', emp.id)
    .is('checkout_ts', null)
    .maybeSingle();
  
  if (sessionError) {
    console.log('Error checking existing session:', sessionError);
  }
  
  if (existingSession) {
    console.log('Found existing session:', existingSession);
    
    // Check if this session is stale (>= 12 hours old)
    const AUTO_CHECKOUT_HOURS = 12;
    const checkinDate = new Date(existingSession.checkin_ts);
    const checkinTime = checkinDate.getTime();
    
    if (Number.isNaN(checkinTime)) {
      console.error('Invalid checkin_ts in existing session:', existingSession.checkin_ts);
      return NextResponse.json({ error: 'Invalid session state' }, { status: 500 });
    }
    
    const now = Date.now();
    const hoursElapsed = (now - checkinTime) / (1000 * 60 * 60);
    
    if (hoursElapsed >= AUTO_CHECKOUT_HOURS) {
      // Auto-close the stale session with a capped checkout timestamp
      const cappedCheckoutTs = new Date(checkinTime + AUTO_CHECKOUT_HOURS * 60 * 60 * 1000).toISOString();
      console.log(`Auto-closing stale session ${existingSession.id} (${hoursElapsed.toFixed(2)}h old), capping checkout at ${cappedCheckoutTs}`);
      
      const { error: closeError } = await supabaseAdmin
        .from('sessions')
        .update({
          checkout_ts: cappedCheckoutTs,
          mood_comment: `Auto-closed: stale session (${hoursElapsed.toFixed(1)}h, capped at ${AUTO_CHECKOUT_HOURS}h)`
        })
        .eq('id', existingSession.id);
      
      if (closeError) {
        console.error('Failed to auto-close stale session:', closeError);
        return NextResponse.json({ error: 'Failed to close stale session' }, { status: 500 });
      }
      // Fall through to create new session below
    } else {
      // Session is recent — return it as-is
      return NextResponse.json({
        employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
        session: existingSession,
        message: 'Open session already exists'
      });
    }
  }
  
  // Create new session with explicit IST timestamp
  const istTimestamp = nowIST().toISOString();
  console.log('Creating new session for employee:', emp.id, 'at:', istTimestamp);
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ 
      employee_id: emp.id, 
      mode, 
      ip, 
      user_agent: ua,
      checkin_ts: istTimestamp
    })
    .select('*')
    .single();
  
  if (error) {
    console.log('Error creating session:', error);
    // If it's a duplicate constraint error, try to get the existing session
    if (error.message.includes('unique constraint') || error.message.includes('duplicate key')) {
      console.log('Duplicate session detected, fetching existing session');
      const { data: existingSession } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('employee_id', emp.id)
        .is('checkout_ts', null)
        .maybeSingle();
      
      if (existingSession) {
        return NextResponse.json({
          employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
          session: existingSession,
          message: 'Open session already exists'
        });
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
    session: data
  });
}

export const dynamic = 'force-dynamic';


