import { Hono } from 'hono';
import { adminHospitalityRoutes } from './admin-hospitality.js';
import { adminCampaignRoutes } from './admin-campaigns.js';
import { adminConnectionRoutes } from './admin-connections.js';
import { fetchEarningsSnapshot } from '../services/earnings.js';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { requireUser, requireAdmin, requireCsrf } from '../middleware/session.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import { dailyJobStatus } from '../services/daily-job.js';
import { affiliateReadiness } from '../services/affiliate-campaigns.js';

/**
 * THE OWNER'S CONTROL CENTRE.
 *
 * Until now every operational task — verifying a code, retiring a dead one,
 * moderating a shopper's price report, promoting an account — meant writing SQL
 * against production. That is not a product; it is a liability with a database
 * attached. This module is the minimum surface that lets the owner run the site
 * from a phone.
 *
 * Three rules shape it:
 *
 *  1. **The server decides.** Every route here mounts behind `requireAdmin`, which
 *     reads the role from the database on each request. The interface hides what
 *     it should, but hiding is decoration — the 403 is the enforcement.
 *  2. **Every write is attributable.** No destructive route exists without an
 *     `admin_audit` row recording who did it, to what, from which value to which.
 *  3. **No route here can delete money or people.** Archiving and rejecting are
 *     reversible state changes; there is no hard delete of a coupon, an offer or a
 *     user from this surface.
 */

export const adminRoutes = new Hono<AppBindings>();

const adminLimiter = createRateLimiter({ name: 'admin', windowMs: 60_000, max: 120 });

// Every request must be a signed-in administrator. This is mounted first, so no
// route registered below can be reached without passing it.
adminRoutes.use('*', async (c, next) => {
  await adminLimiter(c, async () => {});
  await next();
});
adminRoutes.use('*', requireUser);
adminRoutes.use('*', requireAdmin);
adminRoutes.route('/campaigns', adminCampaignRoutes);
adminRoutes.route('/connections', adminConnectionRoutes);
adminRoutes.route('/hospitality', adminHospitalityRoutes);

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

async function audit(
  actor: { id: string; email: string },
  action: string,
  entity: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO admin_audit (id, actor_id, actor_email, action, entity, entity_id, before_json, after_json, at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      newId(),
      actor.id,
      actor.email,
      action,
      entity,
      entityId,
      before === null ? null : JSON.stringify(before).slice(0, 2000),
      after === null ? null : JSON.stringify(after).slice(0, 2000),
      nowIso(),
    );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

adminRoutes.get('/overview', async (c) => {
  const now = nowIso();

  const coupons = (await db
    .prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN expires_at IS NOT NULL AND expires_at > ? THEN 1 ELSE 0 END) AS live,
              SUM(CASE WHEN expires_at IS NOT NULL AND expires_at <= ? THEN 1 ELSE 0 END) AS expired,
              SUM(CASE WHEN code IS NOT NULL AND code <> '' THEN 1 ELSE 0 END) AS with_code,
              SUM(CASE WHEN stated_price_minor IS NOT NULL THEN 1 ELSE 0 END) AS with_price,
              SUM(CASE WHEN trust_state = 'rejected' THEN 1 ELSE 0 END) AS rejected,
              SUM(CASE WHEN trust_state = 'community_verified' THEN 1 ELSE 0 END) AS community_verified,
              COUNT(DISTINCT platform_slug) AS stores
         FROM coupons`,
    )
    .get(now, now)) as Record<string, number>;

  const people = (await db
    .prepare(
      `SELECT COUNT(*) AS users,
              SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified,
              SUM(CASE WHEN status <> 'active' THEN 1 ELSE 0 END) AS inactive
         FROM users`,
    )
    .get()) as Record<string, number>;

  const catalogue = (await db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM catalogue_products) AS products,
              (SELECT COUNT(*) FROM product_variants) AS variants,
              (SELECT COUNT(*) FROM offers WHERE is_active = 1 AND data_origin = 'live') AS offers,
              (SELECT COUNT(*) FROM offer_snapshots) AS snapshots,
              (SELECT COUNT(*) FROM price_alerts) AS alerts,
              (SELECT COUNT(*) FROM community_prices) AS community,
              (SELECT COUNT(*) FROM community_prices WHERE trust_state = 'unverified') AS community_pending`,
    )
    .get()) as Record<string, number>;

  const job = await dailyJobStatus().catch(() => null);
  const affiliate = await affiliateReadiness().catch(() => null);

  return c.json({ coupons, people, catalogue, job, affiliate, now });
});

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/revenue — what the funnel actually did.
 *
 * The owner asked, reasonably, where the money is. This endpoint answers with the
 * only two things that are ours to know:
 *
 *   • **clicks** — measured here, to the row;
 *   • **conversions and commission** — measured by the affiliate network, not by
 *     us, and therefore not invented here. The response says so in `note` rather
 *     than leaving a blank where a rupee figure would look reassuring.
 *
 * Clicks are reported per day, per store and per coupon, because those are the
 * three questions that change what you do next: is the traffic growing, which
 * merchant is worth featuring, and which card earns its place on the page.
 */
