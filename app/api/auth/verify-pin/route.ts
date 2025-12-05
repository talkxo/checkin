import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// Simple in-memory rate limiting
// In production, consider using Redis or a database
const rateLimitMap = new Map<string, { attempts: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip: string): { allowed: boolean; remainingAttempts: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    // Reset or create new record
    rateLimitMap.set(ip, { attempts: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetAt: record.resetAt };
  }

  record.attempts++;
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.attempts, resetAt: record.resetAt };
}

function resetRateLimit(ip: string) {
  rateLimitMap.delete(ip);
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
    const rateLimit = checkRateLimit(ip);

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
    resetRateLimit(ip);

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

