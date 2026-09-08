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
        step3: 'MANUALLY create chatbot in Basecamp: Go to your chat and click "Add a chatbot"',
        step4: 'Set the Command URL to: https://talkxo-checkin.vercel.app/api/basecamp/webhook',
        step5: 'Test the webhook: POST /api/basecamp/webhook',
        webhookUrl: 'https://talkxo-checkin.vercel.app/api/basecamp/webhook',
        note: 'Chatbots must be created manually in Basecamp interface, not via API'
      },
      commands: {
        testWebhook: 'POST /api/basecamp/webhook',
        testConnection: 'GET /api/test/basecamp',
        oauthAuth: 'GET /api/basecamp/auth'
      },
      troubleshooting: {
        issue1: 'If getting "ignored" status: Check that conversation.id matches BC_CHAT_ID',
        issue2: 'If 404 on chatbot creation: Chatbots must be created manually in Basecamp',
        issue3: 'If OAuth fails: Visit /api/basecamp/auth to reconnect'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
