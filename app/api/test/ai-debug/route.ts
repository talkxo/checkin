import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export async function GET(req: NextRequest) {
  try {
    console.log('Testing AI service...');
    
    // Test with a simple prompt
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say "Hello, AI is working!" and nothing else.' }
    ];
    
    const result = await callOpenRouter(testMessages, 0.1);
    
    console.log('AI Test Result:', {
      success: result.success,
      error: result.error,
      dataLength: result.data?.length || 0,
      dataPreview: result.data?.substring(0, 100) || 'No data'
    });
    
    return NextResponse.json({
      success: result.success,
      error: result.error,
      data: result.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('AI Debug Test Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
