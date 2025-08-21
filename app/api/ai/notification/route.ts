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

    const notification = await generateSmartNotification(userData, context);

    if (!notification.success) {
      return NextResponse.json({ error: notification.error }, { status: 500 });
    }

    return NextResponse.json({ notification: notification.data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
