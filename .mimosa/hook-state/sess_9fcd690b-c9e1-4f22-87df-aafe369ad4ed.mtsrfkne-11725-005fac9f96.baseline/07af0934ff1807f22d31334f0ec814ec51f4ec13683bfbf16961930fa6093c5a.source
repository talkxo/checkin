import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
export async function POST(req: NextRequest){
  const { fullName, email } = await req.json();
  if(!fullName) return NextResponse.json({ error: 'fullName required' }, { status: 400 });
  const { data: existing } = await supabaseAdmin.from('employees').select('id, slug').ilike('full_name', fullName).maybeSingle();
  if(existing) return NextResponse.json(existing);
  const { data, error } = await supabaseAdmin.from('employees').insert({ full_name: fullName, email }).select('id, slug').single();
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}


