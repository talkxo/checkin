import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest){
  const slug = new URL(req.url).searchParams.get('slug');
  if(!slug) return NextResponse.json({ ok:false });
  const { data: emp } = await supabaseAdmin.from('employees').select('id, full_name, slug').eq('slug', slug).maybeSingle();
  if(!emp) return NextResponse.json({ ok:false });
  const { data } = await supabaseAdmin.from('sessions').select('*').eq('employee_id', emp.id).is('checkout_ts', null).order('checkin_ts', { ascending: false }).maybeSingle();
  return NextResponse.json({ ok: !!data, session: data||null, employee: emp });
}

export const dynamic = 'force-dynamic';


