import { NextRequest, NextResponse } from 'next/server';
import { setSetting } from '@/lib/settings';
export async function GET(req: NextRequest) {
  try {
    const code = new URL(req.url).searchParams.get('code');
    if (!code) {
      console.error('Basecamp callback: Missing code parameter');
      return new NextResponse('Missing authorization code', { status: 400 });
    }

    // Check if required environment variables are set
    if (!process.env.BC_CLIENT_ID || !process.env.BC_CLIENT_SECRET) {
      console.error('Basecamp callback: Missing client credentials');
      return new NextResponse('Basecamp not properly configured', { status: 500 });
    }

    const base = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const body = new URLSearchParams({ 
      type: 'web_server', 
      client_id: process.env.BC_CLIENT_ID, 
      client_secret: process.env.BC_CLIENT_SECRET, 
      redirect_uri: base + '/api/basecamp/callback', 
      code 
    });

    console.log('Exchanging code for token...');
    const r = await fetch('https://launchpad.37signals.com/authorization/token', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded', 
        'User-Agent': 'PROJECT INSYDE (ops@talkxo.com)' 
      }, 
      body 
    });

    if (!r.ok) {
      const errorText = await r.text();
      console.error('Basecamp OAuth failed:', r.status, errorText);
      return new NextResponse(`OAuth failed: ${errorText}`, { status: 400 });
    }

    const tok = await r.json();
    console.log('Basecamp OAuth successful, storing tokens...');
    
    await setSetting('basecamp_oauth', { 
      access_token: tok.access_token, 
      refresh_token: tok.refresh_token, 
      expires_at: Date.now() + (tok.expires_in ?? 3600) * 1000 
    });

    console.log('Basecamp connection successful!');
    return NextResponse.redirect(new URL('/', base));
  } catch (error) {
    console.error('Basecamp callback error:', error);
    return new NextResponse('Authentication failed', { status: 500 });
  }
}
export const dynamic = 'force-dynamic';


