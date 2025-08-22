import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const webhookUrl = `${baseUrl}/api/basecamp/webhook`;

    return NextResponse.json({
      status: 'success',
      message: 'Basecamp Chatbot Setup Instructions',
      webhookUrl,
      setupSteps: [
        {
          step: 1,
          title: 'Create Chatbot in Basecamp',
          description: 'Go to your Basecamp project and create a new chatbot',
          url: `https://3.basecampapi.com/${process.env.BC_ACCOUNT_ID}/buckets/${process.env.BC_PROJECT_ID}/chatbots/new`
        },
        {
          step: 2,
          title: 'Configure Webhook URL',
          description: 'Set the webhook URL to receive messages',
          webhookUrl
        },
        {
          step: 3,
          title: 'Connect OAuth',
          description: 'Visit /api/basecamp/auth to connect your Basecamp account',
          note: 'This will set up OAuth authentication automatically'
        },
        {
          step: 4,
          title: 'Test the Chatbot',
          description: 'Send a message in the chat to test the integration',
          testMessage: 'What\'s today\'s attendance status?'
        }
      ],
      environmentCheck: {
        BC_ACCOUNT_ID: !!process.env.BC_ACCOUNT_ID,
        BC_PROJECT_ID: !!process.env.BC_PROJECT_ID,
        BC_CHAT_ID: !!process.env.BC_CHAT_ID,
        BC_CLIENT_ID: !!process.env.BC_CLIENT_ID,
        BC_CLIENT_SECRET: !!process.env.BC_CLIENT_SECRET,
        OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY
      }
    });
  } catch (error) {
    console.error('Chatbot setup error:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
