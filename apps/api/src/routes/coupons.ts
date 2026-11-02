import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import * as cuelinks from '../lib/cuelinks.js';
import { buildDiscovery } from '../services/discover.js';
import { syncAffiliateOffers } from '../services/affiliate-sync.js';

/**
 * COUPONS AND DISCOUNTS.
 *
 * The rule this module is built around: **a discount is a claim, and a claim is
 * worthless until it is checked.** So every coupon carries
 *  - `source`      — who said so (community, merchant, affiliate, moderator)
 *  - `trust_state` — how far it has been checked
 *  - `success_count` / `fail_count` — what actually happened at checkout
 *
 * Anything expired or rejected is never returned. Nothing is seeded: an empty
 * table and an honest "we have no verified codes for this store" beats invented
 * codes that fail at checkout and cost the user their trust on first use.
 *
 * CASHBACK IS NOT A DISCOUNT. It arrives days later, it can be refused, and it
 * does not reduce what you pay at the till. It is modelled as its own
 * `discount_type` so the interface can never add it into a payable total.
 */
export const couponRoutes = new Hono<AppBindings>();

const submitLimiter = createRateLimiter({ name: 'coupon-submit', windowMs: 60 * 60_000, max: 5 });

const submitBody = z.object({
  platformSlug: z.string().min(2).max(40),
  code: z.string().trim().min(2).max(40).optional(),
  title: z.string().trim().min(4).max(120),
  description: z.string().trim().max(400).optional(),
  discountType: z.enum(['percent', 'flat', 'cashback', 'free_delivery']),
  /** Percent (1-100) for `percent`; rupees for everything else. */
  discountValue: z.number().positive().max(100_000),
  minOrder: z.number().min(0).max(1_000_000).optional(),
  maxDiscount: z.number().positive().max(1_000_000).optional(),
  categorySlug: z.string().max(60).optional(),
  terms: z.string().max(400).optional(),
  expiresAt: z.string().datetime().optional(),
});

export interface CouponRow {
  id: string;
  platform_slug: string;
  code: string | null;
  title: string;
  description: string | null;
  discount_type: 'percent' | 'flat' | 'cashback' | 'free_delivery';
  discount_value: number;
  max_discount_minor: number | null;
  min_order_minor: number | null;
  category_slug: string | null;
  terms: string | null;
  source: string;
  trust_state: string;
  success_count: number;
  fail_count: number;
  expires_at: string | null;
  verified_at: string | null;
  platform_name?: string | null;
  /* Discovery fields (added when the homepage needed real shelves to fill). */
  campaign_name?: string | null;
  categories?: string | null;
  primary_category?: string | null;
  deal_group?: string | null;
  offer_type?: string | null;
  stated_price_minor?: number | null;
  stated_price_kind?: string | null;
  stated_percent?: number | null;
  stated_percent_cap?: number | null;
  mentions_bank?: number | null;
  starts_at?: string | null;
  created_at?: string | null;
  tracking_url?: string | null;
}

export function toApi(r: CouponRow) {
  return {
    id: r.id,
    platformSlug: r.platform_slug,
    /**
     * The store's own name, in order of trust: the joined platform record, then
     * the campaign name the merchant supplies ("Tata Cliq"), then the slug we
     * derived from it ("tata-cliq") title-cased. Without this the interface
     * printed raw slugs at shoppers.
     */
    platformName:
      r.platform_name ??
      r.campaign_name ??
      r.platform_slug.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
    code: r.code,
    title: r.title,
    description: r.description,
    discountType: r.discount_type,
    discountValue: r.discount_value,
    maxDiscountMinor: r.max_discount_minor,
    minOrderMinor: r.min_order_minor,
    categorySlug: r.category_slug,
    terms: r.terms,
    source: r.source,
    trustState: r.trust_state,
    successCount: r.success_count,
    failCount: r.fail_count,
    expiresAt: r.expires_at,
    verifiedAt: r.verified_at,
    /** Cashback must never be added into a payable total. */
    reducesPayablePrice: r.discount_type !== 'cashback',
    /* ---- discovery ---- */
    campaignName: r.campaign_name ?? r.platform_name ?? r.platform_slug,
    categories: r.categories ?? null,
    dealGroup: r.deal_group ?? 'other',
    offerType: r.offer_type === 'coupon' ? 'coupon' : 'deal',
    /**
     * The price the headline states, in paise, plus how it was qualified.
     * `null` means "the retailer did not state a price in the copy" — never
     * "free", and never zero.
     */
    statedPriceMinor: r.stated_price_minor ?? null,
    statedPriceKind: r.stated_price_kind ?? null,
    /**
     * The percentage the retailer printed. `percentIsCap` is true when the copy
     * said "up to", so the interface must say "up to" as well.
     */
    statedPercent: r.stated_percent ?? null,
    percentIsCap: (r.stated_percent_cap ?? 0) === 1,
    mentionsBankOrUpi: (r.mentions_bank ?? 0) === 1,
    /** Outbound link. Present only for affiliate-sourced rows. */
    outboundUrl: r.tracking_url ?? null,
    startsAt: r.starts_at ?? null,
    createdAt: r.created_at ?? null,
  };
}

