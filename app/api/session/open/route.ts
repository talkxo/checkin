import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth';

export async function GET(req: NextRequest){
  const session = getUserSession();
  if(!session) return NextResponse.json({ ok:false, error: 'Unauthorized' }, { status: 401 });

  const { id: employeeId } = session;

  const { data: emp } = await supabaseAdmin.from('employees').select('id, full_name, slug').eq('id', employeeId).maybeSingle();
  if(!emp) return NextResponse.json({ ok:false });
  
  const { data } = await supabaseAdmin.from('sessions').select('*').eq('employee_id', emp.id).is('checkout_ts', null).order('checkin_ts', { ascending: false }).maybeSingle();
  
  return NextResponse.json({ ok: !!data, session: data||null, employee: emp });
}

export const dynamic = 'force-dynamic';


