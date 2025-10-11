import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    console.log('Simple AI test - message:', message);
    console.log('OpenRouter API key configured:', !!process.env.OPENROUTER_API_KEY);
    console.log('OpenRouter API key length:', process.env.OPENROUTER_API_KEY?.length || 0);
    
    // Test with minimal prompt
    const result = await callOpenRouter([
      { role: 'system', content: 'You are a helpful assistant. Respond briefly.' },
      { role: 'user', content: message || 'Hello, are you working?' }
    ], 0.1);
    
    console.log('Simple AI test result:', {
      success: result.success,
      error: result.error,
      dataLength: result.data?.length || 0,
      dataPreview: result.data?.substring(0, 100) || 'No data'
    });
    
    return NextResponse.json({
      success: result.success,
      error: result.error,
      data: result.data,
      message: message,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Simple AI test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
