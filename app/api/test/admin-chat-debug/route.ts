import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { message, responseStyle = 'short' } = await req.json();

    console.log('=== ADMIN CHAT DEBUG ===');
    console.log('Message:', message);
    console.log('Response Style:', responseStyle);

    // Test with a simple prompt first
    const simplePrompt = `You are an INSYDE admin assistant. The user asked: "${message}"

Please provide a brief, helpful response about team attendance and status. Keep it under 3 sentences.

Response style: ${responseStyle}`;

    console.log('Simple prompt:', simplePrompt);

    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are an INSYDE admin assistant. Provide brief, helpful responses.' },
      { role: 'user', content: simplePrompt }
    ], 0.3);

    console.log('AI Response:', aiResponse);

    return NextResponse.json({
      success: true,
      originalMessage: message,
      responseStyle,
      aiResponse,
      debug: {
        prompt: simplePrompt,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
