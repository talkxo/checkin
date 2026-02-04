import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, setAdminSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password, redirectTo } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Validate using environment-configured credentials
    const configuredUsername = process.env.ADMIN_USERNAME || 'admin';
    const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH || '';

    const usernameOk = username === configuredUsername;
    const passwordOk = configuredPasswordHash
      ? await bcrypt.compare(password, configuredPasswordHash)
      : false;

    if (usernameOk && passwordOk) {
      // Create and set session
      const session = createAdminSession();
      await setAdminSession(session);

      return NextResponse.json({ 
        success: true, 
        redirectTo: redirectTo || '/admin' 
      });
    } else {
      // Do not reveal which field failed
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
