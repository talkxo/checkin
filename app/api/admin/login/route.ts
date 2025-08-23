import { NextRequest, NextResponse } from 'next/server';
import { validateAdminPassword, createAdminSession, setAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { password, redirectTo } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate password
    const isValid = await validateAdminPassword(password);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Create and set session
    const session = createAdminSession();
    await setAdminSession(session);

    return NextResponse.json({ 
      success: true, 
      redirectTo: redirectTo || '/admin' 
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
