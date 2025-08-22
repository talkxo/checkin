import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Check if required environment variables are set
    if (!process.env.BC_CLIENT_ID) {
      console.error('BC_CLIENT_ID not configured');
      return NextResponse.json({ error: 'Basecamp client ID not configured' }, { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const redirect = encodeURIComponent(base + '/api/basecamp/callback');
    
    // Generate a random state parameter
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${process.env.BC_CLIENT_ID}&redirect_uri=${redirect}&state=${state}`;
    
    console.log('Redirecting to Basecamp OAuth:', url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Basecamp auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';


