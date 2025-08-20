import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/settings';
import { getAccessToken, postCampfire } from '@/lib/basecamp';

export async function GET(req: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      BC_CLIENT_ID: !!process.env.BC_CLIENT_ID,
      BC_CLIENT_SECRET: !!process.env.BC_CLIENT_SECRET,
      BC_ACCOUNT_ID: !!process.env.BC_ACCOUNT_ID,
      BC_PROJECT_ID: !!process.env.BC_PROJECT_ID,
      BC_CHAT_ID: !!process.env.BC_CHAT_ID,
      NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    };

    // Check if OAuth is configured
    const oauthSettings = await getSetting('basecamp_oauth');
    const isOAuthConfigured = !!oauthSettings;

    // Test access token if OAuth is configured
    let accessTokenTest = null;
    if (isOAuthConfigured) {
      try {
        const token = await getAccessToken();
        accessTokenTest = { success: true, token: token.substring(0, 10) + '...' };
      } catch (error) {
        accessTokenTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Test posting to campfire if everything is configured
    let campfireTest = null;
    if (isOAuthConfigured && accessTokenTest?.success) {
      try {
        await postCampfire('🧪 Test message from TalkXO Check-in app - ' + new Date().toISOString());
        campfireTest = { success: true };
      } catch (error) {
        campfireTest = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    return NextResponse.json({
      status: 'Basecamp Integration Test Results',
      environment: envCheck,
      oauth: {
        configured: isOAuthConfigured,
        settings: oauthSettings ? {
          hasAccessToken: !!oauthSettings.access_token,
          hasRefreshToken: !!oauthSettings.refresh_token,
          expiresAt: oauthSettings.expires_at,
          isExpired: Date.now() > oauthSettings.expires_at,
        } : null,
      },
      accessToken: accessTokenTest,
      campfire: campfireTest,
      nextSteps: {
        missingEnvVars: Object.entries(envCheck).filter(([key, value]) => !value).map(([key]) => key),
        needsOAuth: !isOAuthConfigured ? 'Visit /api/basecamp/auth to connect' : null,
        needsRefresh: isOAuthConfigured && oauthSettings && Date.now() > oauthSettings.expires_at ? 'OAuth token expired, needs refresh' : null,
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
