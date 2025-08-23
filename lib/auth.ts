import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSession {
  authenticated: boolean;
  timestamp: number;
}

// Hash password for storage (run this once to get the hash)
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create admin session
export function createAdminSession(): AdminSession {
  return {
    authenticated: true,
    timestamp: Date.now()
  };
}

// Get admin session from cookies
export function getAdminSession(): AdminSession | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session: AdminSession = JSON.parse(sessionCookie.value);
    
    // Check if session is expired
    if (Date.now() - session.timestamp > SESSION_DURATION) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error parsing admin session:', error);
    return null;
  }
}

// Set admin session cookie
export async function setAdminSession(session: AdminSession): Promise<void> {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000,
    path: '/'
  });
}

// Clear admin session
export async function clearAdminSession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

// Check if admin is authenticated
export function isAdminAuthenticated(): boolean {
  const session = getAdminSession();
  return session?.authenticated === true;
}

// Validate admin password
export async function validateAdminPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not configured');
    return false;
  }
  
  return verifyPassword(password, adminPassword);
}
