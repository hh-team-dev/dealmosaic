import { Hono } from 'hono';
import {
  CURRENCIES,
  getCountry,
  validateDisplayName,
  validatePincode,
  type CurrencyCode,
} from '@dealmosaic/core';
import { db, nowIso } from '../db/index.js';
import { assertSameOrigin, badRequest, clientIp } from '../lib/http.js';
import { hashIp, verifyPassword } from '../lib/security.js';
import { logAuthEvent } from '../lib/audit.js';
import {
  clearSessionCookie,
  getPreferences,
  requireCsrf,
  requireUser,
  toProfile,
  type AppBindings,
} from '../middleware/session.js';

export const meRoutes = new Hono<AppBindings>();

meRoutes.use('*', requireUser);

meRoutes.get('/', (c) => {
  const user = c.get('user')!;
  return c.json({ user: toProfile(user), preferences: getPreferences(user.id) });
});

meRoutes.patch('/', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const fields: Record<string, string> = {};

  let displayName = user.display_name;
  if (body.displayName !== undefined) {
    displayName = String(body.displayName).trim();
    const err = validateDisplayName(displayName);
    if (err) fields.displayName = err;
  }

  let phone: string | null = user.phone;
  if (body.phone !== undefined) {
    const raw = String(body.phone ?? '').trim();
    if (raw === '') phone = null;
    else if (!/^\+?[0-9\s-]{7,16}$/.test(raw)) fields.phone = 'Enter a valid phone number, or leave it blank.';
    else phone = raw;
  }

  if (Object.keys(fields).length > 0) throw badRequest('Please fix the highlighted fields.', fields);

  db.prepare('UPDATE users SET display_name = ?, phone = ?, updated_at = ? WHERE id = ?').run(
    displayName,
    phone,
    nowIso(),
    user.id,
  );
  const refreshed = db
    .prepare('SELECT id, email, display_name, email_verified_at, role, status, created_at, phone FROM users WHERE id = ?')
    .get(user.id) as Parameters<typeof toProfile>[0];
  return c.json({ user: toProfile(refreshed), preferences: getPreferences(user.id) });
});

meRoutes.patch('/preferences', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const current = getPreferences(user.id);
  const fields: Record<string, string> = {};

  let countryCode = current.countryCode;
  if (body.countryCode !== undefined) {
    const code = String(body.countryCode).toUpperCase();
    const country = getCountry(code);
    if (!country) fields.countryCode = 'Unknown country.';
    else if (!country.enabled) {
      fields.countryCode = `${country.name} is not enabled yet. DEALMOSAIC is launching in India first.`;
    } else countryCode = code;
  }

  let displayCurrency = current.displayCurrency;
  if (body.displayCurrency !== undefined) {
    const code = String(body.displayCurrency).toUpperCase();
    if (!(code in CURRENCIES)) fields.displayCurrency = 'Unsupported display currency.';
    else displayCurrency = code as CurrencyCode;
  }

  let pincode = current.pincode;
  if (body.pincode !== undefined) {
    const raw = String(body.pincode ?? '').trim();
    if (raw === '') pincode = null;
    else {
      const err = validatePincode(raw);
      if (err) fields.pincode = err;
      else pincode = raw;
    }
  }

  if (Object.keys(fields).length > 0) throw badRequest('Please fix the highlighted fields.', fields);

  db.prepare(
    `INSERT INTO user_preferences (user_id, country_code, display_currency, pincode, notify_inapp, notify_email, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       country_code = excluded.country_code,
       display_currency = excluded.display_currency,
       pincode = excluded.pincode,
       notify_inapp = excluded.notify_inapp,
       notify_email = excluded.notify_email,
       updated_at = excluded.updated_at`,
  ).run(
    user.id,
    countryCode,
    displayCurrency,
    pincode,
    body.notifyInApp === undefined ? (current.notifyInApp ? 1 : 0) : body.notifyInApp ? 1 : 0,
    body.notifyEmail === undefined ? (current.notifyEmail ? 1 : 0) : body.notifyEmail ? 1 : 0,
    nowIso(),
    nowIso(),
  );

  return c.json({ preferences: getPreferences(user.id) });
});

/** Data export — DPDP Act portability. Returns everything we hold on this user. */
meRoutes.get('/export', (c) => {
  const user = c.get('user')!;
  const payload = {
    exportedAt: nowIso(),
    account: toProfile(user),
    preferences: getPreferences(user.id),
    searches: db.prepare('SELECT query, country_code, created_at FROM user_search_history WHERE user_id = ?').all(user.id),
    savedProducts: db.prepare('SELECT * FROM saved_products WHERE user_id = ?').all(user.id),
    priceAlerts: db.prepare('SELECT * FROM price_alerts WHERE user_id = ?').all(user.id),
    notifications: db.prepare('SELECT kind, payload, created_at FROM notification_events WHERE user_id = ?').all(user.id),
    note: 'Passwords are stored only as salted scrypt hashes and cannot be exported. Session tokens are never stored in readable form.',
  };
  c.header('Content-Disposition', `attachment; filename="dealmosaic-data-${user.id.slice(0, 8)}.json"`);
  return c.json(payload);
});

/** Account deletion — hard delete, cascading to every user-owned row. */
meRoutes.delete('/', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const password = String(body.password ?? '');
  const confirmation = String(body.confirmation ?? '');

  if (confirmation !== 'DELETE') {
    throw badRequest('Type DELETE to confirm.', { confirmation: 'Type DELETE exactly.' });
  }
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as
    | { password_hash: string }
    | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw badRequest('Password is incorrect.', { password: 'That password is not right.' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  logAuthEvent({ event: 'account_deleted', ipHash: hashIp(clientIp(c)) });
  c.header('Set-Cookie', clearSessionCookie(c), { append: true });
  return c.json({ ok: true, message: 'Your account and all associated data have been deleted.' });
});
