import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { createUserSession, setUserSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Supabase-backed rate limiting for serverless environments
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingAttempts: number; resetAt: number }> {
  const now = Date.now();
  
  // Try to get existing record
  const { data: record, error } = await supabaseAdmin
    .from('login_attempts')
    .select('*')
    .eq('ip_address', ip)
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
      .upsert({ ip_address: ip, attempts: 1, reset_at: newResetAt });
      
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetAt: recordResetAt };
  }

  const newAttempts = record.attempts + 1;
  await supabaseAdmin
    .from('login_attempts')
    .update({ attempts: newAttempts })
    .eq('ip_address', ip);

  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - newAttempts, resetAt: recordResetAt };
}

async function resetRateLimit(ip: string) {
  await supabaseAdmin.from('login_attempts').delete().eq('ip_address', ip);
}

export async function POST(req: NextRequest) {
  try {
    const { username, pin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json(
        { success: false, error: 'Username and PIN are required' },
        { status: 400 }
      );
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { success: false, error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Check rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      const resetMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many failed attempts. Please try again in ${resetMinutes} minute(s).` 
        },
        { status: 429 }
      );
    }

    // --- TEST USER: (Enabled for local testing) ---
    if (username.toLowerCase() === 'test' && pin === '1234') {
      await resetRateLimit(ip);
      const testEmployee = {
        id: '00000000-0000-0000-0000-000000000001',
        full_name: 'Test User',
        slug: 'test-user',
        email: 'test@localhost',
      };
      
      // Issue secure session cookie
      const session = createUserSession(testEmployee.id, testEmployee.slug, testEmployee.full_name);
      await setUserSession(session);

      return NextResponse.json({
        success: true,
        employee: testEmployee,
        pin_change_required: false,
      });
    }

    // Lookup employee by username (can be full_name, slug, or email)
    let employee = null;

    // Try email first (exact match)
    if (username.includes('@')) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, slug, email, pin_hash, pin_change_required, active')
        .eq('email', username)
        .maybeSingle();
      employee = data;
    }

    // Try slug (exact match)
    if (!employee) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, slug, email, pin_hash, pin_change_required, active')
        .eq('slug', username.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
        .maybeSingle();
      employee = data;
    }

    // Try full_name (case-insensitive)
    if (!employee) {
      const { data } = await supabaseAdmin
        .from('employees')
        .select('id, full_name, slug, email, pin_hash, pin_change_required, active')
        .ilike('full_name', username)
        .maybeSingle();
      employee = data;
    }

    // Generic error message (don't reveal if username exists)
    const genericError = 'Invalid username or PIN';

    if (!employee) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 401 }
      );
    }

    // Check if employee is active
    if (!employee.active) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 401 }
      );
    }

    // Check if PIN is set
    if (!employee.pin_hash) {
      return NextResponse.json(
        { success: false, error: 'PIN not set. Please contact administrator.' },
        { status: 401 }
      );
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, employee.pin_hash);

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: genericError },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    await resetRateLimit(ip);

    // Create and set secure session cookie
    const session = createUserSession(employee.id, employee.slug, employee.full_name);
    await setUserSession(session);

    // Return employee data (without sensitive info)
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        full_name: employee.full_name,
        slug: employee.slug,
        email: employee.email
      },
      pin_change_required: employee.pin_change_required || false
    });

  } catch (error) {
    console.error('PIN verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

