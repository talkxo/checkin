import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await clearAdminSession();
    
    return NextResponse.json({ 
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
