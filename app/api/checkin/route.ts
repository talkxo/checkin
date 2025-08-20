import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { fullName, slug, mode } = await req.json();
  if (!mode || !['office', 'remote'].includes(mode)) {
    return NextResponse.json({ error: 'mode must be office|remote' }, { status: 400 });
  }
  
  let emp;
  // Prefer slug lookup; fallback to ilike match; if none, create safely
  if (slug) {
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
  const { data: existingSession } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('employee_id', emp.id)
    .is('checkout_ts', null)
    .maybeSingle();
  
  if (existingSession) {
    // Return existing session data instead of error
    return NextResponse.json({
      employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
      session: existingSession,
      message: 'Open session already exists'
    });
  }
  
  // Create new session
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .insert({ employee_id: emp.id, mode, ip, user_agent: ua })
    .select('*')
    .single();
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  return NextResponse.json({
    employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug },
    session: data
  });
}

export const dynamic = 'force-dynamic';


