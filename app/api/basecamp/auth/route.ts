import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.BC_CLIENT_ID) {
      console.error('BC_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Basecamp client ID not configured' }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirect = encodeURIComponent(base + '/api/basecamp/callback');

    // Generate a cryptographically secure random state and store in an HttpOnly cookie for validation
    const state = randomBytes(32).toString('hex');
    const cookieStore = cookies();
    cookieStore.set('bc_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/',
    });

    const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${process.env.BC_CLIENT_ID}&redirect_uri=${redirect}&state=${state}`;

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Basecamp auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


