import { Hono, type Context } from 'hono';
import { merchantHome } from '../lib/merchant-home.js';
import { db, newId, nowIso } from '../db/index.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import type { AppBindings } from '../middleware/session.js';

/** Outbound ATTEMPTS, not confirmed store arrivals or payable earnings.
 * Preserve the network-issued publisher link. A unique sub-id helps reconcile
 * attempts with network reports; it does not itself create an entitlement to
 * commission, nor is it required for every network's publisher attribution.
 * No server-side test clicks, tracking-host swaps or silent direct fallbacks. */

export const goRoutes = new Hono<AppBindings>();

const clickLimiter = createRateLimiter({ name: 'go', windowMs: 60_000, max: 120 });

type ClickRow = {
  id: string;
  platform_slug: string;
  code: string | null;
  tracking_url: string | null;
  trust_state: string;
  expires_at: string | null;
  starts_at: string | null;
};

/**
 * Append the sub-id to a tracking URL without breaking it.
 *
 * The network links arrive in three shapes — already carrying a query, carrying a
 * fragment, or bare — and a naive `?subid=` breaks the first two. The parameter
 * name is the network's, not ours: Cuelinks reads `subid` (with `subid2`…`subid5`
 * for extra dimensions), so that is what we send.
 */
export function withSubid(url: string, subid: string): string {
  const [beforeHash, hash = ''] = url.split('#', 2);
  const [base, query = ''] = (beforeHash ?? '').split('?', 2);
  const params = new URLSearchParams(query);
  params.set('subid', subid);
  const suffix = hash ? `#${hash}` : '';
  return `${base}?${params.toString()}${suffix}`;
}

/** One of three words. Enough to know if phones are the traffic, not enough to profile a person. */
function deviceOf(ua: string): 'phone' | 'tablet' | 'desktop' {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Android|iPhone|Mobile/i.test(ua)) return 'phone';
  return 'desktop';
}

function unavailable(c: Context<AppBindings>, id: string, code: string, message: string, status: 404 | 410) {
  c.header('Cache-Control', 'no-store');
  if (c.req.header('accept')?.includes('text/html')) {
    return c.redirect(`/store-link-help?offer=${encodeURIComponent(id)}`, 303);
  }
  return c.json({ error: code, message }, status);
}

function eligible(row: ClickRow): boolean {
  const now = Date.now();
  const end = row.expires_at ? Date.parse(row.expires_at) : null;
  const start = row.starts_at ? Date.parse(row.starts_at) : null;
  return ['listed', 'community_verified', 'moderator_verified'].includes(row.trust_state)
    && (end === null || (Number.isFinite(end) && end > now))
    && (start === null || (Number.isFinite(start) && start <= now));
}
function safeHost(url: string | null): string | null {
  try { const parsed = new URL(url ?? ''); return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.hostname : null; }
  catch { return null; }
}

// Read-only recovery metadata. Never calls the network and never logs a click.
// Held/unpublished offers expose neither their code nor their private destination.
goRoutes.get('/:couponId/details', async c => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  const row = await db.prepare(`SELECT c.id, c.platform_slug, c.code, c.tracking_url, c.trust_state, c.expires_at,
    c.starts_at, c.title, c.campaign_name, c.terms, a.domain AS merchant_domain FROM coupons c
    LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id WHERE c.id = ?`).get(c.req.param('couponId')) as (ClickRow & { title: string; campaign_name: string | null; terms: string | null; merchant_domain: string | null }) | undefined;
  if (!row || !eligible(row) || !safeHost(row.tracking_url)) return c.json({ available: false,
    reason: 'The offer is unavailable, outside its validity window, or has no safe store link.' });
  return c.json({ available: true, title: row.title, store: row.campaign_name || row.platform_slug,
    code: row.code, terms: row.terms, expiresAt: row.expires_at, linkHost: safeHost(row.tracking_url), merchantHomeUrl: merchantHome(row.merchant_domain, row.tracking_url) });
});

goRoutes.get('/:couponId', async (c) => {
  c.header('Cache-Control', 'no-store');
  c.header('X-Robots-Tag', 'noindex, nofollow');
  await clickLimiter(c, async () => {});

  const id = c.req.param('couponId');
  const row = (await db
    .prepare(
      `SELECT id, platform_slug, code, tracking_url, trust_state, expires_at, starts_at
         FROM coupons
        WHERE id = ?`,
    )
    .get(id)) as ClickRow | undefined;

  if (!row) return unavailable(c, id, 'not_found', 'That offer is no longer in the list.', 404);
  if (!eligible(row)) return unavailable(c, id, 'withdrawn', 'That offer is unavailable or outside its validity window.', 410);
  if (!row.tracking_url) return unavailable(c, id, 'no_link', 'No tracked link is on file for this offer.', 404);
  if (!safeHost(row.tracking_url)) return unavailable(c, id, 'invalid_link', 'That store link is unavailable. Please choose another offer.', 410);

  const clickId = newId();
  // Short, unique, and alphanumeric: some networks reject punctuation in sub-ids.
  const subid = `dm${Date.now().toString(36)}${clickId.replace(/-/g, '').slice(0, 8)}`;
  const destination = withSubid(row.tracking_url, subid);
  const session = c.get('session');
  const source = (c.req.query('src') ?? 'direct').slice(0, 24);

  /*
   * The click record must never stand between the shopper and the merchant: a
   * failed insert loses one row of analytics, while a failed redirect loses the
   * sale. So it is written first but awaited on a short leash, and a failure is
   * logged rather than thrown.
   */
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const write = db
      .prepare(
        `INSERT INTO outbound_clicks (id, coupon_id, platform_slug, user_id, subid, destination, source, device, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        clickId,
        row.id,
        row.platform_slug,
        session?.user_id ?? null,
        subid,
        destination,
        source,
        deviceOf(c.req.header('user-agent') ?? ''),
        nowIso(),
      );
    await Promise.race([write, new Promise<void>(resolve => { timer = setTimeout(resolve, 800); })]);
  } catch {
    console.error('outbound attempt record failed');
  } finally {
    if (timer) clearTimeout(timer);
  }

  c.header('cache-control', 'no-store');
  c.header('referrer-policy', 'no-referrer-when-downgrade');
  return c.redirect(destination, 302);
});
