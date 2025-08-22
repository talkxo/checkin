import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      BC_ACCOUNT_ID: !!process.env.BC_ACCOUNT_ID,
      BC_PROJECT_ID: !!process.env.BC_PROJECT_ID,
      BC_CHAT_ID: !!process.env.BC_CHAT_ID,
      BC_CLIENT_ID: !!process.env.BC_CLIENT_ID,
      BC_CLIENT_SECRET: !!process.env.BC_CLIENT_SECRET,
      OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY
    };

    const missingVars = Object.entries(envCheck).filter(([_, present]) => !present).map(([key]) => key);

    return NextResponse.json({
      status: 'ready',
      message: 'INSYDE Basecamp Chatbot Setup',
      environment: envCheck,
      missing: missingVars,
      setup: {
        step1: 'Ensure all environment variables are set in Vercel',
        step2: 'Connect OAuth by visiting: /api/basecamp/auth',
        step3: 'Create the chatbot by calling: POST /api/basecamp/create-chatbot',
        step4: 'Test the webhook: POST /api/basecamp/webhook',
        webhookUrl: 'https://talkxo-checkin.vercel.app/api/basecamp/webhook'
      },
      commands: {
        createChatbot: 'POST /api/basecamp/create-chatbot',
        testWebhook: 'POST /api/basecamp/webhook',
        testConnection: 'GET /api/test/basecamp'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