adminRoutes.get('/revenue', async (c) => {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  const totals = (await db
    .prepare(
      `SELECT
         COUNT(*) AS all_time,
         SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_24h,
         SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_7d,
         SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS last_30d,
         COUNT(DISTINCT coupon_id) AS coupons_clicked,
         COUNT(DISTINCT platform_slug) AS stores_clicked,
         COUNT(DISTINCT user_id) AS signed_in_clickers,
         MAX(created_at) AS last_click_at
       FROM outbound_clicks`,
    )
    .get(monthAgo, weekAgo, monthAgo)) as Record<string, number | string | null>;

  const byStore = (await db
    .prepare(
      `SELECT platform_slug AS store, COUNT(*) AS clicks
         FROM outbound_clicks
        WHERE created_at >= ?
        GROUP BY platform_slug
        ORDER BY clicks DESC
        LIMIT 12`,
    )
    .all(monthAgo)) as Array<{ store: string; clicks: number }>;

  const byDay = (await db
    .prepare(
      `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS clicks
         FROM outbound_clicks
        WHERE created_at >= ?
        GROUP BY day
        ORDER BY day ASC`,
    )
    .all(new Date(now.getTime() - 13 * 24 * 3600 * 1000).toISOString())) as Array<{
    day: string;
    clicks: number;
  }>;

  const topCoupons = (await db
    .prepare(
      `SELECT c.id, c.platform_slug AS store, c.title, c.code, COUNT(*) AS clicks
         FROM outbound_clicks o
         JOIN coupons c ON c.id = o.coupon_id
        WHERE o.created_at >= ?
        GROUP BY o.coupon_id
        ORDER BY clicks DESC
        LIMIT 10`,
    )
    .all(monthAgo)) as Array<Record<string, unknown>>;

  const byDevice = (await db
    .prepare(
      `SELECT device, COUNT(*) AS clicks
         FROM outbound_clicks
        WHERE created_at >= ?
        GROUP BY device
        ORDER BY clicks DESC`,
    )
    .all(monthAgo)) as Array<{ device: string | null; clicks: number }>;

  /*
   * The network's ledger, alongside ours. `network` is null when the affiliate API
   * is unreachable or not configured — and the page says exactly that rather than
   * showing ₹0, because "we could not ask" and "you earned nothing" are different
   * facts and only one of them is worth panicking about.
   */
  const network = await fetchEarningsSnapshot(30, Number(process.env.CUELINKS_CHANNEL_ID) || undefined);

  return c.json({
    clicks: totals,
    byStore,
    byDay,
    topCoupons,
    byDevice,
    network,
    note: network
      ? 'Clicks are counted here. Commission, sales and payout state come from the affiliate network for the last 30 days and are the network\u2019s figures, not ours.'
      : 'Clicks are counted here. The affiliate network could not be reached just now, so commission is unknown \u2014 not zero.',
    now: nowIso(),
  });
});

/* ------------------------------------------------------------------ */
/* Coupons                                                             */
/* ------------------------------------------------------------------ */

const couponQuery = z.object({
  state: z.enum(['live', 'expired', 'rejected', 'codes', 'all']).default('live'),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
});

adminRoutes.get('/coupons', async (c) => {
  const parsed = couponQuery.safeParse({
    state: c.req.query('state') ?? 'live',
    q: c.req.query('q') ?? undefined,
    limit: c.req.query('limit') ?? 50,
  });
  if (!parsed.success) return c.json({ error: { code: 'invalid_request', message: parsed.error.issues[0]?.message } }, 400);

  const { state, q, limit } = parsed.data;
  const now = nowIso();
  const where = [`(? = 'all'
      OR (? = 'live' AND c.trust_state NOT IN ('rejected','expired') AND (c.expires_at IS NULL OR c.expires_at > ?))
      OR (? = 'expired' AND (c.trust_state = 'expired' OR (c.expires_at IS NOT NULL AND c.expires_at <= ?)))
      OR (? = 'rejected' AND c.trust_state = 'rejected')
      OR (? = 'codes' AND c.code IS NOT NULL AND c.code <> '' AND c.trust_state NOT IN ('rejected','expired') AND (c.expires_at IS NULL OR c.expires_at > ?)))`].join(' AND ');

  const rows = (await db
    .prepare(
      `SELECT c.id, c.platform_slug, c.campaign_name, c.code, c.title, c.trust_state, c.source,
              c.expires_at, c.success_count, c.fail_count, c.stated_percent, c.stated_price_minor,
              c.offer_type, c.tracking_url, a.access_status AS affiliate_status
         FROM coupons c
    LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id
        WHERE ${where}
          AND (? IS NULL OR LOWER(c.title) LIKE ? OR LOWER(COALESCE(c.code,'')) LIKE ? OR LOWER(c.platform_slug) LIKE ?)
        ORDER BY CASE WHEN c.expires_at IS NULL THEN 1 ELSE 0 END, c.expires_at ASC
        LIMIT ?`,
    )
    .all(
      state, state, now, state, now, state, state, now,
      q ?? null, q ? `%${q.toLowerCase()}%` : null, q ? `%${q.toLowerCase()}%` : null, q ? `%${q.toLowerCase()}%` : null,
      limit,
    )) as unknown as Array<Record<string, unknown>>;

  return c.json({ state, count: rows.length, coupons: rows });
});

