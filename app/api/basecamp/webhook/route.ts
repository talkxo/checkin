import { NextRequest, NextResponse } from 'next/server';
import { callOpenRouter } from '@/lib/ai';
import { getAccessToken } from '@/lib/basecamp';

export const dynamic = 'force-dynamic';

// Helper function to handle check-in
async function handleCheckin(sender: any, mode: string, origin: string): Promise<string> {
  try {
    console.log('=== CHECKIN DEBUG ===');
    console.log('Sender object:', JSON.stringify(sender, null, 2));
    
    const email = sender.email_address || sender.email;
    const name = sender.name || sender.full_name;
    
    console.log('Extracted email:', email);
    console.log('Extracted name:', name);
    
    if (!email) {
      return "I need your email address to check you in. Please make sure your Basecamp profile has your email address.";
    }

    // Use email as primary lookup (most reliable)
    const response = await fetch(`${origin}/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email,
        fullName: name, // Include name for reference
        mode: mode 
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      return `✅ Checked in successfully! Mode: ${mode}. Welcome to work!`;
    } else {
      return `❌ Check-in failed: ${result.error || 'Unknown error'}. Please make sure your email "${email}" is registered in the system.`;
    }
    
  } catch (error) {
    return `❌ Check-in failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

// Helper function to handle check-out
async function handleCheckout(sender: any, origin: string): Promise<string> {
  try {
    console.log('=== CHECKOUT DEBUG ===');
    console.log('Sender object:', JSON.stringify(sender, null, 2));
    
    const email = sender.email_address || sender.email;
    const name = sender.name || sender.full_name;
    
    console.log('Extracted email:', email);
    console.log('Extracted name:', name);
    
    if (!email) {
      return "I need your email address to check you out. Please make sure your Basecamp profile has your email address.";
    }

    // Use email as primary lookup (most reliable)
    const response = await fetch(`${origin}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      return `✅ Checked out successfully! Have a great day!`;
    } else {
      return `❌ Check-out failed: ${result.error || 'Unknown error'}. Please make sure your email "${email}" is registered in the system.`;
    }
  } catch (error) {
    return `❌ Check-out failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

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
      sender = { 
        type: 'person', 
        id: body.creator?.id, 
        name: body.creator?.name,
        email_address: body.creator?.email_address,
        email: body.creator?.email_address
      };
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

    // Handle check-in/check-out commands
    if (content.toLowerCase().includes('check in') || content.toLowerCase().includes('checkin') || content.toLowerCase().includes('clock in')) {
      const mode = content.toLowerCase().includes('remote') ? 'remote' : 'office';
      const checkinResult = await handleCheckin(sender, mode, req.nextUrl.origin);
      return new Response(checkinResult, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    if (content.toLowerCase().includes('check out') || content.toLowerCase().includes('checkout') || content.toLowerCase().includes('clock out')) {
      const checkoutResult = await handleCheckout(sender, req.nextUrl.origin);
      return new Response(checkoutResult, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Fetch all attendance data from single comprehensive endpoint
    let contextData = '';
    
    try {
      const chatbotDataResponse = await fetch(`${req.nextUrl.origin}/api/admin/chatbot-data`);
      if (chatbotDataResponse.ok) {
        const chatbotData = await chatbotDataResponse.json();
        contextData = `Complete Attendance Data: ${JSON.stringify(chatbotData, null, 2)}`;
        console.log('Chatbot data fetched successfully');
      } else {
        console.log('Failed to fetch chatbot data:', chatbotDataResponse.status);
        contextData = 'Error: Unable to fetch attendance data';
      }
    } catch (error) {
      console.error('Error fetching chatbot data:', error);
      contextData = 'Error: Unable to fetch attendance data';
    }

    // Check if we have valid data
    if (!contextData || contextData.includes('Error:') || contextData === '') {
      console.log('No valid attendance data available, using fallback response');
      const fallbackResponse = `I don't have current attendance data available right now. Please try again in a few minutes, or check the admin dashboard for current information.`;
      
      // Check if this is a test request (no Basecamp headers)
      const isTestRequest = !req.headers.get('user-agent')?.includes('Basecamp') && !req.headers.get('x-forwarded-for');
      
      if (isTestRequest) {
        return NextResponse.json({ 
          status: 'success', 
          message: 'Test webhook successful (no data available)',
          aiResponse: fallbackResponse,
          note: 'No attendance data available'
        });
      }

      // Return fallback response for Basecamp chatbot to post
      return new Response(fallbackResponse, {
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Get current time in IST for proper greetings
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const hour = istTime.getHours();
    
    // Determine appropriate greeting based on time
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning!';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon!';
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = 'Good evening!';
    } else {
      timeGreeting = 'Hello!';
    }

    // Create AI prompt for Basecamp chatbot
    const prompt = `You are the INSYDE attendance assistant chatbot in Basecamp. A user has asked: "${content}"

Current time context: ${timeGreeting} (${istTime.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST)

Available Data: ${contextData}

CRITICAL RULES:
1. Start your response with "${timeGreeting}" - use this exact greeting based on the current time.
2. ONLY use the data provided above. If no data is available, say "I don't have current attendance data available right now."
3. DO NOT make up any numbers, percentages, or statistics that aren't in the provided data.
4. DO NOT mention specific attendance figures unless they are explicitly in the provided data.
5. If the data shows "Error: Unable to fetch attendance data", respond with "I'm having trouble accessing the attendance data right now. Please try again in a few minutes."
6. This company uses Basecamp, Google Workspace, and Canva - do NOT mention Slack, Microsoft Teams, or other tools they don't use.

Provide a helpful, concise response (max 2-3 sentences) based ONLY on the available data. Be friendly and professional. If no relevant data is available, acknowledge the request but explain the limitation.`;

    // Get AI response
    const aiResponse = await callOpenRouter([
      { role: 'system', content: `You are a helpful INSYDE attendance assistant in Basecamp. CRITICAL: Only use the data provided to you. Do not make up any numbers, percentages, or statistics. If no data is available, clearly state that. Be brief, friendly, and accurate. This company uses Basecamp, Google Workspace, and Canva - do not mention other tools. IMPORTANT: Always use the exact time greeting provided in the prompt (Good morning/afternoon/evening/Hello) based on the current time.` },
      { role: 'user', content: prompt }
    ], 0.3); // Lower temperature for more conservative responses

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
      return new Response(fallbackResponse, {
        headers: { 'Content-Type': 'text/plain' }
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

    // Return just the content text for Basecamp chatbot to post
    console.log('AI response generated successfully, returning content for chatbot to post');
    return new Response(aiResponse.data, {
      headers: { 'Content-Type': 'text/plain' }
    });

  } catch (error) {
    console.error('Basecamp webhook error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
