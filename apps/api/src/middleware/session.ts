import type { Context, MiddlewareHandler } from 'hono';
import { db, nowIso } from '../db/index.js';
import { sha256, safeEqual } from '../lib/security.js';
import { unauthorized, forbidden } from '../lib/http.js';
import type { UserPreferences, UserProfile } from '@dealmosaic/core';

export const SESSION_COOKIE = 'dm_session';
export const SESSION_TTL_DAYS = 30;

export interface SessionRow {
  id: string;
  user_id: string;
  csrf_token: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  email_verified_at: string | null;
  role: 'user' | 'admin' | 'super_admin';
  status: string;
  created_at: string;
  phone: string | null;
}

export interface PrefRow {
  user_id: string;
  country_code: string;
  display_currency: string;
  pincode: string | null;
  notify_inapp: number;
  notify_email: number;
}

export interface AppBindings {
  Variables: {
    user: UserRow | null;
    session: SessionRow | null;
  };
}

export type AppContext = Context<AppBindings>;

/** Reads the session cookie, resolves it server-side and refreshes last_seen_at.
 *  A revoked or expired session is treated exactly like no session. */
export const loadSession: MiddlewareHandler<AppBindings> = async (c, next) => {
  c.set('user', null);
  c.set('session', null);

  const raw = getCookie(c, SESSION_COOKIE);
  if (raw) {
    const row = await (db
      .prepare(
        `SELECT s.id, s.user_id, s.csrf_token, s.expires_at, s.revoked_at
         FROM sessions s
         WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?`,
      )
      .get(sha256(raw), nowIso())) as unknown as SessionRow | undefined;

    if (row) {
      const user = await (db
        .prepare(
          `SELECT id, email, display_name, email_verified_at, role, status, created_at, phone
           FROM users WHERE id = ? AND status = 'active'`,
        )
        .get(row.user_id)) as unknown as UserRow | undefined;

      if (user) {
        await db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), row.id);
        c.set('user', user);
        c.set('session', row);
      }
    }
  }

  await next();
};

export const requireUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  if (!user) throw unauthorized('Sign in to compare prices. Accounts are free.');
  await next();
};

/** Authenticated + verified. Search and personal features require a verified email. */
export const requireVerifiedUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  if (!user) throw unauthorized('Sign in to compare prices. Accounts are free.');
  if (!user.email_verified_at) {
    throw unauthorized('Verify your email address to continue. Check your inbox for the link.');
  }
  await next();
};

/** Double-submit CSRF check: header must match the token bound to this session. */
export const requireCsrf: MiddlewareHandler<AppBindings> = async (c, next) => {
  const session = c.get('session');
  if (!session) throw unauthorized();
  const header = c.req.header('x-csrf-token') ?? '';
  if (!header || !safeEqual(header, session.csrf_token)) {
    // 403, not 401: the session is valid, the request is not. A client that gets
    // 401 here would show a login screen to someone who is already signed in.
    throw forbidden('Security token expired. Refresh the page and try again.');
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = c.get('user');
  if (!user) throw unauthorized();
  /**
   * 401 means "we do not know who you are"; 403 means "we know, and you may not".
   * This used to throw 401 for a signed-in non-administrator, which sent the
   * client back to a login screen that could never help them.
   */
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw forbidden('This account is not an administrator.');
  }
  await next();
};

/* ----------------------------- cookies ----------------------------- */

export function getCookie(c: Context, name: string): string | null {
  const header = c.req.header('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function isSecureRequest(c: Context): boolean {
  const proto = c.req.header('x-forwarded-proto');
  if (proto) return proto.split(',')[0]!.trim() === 'https';
  try {
    return new URL(c.req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

export function sessionCookie(c: Context, token: string, maxAgeSeconds: number): string {
  const secure = isSecureRequest(c) ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearSessionCookie(c: Context): string {
  const secure = isSecureRequest(c) ? '; Secure' : '';
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

/* --------------------------- serialisers --------------------------- */

export function toProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    emailVerified: Boolean(row.email_verified_at),
    role: row.role,
    createdAt: row.created_at,
    phone: row.phone,
  };
}

export function toPreferences(row: PrefRow | undefined): UserPreferences {
  return {
    countryCode: row?.country_code ?? 'IN',
    displayCurrency: row?.display_currency ?? 'INR',
    pincode: row?.pincode ?? null,
    notifyInApp: row ? Boolean(row.notify_inapp) : true,
    notifyEmail: row ? Boolean(row.notify_email) : true,
  };
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const row = await db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as
    | PrefRow
    | undefined;
  return toPreferences(row);
}
