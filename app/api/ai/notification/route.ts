import { NextRequest, NextResponse } from 'next/server';
import { generateSmartNotification } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userData, context } = await req.json();

    if (!userData) {
      return NextResponse.json({ error: 'userData is required' }, { status: 400 });
    }

    if (!context) {
      return NextResponse.json({ error: 'context is required' }, { status: 400 });
    }

    console.log('AI Notification Request:', { 
      user: userData?.full_name || 'Unknown', 
      context: context.substring(0, 100) + '...' 
    });

    const notification = await generateSmartNotification(userData, context);

    if (!notification.success) {
      console.error('AI Notification failed:', notification.error);
      // Return a fallback notification instead of error
      const fallbackNotification = "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline! Keep up the excellent work!";
      return NextResponse.json({ notification: fallbackNotification });
    }

    console.log('AI Notification success:', notification.data?.substring(0, 100) + '...');
    return NextResponse.json({ notification: notification.data });
  } catch (error) {
    console.error('AI Notification endpoint error:', error);
    // Return a fallback notification instead of error
    const fallbackNotification = "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline! Keep up the excellent work!";
    return NextResponse.json({ notification: fallbackNotification });
  }
}
