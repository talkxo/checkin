import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, setAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password, redirectTo } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Simple username/password validation
    if (username === 'admin' && password === 'admin123') {
      // Create and set session
      const session = createAdminSession();
      await setAdminSession(session);

      return NextResponse.json({ 
        success: true, 
        redirectTo: redirectTo || '/admin' 
      });
    } else {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