/** The public shape of a coupon, derived from the mapper so it cannot drift. */
export type CouponView = ReturnType<typeof toApi>;

/**
 * GET /api/coupons?platform=&category=
 *
 * Public and cacheable — coupons are a discovery surface like product pages, so
 * a crawler and a signed-out visitor see the same thing.
 */
couponRoutes.get('/', async (c) => {
  const platform = c.req.query('platform');
  const category = c.req.query('category');
  const q = c.req.query('q')?.trim();
  const withCodeOnly = c.req.query('codes') === '1';
  const limit = Math.min(Number(c.req.query('limit') ?? 40), 200);
  const now = nowIso();

  /**
   * Shelf filters. These exist because the homepage's sections link into this
   * endpoint: "Deals under ₹499" must land on exactly the offers that made the
   * count on the homepage, not an approximation of them.
   */
  const group = c.req.query('group')?.trim() || null;
  const maxPriceRupees = Number(c.req.query('maxPrice') ?? '');
  const maxPriceMinor = Number.isFinite(maxPriceRupees) && maxPriceRupees > 0 ? Math.round(maxPriceRupees * 100) : null;
  const expiringDays = Number(c.req.query('expiring') ?? '');
  const expiringBefore =
    Number.isFinite(expiringDays) && expiringDays > 0
      ? new Date(Date.now() + expiringDays * 86_400_000).toISOString()
      : null;
  const bankOnly = c.req.query('bank') === '1';
  const sort = c.req.query('sort') ?? '';
  const orderBy =
    sort === 'savings'
      ? 'c.stated_percent DESC, c.stated_price_minor ASC, c.expires_at ASC'
      : sort === 'price'
        ? 'c.stated_price_minor ASC, c.expires_at ASC'
        : sort === 'new'
          ? 'c.created_at DESC, c.expires_at ASC'
          : sort === 'ending'
            ? 'c.expires_at ASC'
            : `CASE WHEN c.code IS NOT NULL THEN 0 ELSE 1 END,
               c.success_count DESC,
               CASE WHEN c.expires_at IS NULL THEN 1 ELSE 0 END,
               c.expires_at ASC,
               c.created_at DESC`;

  const rows = (await db
    .prepare(
      `SELECT c.*, p.name AS platform_name
         FROM coupons c
         LEFT JOIN platforms p ON p.slug = c.platform_slug
        WHERE c.trust_state IN ('community_verified','moderator_verified')
          AND (c.expires_at IS NULL OR c.expires_at > ?)
          AND (c.starts_at IS NULL OR c.starts_at <= ?)
          AND (? IS NULL OR c.platform_slug = ?)
          AND (? IS NULL OR c.category_slug IS NULL OR c.category_slug = ?)
          AND (? IS NULL OR c.title LIKE ? OR c.code LIKE ? OR c.platform_slug LIKE ?)
          AND (? = 0 OR c.code IS NOT NULL)
          AND (? IS NULL OR c.deal_group = ?)
          AND (? IS NULL OR (c.stated_price_minor IS NOT NULL AND c.stated_price_minor <= ?))
          AND (? IS NULL OR (c.expires_at IS NOT NULL AND c.expires_at <= ?))
          AND (? = 0 OR c.mentions_bank = 1)
        ORDER BY ${orderBy}
        LIMIT ?`,
    )
    .all(
      now, now,
      platform ?? null, platform ?? null,
      category ?? null, category ?? null,
      q ?? null, q ? `%${q}%` : null, q ? `%${q}%` : null, q ? `%${q}%` : null,
      withCodeOnly ? 1 : 0,
      group, group,
      maxPriceMinor, maxPriceMinor,
      expiringBefore, expiringBefore,
      bankOnly ? 1 : 0,
      limit,
    )) as unknown as CouponRow[];

  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  return c.json({
    coupons: rows.map(toApi),
    count: rows.length,
    /** Stated in the API so the interface cannot drift from the policy. */
    rules: {
      cashbackIsNotADiscount: 'Cashback is returned as its own line and never subtracted from the payable total.',
      onlyCheckedCoupons: 'Coupons appear here only after a second independent report or a moderator check.',
    },
    emptyMessage:
      rows.length === 0
        ? 'No verified discount codes for this store yet. We do not list unverified codes, because a code that fails at checkout is worse than no code at all.'
        : null,
  });
});

