import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

// GET - Get saved responses with filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'admin';
    const tags = searchParams.get('tags')?.split(',').filter(t => t) || [];
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    let query = supabaseAdmin
      .from('saved_responses')
      .select('*')
      .eq('user_id', userId);
    
    // Apply tag filters
    if (tags.length > 0) {
      query = query.overlaps('tags', tags);
    }
    
    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    
    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Save a new response
export async function POST(req: NextRequest) {
  try {
    const { userId, title, content, tags } = await req.json();
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }
    
    const { data, error } = await supabaseAdmin
      .from('saved_responses')
      .insert({
        user_id: userId || 'admin',
        title,
        content,
        tags: tags || []
      })
      .select('*')
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update a saved response
export async function PUT(req: NextRequest) {
  try {
    const { id, title, content, tags } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Response ID is required' }, { status: 400 });
    }
    
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (tags !== undefined) updateData.tags = tags;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('saved_responses')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a saved response
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Response ID is required' }, { status: 400 });
    }
    
    const { error } = await supabaseAdmin
      .from('saved_responses')
      .delete()
      .eq('id', id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
