// Route guards — the single vocabulary for API auth. Every route that touches
// the DB uses one of these; scripts/api-map.mjs scans for them to build the
// security map (docs/api-map.md).
import { NextResponse } from 'next/server';
import { getUserSession, isAdminAuthenticated, UserSession } from './auth';

export type GuardResult =
  | { ok: true; session: UserSession | null; admin: boolean }
  | { ok: false; response: NextResponse };

const denied = (status: 401 | 403, error: string) => ({
  ok: false as const,
  response: NextResponse.json({ error }, { status }),
});

/** Any authenticated principal — employee session or admin. */
export function requireAuth(): GuardResult {
  const session = getUserSession();
  if (session) return { ok: true, session, admin: false };
  if (isAdminAuthenticated()) return { ok: true, session: null, admin: true };
  return denied(401, 'Unauthorized');
}

/**
 * Authenticated AND allowed to act on the target employee. Admins may target
 * anyone; employees only themselves (matched by slug — sessions carry no email).
 *
 * The admin console shares a browser with the userside app, so both cookies
 * arrive together: a user session that doesn't match the target slug must fall
 * through to the admin check instead of denying, or the admin can only act on
 * their own userside profile.
 */
export function requireAuthFor(slug?: string | null, email?: string | null): GuardResult {
  const session = getUserSession();
  if (session && slug && slug === session.slug) return { ok: true, session, admin: false };
  if (isAdminAuthenticated()) return { ok: true, session: null, admin: true };
  // The employee app always sends its own slug; email-only lookups from a
  // user session are ambiguous, so they're admin-only.
  if (session) return denied(403, 'Forbidden: you can only access your own records');
  return denied(401, 'Unauthorized');
}

/** Admin only. */
export function requireAdmin(): GuardResult {
  if (isAdminAuthenticated()) return { ok: true, session: null, admin: true };
  return denied(401, 'Admin authentication required');
}
