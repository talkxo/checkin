import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Load environment variables manually
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mfbgnipqkkkredgmediu.supabase.co';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mYmduaXBxa2trcmVkZ21lZGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQxNzI5OTksImV4cCI6MjAzOTc0ODk5OX0.1wz9tDfhObRgN0gw0TcvJQ0ZhM0QGsp-R5z70BFZB7M';

const supabaseAdmin = createClient(SB_URL, SB_ANON, { auth: { persistSession: false } });

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('=== SUPABASE CONNECTION TEST ===');
    
    // Test a simple query
    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('count')
      .limit(1);

    if (error) {
      console.log('Supabase error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code 
      }, { status: 500 });
    }

    console.log('Supabase connection successful');
    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      data: data
    });
  } catch (error) {
    console.log('Exception:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
