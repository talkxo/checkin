import { cookies } from 'next/headers';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export interface AdminSession {
  authenticated: boolean;
  timestamp: number;
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
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return null;
    }

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
  try {
    const cookieStore = cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/'
    });
  } catch (error) {
    console.error('Error setting admin session:', error);
  }
}

// Clear admin session
export async function clearAdminSession(): Promise<void> {
  try {
    const cookieStore = cookies();
    cookieStore.delete(ADMIN_SESSION_COOKIE);
  } catch (error) {
    console.error('Error clearing admin session:', error);
  }
}

// Check if admin is authenticated
export function isAdminAuthenticated(): boolean {
  try {
    const session = getAdminSession();
    return session?.authenticated === true;
  } catch (error) {
    console.error('Error checking admin authentication:', error);
    return false;
  }
}
