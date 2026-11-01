import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';

/**
 * Community Price — the honest answer to "we cannot legally read Blinkit's
 * price feed". A shopper reports what they actually saw at their pincode.
 * These reports are NEVER merged into a verified total and never ranked
 * alongside connector-observed offers.
 */
export const communityRoutes = new Hono<AppBindings>();

const reportBody = z.object({
  variantId: z.string().uuid(),
  platformSlug: z.string().min(2).max(40),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit Indian pincode'),
  price: z.number().positive().max(1_000_000),
  mrp: z.number().positive().max(1_000_000).optional(),
  deliveryFee: z.number().min(0).max(100_000).optional(),
  note: z.string().max(280).optional(),
});

communityRoutes.get('/:variantId', async (c) => {
  const variantId = c.req.param('variantId');
  const pincode = c.req.query('pincode');
  const rows = await (db
    .prepare(
      `SELECT c.id, c.platform_slug, c.pincode, c.price_minor, c.mrp_minor, c.delivery_fee_minor,
              c.reported_at, c.trust_state, c.corroboration_count, c.note, p.name AS platform_name
         FROM community_prices c
         LEFT JOIN platforms p ON p.slug = c.platform_slug
        WHERE c.variant_id = ? AND c.trust_state != 'rejected'
          AND (? IS NULL OR c.pincode = ?)
        ORDER BY c.reported_at DESC LIMIT 25`,
    )
    .all(variantId, pincode ?? null, pincode ?? null)) as Array<Record<string, unknown>>;

  return c.json({
    reports: rows.map((r) => ({
      id: r.id,
      platformSlug: r.platform_slug,
      platformName: r.platform_name ?? r.platform_slug,
      pincode: r.pincode,
      priceMinor: r.price_minor,
      mrpMinor: r.mrp_minor,
      deliveryFeeMinor: r.delivery_fee_minor,
      reportedAt: r.reported_at,
      trustState: r.trust_state,
      corroborationCount: r.corroboration_count,
      note: r.note,
    })),
    disclosure:
      'Shopper-reported prices. They are not retailer-verified, are specific to one pincode and moment, and are never used to rank the three verified offers.',
  });
});

communityRoutes.post('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: { code: 'unauthorized', message: 'Sign in to report a price.' } }, 401);

  const parsed = reportBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      { error: { code: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid report' } },
      400,
    );
  }
  const body = parsed.data;

  const variant = await db.prepare('SELECT id FROM product_variants WHERE id = ?').get(body.variantId);
  if (!variant) {
    return c.json({ error: { code: 'variant_not_found', message: 'Unknown product variant.' } }, 404);
  }

  // Corroboration: if another shopper already reported the same pincode+platform
  // within 2 hours and within 5%, mark it corroborated rather than duplicating.
  const recent = await db
    .prepare(
      `SELECT id, price_minor, corroboration_count FROM community_prices
        WHERE variant_id = ? AND platform_slug = ? AND pincode = ? AND trust_state != 'rejected'
          AND reported_at > ? ORDER BY reported_at DESC LIMIT 1`,
    )
    .get(body.variantId, body.platformSlug, body.pincode, new Date(Date.now() - 2 * 3600_000).toISOString()) as
    | { id: string; price_minor: number; corroboration_count: number }
    | undefined;

  const priceMinor = Math.round(body.price * 100);
  if (recent && Math.abs(recent.price_minor - priceMinor) / recent.price_minor <= 0.05) {
    await db.prepare(
      'UPDATE community_prices SET corroboration_count = corroboration_count + 1, trust_state = ? WHERE id = ?',
    ).run('corroborated', recent.id);
    return c.json({
      ok: true,
      corroborated: true,
      message: 'Your report matches another shopper at this pincode within 2 hours, so it is now shown as corroborated.',
    });
  }

  await db.prepare(
    `INSERT INTO community_prices (id, variant_id, platform_slug, pincode, price_minor, currency, mrp_minor,
      delivery_fee_minor, reported_by, reported_at, trust_state, corroboration_count, note)
     VALUES (?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, 'reported', 0, ?)`,
  ).run(
    newId(),
    body.variantId,
    body.platformSlug,
    body.pincode,
    priceMinor,
    body.mrp ? Math.round(body.mrp * 100) : null,
    body.deliveryFee !== undefined ? Math.round(body.deliveryFee * 100) : null,
    user.id,
    nowIso(),
    body.note ?? null,
  );

  return c.json({
    ok: true,
    corroborated: false,
    message: 'Reported. It is shown as a single shopper report until someone at the same pincode confirms it.',
  });
});
