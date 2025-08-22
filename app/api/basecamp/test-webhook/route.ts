import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Log the incoming request
    console.log('Test webhook received:', JSON.stringify(body, null, 2));
    
    // Check environment variables
    const envVars = {
      BC_CHAT_ID: process.env.BC_CHAT_ID,
      BC_ACCOUNT_ID: process.env.BC_ACCOUNT_ID,
      BC_PROJECT_ID: process.env.BC_PROJECT_ID
    };
    
    console.log('Environment variables:', envVars);
    
    // Simulate the webhook logic
    if (body.type !== 'chatbot_message') {
      return NextResponse.json({ 
        status: 'ignored',
        reason: 'Not a chatbot message',
        receivedType: body.type
      });
    }
    
    const conversationId = body.conversation?.id;
    const expectedChatIds = process.env.BC_CHAT_ID?.split('\n').map(id => id.trim()).filter(id => id) || [];
    
    console.log(`Comparing: "${conversationId}" with [${expectedChatIds.join(', ')}]`);
    
    // Extract chat ID from conversation ID (format: chat_id@account_id)
    const chatIdFromConversation = conversationId?.split('@')[0];
    console.log(`Extracted chat ID from conversation: "${chatIdFromConversation}"`);
    
    if (!expectedChatIds.includes(chatIdFromConversation)) {
      return NextResponse.json({ 
        status: 'ignored',
        reason: 'Wrong conversation ID',
        received: conversationId,
        extractedChatId: chatIdFromConversation,
        expected: expectedChatIds
      });
    }
    
    if (body.sender?.type === 'chatbot') {
      return NextResponse.json({ 
        status: 'ignored',
        reason: 'Message from chatbot itself'
      });
    }
    
    // If we get here, the message should be processed
    return NextResponse.json({ 
      status: 'success',
      message: 'Webhook would process this message',
      content: body.content,
      sender: body.sender?.name
    });
    
  } catch (error) {
    console.error('Test webhook error:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
