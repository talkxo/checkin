import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';
import { getUserSession } from '@/lib/auth';

export async function POST(req: NextRequest){
  try {
    const session = getUserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mood, moodComment } = await req.json();
    const employeeId = session.id;
    
    console.log('=== CHECKOUT DEBUG ===');
    console.log('Request data:', { employeeId: session.id, mood, moodComment });
    
    // Verify employee is active
    const { data: emp, error: empError } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .eq('active', true)
      .maybeSingle();
      
    if(!emp || empError) {
      return NextResponse.json({ error: 'Employee not found or inactive' }, { status: 404 });
    }
    
    const { data: ses, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('employee_id', emp.id)
      .is('checkout_ts', null)
      .order('checkin_ts', { ascending: false })
      .maybeSingle();
    
    if (sessionError) {
      console.error('Session lookup error:', sessionError);
      return NextResponse.json({ error: 'Failed to lookup session' }, { status: 500 });
    }
    
    if(!ses) {
      return NextResponse.json({ error: 'No open session found' }, { status: 404 });
    }
    
    // Use IST timestamp for checkout
    const istTimestamp = nowIST().toISOString();
    
    // Prepare update data
    const updateData: any = { checkout_ts: istTimestamp };
    if (mood) updateData.mood = mood;
    if (moodComment) updateData.mood_comment = moodComment;
    
    const { data, error: updateError } = await supabaseAdmin
      .from('sessions')
      .update(updateData)
      .eq('id', ses.id)
      .select('*')
      .single();
    
    if(updateError) {
      console.error('Session update error:', updateError);
      return NextResponse.json({ error: `Failed to update session: ${updateError.message}` }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Checkout route error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unexpected error occurred during checkout' 
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


