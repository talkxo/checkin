import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const testName = searchParams.get('name') || 'Rishi';
    const testEmail = searchParams.get('email') || 'rishi@talkxo.com';
    
    console.log('=== EMPLOYEE LOOKUP TEST ===');
    console.log('Testing name:', testName);
    console.log('Testing email:', testEmail);
    
    // Get all employees
    const { data: allEmployees, error: allError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug, email')
      .order('full_name');
    
    if (allError) {
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }
    
    console.log('All employees:', allEmployees);
    
    // Test different lookup methods
    const lookups = {
      byExactName: null,
      byILikeName: null,
      bySlug: null,
      byEmail: null,
      byGeneratedSlug: null
    };
    
    // Test exact name match
    const { data: exactName } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('full_name', testName)
      .maybeSingle();
    lookups.byExactName = exactName;
    
    // Test ILIKE name match
    const { data: ilikeName } = await supabaseAdmin
      .from('employees')
      .select('*')
      .ilike('full_name', testName)
      .maybeSingle();
    lookups.byILikeName = ilikeName;
    
    // Test slug match
    const generatedSlug = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { data: slugMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('slug', generatedSlug)
      .maybeSingle();
    lookups.bySlug = slugMatch;
    lookups.byGeneratedSlug = generatedSlug;
    
    // Test email match
    const { data: emailMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('email', testEmail)
      .maybeSingle();
    lookups.byEmail = emailMatch;
    
    console.log('Lookup results:', lookups);
    
    return NextResponse.json({
      allEmployees,
      testName,
      testEmail,
      lookups,
      recommendations: {
        bestMethod: lookups.byILikeName ? 'ILIKE name match' : 
                   lookups.bySlug ? 'slug match' : 
                   lookups.byEmail ? 'email match' : 'no match found'
      }
    });
    
  } catch (error) {
    console.error('Employee lookup test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
