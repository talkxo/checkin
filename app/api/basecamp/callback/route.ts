import { NextRequest, NextResponse } from 'next/server';
import { setSetting } from '@/lib/settings';
export async function GET(req: NextRequest){
  const code = new URL(req.url).searchParams.get('code');
  if(!code) return new NextResponse('Missing code', { status: 400 });
  const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const body = new URLSearchParams({ type:'web_server', client_id: process.env.BC_CLIENT_ID!, client_secret: process.env.BC_CLIENT_SECRET!, redirect_uri: base + '/api/basecamp/callback', code });
  const r = await fetch('https://launchpad.37signals.com/authorization/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'TalkXO Checkin (ops@talkxo.com)' }, body });
  if(!r.ok) return new NextResponse('OAuth failed', { status: 400 });
  const tok = await r.json();
  await setSetting('basecamp_oauth', { access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 3600)*1000 });
  return NextResponse.redirect(new URL('/', base));
}
export const dynamic = 'force-dynamic';


