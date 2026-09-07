import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isWorkdayIST, istDayWindow, hhmmIST } from '@/lib/time';
import { postCampfire } from '@/lib/basecamp';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  try {
    // Protect cron endpoint with a secret token (mirrors auto-checkout).
    // Dev convenience: if CRON_SECRET is not configured outside production, allow unauthenticated dev calls.
    const authToken = req.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET;
    if ((expectedToken || process.env.NODE_ENV === 'production') && (!expectedToken || authToken !== `Bearer ${expectedToken}`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if(!isWorkdayIST()) return NextResponse.json({ skipped: 'weekend' });
  const { start, end } = istDayWindow();
  const { data } = await supabaseAdmin.rpc('today_sessions', { start_ts: start.toISOString(), end_ts: end.toISOString() });
  const items = (data||[]) as any[];
  const office = items.filter(i=>i.mode==='office'); const remote = items.filter(i=>i.mode==='remote');
  const lines = [ 'Daily Attendance (11:30 IST)', '', `OFFICE (${office.length}):`, ...office.map(x=>`- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`), '', `REMOTE (${remote.length}):`, ...remote.map(x=>`- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`) ];
  await postCampfire(lines.join('\n'));
  return NextResponse.json({ ok: true, office: office.length, remote: remote.length });
  } catch (error) {
    console.error('Cron summary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


