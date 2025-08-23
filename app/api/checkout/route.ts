import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { nowIST } from '@/lib/time';

export async function POST(req: NextRequest){
  const { slug, email, mood, moodComment } = await req.json();
  
  console.log('=== CHECKOUT DEBUG ===');
  console.log('Request data:', { slug, email, mood, moodComment });
  
  let emp;
  // Prefer email lookup (most reliable); fallback to slug
  if (email) {
    console.log('Looking up by email:', email);
    const { data, error } = await supabaseAdmin.from('employees').select('*').eq('email', email).maybeSingle();
    if (error) {
      console.log('Email lookup error:', error);
    } else {
      console.log('Email lookup result:', data);
      emp = data;
    }
  }
  if (!emp && slug) {
    console.log('Looking up by slug:', slug);
    const { data, error } = await supabaseAdmin.from('employees').select('*').eq('slug', slug).maybeSingle();
    if (error) {
      console.log('Slug lookup error:', error);
    } else {
      console.log('Slug lookup result:', data);
      emp = data;
    }
  }
  
  if(!emp) {
    console.log('Employee not found for:', { email, slug });
    // Let's also check what employees exist for debugging
    const { data: allEmployees } = await supabaseAdmin.from('employees').select('id, full_name, email, slug').limit(5);
    console.log('Sample employees in DB:', allEmployees);
    return NextResponse.json({ error: 'employee not found' }, { status: 404 });
  }
  const { data: ses } = await supabaseAdmin.from('sessions').select('*').eq('employee_id', emp.id).is('checkout_ts', null).order('checkin_ts', { ascending: false }).maybeSingle();
  if(!ses) return NextResponse.json({ error: 'no open session' }, { status: 404 });
  
  // Use IST timestamp for checkout
  const istTimestamp = nowIST().toISOString();
  
  // Prepare update data
  const updateData: any = { checkout_ts: istTimestamp };
  if (mood) updateData.mood = mood;
  if (moodComment) updateData.mood_comment = moodComment;
  
  const { data, error } = await supabaseAdmin.from('sessions').update(updateData).eq('id', ses.id).select('*').single();
  if(error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export const dynamic = 'force-dynamic';


