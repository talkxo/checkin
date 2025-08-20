import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Get all open sessions
    const { data: openSessions, error: fetchError } = await supabaseAdmin
      .from('sessions')
      .select('id, employee_id, checkin_ts')
      .is('checkout_ts', null);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!openSessions || openSessions.length === 0) {
      return NextResponse.json({ 
        message: 'No active sessions found',
        resetCount: 0 
      });
    }

    // Check out all open sessions
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('sessions')
      .update({ checkout_ts: now })
      .is('checkout_ts', null);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Successfully checked out ${openSessions.length} active sessions`,
      resetCount: openSessions.length,
      timestamp: now
    });

  } catch (error) {
    console.error('Session reset error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
