import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, isWorkdayIST, hhmmIST } from '@/lib/time';
import { postCampfire } from '@/lib/basecamp';
export async function POST(){
  if(!isWorkdayIST()) return NextResponse.json({ skipped: 'weekend' });
  const now = nowIST(); const start = new Date(now); start.setHours(0,0,0,0); const end = new Date(now); end.setHours(23,59,59,999);
  const { data } = await supabaseAdmin.rpc('today_sessions', { start_ts: start.toISOString(), end_ts: end.toISOString() });
  const items = (data||[]) as any[];
  const office = items.filter(i=>i.mode==='office'); const remote = items.filter(i=>i.mode==='remote');
  const lines = [ 'Daily Attendance (11:30 IST)', '', `OFFICE (${office.length}):`, ...office.map(x=>`- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`), '', `REMOTE (${remote.length}):`, ...remote.map(x=>`- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`) ];
  await postCampfire(lines.join('\n'));
  return NextResponse.json({ ok: true, office: office.length, remote: remote.length });
}


