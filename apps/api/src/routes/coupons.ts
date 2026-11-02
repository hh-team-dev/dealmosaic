import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { createRateLimiter } from '../lib/rate-limit.js';

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

interface CouponRow {
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
}

function toApi(r: CouponRow) {
  return {
    id: r.id,
    platformSlug: r.platform_slug,
    platformName: r.platform_name ?? r.platform_slug,
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
  };
}

/**
 * GET /api/coupons?platform=&category=
 *
 * Public and cacheable — coupons are a discovery surface like product pages, so
 * a crawler and a signed-out visitor see the same thing.
 */
couponRoutes.get('/', async (c) => {
  const platform = c.req.query('platform');
  const category = c.req.query('category');
  const limit = Math.min(Number(c.req.query('limit') ?? 40), 100);
  const now = nowIso();

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
        ORDER BY
          CASE c.trust_state WHEN 'moderator_verified' THEN 0 ELSE 1 END,
          c.success_count DESC, c.created_at DESC
        LIMIT ?`,
    )
    .all(
      now, now,
      platform ?? null, platform ?? null,
      category ?? null, category ?? null,
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
