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

    // Clean the AI response to remove any reasoning or analysis
    let cleanNotification = notification.data || '';
    
    // Remove common reasoning patterns
    const reasoningPatterns = [
      /analysis.*?assistantfinal/i,
      /we need to.*?good\./i,
      /let's craft.*?words, within/i,
      /count words.*?good\./i,
      /that's \d+ words.*?good\./i
    ];
    
    reasoningPatterns.forEach(pattern => {
      cleanNotification = cleanNotification.replace(pattern, '');
    });
    
    // Clean up any remaining artifacts
    cleanNotification = cleanNotification
      .replace(/analysis/i, '')
      .replace(/assistantfinal/i, '')
      .replace(/^\s*/, '') // Remove leading whitespace
      .replace(/\s*$/, ''); // Remove trailing whitespace

    console.log('AI Notification success:', cleanNotification?.substring(0, 100) + '...');
    return NextResponse.json({ notification: cleanNotification });
  } catch (error) {
    console.error('AI Notification endpoint error:', error);
    // Return a fallback notification instead of error
    const fallbackNotification = "Did you know? Taking short breaks every 90 minutes can boost productivity by 20%. Your consistent check-ins show great discipline! Keep up the excellent work!";
    return NextResponse.json({ notification: fallbackNotification });
  }
}
