import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken, postCampfire } from '@/lib/basecamp';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Test if we can get an access token
    const token = await getAccessToken();
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Basecamp is connected!',
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 10)}...` : null
    });
  } catch (error) {
    console.error('Basecamp test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Test posting to Basecamp
    const result = await postCampfire(`🧪 Test message from INSYDE: ${message}`);
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Message posted to Basecamp!',
      result
    });
  } catch (error) {
    console.error('Basecamp post test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
