import { Hono } from 'hono';
import { db } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { fetchCampaigns, isConfigured } from '../lib/cuelinks.js';
import { createRateLimiter } from '../lib/rate-limit.js';

/** Mounted ONLY behind adminRoutes' server-side user + role checks. Read-only:
 * never joins a campaign, changes an offer, creates a link or generates a click. */
export const adminCampaignRoutes = new Hono<AppBindings>();
const liveLimiter = createRateLimiter({ name: 'campaign-read', windowMs: 60_000, max: 4, keyFn: () => 'publisher' });
const pageNumber = (s?: string) => /^\d{1,5}$/.test(s ?? '') ? Math.max(1, Math.min(10000, Number(s))) : 1;
const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

async function metrics(ids: number[]) {
  if (!ids.length) return new Map<number, { liveOffers: number; heldOffers: number; clicks30: number }>();
  const marks = ids.map(() => '?').join(',');
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const rows = await db.prepare(`SELECT c.campaign_id AS id,
    SUM(CASE WHEN c.trust_state IN ('listed','community_verified','moderator_verified')
      AND (c.expires_at IS NULL OR c.expires_at > ?) AND (c.starts_at IS NULL OR c.starts_at <= ?)
      AND c.tracking_url LIKE 'https://%' THEN 1 ELSE 0 END) AS liveOffers,
    SUM(CASE WHEN c.trust_state = 'rejected' THEN 1 ELSE 0 END) AS heldOffers,
    COALESCE((SELECT COUNT(*) FROM outbound_clicks x JOIN coupons cx ON cx.id = x.coupon_id
      WHERE cx.campaign_id = c.campaign_id AND x.created_at >= ?), 0) AS clicks30
    FROM coupons c WHERE c.campaign_id IN (${marks}) GROUP BY c.campaign_id`).all(now, now, since, ...ids) as Array<{ id: number; liveOffers: number; heldOffers: number; clicks30: number }>;
  return new Map(rows.map(r => [r.id, r]));
}

adminCampaignRoutes.get('/', async c => {
  c.header('Cache-Control', 'private, no-store');
  const page = pageNumber(c.req.query('page'));
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const access = c.req.query('access') ?? '';
  const coverage = c.req.query('coverage') ?? '';
  const clauses = ['1=1']; const args: (string | number)[] = [];
  if (q) { clauses.push("(a.name LIKE ? ESCAPE '\\' OR a.domain LIKE ? ESCAPE '\\' OR CAST(a.id AS TEXT) = ?)"); args.push(`%${escapeLike(q)}%`, `%${escapeLike(q)}%`, q); }
  if (['open', 'pending', 'not_applied'].includes(access)) { clauses.push('a.access_status = ?'); args.push(access); }
  else if (access === 'other') clauses.push("COALESCE(a.access_status,'') NOT IN ('open','pending','not_applied')");
  const live = `EXISTS (SELECT 1 FROM coupons c WHERE c.campaign_id = a.id
    AND c.trust_state IN ('listed','community_verified','moderator_verified')
    AND (c.expires_at IS NULL OR c.expires_at > ?) AND (c.starts_at IS NULL OR c.starts_at <= ?)
    AND c.tracking_url LIKE 'https://%')`;
  if (coverage === 'with' || coverage === 'without') {
    clauses.push(coverage === 'with' ? live : `NOT ${live}`);
    const now = new Date().toISOString(); args.push(now, now);
  }
  const where = clauses.join(' AND ');
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM affiliate_campaigns a WHERE ${where}`).get(...args) as { n: number };
  const rows = await db.prepare(`SELECT * FROM affiliate_campaigns a WHERE ${where} ORDER BY a.name COLLATE NOCASE, a.id LIMIT 50 OFFSET ?`).all(...args, (page - 1) * 50) as Array<Record<string, unknown>>;
  const stats = await metrics(rows.map(r => Number(r.id)));
  const summary = await db.prepare(`SELECT COUNT(*) AS total, MIN(synced_at) AS oldest, MAX(synced_at) AS newest,
    SUM(CASE WHEN access_status = 'open' THEN 1 ELSE 0 END) AS open,
    SUM(CASE WHEN access_status = 'pending' THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN access_status = 'not_applied' THEN 1 ELSE 0 END) AS notApplied FROM affiliate_campaigns`).get();
  return c.json({ source: 'cache', page, pageSize: 50, total: count.n, totalPages: Math.max(1, Math.ceil(count.n / 50)), summary,
    fetchedAt: new Date().toISOString(),
    rows: rows.map(r => ({ id: r.id, name: r.name, domain: r.domain, access: r.access_status, type: r.campaign_type,
      payout: r.payout, currency: r.payout_currency, payoutType: null, cookie: r.cookie_duration,
      deepLink: r.deeplink_allowed === null ? null : Boolean(r.deeplink_allowed),
      checkedAt: r.synced_at, ...stats.get(Number(r.id)),
      liveOffers: stats.get(Number(r.id))?.liveOffers ?? 0, heldOffers: stats.get(Number(r.id))?.heldOffers ?? 0,
      clicks30: stats.get(Number(r.id))?.clicks30 ?? 0 })),
  });
});

adminCampaignRoutes.get('/network', liveLimiter, async c => {
  c.header('Cache-Control', 'private, no-store');
  if (!isConfigured()) return c.json({ error: { code: 'network_unavailable', message: 'The campaign API is not configured. Cached inventory is still available.' } }, 503);
  const page = pageNumber(c.req.query('page'));
  try {
    // Omit campaign_type to see ALL network types, not only the cached CPS list.
    const result = await fetchCampaigns(page, 100, '');
    const rows = result.data.slice(0, 100);
    const stats = await metrics(rows.map(r => r.id));
    const stamp = new Date().toISOString();
    return c.json({ source: 'network', page: result.meta.page, pageSize: result.meta.per_page,
      total: result.meta.total, totalPages: Math.max(1, result.meta.total_pages), summary: null, fetchedAt: stamp,
      rows: rows.map(r => ({ id: r.id, name: r.name, domain: r.domain, access: r.access_status, type: r.campaign_type,
        payout: r.payout, currency: r.payout_currency, payoutType: r.payout_type, cookie: r.cookie_duration,
        deepLink: r.deeplink_allowed, checkedAt: stamp,
        liveOffers: stats.get(r.id)?.liveOffers ?? 0, heldOffers: stats.get(r.id)?.heldOffers ?? 0,
        clicks30: stats.get(r.id)?.clicks30 ?? 0 })),
    });
  } catch {
    // Do not return upstream response bodies, publisher details or credentials.
    return c.json({ error: { code: 'network_unavailable', message: 'The live campaign API could not be read. It may be busy or rate-limited. Wait a minute and retry, or use cached inventory; this does not mean there are zero campaigns.' } }, 503);
  }
});
