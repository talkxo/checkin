import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Valid mood values
const VALID_MOODS = ['great', 'good', 'challenging', 'exhausted', 'productive'];

export async function PUT(req: NextRequest) {
  try {
    const { slug, sessionId, date, mood, moodComment } = await req.json();
    
    // Validate required fields
    if (!slug && !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'slug or sessionId is required' 
      }, { status: 400 });
    }
    
    if (!mood) {
      return NextResponse.json({ 
        success: false, 
        error: 'mood is required' 
      }, { status: 400 });
    }
    
    // Validate mood enum
    if (!VALID_MOODS.includes(mood)) {
      return NextResponse.json({ 
        success: false, 
        error: `Invalid mood. Must be one of: ${VALID_MOODS.join(', ')}`
      }, { status: 400 });
    }
    
    let session;
    
    // Find session by ID or by slug + date
    if (sessionId) {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*, employees(*)')
        .eq('id', sessionId)
        .maybeSingle();
      
      if (error) {
        console.error('Session lookup error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to lookup session' 
        }, { status: 500 });
      }
      
      if (!data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Session not found' 
        }, { status: 404 });
      }
      
      session = data;
    } else if (slug && date) {
      // Lookup by slug and date
      const { data: emp, error: empError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      
      if (empError || !emp) {
        return NextResponse.json({ 
          success: false, 
          error: 'Employee not found' 
        }, { status: 404 });
      }
      
      // Parse date and create date range for the day
      const targetDate = new Date(date);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*, employees(*)')
        .eq('employee_id', emp.id)
        .gte('checkin_ts', startOfDay.toISOString())
        .lte('checkin_ts', endOfDay.toISOString())
        .order('checkin_ts', { ascending: false })
        .maybeSingle();
      
      if (error) {
        console.error('Session lookup error:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to lookup session' 
        }, { status: 500 });
      }
      
      if (!data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Session not found for the specified date' 
        }, { status: 404 });
      }
      
      session = data;
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Either sessionId or both slug and date are required' 
      }, { status: 400 });
    }
    
    // Update session with mood data
    const updateData: any = { mood };
    if (moodComment !== undefined) {
      updateData.mood_comment = moodComment;
    }
    
    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', session.id)
      .select('*')
      .single();
    
    if (updateError) {
      console.error('Session update error:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: `Failed to update session: ${updateError.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      session: updatedSession 
    });
  } catch (error) {
    console.error('Update mood route error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

