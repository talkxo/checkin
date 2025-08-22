import { NextRequest, NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/basecamp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    console.log('Creating Basecamp chatbot...');
    
    // Check environment variables
    if (!process.env.BC_ACCOUNT_ID || !process.env.BC_PROJECT_ID || !process.env.BC_CHAT_ID) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing required environment variables',
        required: ['BC_ACCOUNT_ID', 'BC_PROJECT_ID', 'BC_CHAT_ID']
      }, { status: 400 });
    }

    const accessToken = await getAccessToken();
    
    // Create chatbot in Basecamp
    const chatbotData = {
      name: "INSYDE Assistant",
      description: "AI-powered attendance and team insights assistant",
      command_url: `https://talkxo-checkin.vercel.app/api/basecamp/webhook`,
      avatar_url: "https://talkxo-checkin.vercel.app/insyde-logo.png"
    };

    console.log('Creating chatbot with data:', chatbotData);

    const response = await fetch(`https://3.basecampapi.com/${process.env.BC_ACCOUNT_ID}/buckets/${process.env.BC_PROJECT_ID}/chats/${process.env.BC_CHAT_ID}/chatbots.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'PROJECT INSYDE (ops@talkxo.com)'
      },
      body: JSON.stringify(chatbotData)
    });

    console.log('Basecamp API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to create chatbot:', response.status, errorText);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to create chatbot in Basecamp',
        error: errorText,
        statusCode: response.status
      }, { status: 500 });
    }

    const chatbot = await response.json();
    console.log('Chatbot created successfully:', chatbot);

    return NextResponse.json({
      status: 'success',
      message: 'Chatbot created successfully in Basecamp',
      chatbot: chatbot
    });

  } catch (error) {
    console.error('Error creating chatbot:', error);
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
