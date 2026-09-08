import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import {
  BetaSignupData,
  emptySignup,
  sanitizeForSubmit,
  validateAll,
  WORK_DAYS,
  WORK_MODELS,
} from '@/lib/beta-signup';

// Public endpoint behind a shared wizard link. Abuse is kept in check by:
// a honeypot field, strict payload whitelisting, server-side validation and
// contact-email dedupe. Burst throttling is handled at the platform edge.
const ALLOWED_WORK_DAYS = new Set<string>(WORK_DAYS.map((d) => d.value));
const ALLOWED_MODELS = new Set<string>(WORK_MODELS.map((m) => m.value));
const ALLOWED_LIST_FIELDS = new Set([
  'Design / Creative', 'Software / IT', 'Marketing / Agency', 'Consulting', 'E-commerce',
  'Education', 'Healthcare', 'Finance', 'Other', '1–10', '11–30', '31–75', '76–150', '150+',
]);

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Honeypot — real users never fill this hidden field.
  if (typeof body?.hp === 'string' && body.hp.trim() !== '') {
    return NextResponse.json({ ok: true, reference: 'BETA-THANKS' });
  }

  // Build the payload from whitelisted fields only.
  const raw: BetaSignupData = { ...emptySignup(), ...(typeof body === 'object' && body ? body : {}) };
  raw.work_days = Array.isArray(raw.work_days)
    ? raw.work_days.filter((d: unknown) => typeof d === 'string' && ALLOWED_WORK_DAYS.has(d))
    : [];
  raw.team_members = Array.isArray(raw.team_members) ? raw.team_members : [];
  raw.tools = Array.isArray(raw.tools)
    ? raw.tools.filter((t: unknown) => typeof t === 'string' && t.length <= 40)
    : [];
  if (!ALLOWED_MODELS.has(raw.work_model)) raw.work_model = '';
  if (!ALLOWED_LIST_FIELDS.has(raw.industry)) raw.industry = '';
  if (!ALLOWED_LIST_FIELDS.has(raw.company_size)) raw.company_size = '';

  const payload = sanitizeForSubmit(raw);
  const errors = validateAll(payload);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Some fields need attention.', fields: errors }, { status: 400 });
  }

  // Same contact email twice → treat as update, no duplicate rows.
  const existing = await supabaseAdmin
    .from('beta_signups')
    .select('reference_code')
    .eq('contact_email', payload.contact_email)
    .limit(1)
    .maybeSingle();
  if (existing?.data?.reference_code) {
    return NextResponse.json({ ok: true, reference: existing.data.reference_code, duplicate: true });
  }

  const { data, error } = await supabaseAdmin
    .from('beta_signups')
    .insert({
      contact_name: payload.contact_name,
      contact_email: payload.contact_email,
      contact_role: payload.contact_role || null,
      contact_phone: payload.contact_phone || null,
      company_name: payload.company_name,
      website: payload.website || null,
      industry: payload.industry || null,
      company_size: payload.company_size || null,
      work_model: payload.work_model || null,
      work_days: payload.work_days,
      work_start_time: payload.work_start_time || null,
      work_end_time: payload.work_end_time || null,
      timezone: payload.timezone,
      team_members: payload.team_members,
      tools: payload.tools,
      notes: payload.notes || null,
    })
    .select('reference_code')
    .single();

  if (error) {
    console.error('beta_signups insert failed:', error.message);
    return NextResponse.json(
      { error: 'We could not save your request right now. Please try again in a bit.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, reference: data.reference_code });
}
