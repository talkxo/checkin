import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest){
  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  if(q.length < 2) return NextResponse.json([]);
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, slug')
    .ilike('full_name', `%${q}%`)
    .order('full_name', { ascending: true })
    .limit(10);
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const dynamic = 'force-dynamic';


