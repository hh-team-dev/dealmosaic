import { Hono } from 'hono';
import {
  normaliseEmail,
  validateDisplayName,
  validateEmail,
  validatePassword,
} from '@dealmosaic/core';
import { db, newId, nowIso } from '../db/index.js';
import { hashPassword, verifyPassword, randomToken, sha256, hashIp } from '../lib/security.js';
import { assertSameOrigin, badRequest, clientIp, conflict, forbidden, unauthorized } from '../lib/http.js';
import { authLimiter } from '../lib/rate-limit.js';
import { logAuthEvent } from '../lib/audit.js';
import { queueEmail } from '../lib/outbox.js';
import {
  SESSION_TTL_DAYS,
  clearSessionCookie,
  getPreferences,
  sessionCookie,
  toProfile,
  type AppBindings,
  type SessionRow,
  type UserRow,
} from '../middleware/session.js';

export const authRoutes = new Hono<AppBindings>();

const IS_DEV = process.env.NODE_ENV !== 'production';
const VERIFY_TTL_HOURS = 24;
const RESET_TTL_MINUTES = 60;

async function createSession(c: Parameters<typeof sessionCookie>[0], userId: string) {
  const token = randomToken(32);
  const csrf = randomToken(24);
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const id = newId();

  await db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, csrf_token, created_at, last_seen_at, expires_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    sha256(token),
    csrf,
    now.toISOString(),
    now.toISOString(),
    expires.toISOString(),
    hashIp(clientIp(c)),
    (c.req.header('user-agent') ?? '').slice(0, 200),
  );

  c.header('Set-Cookie', sessionCookie(c, token, SESSION_TTL_DAYS * 24 * 60 * 60), { append: true });
  return { id, csrfToken: csrf, expiresAt: expires.toISOString() };
}

