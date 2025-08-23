import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const testName = url.searchParams.get('name') || 'Rizvi';
    
    console.log('=== EMPLOYEE DEBUG ===');
    console.log('Testing lookup for name:', testName);
    
    // Get all employees first
    const { data: allEmployees, error: allError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, slug, email')
      .order('full_name');
    
    if (allError) {
      console.log('Error fetching all employees:', allError);
      return NextResponse.json({ error: allError.message }, { status: 500 });
    }
    
    console.log('All employees in DB:', allEmployees);
    
    // Test different lookup methods
    const lookups = {
      exactName: null,
      ilikeName: null,
      slug: null,
      generatedSlug: null
    };
    
    // 1. Exact name match
    const { data: exactMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('full_name', testName)
      .maybeSingle();
    lookups.exactName = exactMatch;
    
    // 2. ILIKE name match (case insensitive)
    const { data: ilikeMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .ilike('full_name', testName)
      .maybeSingle();
    lookups.ilikeName = ilikeMatch;
    
    // 3. Slug match
    const { data: slugMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('slug', testName)
      .maybeSingle();
    lookups.slug = slugMatch;
    
    // 4. Generated slug match (convert name to slug format)
    const generatedSlug = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const { data: generatedSlugMatch } = await supabaseAdmin
      .from('employees')
      .select('*')
      .eq('slug', generatedSlug)
      .maybeSingle();
    lookups.generatedSlug = generatedSlugMatch;
    
    console.log('Lookup results:', lookups);
    
    return NextResponse.json({
      testName,
      allEmployees,
      lookups,
      generatedSlug,
      summary: {
        totalEmployees: allEmployees?.length || 0,
        foundByExactName: !!lookups.exactName,
        foundByIlikeName: !!lookups.ilikeName,
        foundBySlug: !!lookups.slug,
        foundByGeneratedSlug: !!lookups.generatedSlug
      }
    });
    
  } catch (error) {
    console.error('Employee debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
