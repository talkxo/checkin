import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
import { getSetting } from '@/lib/settings';

export async function POST() {
  try {
    // Get auto-checkout hours from settings (default: 12)
    const autoCheckoutHours = Number(await getSetting('auto_checkout_hours')) || 12;
    console.log(`Auto-checkout: Checking sessions with duration >= ${autoCheckoutHours} hours`);
    
    // Get all open sessions (checkout_ts IS NULL)
    const { data: openSessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('*, employees(*)')
      .is('checkout_ts', null)
      .order('checkin_ts', { ascending: true });
    
    if (sessionsError) {
      console.error('Error fetching open sessions:', sessionsError);
      return NextResponse.json({ 
        error: 'Failed to fetch open sessions',
        checkedOut: 0,
        errors: 1
      }, { status: 500 });
    }
    
    if (!openSessions || openSessions.length === 0) {
      return NextResponse.json({ 
        checkedOut: 0,
        errors: 0,
        message: 'No open sessions found'
      });
    }
    
    const now = nowIST();
    let checkedOut = 0;
    let errors = 0;
    
    // Process each session
    for (const session of openSessions) {
      try {
        const checkinTime = new Date(session.checkin_ts);
        const durationMs = now.getTime() - checkinTime.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);
        
        // Check if session duration >= configured hours
        if (durationHours >= autoCheckoutHours) {
          const istTimestamp = nowIST().toISOString();
          
          // Update session with checkout timestamp
          // Set mood to null for auto-checked out sessions (can be updated later)
          const { error: updateError } = await supabaseAdmin
            .from('sessions')
            .update({ 
              checkout_ts: istTimestamp,
              mood_comment: `Auto-checked out after ${durationHours.toFixed(2)} hours`
            })
            .eq('id', session.id);
          
          if (updateError) {
            console.error(`Error checking out session ${session.id}:`, updateError);
            errors++;
          } else {
            console.log(`Auto-checked out session ${session.id} for employee ${session.employees?.full_name || session.employee_id} (${durationHours.toFixed(2)} hours)`);
            checkedOut++;
          }
        }
      } catch (error) {
        console.error(`Error processing session ${session.id}:`, error);
        errors++;
      }
    }
    
    return NextResponse.json({ 
      checkedOut,
      errors,
      totalChecked: openSessions.length,
      autoCheckoutHours
    });
  } catch (error) {
    console.error('Auto-checkout cron error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      checkedOut: 0,
      errors: 1
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

