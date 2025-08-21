import { NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simple test message
    const testMessage = "Hello! Can you respond with a simple greeting and confirm you're working?";
    
    const response = await callOpenRouter([
      { role: 'system', content: 'You are a helpful AI assistant. Respond briefly and clearly.' },
      { role: 'user', content: testMessage }
    ], 0.7);

    if (response.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'AI connection successful!',
        response: response.data 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: response.error 
      }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
