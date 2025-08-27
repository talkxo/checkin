import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the AI assistant endpoint
    const testQuery = "What are the leave policies?";
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testQuery,
        conversationHistory: []
      }),
    });

          if (!response.ok) {
        throw new Error(`Assistant API returned ${response.status}`);
      }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Assistant is working correctly',
      testQuery,
      response: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Assistant test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Assistant test failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
