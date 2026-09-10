import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/route-guard';

export async function GET() {
  const guard = requireAuth();
  if (!guard.ok) return guard.response;
  try {
    const { data: leaveTypes, error } = await supabaseAdmin
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching leave types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      leaveTypes: leaveTypes || []
    });

  } catch (error) {
    console.error('Error in leave types API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
