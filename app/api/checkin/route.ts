import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
export async function POST(req: NextRequest){
  const { fullName, slug, mode } = await req.json();
  if(!mode || !['office','remote'].includes(mode)) return NextResponse.json({ error: 'mode must be office|remote' }, { status: 400 });
  let emp;
  if(slug){ const { data } = await supabaseAdmin.from('employees').select('*').eq('slug', slug).single(); emp = data; }
  if(!emp && fullName){ const { data } = await supabaseAdmin.from('employees').select('*').ilike('full_name', fullName).maybeSingle(); emp = data; }
  if(!emp && fullName){ const ins = await supabaseAdmin.from('employees').insert({ full_name: fullName }).select('*').single(); emp = ins.data; }
  if(!emp) return NextResponse.json({ error: 'employee not found' }, { status: 404 });
  const ip = req.headers.get('x-forwarded-for') || '0.0.0.0';
  const ua = req.headers.get('user-agent') || '';
  const open = await supabaseAdmin.from('sessions').select('id').eq('employee_id', emp.id).is('checkout_ts', null).maybeSingle();
  if(open.data) return NextResponse.json({ error: 'Open session exists' }, { status: 409 });
  const { data, error } = await supabaseAdmin.from('sessions').insert({ employee_id: emp.id, mode, ip, user_agent: ua }).select('*').single();
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ employee: { id: emp.id, full_name: emp.full_name, slug: emp.slug }, session: data });
}


