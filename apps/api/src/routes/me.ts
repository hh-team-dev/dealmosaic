import { Hono } from 'hono';
import { z } from 'zod';
import {
  CURRENCIES,
  getCountry,
  validateDisplayName,
  validatePincode,
  type CurrencyCode,
} from '@dealmosaic/core';
import { db, nowIso } from '../db/index.js';
import { listSavedDealIds, saveDeal, unsaveDeal } from '../services/saved-digest.js';
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

meRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  return c.json({ user: toProfile(user), preferences: await getPreferences(user.id) });
});

/** Private, consent-aware notification history. Never an empty promotional push. */
meRoutes.get('/notifications', async (c) => {
  const user = c.get('user')!;
  const preferences = await getPreferences(user.id);
  c.header('Cache-Control', 'private, no-store');
  if (!preferences.notifyInApp) return c.json({ enabled: false, notifications: [] });
  const rows = await db.prepare("SELECT id, payload, created_at FROM notification_events WHERE user_id = ? AND kind = 'price_alert' ORDER BY created_at DESC LIMIT 50").all(user.id) as Array<{ id: string; payload: string; created_at: string }>;
  const notifications = rows.flatMap(row => {
    try {
      const p = JSON.parse(row.payload);
      if (p?.dataOrigin !== 'live' || p.inApp !== true || !Number.isSafeInteger(p.bestMinor) || p.bestMinor <= 0 || !Number.isSafeInteger(p.targetMinor) || p.targetMinor <= 0) return [];
      return [{ id: row.id, title: typeof p.productTitle === 'string' ? p.productTitle : 'Price target',
        productSlug: typeof p.productSlug === 'string' && /^[a-z0-9-]+$/.test(p.productSlug) ? p.productSlug : null,
        observedPriceMinor: p.bestMinor, targetMinor: p.targetMinor,
        platform: typeof p.platformSlug === 'string' ? p.platformSlug : 'the store',
        createdAt: row.created_at, emailSent: p.emailed === true }];
    } catch { return []; }
  });
  return c.json({ enabled: true, notifications });
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

  await db.prepare('UPDATE users SET display_name = ?, phone = ?, updated_at = ? WHERE id = ?').run(
    displayName,
    phone,
    nowIso(),
    user.id,
  );
  const refreshed = await (db
    .prepare('SELECT id, email, display_name, email_verified_at, role, status, created_at, phone FROM users WHERE id = ?')
    .get(user.id)) as unknown as Parameters<typeof toProfile>[0];
  return c.json({ user: toProfile(refreshed), preferences: await getPreferences(user.id) });
});

meRoutes.patch('/preferences', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const body = await c.req.json().catch(() => ({}));
  const current = await getPreferences(user.id);
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

  await db.prepare(
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

  return c.json({ preferences: await getPreferences(user.id) });
});

/** Data export — DPDP Act portability. Returns everything we hold on this user. */
/* ------------------------------------------------------------------ */
/* Saved deals — the server's copy, so the weekly email has something  */
/* to read. The list itself still works with no account.               */
/* ------------------------------------------------------------------ */

/**
 * The saved list is device-local by design (docs/25), which means the server
 * cannot email a shopper about a deal it has never heard of. These three routes
 * keep the ids in step for signed-in shoppers only; nothing else is copied,
 * because the coupon row already holds everything the email needs.
 */
meRoutes.get('/saved-deals', async (c) => {
  const user = c.get('user')!;
  const saved = await listSavedDealIds(user.id);
  return c.json({ saved });
});

const savedDealBody = z.object({ couponId: z.string().trim().min(1).max(64) });

meRoutes.post('/saved-deals', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const body = savedDealBody.parse(await c.req.json());
  const result = await saveDeal(user.id, body.couponId);
  return result.saved ? c.json({ saved: true }) : c.json({ saved: false, message: result.reason }, 404);
});

meRoutes.delete('/saved-deals/:couponId', requireCsrf, async (c) => {
  const user = c.get('user')!;
  await unsaveDeal(user.id, c.req.param('couponId'));
  return c.json({ saved: false });
});

meRoutes.get('/export', async (c) => {
  const user = c.get('user')!;
  const payload = {
    exportedAt: nowIso(),
    account: toProfile(user),
    preferences: await getPreferences(user.id),
    searches: await db.prepare('SELECT query, country_code, created_at FROM user_search_history WHERE user_id = ?').all(user.id),
    savedProducts: await db.prepare('SELECT * FROM saved_products WHERE user_id = ?').all(user.id),
    priceAlerts: await db.prepare('SELECT * FROM price_alerts WHERE user_id = ?').all(user.id),
    notifications: await db.prepare('SELECT kind, payload, created_at FROM notification_events WHERE user_id = ?').all(user.id),
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
  const row = await db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as
    | { password_hash: string }
    | undefined;
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw badRequest('Password is incorrect.', { password: 'That password is not right.' });
  }

  await db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  logAuthEvent({ event: 'account_deleted', ipHash: hashIp(clientIp(c)) });
  c.header('Set-Cookie', clearSessionCookie(c), { append: true });
  return c.json({ ok: true, message: 'Your account and all associated data have been deleted.' });
});
