import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const { subscription, employeeId } = await req.json();
  if (!subscription?.endpoint || !employeeId)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  await supabaseAdmin.from('push_subscriptions').upsert({
    employee_id: employeeId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });

  return NextResponse.json({ ok: true });
}