/**
 * GET /api/coupons/discover — the homepage's shelves, computed from live rows.
 *
 * WHY THIS IS ONE ENDPOINT AND NOT NINE.
 * The homepage needs nine different cuts of the same feed. Nine round trips on a
 * mid-range Android phone on Indian mobile data is a visibly slower page, so the
 * cuts are computed here from a single query and returned together. The whole
 * payload is ~40 offers, which is smaller than one product photo on a typical
 * e-commerce homepage.
 *
 * THE RULE THAT SHAPES EVERY SECTION: **a shelf with nothing real behind it is
 * not rendered.** Each section carries `minItems` and the client drops anything
 * that does not clear it, so on a quiet day the homepage gets shorter instead of
 * getting fictional. Today only three offers are genuinely under ₹99 — so the
 * ₹99 shelf shows three, or shows nothing.
 *
 * Every number in the response is traceable to a sentence a merchant wrote:
 * `statedPriceMinor` and `statedPercent` come from the offer headline via
 * `@dealmosaic/core/offer-text`, and `percentIsCap` records whether the merchant
 * said "up to" so the interface cannot round a ceiling up into a promise.
 */
couponRoutes.get('/discover', async (c) => {
  const now = nowIso();
  const rows = (await db
    .prepare(
      `SELECT c.*, p.name AS platform_name
         FROM coupons c
         LEFT JOIN platforms p ON p.slug = c.platform_slug
        WHERE c.trust_state IN ('community_verified','moderator_verified')
          AND (c.expires_at IS NULL OR c.expires_at > ?)
          AND (c.starts_at IS NULL OR c.starts_at <= ?)
        ORDER BY c.created_at DESC
        LIMIT 2500`,
    )
    .all(now, now)) as unknown as CouponRow[];

  const result = buildDiscovery(rows.map(toApi));

  // A cacheable public response: the same shelves for a crawler and a shopper.
  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  return c.json({
    generatedAt: now,
    ...result,
    rules: {
      statedPrices: 'Price buckets only contain offers whose own headline states a price <= the bucket.',
      savings: 'Percentages are the store’s own published figures; "up to" is preserved as a ceiling.',
      expiry: 'Expiry is shown only where the store supplied a date.',
    },
  });
});

/**
 * POST /api/coupons — community submission.
 *
 * Anyone can report a code; nobody can publish one. A submission lands as
 * `reported` and stays invisible until a second person corroborates it or a
 * moderator verifies it. Open submission without a trust gate is how coupon
 * sites become lists of dead codes.
 */
couponRoutes.post('/', async (c) => {
  await submitLimiter(c, async () => {});

  const parsed = submitBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      { error: { code: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid coupon' } },
      400,
    );
  }
  const b = parsed.data;
  if (b.discountType === 'percent' && b.discountValue > 100) {
    return c.json({ error: { code: 'invalid_request', message: 'A percentage discount cannot exceed 100.' } }, 400);
  }

  const user = c.get('user');
  await db
    .prepare(
      `INSERT INTO coupons (id, platform_slug, code, title, description, discount_type, discount_value,
                            max_discount_minor, min_order_minor, category_slug, terms, source, trust_state,
                            reported_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'community', 'reported', ?, ?, ?)`,
    )
    .run(
      newId(),
      b.platformSlug,
      b.code ?? null,
      b.title,
      b.description ?? null,
      b.discountType,
      Math.round(b.discountValue),
      b.maxDiscount ? Math.round(b.maxDiscount * 100) : null,
      b.minOrder !== undefined ? Math.round(b.minOrder * 100) : null,
      b.categorySlug ?? null,
      b.terms ?? null,
      user?.id ?? null,
      b.expiresAt ?? null,
      nowIso(),
    );

  return c.json(
    {
      ok: true,
      message: 'Thanks — reported. It appears publicly once a second person confirms it or a moderator checks it.',
    },
    201,
  );
});

