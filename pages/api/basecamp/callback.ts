import type { NextApiRequest, NextApiResponse } from 'next';
import { setSetting } from '@/lib/settings';

function getOrigin(req: NextApiRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const code = req.query.code as string | undefined;
  if(!code) return res.status(400).send('Missing code');
  const base = process.env.NEXT_PUBLIC_APP_URL || getOrigin(req);
  const body = new URLSearchParams({ type:'web_server', client_id: process.env.BC_CLIENT_ID!, client_secret: process.env.BC_CLIENT_SECRET!, redirect_uri: base + '/api/basecamp/callback', code });
  const r = await fetch('https://launchpad.37signals.com/authorization/token', { method:'POST', headers:{ 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'TalkXO Checkin (ops@talkxo.com)' }, body });
  if(!r.ok) return res.status(400).send('OAuth failed');
  const tok = await r.json();
  await setSetting('basecamp_oauth', { access_token: tok.access_token, refresh_token: tok.refresh_token, expires_at: Date.now() + (tok.expires_in ?? 3600)*1000 });
  res.redirect(302, base + '/');
}


