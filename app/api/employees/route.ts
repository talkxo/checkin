import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest){
  const q = new URL(req.url).searchParams.get('q')?.trim() || '';
  if(q.length < 2) return NextResponse.json([]);

  // DEV-ONLY: include hardcoded test user in results
  const devUser = process.env.NODE_ENV === 'development' && 'test user'.includes(q.toLowerCase())
    ? [{ id: '00000000-0000-0000-0000-000000000001', full_name: 'Test User', slug: 'test-user' }]
    : [];

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, full_name, slug')
    .ilike('full_name', `%${q}%`)
    .order('full_name', { ascending: true })
    .limit(10);
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json([...devUser, ...(data || [])]);
}

export const dynamic = 'force-dynamic';


