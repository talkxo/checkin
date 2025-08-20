import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST, hhmmIST } from '@/lib/time';
import { postCampfire } from '@/lib/basecamp';

export async function POST(req: NextRequest) {
  try {
    const { force = false } = await req.json();
    
    // Get today's data
    const now = nowIST();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    // Get sessions data
    const { data, error } = await supabaseAdmin.rpc('today_sessions', {
      start_ts: start.toISOString(),
      end_ts: end.toISOString()
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data || []) as any[];
    const office = items.filter(i => i.mode === 'office');
    const remote = items.filter(i => i.mode === 'remote');

    // Create summary message
    const lines = [
      '📊 Daily Attendance Summary (Test)',
      '',
      `🏢 OFFICE (${office.length}):`,
      ...office.map(x => `- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`),
      '',
      `🏠 REMOTE (${remote.length}):`,
      ...remote.map(x => `- ${x.full_name} — ${hhmmIST(x.checkin_ts)}`),
      '',
      `📈 Total: ${items.length} employees checked in today`,
      `⏰ Generated at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
    ];

    const message = lines.join('\n');

    // Try to post to Basecamp
    let basecampResult = null;
    try {
      await postCampfire(message);
      basecampResult = { success: true, message: 'Posted to Basecamp successfully' };
    } catch (error) {
      basecampResult = { success: false, error: error.message };
    }

    return NextResponse.json({
      status: 'Daily Summary Test Results',
      data: {
        total: items.length,
        office: office.length,
        remote: remote.length,
        items: items.map(item => ({
          name: item.full_name,
          mode: item.mode,
          checkin: hhmmIST(item.checkin_ts),
          checkout: item.checkout_ts ? hhmmIST(item.checkout_ts) : null
        }))
      },
      message: message,
      basecamp: basecampResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
