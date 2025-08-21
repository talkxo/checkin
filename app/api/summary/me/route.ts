import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, hhmmIST } from '@/lib/time';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') || '';
  const fullName = url.searchParams.get('fullName') || '';
  if(!slug && !fullName) return NextResponse.json({ error: 'slug or fullName required' }, { status: 400 });

  let emp: any = null;
  if(slug){ const { data } = await supabaseAdmin.from('employees').select('id, full_name, slug').eq('slug', slug).maybeSingle(); emp = data; }
  if(!emp && fullName){ const { data } = await supabaseAdmin.from('employees').select('id, full_name, slug').ilike('full_name', fullName).maybeSingle(); emp = data; }
  if(!emp) return NextResponse.json({ error: 'employee not found' }, { status: 404 });

  const now = nowIST(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999);
  const { data: sessions, error } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('employee_id', emp.id)
    .gte('checkin_ts', start.toISOString())
    .lte('checkin_ts', end.toISOString())
    .order('checkin_ts', { ascending: true });
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });

  let workedMs = 0;
  let lastIn: string | null = null;
  let lastOut: string | null = null;
  let open = false;
  let mode: string | null = null;
  
  for(const s of sessions||[]){
    lastIn = s.checkin_ts;
    const out = s.checkout_ts ? new Date(s.checkout_ts) : now;
    if(!s.checkout_ts) open = true; else lastOut = s.checkout_ts;
    workedMs += new Date(out).getTime() - new Date(s.checkin_ts).getTime();
    // Get mode from the most recent session
    mode = s.mode;
  }
  
  const workedMinutes = Math.max(0, Math.round(workedMs/60000));
  return NextResponse.json({ 
    employee: emp, 
    open, 
    lastIn: lastIn ? hhmmIST(lastIn) : null, 
    lastOut: lastOut ? hhmmIST(lastOut) : null, 
    workedMinutes, 
    mode 
  });
}

export const dynamic = 'force-dynamic';


