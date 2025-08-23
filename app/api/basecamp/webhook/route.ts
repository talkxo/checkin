import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';
import { getAccessToken } from '@/lib/basecamp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Basecamp webhook received:', JSON.stringify(body, null, 2));
    console.log('Environment variables check:');
    console.log('- BC_CHAT_ID:', process.env.BC_CHAT_ID ? `Set: ${process.env.BC_CHAT_ID}` : 'Not set');
    console.log('- BC_ACCOUNT_ID:', process.env.BC_ACCOUNT_ID ? `Set: ${process.env.BC_ACCOUNT_ID}` : 'Not set');
    console.log('- BC_PROJECT_ID:', process.env.BC_PROJECT_ID ? `Set: ${process.env.BC_PROJECT_ID}` : 'Not set');

    // Handle both chatbot_message and command message types
    let content, sender, conversation;
    
    if (body.type === 'chatbot_message') {
      // Standard chatbot message format
      ({ content, sender, conversation } = body);
    } else if (body.command) {
      // Command message format (like "hello")
      content = body.command;
      sender = { type: 'person', id: body.creator?.id, name: body.creator?.name };
      // Extract conversation info from callback_url
      const urlParts = body.callback_url?.split('/') || [];
      const chatId = urlParts[urlParts.length - 2]; // Get chat ID from URL
      conversation = { id: `${chatId}@${process.env.BC_ACCOUNT_ID}` };
    } else {
      return NextResponse.json({ status: 'ignored', reason: 'Unknown message format' });
    }
    
    // Only respond to messages in the configured chat
    const expectedChatIds = process.env.BC_CHAT_ID?.split('\n').map(id => id.trim()).filter(id => id) || [];
    console.log(`Comparing conversation.id: "${conversation.id}" with BC_CHAT_IDs: [${expectedChatIds.join(', ')}]`);
    
    // Extract chat ID from conversation ID (format: chat_id@account_id)
    const chatIdFromConversation = conversation.id.split('@')[0];
    console.log(`Extracted chat ID from conversation: "${chatIdFromConversation}"`);
    
    if (!expectedChatIds.includes(chatIdFromConversation)) {
      console.log(`Message from different chat (${conversation.id}), extracted chat ID ${chatIdFromConversation} not in expected: [${expectedChatIds.join(', ')}], ignoring`);
      return NextResponse.json({ status: 'ignored' });
    }

    // Don't respond to our own messages
    if (sender.type === 'chatbot') {
      return NextResponse.json({ status: 'ignored', reason: 'Sender is chatbot' });
    }

    console.log('Processing message:', content);

    // Always fetch attendance data for accurate responses
    let contextData = '';
    
    try {
      // Fetch today's stats (always)
      const todayResponse = await fetch(`${req.nextUrl.origin}/api/admin/daily-stats`);
      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        contextData = `Today's Statistics: ${JSON.stringify(todayData, null, 2)}`;
        console.log('Today stats fetched:', todayData);
      } else {
        console.log('Failed to fetch today stats:', todayResponse.status);
      }

      // Fetch weekly stats if requested
      if (content.toLowerCase().includes('week') || content.toLowerCase().includes('trend')) {
        const weeklyResponse = await fetch(`${req.nextUrl.origin}/api/admin/stats`);
        if (weeklyResponse.ok) {
          const weeklyData = await weeklyResponse.json();
          contextData += `\nWeekly Statistics: ${JSON.stringify(weeklyData, null, 2)}`;
          console.log('Weekly stats fetched:', weeklyData);
        }
      }

      // Fetch employee data if requested
      if (content.toLowerCase().includes('employee') || content.toLowerCase().includes('team')) {
        const employeeResponse = await fetch(`${req.nextUrl.origin}/api/admin/users`);
        if (employeeResponse.ok) {
          const employeeData = await employeeResponse.json();
          contextData += `\nEmployee Data: ${JSON.stringify(employeeData, null, 2)}`;
          console.log('Employee data fetched:', employeeData);
        }
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      contextData = 'Error: Unable to fetch attendance data';
    }

    // Create AI prompt for Basecamp chatbot
    const prompt = `You are the INSYDE attendance assistant chatbot in Basecamp. A user has asked: "${content}"

Available Data: ${contextData}

IMPORTANT: This company uses Basecamp for chats, notes and tasks, Google Drive for files and other Google Workspace services like Gmail, and Canva for design work. Do NOT mention Slack, Microsoft Teams, or other tools they don't use.

Provide a helpful, concise response (max 2-3 sentences) about attendance data. Be friendly and professional. Focus on:
- Current team status
- Attendance patterns
- Quick insights
- Actionable information

Keep it brief and conversational for Basecamp chat.`;

    // Get AI response
    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are a helpful INSYDE attendance assistant in Basecamp. Provide brief, friendly responses about attendance data. This company uses Basecamp, Google Workspace, and Canva - do not mention other tools.' },
      { role: 'user', content: prompt }
    ], 0.7);

    if (!aiResponse.success) {
      console.error('AI response failed:', aiResponse.error);
      
      // Provide a fallback response when AI fails
      const fallbackResponse = `I'm having trouble accessing the attendance data right now. Please try asking again in a few minutes, or check the admin dashboard for current information.`;
      
      // Check if this is a test request (no Basecamp headers)
      const isTestRequest = !req.headers.get('user-agent')?.includes('Basecamp') && !req.headers.get('x-forwarded-for');
      
      if (isTestRequest) {
        return NextResponse.json({ 
          status: 'success', 
          message: 'Test webhook successful (fallback response)',
          aiResponse: fallbackResponse,
          note: 'AI models failed, using fallback response'
        });
      }

      // Return fallback response for Basecamp chatbot to post
      console.log('AI failed, returning fallback response for chatbot to post');
      return NextResponse.json({ 
        content: fallbackResponse,
        status: 'success',
        note: 'Used fallback response'
      });
    }

    // Check if this is a test request (no Basecamp headers)
    const isTestRequest = !req.headers.get('user-agent')?.includes('Basecamp') && !req.headers.get('x-forwarded-for');
    
    if (isTestRequest) {
      console.log('Test request detected, returning AI response without posting to Basecamp');
      return NextResponse.json({ 
        status: 'success', 
        message: 'Test webhook successful',
        aiResponse: aiResponse.data,
        note: 'This was a test request. In real Basecamp integration, the response would be posted to the chat.'
      });
    }

    // Return the response for Basecamp chatbot to post
    console.log('AI response generated successfully, returning for chatbot to post');
    return NextResponse.json({ 
      content: aiResponse.data,
      status: 'success'
    });

  } catch (error) {
    console.error('Basecamp webhook error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
