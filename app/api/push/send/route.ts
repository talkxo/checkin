import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabaseAdmin } from '@/lib/supabase';

let vapidConfigured = false;

function ensureVapidConfigured() {
  if (vapidConfigured) return true;

  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!email || !publicKey || !privateKey) {
    return false;
  }

  const subject = email.startsWith('mailto:') || email.startsWith('https://')
    ? email
    : `mailto:${email}`;

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!ensureVapidConfigured()) {
    return NextResponse.json({ error: 'Push notifications are not configured correctly.' }, { status: 503 });
  }

  const { employeeId, title, body, url, tag } = await req.json();
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions').select('*').eq('employee_id', employeeId);

  if (!subs?.length) return NextResponse.json({ sent: 0 });

  const payload = JSON.stringify({ title, body, url: url || '/', tag });
  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  return NextResponse.json({ sent });
}
