import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_SESSION_COOKIE = 'admin_session';
const USER_SESSION_COOKIE = 'user_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

// SECRET used to sign session cookies. In production this must come from the
// environment — a hardcoded fallback would let anyone forge a valid session
// cookie, since this file is in a public repo. Only non-production
// environments (local dev without a .env.local) fall back to a dev secret.
if (!process.env.AUTH_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error(
    'AUTH_SECRET environment variable is not set. Refusing to start in production without a secret ' +
    'to sign session cookies — set AUTH_SECRET in your environment configuration.'
  );
}

if (!process.env.AUTH_SECRET) {
  console.warn(
    'AUTH_SECRET is not set — using an insecure development-only fallback secret. ' +
    'Set AUTH_SECRET in .env.local before deploying to production.'
  );
}

const AUTH_SECRET = process.env.AUTH_SECRET || 'fallback-secret-for-dev-only-change-in-prod';

export interface AdminSession {
  authenticated: boolean;
  timestamp: number;
}

export interface UserSession {
  id: string;
  slug: string;
  fullName: string;
  timestamp: number;
}

// HMAC signing for session payload
function signPayload(payload: string): string {
  return createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
}

// Verify HMAC signature
function verifySignature(payload: string, signature: string): boolean {
  try {
    const freshSignature = signPayload(payload);
    return timingSafeEqual(Buffer.from(freshSignature), Buffer.from(signature));
  } catch {
    return false;
  }
}

// Create and sign session token
function createSignedToken(data: any): string {
  const payload = JSON.stringify(data);
  const signature = signPayload(payload);
  return `${Buffer.from(payload).toString('base64')}.${signature}`;
}

// Parse and verify session token
function getVerifiedToken<T>(token: string): T | null {
  try {
    const [b64Payload, signature] = token.split('.');
    if (!b64Payload || !signature) return null;

    const payload = Buffer.from(b64Payload, 'base64').toString('utf8');
    if (!verifySignature(payload, signature)) return null;

    return JSON.parse(payload) as T;
  } catch {
    return null;
  }
}

/**
 * ADMIN AUTHENTICATION
 */

export function createAdminSession(): AdminSession {
  return {
    authenticated: true,
    timestamp: Date.now()
  };
}

export function getAdminSession(): AdminSession | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = getVerifiedToken<AdminSession>(token);
    if (!session) return null;

    if (Date.now() - session.timestamp > SESSION_DURATION) {
      return null;
    }
    return session;
  } catch (error) {
    return null;
  }
}

export async function setAdminSession(session: AdminSession): Promise<void> {
  const token = createSignedToken(session);
  cookies().set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  });
}

export async function clearAdminSession(): Promise<void> {
  cookies().delete(ADMIN_SESSION_COOKIE);
}

export function isAdminAuthenticated(): boolean {
  return getAdminSession()?.authenticated === true;
}

/**
 * EMPLOYEE AUTHENTICATION
 */

export function createUserSession(id: string, slug: string, fullName: string): UserSession {
  return {
    id,
    slug,
    fullName,
    timestamp: Date.now()
  };
}

export async function setUserSession(session: UserSession): Promise<void> {
  const token = createSignedToken(session);
  cookies().set(USER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // Needed for potential basecamp redirects
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  });
}

export function getUserSession(): UserSession | null {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
    if (!token) return null;

    const session = getVerifiedToken<UserSession>(token);
    if (!session) return null;

    if (Date.now() - session.timestamp > SESSION_DURATION) {
      return null;
    }
    return session;
  } catch (error) {
    return null;
  }
}

export async function clearUserSession(): Promise<void> {
  cookies().delete(USER_SESSION_COOKIE);
}

const REFRESH_THRESHOLD = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function refreshUserSessionIfNeeded(): Promise<void> {
  const session = getUserSession();
  if (!session) return;
  if (Date.now() - session.timestamp < REFRESH_THRESHOLD) return;
  const refreshed = createUserSession(session.id, session.slug, session.fullName);
  await setUserSession(refreshed);
}
