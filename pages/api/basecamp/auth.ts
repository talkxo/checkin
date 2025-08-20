import type { NextApiRequest, NextApiResponse } from 'next';

function getOrigin(req: NextApiRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = req.headers.host || 'localhost:3000';
  return `${proto}://${host}`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const base = process.env.NEXT_PUBLIC_APP_URL || getOrigin(req);
  const redirect = encodeURIComponent(base + '/api/basecamp/callback');
  const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${process.env.BC_CLIENT_ID}&redirect_uri=${redirect}&state=${crypto.randomUUID()}`;
  res.redirect(307, url);
}