/**
 * POST /api/coupons/:id/outcome — did it work at checkout?
 *
 * This is the only signal that cannot be faked by wishful thinking, and it is
 * what eventually promotes or retires a code.
 */
const outcomeBody = z.object({ worked: z.boolean() });

couponRoutes.post('/:id/outcome', async (c) => {
  const id = c.req.param('id');
  const parsed = outcomeBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_request', message: 'Say whether the code worked.' } }, 400);
  }

  const col = parsed.data.worked ? 'success_count' : 'fail_count';
  const row = (await db
    .prepare(`UPDATE coupons SET ${col} = ${col} + 1 WHERE id = ? RETURNING success_count, fail_count`)
    .get(id)) as { success_count: number; fail_count: number } | undefined;

  if (!row) return c.json({ error: { code: 'not_found', message: 'No such coupon.' } }, 404);

  // Enough failures retire a code automatically: a coupon that mostly fails is
  // a coupon that wastes people's time.
  if (row.fail_count >= 5 && row.fail_count > row.success_count * 2) {
    await db.prepare("UPDATE coupons SET trust_state = 'expired' WHERE id = ?").run(id);
  }

  return c.json({ ok: true, successCount: row.success_count, failCount: row.fail_count });
});

/**
 * POST /api/coupons/sync — pull the affiliate offers feed into `coupons`.
 *
 * Guarded by SYNC_TOKEN rather than being open, because it mutates data. It is
 * idempotent: `external_id` is unique, so re-running updates rows in place
 * instead of duplicating them, and an offer that has disappeared from the feed is
 * marked expired rather than deleted — losing history would make it impossible to
 * tell a withdrawn offer from one that never existed.
 */
couponRoutes.post('/sync', async (c) => {
  const expected = process.env.SYNC_TOKEN;
  const given = c.req.header('x-sync-token');
  if (!expected || given !== expected) {
    return c.json({ error: { code: 'forbidden', message: 'Sync requires a valid token.' } }, 403);
  }
  if (!cuelinks.isConfigured()) {
    return c.json({ error: { code: 'not_configured', message: 'CUELINKS_API_KEY is not set.' } }, 503);
  }

  // The work lives in a service because the daily maintenance job runs it too.
  const result = await syncAffiliateOffers(Number(c.req.query('pages') ?? 5));
  return c.json(result);
});

/**
 * GET /api/coupons/merchants — the facet list for the deals page.
 *
 * Only merchants that actually have a live, usable offer appear. Showing a store
 * with nothing behind it is a dead end for the shopper and a thin page for a
 * crawler.
 */
couponRoutes.get('/merchants', async (c) => {
  const now = nowIso();
  const rows = (await db
    .prepare(
      `SELECT c.platform_slug,
              COUNT(*) AS total,
              SUM(CASE WHEN c.code IS NOT NULL THEN 1 ELSE 0 END) AS codes,
              MAX(c.platform_slug) AS slug
         FROM coupons c
        WHERE c.trust_state IN ('community_verified','moderator_verified')
          AND (c.expires_at IS NULL OR c.expires_at > ?)
        GROUP BY c.platform_slug
        ORDER BY codes DESC, total DESC
        LIMIT 80`,
    )
    .all(now)) as unknown as Array<{ platform_slug: string; total: number; codes: number }>;

  c.header('Cache-Control', 'public, max-age=600, stale-while-revalidate=3600');
  return c.json({
    merchants: rows.map((r) => ({
      slug: r.platform_slug,
      name: r.platform_slug
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      total: Number(r.total),
      codes: Number(r.codes),
    })),
  });
});
