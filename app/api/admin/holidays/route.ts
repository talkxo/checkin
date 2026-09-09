import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Team-wide holiday calendar CRUD for the console's Settings module.
// The holidays table already existed (team_holidays migration) but was only
// writable via the SQL editor — this exposes it to the admin panel.

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const year = new URL(req.url).searchParams.get('year');
    let query = supabaseAdmin.from('holidays').select('id, name, date').order('date', { ascending: true });
    if (year && /^\d{4}$/.test(year)) {
      query = query.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ holidays: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const body = await req.json();
    // Single { name, date } or bulk { items: [{ name, date }] } (templates,
    // paste-from-Excel). Bulk upserts skip pairs already on the calendar.
    const items: Array<{ name: unknown; date: unknown }> = Array.isArray(body?.items)
      ? body.items
      : [{ name: body?.name, date: body?.date }];
    if (!items.length) {
      return NextResponse.json({ error: 'name and date are required' }, { status: 400 });
    }

    const rows = items
      .filter((it) => typeof it?.name === 'string' && it.name.trim() && typeof it?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(it.date))
      .map((it) => ({ name: (it.name as string).trim(), date: it.date as string }));
    if (!rows.length) {
      return NextResponse.json({ error: 'name and a date (YYYY-MM-DD) are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('holidays')
      .upsert(rows, { onConflict: 'name,date', ignoreDuplicates: true })
      .select('id, name, date');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (Array.isArray(body?.items)) {
      return NextResponse.json({ holidays: data ?? [], added: data?.length ?? 0, submitted: rows.length });
    }
    return NextResponse.json({ holiday: data?.[0] ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { error } = await supabaseAdmin.from('holidays').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
