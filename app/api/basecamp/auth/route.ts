import { NextRequest, NextResponse } from 'next/server';
export async function GET(req: NextRequest){
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirect = encodeURIComponent(base + '/api/basecamp/callback');
  const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${process.env.BC_CLIENT_ID}&redirect_uri=${redirect}&state=${crypto.randomUUID()}`;
  return NextResponse.redirect(url);
}


