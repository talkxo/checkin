import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Admin-only: employee profile fields + document links
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = params;
    const [empRes, docsRes] = await Promise.all([
      supabaseAdmin
        .from('employees')
        .select('id, full_name, slug, email, active, date_of_birth, phone, emergency_contact, created_at')
        .eq('id', id)
        .maybeSingle(),
      supabaseAdmin
        .from('employee_documents')
        .select('id, label, url, created_at')
        .eq('employee_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (empRes.error) return NextResponse.json({ error: empRes.error.message }, { status: 500 });
    if (!empRes.data) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    return NextResponse.json({ employee: empRes.data, documents: docsRes.data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};
    if (typeof body.dateOfBirth === 'string') updates.date_of_birth = body.dateOfBirth || null;
    if (typeof body.phone === 'string') updates.phone = body.phone || null;
    if (typeof body.emergencyContact === 'string') updates.emergency_contact = body.emergencyContact || null;
    if (typeof body.fullName === 'string' && body.fullName.trim()) updates.full_name = body.fullName.trim();
    if (typeof body.active === 'boolean') updates.active = body.active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select('id, full_name, date_of_birth, phone, emergency_contact, active')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ employee: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { id } = params;
    const body = await req.json();
    const label = String(body.label ?? '').trim();
    const url = String(body.url ?? '').trim();

    if (!label || !url) {
      return NextResponse.json({ error: 'Label and URL are required' }, { status: 400 });
    }
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('employee_documents')
      .insert({ employee_id: id, label, url, created_by: 'admin' })
      .select('id, label, url, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ document: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAdminAuthenticated()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const documentId = new URL(req.url).searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required' }, { status: 400 });
    }
    const { error } = await supabaseAdmin
      .from('employee_documents')
      .delete()
      .eq('id', documentId)
      .eq('employee_id', params.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
