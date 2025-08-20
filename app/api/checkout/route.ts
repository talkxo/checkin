import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
export async function POST(req: NextRequest){
  const { slug } = await req.json();
  if(!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });
  const { data: emp } = await supabaseAdmin.from('employees').select('id').eq('slug', slug).single();
  if(!emp) return NextResponse.json({ error: 'employee not found' }, { status: 404 });
  const { data: ses } = await supabaseAdmin.from('sessions').select('*').eq('employee_id', emp.id).is('checkout_ts', null).order('checkin_ts', { ascending: false }).maybeSingle();
  if(!ses) return NextResponse.json({ error: 'no open session' }, { status: 404 });
  const { data, error } = await supabaseAdmin.from('sessions').update({ checkout_ts: new Date().toISOString() }).eq('id', ses.id).select('*').single();
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
export const dynamic = 'force-dynamic';


