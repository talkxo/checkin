import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createAdminSession, setAdminSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Supabase-backed rate limiting for serverless environments
// Reuses the same `login_attempts` table as the employee PIN login,
// but prefixes the key with "admin:" so admin login attempts and
// employee PIN attempts from the same office IP don't share a counter.
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function rateLimitKey(ip: string): string {
  return `admin:${ip}`;
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingAttempts: number; resetAt: number }> {
  const now = Date.now();
  const key = rateLimitKey(ip);

  // Try to get existing record
  const { data: record, error } = await supabaseAdmin
    .from('login_attempts')
    .select('*')
    .eq('ip_address', key)
    .maybeSingle();

  if (error) {
    console.error('Rate limit fetch error:', error);
    // Fail open if DB fails, or we could fail closed. Let's fail open to not block logins on DB glitch
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  const recordResetAt = record ? new Date(record.reset_at).getTime() : 0;

  if (!record || now > recordResetAt) {
    // Reset or create new record
    const newResetAt = new Date(now + RATE_LIMIT_WINDOW).toISOString();
    await supabaseAdmin
      .from('login_attempts')
      .upsert({ ip_address: key, attempts: 1, reset_at: newResetAt });

    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetAt: recordResetAt };
  }

  const newAttempts = record.attempts + 1;
  await supabaseAdmin
    .from('login_attempts')
    .update({ attempts: newAttempts })
    .eq('ip_address', key);

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - newAttempts, resetAt: recordResetAt };
}

async function resetRateLimit(ip: string) {
  await supabaseAdmin.from('login_attempts').delete().eq('ip_address', rateLimitKey(ip));
}

export async function POST(req: NextRequest) {
  try {
    const { username, password, redirectTo } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Check rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${resetMinutes} minute(s).` },
        { status: 429 }
      );
    }

    // Validate credentials from environment variables
    const validUsername = process.env.ADMIN_USERNAME;
    const validPassword = process.env.ADMIN_PASSWORD;

    if (!validUsername || !validPassword) {
      console.error('Admin credentials not configured in environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    if (username === validUsername && password === validPassword) {
      // Reset rate limit on successful login
      await resetRateLimit(ip);

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
