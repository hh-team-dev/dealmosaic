import { Hono } from 'hono';
import { merchantHome } from '../lib/merchant-home.js';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { requireCsrf, requireVerifiedUser } from '../middleware/session.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import { clientIp } from '../lib/http.js';
import * as cuelinks from '../lib/cuelinks.js';
import { buildDiscovery } from '../services/discover.js';
import { syncAffiliateOffers } from '../services/affiliate-sync.js';
import { assessCoupon, nextTrustState } from '../services/coupon-confidence.js';
import { couponImageDataUrl } from '../lib/coupon-images.js';

type CouponImageRow = {
  category_slug: string;
  image_url: string;
  image_type: string;
  alt_text: string | null;
};

type SingleImageRow = {
  image_url: string;
  image_type: string;
  alt_text: string | null;
};

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
  merchant_domain?: string | null;
}

export function toApi(r: CouponRow) {
  /**
   * Two separate answers, computed once, server-side: how good the merchant's
   * number is, and how much evidence stands behind the row. The browser is never
   * asked to infer either — a client that has to guess will always guess upwards.
   */
  const assessment = assessCoupon({
    source: r.source,
    trustState: r.trust_state,
    successCount: r.success_count ?? 0,
    failCount: r.fail_count ?? 0,
    verifiedAt: r.verified_at,
    statedPercent: r.stated_percent ?? null,
    percentIsCap: (r.stated_percent_cap ?? 0) === 1,
    statedPriceMinor: r.stated_price_minor ?? null,
    discountType: r.discount_type,
    discountValue: r.discount_value,
  });

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
    /** Trimmed on read as well as on write — old rows predate the import fix. */
    code: r.code ? r.code.trim() || null : null,
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
    failCount: r.fail_count ?? 0,
    /** What we know, and how good the deal is — never one blended score. */
    confidence: assessment.confidence,
    quality: assessment.quality,
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
    merchantHomeUrl: merchantHome(r.merchant_domain, r.tracking_url),
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

  /**
   * ONE WHERE CLAUSE, TWO QUERIES.
   *
   * The list and its counters must answer the same question. They used to be
   * written separately: the rows were filtered, the counters were not, so
   * tapping "Klook" showed 289 "with a copyable code" next to a list of 22
   * Klook offers, and tapping "Codes only" left the count unchanged. That is a
   * small lie told in a large font, which is the worst kind. The filter list and
   * its parameter order now live in exactly one place.
   */
  const filters: string[] = [];
  const filterParams: Array<string | number> = [];
  const addFilter = (sql: string, ...params: Array<string | number>) => {
    filters.push(sql);
    filterParams.push(...params);
  };

  addFilter("(c.expires_at IS NULL OR c.expires_at > ?)", now);
  addFilter("(c.starts_at IS NULL OR c.starts_at <= ?)", now);
  if (platform) addFilter('c.platform_slug = ?', platform);
  if (category) addFilter('(c.category_slug IS NULL OR c.category_slug = ?)', category);
  if (q) {
    addFilter('(c.title LIKE ? OR c.code LIKE ? OR c.platform_slug LIKE ?)', `%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (withCodeOnly) addFilter("(c.code IS NOT NULL AND c.code <> '')");
  if (group) addFilter('c.deal_group = ?', group);
  if (maxPriceMinor !== null) addFilter('(c.stated_price_minor IS NOT NULL AND c.stated_price_minor <= ?)', maxPriceMinor);
  if (expiringBefore) addFilter('(c.expires_at IS NOT NULL AND c.expires_at <= ?)', expiringBefore);
  if (bankOnly) addFilter('c.mentions_bank = 1');

  const whereSql = `c.trust_state IN ('listed','community_verified','moderator_verified')${filters.length ? ` AND ${filters.join(' AND ')}` : ''}`;

  const rows = (await db
    .prepare(
      `SELECT c.*, p.name AS platform_name, a.domain AS merchant_domain
         FROM coupons c
         LEFT JOIN platforms p ON p.slug = c.platform_slug
         LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id
        WHERE ${whereSql}
        ORDER BY ${orderBy}
        LIMIT ?`,
    )
    .all(...filterParams, limit)) as unknown as CouponRow[];

  /**
   * TWO CAMPAIGNS, ONE CODE.
   *
   * Merchants routinely ship the same coupon under two campaign names — live
   * example: AJIO's `ALLSTARSDIWAL…` appeared twice with the same 5% claim. Two
   * visually identical cards next to each other read as a bug to a shopper and
   * as padding to anyone who suspects we inflate the list. First row wins,
   * because the list is already ordered by usefulness.
   */
  const seenCode = new Set<string>();
  const deduped = rows.filter((r) => {
    if (!r.code) return true;
    const key = `${r.platform_slug}::${r.code.toUpperCase()}`;
    if (seenCode.has(key)) return false;
    seenCode.add(key);
    return true;
  });

  c.header('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
  /**
   * Totals over the WHOLE table, not over the page we are about to return.
   *
   * The deals page used to print `coupons.length` as "offers live now" while the
   * request was capped at 200, so a shopper was shown "200 offers live now" when
   * there were 1,089. A wrong number on the busiest page is worse than no number:
   * it is a statement of fact that happens to be false.
   */
  /**
   * Counters over the *filtered* set, not the whole table. `filtered` tells the
   * client whether to word them as "231 matching" or "231 live", so the same
   * number is never described two ways in two places on one screen.
   */
  const totals = (await db
    .prepare(
      `SELECT COUNT(*) AS live,
              SUM(CASE WHEN code IS NOT NULL AND code <> '' THEN 1 ELSE 0 END) AS with_code,
              COUNT(DISTINCT platform_slug) AS stores
         FROM coupons c
        WHERE ${whereSql}`,
    )
    .get(...filterParams)) as unknown as { live: number; with_code: number | null; stores: number | null };

  return c.json({
    totals: {
      live: totals?.live ?? 0,
      withCode: totals?.with_code ?? 0,
      stores: totals?.stores ?? 0,
      /** True when a filter is applied, so the UI can say "matching" not "live". */
      filtered: filters.length > 2,
    },
    coupons: deduped.map(toApi),
    count: deduped.length,
    /** Stated in the API so the interface cannot drift from the policy. */
    rules: {
      cashbackIsNotADiscount: 'Cashback is returned as its own line and never subtracted from the payable total.',
      onlyCheckedCoupons: 'Store-listed claims are separated from checkout reports. Only supported redemption evidence is labelled as checked.',
    },
    emptyMessage:
      deduped.length === 0
        ? 'No current offer matches these filters. Store-listed claims are not checkout verification; check other offers or clear the filters.'
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
      `SELECT c.*, p.name AS platform_name, a.domain AS merchant_domain
         FROM coupons c
         LEFT JOIN platforms p ON p.slug = c.platform_slug
         LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id
        WHERE c.trust_state IN ('listed','community_verified','moderator_verified')
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
 * This is the only signal that cannot be faked by wishful thinking, so it is the
 * only thing allowed to promote a code — and it is worth being strict about what
 * "cannot be faked" means. The endpoint used to accept an anonymous POST and
 * increment a counter, which made the counter a number anyone could raise with a
 * loop and the interface printed it as evidence.
 *
 * Now: signed in, email verified, CSRF header present, and **one row per account
 * per coupon**. Reporting again replaces your earlier answer, so the counts are
 * people, not clicks. A hundred accounts is a hundred reports and that is still a
 * hundred people saying something, which is the truth of the situation.
 */
const outcomeLimiter = createRateLimiter({
  name: 'coupon-outcome',
  windowMs: 60 * 60_000,
  max: 30,
  // Keyed by account: the limit is about one person, and is the same on every
  // network they might arrive from.
  keyFn: (c) => c.get('user')?.id ?? clientIp(c),
});
const outcomeBody = z.object({ worked: z.boolean() });

couponRoutes.post('/:id/outcome', requireVerifiedUser, requireCsrf, outcomeLimiter, async (c) => {
  const user = c.get('user')!;

  const id = c.req.param('id');
  const parsed = outcomeBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: { code: 'invalid_request', message: 'Say whether the code worked.' } }, 400);
  }

  const exists = (await db.prepare('SELECT id FROM coupons WHERE id = ?').get(id)) as { id: string } | undefined;
  if (!exists) return c.json({ error: { code: 'not_found', message: 'No such coupon.' } }, 404);

  await db
    .prepare(
      `INSERT INTO coupon_reports (id, coupon_id, user_id, worked, reported_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(coupon_id, user_id) DO UPDATE SET worked = excluded.worked, reported_at = excluded.reported_at`,
    )
    .run(newId(), id, user.id, parsed.data.worked ? 1 : 0, nowIso());

  // Counts are derived from the reports table, never incremented. A counter that
  // can drift from its evidence is a counter nobody can audit.
  const tally = (await db
    .prepare(
      `SELECT SUM(CASE WHEN worked = 1 THEN 1 ELSE 0 END) AS worked,
              SUM(CASE WHEN worked = 0 THEN 1 ELSE 0 END) AS failed
         FROM coupon_reports WHERE coupon_id = ?`,
    )
    .get(id)) as { worked: number | null; failed: number | null } | undefined;
  const worked = Number(tally?.worked ?? 0);
  const failed = Number(tally?.failed ?? 0);

  const current = (await db.prepare('SELECT trust_state FROM coupons WHERE id = ?').get(id)) as
    | { trust_state: string }
    | undefined;
  const next = nextTrustState(current?.trust_state ?? 'listed', worked, failed);

  /*
   * The row's counters are a cache of the reports table, written only here, from
   * the tally immediately above. The list endpoint sorts on success_count and the
   * card prints the counts, so they have to agree with the evidence — and the only
   * way to keep them agreeing is never to increment them by hand.
   */
  await db
    .prepare('UPDATE coupons SET success_count = ?, fail_count = ? WHERE id = ?')
    .run(worked, failed, id);

  if (next) {
    await db
      .prepare('UPDATE coupons SET trust_state = ?, verified_at = ? WHERE id = ?')
      .run(next, next === 'community_verified' ? nowIso() : null, id);
  }

  return c.json({
    ok: true,
    successCount: worked,
    failCount: failed,
    trustState: next ?? current?.trust_state ?? 'listed',
    /** What the shopper is told, in the API's words so the page cannot paraphrase it up. */
    message:
      'Thanks — that is on the record. A code needs three shoppers agreeing before we call it confirmed.',
  });
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
        WHERE c.trust_state IN ('listed','community_verified','moderator_verified')
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

/**
 * GET /api/coupons/images
 * List all categories that have a default image in the bank, plus the image URL.
 * Public and cacheable — used by the frontend to decorate coupon cards.
 */
couponRoutes.get('/images', async (c) => {
  const result = await db
    .prepare(
      `SELECT category_slug, image_url, image_type, alt_text
         FROM coupon_images
        WHERE is_default = 1
        ORDER BY category_slug ASC`
    )
    .all();
  const rows = result as unknown as CouponImageRow[];

  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
  return c.json({
    images: rows.map((r) => ({
      categorySlug: r.category_slug,
      imageUrl: r.image_url,
      imageType: r.image_type,
      altText: r.alt_text ?? `Image for ${r.category_slug} deals`,
    })),
    count: rows.length,
  });
});

/**
 * GET /api/coupons/image/:categorySlug
 * Get the default image for a single category. Falls back to a generated SVG
 * if no bank image exists for that category.
 */
couponRoutes.get('/image/:categorySlug', async (c) => {
  const categorySlug = c.req.param('categorySlug');

  const result = await db
    .prepare(
      `SELECT image_url, image_type, alt_text
         FROM coupon_images
        WHERE category_slug = ? AND is_default = 1
        LIMIT 1`
    )
    .get(categorySlug);
  const row = result as unknown as SingleImageRow | undefined;

  const imageUrl = row?.image_url ?? couponImageDataUrl(categorySlug);
  const imageType = row?.image_type ?? 'svg';
  const altText = row?.alt_text ?? `Image for ${categorySlug} deals`;

  c.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=7200');
  return c.json({
    categorySlug,
    imageUrl,
    imageType,
    altText,
  });
});
