import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { istDayWindow } from '@/lib/time';
export async function GET(){
  const { start, end } = istDayWindow();
  const { data, error } = await supabaseAdmin.rpc('today_sessions', { start_ts: start.toISOString(), end_ts: end.toISOString() });
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
export const dynamic = 'force-dynamic';


