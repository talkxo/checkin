import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
export async function GET(){
  const now = nowIST(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999);
  const { data, error } = await supabaseAdmin.rpc('today_sessions', { start_ts: start.toISOString(), end_ts: end.toISOString() });
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}


