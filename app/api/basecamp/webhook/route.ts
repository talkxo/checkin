import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';
import { getAccessToken } from '@/lib/basecamp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Basecamp webhook received:', JSON.stringify(body, null, 2));

    // Verify this is a chatbot message
    if (body.type !== 'chatbot_message') {
      return NextResponse.json({ status: 'ignored' });
    }

    const { content, sender, conversation } = body;
    
    // Only respond to messages in the configured chat
    if (conversation.id !== process.env.BC_CHAT_ID) {
      console.log('Message from different chat, ignoring');
      return NextResponse.json({ status: 'ignored' });
    }

    // Don't respond to our own messages
    if (sender.type === 'chatbot') {
      return NextResponse.json({ status: 'ignored' });
    }

    console.log('Processing message:', content);

    // Get attendance data based on the query
    let contextData = '';
    
    if (content.toLowerCase().includes('today') || content.toLowerCase().includes('status')) {
      // Fetch today's stats
      const todayResponse = await fetch(`${req.nextUrl.origin}/api/admin/daily-stats`);
      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        contextData = `Today's Statistics: ${JSON.stringify(todayData, null, 2)}`;
      }
    }

    if (content.toLowerCase().includes('week') || content.toLowerCase().includes('trend')) {
      // Fetch weekly stats
      const weeklyResponse = await fetch(`${req.nextUrl.origin}/api/admin/stats`);
      if (weeklyResponse.ok) {
        const weeklyData = await weeklyResponse.json();
        contextData += `\nWeekly Statistics: ${JSON.stringify(weeklyData, null, 2)}`;
      }
    }

    if (content.toLowerCase().includes('employee') || content.toLowerCase().includes('team')) {
      // Fetch employee data
      const employeeResponse = await fetch(`${req.nextUrl.origin}/api/admin/users`);
      if (employeeResponse.ok) {
        const employeeData = await employeeResponse.json();
        contextData += `\nEmployee Data: ${JSON.stringify(employeeData, null, 2)}`;
      }
    }

    // Create AI prompt for Basecamp chatbot
    const prompt = `You are the INSYDE attendance assistant chatbot in Basecamp. A user has asked: "${content}"

Available Data: ${contextData}

Provide a helpful, concise response (max 2-3 sentences) about attendance data. Be friendly and professional. Focus on:
- Current team status
- Attendance patterns
- Quick insights
- Actionable information

Keep it brief and conversational for Basecamp chat.`;

    // Get AI response
    const aiResponse = await callOpenRouter([
      { role: 'system', content: 'You are a helpful INSYDE attendance assistant in Basecamp. Provide brief, friendly responses about attendance data.' },
      { role: 'user', content: prompt }
    ], 0.7);

    if (!aiResponse.success) {
      console.error('AI response failed:', aiResponse.error);
      
      // Provide a fallback response when AI fails
      const fallbackResponse = `I'm having trouble accessing the attendance data right now. Please try asking again in a few minutes, or check the admin dashboard for current information.`;
      
      // Check if this is a test request
      const isTestRequest = !req.headers.get('user-agent')?.includes('Basecamp');
      
      if (isTestRequest) {
        return NextResponse.json({ 
          status: 'success', 
          message: 'Test webhook successful (fallback response)',
          aiResponse: fallbackResponse,
          note: 'AI models failed, using fallback response'
        });
      }

      // Send fallback response to Basecamp
      const accessToken = await getAccessToken();
      const response = await fetch(`https://3.basecampapi.com/${process.env.BC_ACCOUNT_ID}/buckets/${process.env.BC_PROJECT_ID}/chats/${process.env.BC_CHAT_ID}/lines.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PROJECT INSYDE (ops@talkxo.com)'
        },
        body: JSON.stringify({
          content: fallbackResponse
        })
      });

      if (!response.ok) {
        console.error('Failed to send fallback response to Basecamp:', response.status, await response.text());
        return NextResponse.json({ 
          status: 'error', 
          error: 'Failed to send response' 
        }, { status: 500 });
      }

      console.log('Fallback response sent to Basecamp successfully');
      return NextResponse.json({ status: 'success', note: 'Used fallback response' });
    }

    // Check if this is a test request (no Basecamp headers)
    const isTestRequest = !req.headers.get('user-agent')?.includes('Basecamp');
    
    if (isTestRequest) {
      console.log('Test request detected, returning AI response without posting to Basecamp');
      return NextResponse.json({ 
        status: 'success', 
        message: 'Test webhook successful',
        aiResponse: aiResponse.data,
        note: 'This was a test request. In real Basecamp integration, the response would be posted to the chat.'
      });
    }

    // Send response back to Basecamp
    const accessToken = await getAccessToken();
    const response = await fetch(`https://3.basecampapi.com/${process.env.BC_ACCOUNT_ID}/buckets/${process.env.BC_PROJECT_ID}/chats/${process.env.BC_CHAT_ID}/lines.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PROJECT INSYDE (ops@talkxo.com)'
      },
      body: JSON.stringify({
        content: aiResponse.data
      })
    });

    if (!response.ok) {
      console.error('Failed to send response to Basecamp:', response.status, await response.text());
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to send response' 
      }, { status: 500 });
    }

    console.log('Response sent to Basecamp successfully');
    return NextResponse.json({ status: 'success' });

  } catch (error) {
    console.error('Basecamp webhook error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