async function issueAuthToken(userId: string, email: string, kind: 'verify_email' | 'reset_password') {
  const token = randomToken(32);
  const ttlMs = kind === 'verify_email' ? VERIFY_TTL_HOURS * 3600_000 : RESET_TTL_MINUTES * 60_000;
  const expires = new Date(Date.now() + ttlMs).toISOString();
  await db.prepare(
    `INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(newId(), userId, kind, sha256(token), expires, nowIso());

  const path = kind === 'verify_email' ? 'verify-email' : 'reset-password';
  const actionUrl = `/${path}?token=${token}`;
  await queueEmail({
    to: email,
    subject:
      kind === 'verify_email'
        ? 'Confirm your DEALMOSAIC email address'
        : 'Reset your DEALMOSAIC password',
    body:
      kind === 'verify_email'
        ? `Welcome to DEALMOSAIC. Confirm your email address to start comparing prices. This link expires in ${VERIFY_TTL_HOURS} hours.`
        : `Someone asked to reset the password for this account. If that was you, use the link below within ${RESET_TTL_MINUTES} minutes. If it was not you, no action is needed.`,
    actionUrl,
  });
  return { actionUrl: IS_DEV ? actionUrl : undefined, expiresAt: expires };
}

/* ------------------------------- register ------------------------------- */

authRoutes.post('/register', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));

  const displayName = String(body.displayName ?? '').trim();
  const email = normaliseEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');
  const passwordConfirm = String(body.passwordConfirm ?? '');
  const ageConfirmed = body.ageConfirmed === true;

  const fields: Record<string, string> = {};
  const nameErr = validateDisplayName(displayName);
  if (nameErr) fields.displayName = nameErr;
  const emailErr = validateEmail(email);
  if (emailErr) fields.email = emailErr;
  const pwErr = validatePassword(password);
  if (pwErr) fields.password = pwErr;
  if (password !== passwordConfirm) fields.passwordConfirm = 'The two passwords do not match.';
  if (!ageConfirmed) fields.ageConfirmed = 'Please confirm you are 13 or older.';
  if (Object.keys(fields).length > 0) throw badRequest('Please fix the highlighted fields.', fields);

  const existing = await db.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').get(email) as
    | { id: string; email_verified_at: string | null }
    | undefined;

  if (existing) {
    logAuthEvent({ userId: existing.id, event: 'register_duplicate_email', ipHash: hashIp(clientIp(c)) });
    throw conflict('This email is already registered. Sign in instead, or reset your password.');
  }

  const id = newId();
  const now = nowIso();
  await db.transaction(async (tx) => {
    await tx
      .prepare(
        `INSERT INTO users (id, email, password_hash, display_name, age_confirmed_at, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?)`,
      )
      .run(id, email, '', displayName, now, now, now);
    await tx.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run('pending', id);
  });

  // Hash outside the transaction: scrypt is intentionally slow.
  const hash = await hashPassword(password);
  await db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, nowIso(), id);
  await db.prepare(
    `INSERT INTO user_preferences (user_id, country_code, display_currency, created_at, updated_at)
     VALUES (?, 'IN', 'INR', ?, ?)`,
  ).run(id, now, now);

  const token = await issueAuthToken(id, email, 'verify_email');
  logAuthEvent({ userId: id, event: 'register', ipHash: hashIp(clientIp(c)) });

  return c.json(
    {
      ok: true,
      needsVerification: true,
      email,
      message: 'Account created. Confirm your email to sign in.',
      devActionUrl: token.actionUrl,
    },
    201,
  );
});

/* -------------------------------- verify -------------------------------- */

authRoutes.post('/verify-email', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token ?? '');
  if (!token) throw badRequest('Verification token missing.');

  const row = await db
    .prepare(
      `SELECT id, user_id, expires_at, consumed_at FROM auth_tokens
       WHERE token_hash = ? AND kind = 'verify_email'`,
    )
    .get(sha256(token)) as
    | { id: string; user_id: string; expires_at: string; consumed_at: string | null }
    | undefined;

  if (!row) throw badRequest('That confirmation link is not valid. Request a new one from the sign-in page.');
  if (row.consumed_at) throw badRequest('That link has already been used. You can sign in.');
  if (row.expires_at < nowIso()) throw badRequest('That link has expired. Request a new one from the sign-in page.');

  const now = nowIso();
  await db.transaction(async (tx) => {
    await tx.prepare('UPDATE auth_tokens SET consumed_at = ? WHERE id = ?').run(now, row.id);
    await tx.prepare('UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?').run(now, now, row.user_id);
  });

  const user = await (db
    .prepare('SELECT id, email, display_name, email_verified_at, role, status, created_at, phone FROM users WHERE id = ?')
    .get(row.user_id)) as unknown as UserRow;
  const session = await createSession(c, user.id);
  logAuthEvent({ userId: user.id, event: 'email_verified', ipHash: hashIp(clientIp(c)) });

  return c.json({
    ok: true,
    user: toProfile(user),
    preferences: await getPreferences(user.id),
    csrfToken: session.csrfToken,
  });
});

/* ------------------------------- resend -------------------------------- */

authRoutes.post('/resend-verification', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const email = normaliseEmail(String(body.email ?? ''));
  const user = await db.prepare('SELECT id, email_verified_at FROM users WHERE email = ?').get(email) as
    | { id: string; email_verified_at: string | null }
    | undefined;

  let devActionUrl: string | undefined;
  if (user && !user.email_verified_at) {
    devActionUrl = (await issueAuthToken(user.id, email, 'verify_email')).actionUrl;
    logAuthEvent({ userId: user.id, event: 'verification_resent', ipHash: hashIp(clientIp(c)) });
  }
  // Always the same response: no account enumeration from this endpoint.
  return c.json({
    ok: true,
    message: 'If that address has an unconfirmed account, a new link is on its way.',
    devActionUrl,
  });
});

/* --------------------------------- login -------------------------------- */

authRoutes.post('/login', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const email = normaliseEmail(String(body.email ?? ''));
  const password = String(body.password ?? '');

  const user = await db
    .prepare('SELECT id, email, password_hash, display_name, email_verified_at, role, status, created_at, phone FROM users WHERE email = ?')
    .get(email) as
    | (UserRow & { password_hash: string })
    | undefined;

  // Constant-ish work whether or not the account exists.
  const storedHash = user?.password_hash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA';
  const ok = await verifyPassword(password, storedHash);

  if (!user || !ok) {
    logAuthEvent({ userId: user?.id, event: 'login_failed', ipHash: hashIp(clientIp(c)) });
    throw unauthorized('Email or password is incorrect.');
  }
  if (user.status !== 'active') throw forbidden('This account is not active. Contact support.');
  if (!user.email_verified_at) {
    const resend = await issueAuthToken(user.id, user.email, 'verify_email');
    logAuthEvent({ userId: user.id, event: 'login_blocked_unverified', ipHash: hashIp(clientIp(c)) });
    return c.json(
      {
        error: {
          code: 'email_unverified',
          message: 'Confirm your email address first. We have sent a fresh link.',
        },
        devActionUrl: resend.actionUrl,
      },
      403,
    );
  }

  const session = await createSession(c, user.id);
  logAuthEvent({ userId: user.id, event: 'login', ipHash: hashIp(clientIp(c)) });

  return c.json({
    user: toProfile(user),
    preferences: await getPreferences(user.id),
    csrfToken: session.csrfToken,
  });
});

/* -------------------------------- logout -------------------------------- */

authRoutes.post('/logout', async (c) => {
  assertSameOrigin(c);
  const session = c.get('session') as SessionRow | null;
  if (session) {
    await db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(nowIso(), session.id);
    logAuthEvent({ userId: session.user_id, event: 'logout', ipHash: hashIp(clientIp(c)) });
  }
  c.header('Set-Cookie', clearSessionCookie(c), { append: true });
  return c.json({ ok: true });
});

/* ------------------------------- session -------------------------------- */

authRoutes.get('/session', async (c) => {
  const user = c.get('user');
  const session = c.get('session');
  if (!user || !session) return c.json({ user: null, preferences: null, csrfToken: null });
  return c.json({
    user: toProfile(user),
    preferences: await getPreferences(user.id),
    csrfToken: session.csrf_token,
  });
});

/* ----------------------------- password reset --------------------------- */

authRoutes.post('/forgot-password', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const email = normaliseEmail(String(body.email ?? ''));
  const user = (await db.prepare('SELECT id FROM users WHERE email = ?').get(email)) as { id: string } | undefined;

  let devActionUrl: string | undefined;
  if (user) {
    devActionUrl = (await issueAuthToken(user.id, email, 'reset_password')).actionUrl;
    logAuthEvent({ userId: user.id, event: 'password_reset_requested', ipHash: hashIp(clientIp(c)) });
  }
  return c.json({
    ok: true,
    message: 'If that address has an account, a reset link is on its way.',
    devActionUrl,
  });
});

authRoutes.post('/reset-password', authLimiter, async (c) => {
  assertSameOrigin(c);
  const body = await c.req.json().catch(() => ({}));
  const token = String(body.token ?? '');
  const password = String(body.password ?? '');
  const passwordConfirm = String(body.passwordConfirm ?? '');

  const fields: Record<string, string> = {};
  const pwErr = validatePassword(password);
  if (pwErr) fields.password = pwErr;
  if (password !== passwordConfirm) fields.passwordConfirm = 'The two passwords do not match.';
  if (Object.keys(fields).length > 0) throw badRequest('Please fix the highlighted fields.', fields);

  const row = await db
    .prepare(
      `SELECT id, user_id, expires_at, consumed_at FROM auth_tokens
       WHERE token_hash = ? AND kind = 'reset_password'`,
    )
    .get(sha256(token)) as
    | { id: string; user_id: string; expires_at: string; consumed_at: string | null }
    | undefined;

  if (!row || row.consumed_at) throw badRequest('That reset link is not valid. Request a new one.');
  if (row.expires_at < nowIso()) throw badRequest('That reset link has expired. Request a new one.');

  const hash = await hashPassword(password);
  const now = nowIso();
  await db.transaction(async (tx) => {
    await tx.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, now, row.user_id);
    await tx.prepare('UPDATE auth_tokens SET consumed_at = ? WHERE id = ?').run(now, row.id);
    // Every existing session dies: a reset means "assume someone else had access".
    await tx
      .prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
      .run(now, row.user_id);
  });

  logAuthEvent({ userId: row.user_id, event: 'password_reset_completed', ipHash: hashIp(clientIp(c)) });
  c.header('Set-Cookie', clearSessionCookie(c), { append: true });
  return c.json({ ok: true, message: 'Password updated. Sign in with your new password.' });
});
