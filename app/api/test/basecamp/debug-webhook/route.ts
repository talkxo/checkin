import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('=== DEBUG WEBHOOK ===');
    console.log('Full request body:', JSON.stringify(body, null, 2));
    console.log('Headers:', Object.fromEntries(req.headers.entries()));
    
    // Check environment variables
    console.log('Environment variables:');
    console.log('- BC_CHAT_ID:', process.env.BC_CHAT_ID ? `"${process.env.BC_CHAT_ID}"` : 'Not set');
    console.log('- BC_ACCOUNT_ID:', process.env.BC_ACCOUNT_ID ? `"${process.env.BC_ACCOUNT_ID}"` : 'Not set');
    console.log('- BC_PROJECT_ID:', process.env.BC_PROJECT_ID ? `"${process.env.BC_PROJECT_ID}"` : 'Not set');
    
    // Test filtering logic
    const { type, content, sender, conversation } = body;
    
    console.log('\n=== FILTERING CHECKS ===');
    
    // Check 1: Message type
    console.log(`1. Message type check: "${type}" === "chatbot_message"? ${type === 'chatbot_message'}`);
    if (type !== 'chatbot_message') {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: 'Message type is not chatbot_message',
        receivedType: type,
        expectedType: 'chatbot_message'
      });
    }
    
    // Check 2: Chat ID matching
    const expectedChatIds = process.env.BC_CHAT_ID?.split('\n').map(id => id.trim()).filter(id => id) || [];
    const chatIdFromConversation = conversation?.id?.split('@')[0];
    
    console.log(`2. Chat ID check:`);
    console.log(`   - Expected chat IDs: [${expectedChatIds.join(', ')}]`);
    console.log(`   - Conversation ID: "${conversation?.id}"`);
    console.log(`   - Extracted chat ID: "${chatIdFromConversation}"`);
    console.log(`   - Match found? ${expectedChatIds.includes(chatIdFromConversation)}`);
    
    if (!expectedChatIds.includes(chatIdFromConversation)) {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: 'Chat ID mismatch',
        expectedChatIds,
        receivedConversationId: conversation?.id,
        extractedChatId: chatIdFromConversation
      });
    }
    
    // Check 3: Sender type
    console.log(`3. Sender type check: "${sender?.type}" === "chatbot"? ${sender?.type === 'chatbot'}`);
    if (sender?.type === 'chatbot') {
      return NextResponse.json({ 
        status: 'ignored', 
        reason: 'Sender is a chatbot (avoiding self-response)',
        senderType: sender?.type
      });
    }
    
    console.log('=== ALL CHECKS PASSED ===');
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'All filtering checks passed - message would be processed',
      content,
      sender: sender?.type,
      conversationId: conversation?.id
    });
    
  } catch (error) {
    console.error('Debug webhook error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