const stateBody = z.object({ trustState: z.enum(['listed', 'moderator_verified', 'community_verified', 'rejected', 'expired']) });

/**
 * Change a coupon's trust state. Reversible by design: rejecting is a label, not
 * a deletion, so a mistake is one more click rather than a restore from backup.
 */
adminRoutes.post('/coupons/:id/state', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const parsed = stateBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: { code: 'invalid_request', message: 'Unknown trust state' } }, 400);

  const id = c.req.param('id');
  const before = (await db.prepare('SELECT id, trust_state, expires_at FROM coupons WHERE id = ?').get(id)) as
    | { id: string; trust_state: string; expires_at: string | null }
    | undefined;
  if (!before) return c.json({ error: { code: 'not_found', message: 'No such coupon' } }, 404);

  await db
    .prepare('UPDATE coupons SET trust_state = ? WHERE id = ?')
    .run(parsed.data.trustState, id);

  await audit(user, 'coupon.state', 'coupon', id, before, { trust_state: parsed.data.trustState });
  return c.json({ ok: true, id, trustState: parsed.data.trustState });
});

/* ------------------------------------------------------------------ */
/* Community price reports                                             */
/* ------------------------------------------------------------------ */

adminRoutes.get('/community', async (c) => {
  const rows = (await db
    .prepare(
      `SELECT cp.id, cp.variant_id, cp.platform_slug, cp.price_minor, cp.pincode, cp.reported_at AS observed_at,
              cp.trust_state, cp.reported_by, v.variant_label, p.title
         FROM community_prices cp
    LEFT JOIN product_variants v ON v.id = cp.variant_id
    LEFT JOIN catalogue_products p ON p.id = v.product_id
        ORDER BY cp.reported_at DESC
        LIMIT 100`,
    )
    .all()) as unknown as Array<Record<string, unknown>>;
  return c.json({ count: rows.length, reports: rows });
});

adminRoutes.post('/community/:id/state', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const parsed = z.object({ trustState: z.enum(['reported', 'corroborated', 'moderator_verified', 'rejected']) }).safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: { code: 'invalid_request', message: 'Unknown trust state' } }, 400);

  const id = c.req.param('id');
  const before = (await db.prepare('SELECT id, trust_state FROM community_prices WHERE id = ?').get(id)) as
    | { id: string; trust_state: string }
    | undefined;
  if (!before) return c.json({ error: { code: 'not_found', message: 'No such report' } }, 404);

  await db.prepare('UPDATE community_prices SET trust_state = ? WHERE id = ?').run(parsed.data.trustState, id);
  await audit(user, 'community.state', 'community_price', id, before, { trust_state: parsed.data.trustState });
  return c.json({ ok: true, id, trustState: parsed.data.trustState });
});

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

adminRoutes.get('/users', async (c) => {
  const rows = (await db
    .prepare(
      `SELECT id, email, display_name, role, status, email_verified_at, created_at
         FROM users ORDER BY created_at DESC LIMIT 200`,
    )
    .all()) as unknown as Array<Record<string, unknown>>;
  return c.json({ count: rows.length, users: rows });
});

const roleBody = z.object({ role: z.enum(['user', 'admin']) });

/**
 * Promote or demote an administrator.
 *
 * `super_admin` cannot be granted from the web at all — only set directly in the
 * database — so a compromised admin session cannot mint an unrevokable owner.
 */
adminRoutes.post('/users/:id/role', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const parsed = roleBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: { code: 'invalid_request', message: 'Role must be user or admin' } }, 400);

  const id = c.req.param('id');
  const before = (await db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(id)) as
    | { id: string; email: string; role: string }
    | undefined;
  if (!before) return c.json({ error: { code: 'not_found', message: 'No such user' } }, 404);
  if (before.role === 'super_admin') {
    return c.json({ error: { code: 'forbidden', message: 'A super admin cannot be changed from the web' } }, 403);
  }

  await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(parsed.data.role, id);
  await audit(user, 'user.role', 'user', id, before, { role: parsed.data.role });
  return c.json({ ok: true, id, role: parsed.data.role });
});

/* ------------------------------------------------------------------ */
/* Jobs, sync health and the audit trail                               */
/* ------------------------------------------------------------------ */

adminRoutes.get('/jobs', async (c) => {
  const job = await dailyJobStatus().catch(() => null);
  const runs = (await db
    .prepare('SELECT name, last_started_at, last_finished_at, last_ok, last_result FROM job_runs ORDER BY last_started_at DESC LIMIT 20')
    .all()) as unknown as Array<Record<string, unknown>>;
  return c.json({ job, runs });
});

adminRoutes.get('/audit', async (c) => {
  const rows = (await db
    .prepare('SELECT id, actor_email, action, entity, entity_id, before_json, after_json, at FROM admin_audit ORDER BY at DESC LIMIT 200')
    .all()) as unknown as Array<Record<string, unknown>>;
  return c.json({ count: rows.length, entries: rows });
});

