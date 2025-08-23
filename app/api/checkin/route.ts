import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export async function POST(req: NextRequest) {
  const { fullName, slug, email, mode } = await req.json();
  
  console.log('=== CHECKIN API DEBUG ===');
  console.log('Received request data:', { fullName, slug, email, mode });
  
  if (!mode || !['office', 'remote'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be office|remote' }, { status: 400 });
  }
  
  let emp;
  // Prefer email lookup (most reliable); fallback to slug; then name
  if (email) {
    const { data } = await supabaseAdmin.from('employees').select('*').eq('email', email).maybeSingle();
    emp = data as any;
  }
  if (!emp && slug) {
    const { data } = await supabaseAdmin.from('employees').select('*').eq('slug', slug).maybeSingle();
    emp = data as any;
  }
  if (!emp && fullName) {
    const { data } = await supabaseAdmin.from('employees').select('*').ilike('full_name', fullName).maybeSingle();
    emp = data as any;
  }
  
  // Do NOT auto-create employees here. Admin must add separately.
  if (!emp) {
    return NextResponse.json({ error: 'employee not found' }, { status: 404 });
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
    // Return existing session data instead of error
    return NextResponse.json({
      employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
      session: existingSession,
      message: 'Open session already exists'
    });
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


