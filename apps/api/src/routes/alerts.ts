import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import { createRateLimiter } from '../lib/rate-limit.js';
import { badRequest } from '../lib/http.js';
import { requireCsrf, requireUser, requireVerifiedUser, type AppBindings } from '../middleware/session.js';
import { bestOfferForVariant, runAlerts } from '../services/alerts.js';

/**
 * PRICE ALERTS — the user-facing half.
 *
 * Two audiences share this file:
 *
 *   • the shopper setting, listing and cancelling targets (auth required);
 *   • the scheduler that evaluates them (`POST /run`, guarded by SYNC_TOKEN).
 *
 * The scheduler endpoint is deliberately in the same module as the user routes:
 * the rule it enforces is a product rule — *no price drop, no email* — and it
 * should be impossible to change one without seeing the other.
 */
export const alertRoutes = new Hono<AppBindings>();

const setLimiter = createRateLimiter({ name: 'alert-set', windowMs: 60 * 60_000, max: 20 });

const createBody = z.object({
  variantId: z.string().min(8).max(64),
  /** Rupees, as typed. Converted to paise at the boundary. */
  targetPrice: z.number().positive().max(1_000_000),
});

/**
 * POST /api/alerts/run — evaluate every active alert.
 *
 * Guarded by SYNC_TOKEN like the affiliate sync, because it sends email. It is
 * idempotent in the only way that matters: a triggered alert is closed, so a
 * second run in the same hour sends nothing.
 */
alertRoutes.post('/run', async (c) => {
  const expected = process.env.SYNC_TOKEN;
  const given = c.req.header('x-sync-token');
  if (!expected || given !== expected) {
    return c.json({ error: { code: 'forbidden', message: 'This endpoint requires a valid token.' } }, 403);
  }
  const result = await runAlerts();
  return c.json({
    ok: true,
    checked: result.checked,
    skipped: result.skipped,
    triggered: result.triggered.map((t) => ({
      alertId: t.alertId,
      product: t.productTitle,
      bestMinor: t.bestMinor,
      targetMinor: t.targetMinor,
      platform: t.bestPlatform,
      emailSent: t.sent,
      ...(t.skippedReason ? { note: t.skippedReason } : {}),
    })),
  });
});

/* ------------------------------- user routes ------------------------------ */

alertRoutes.use('*', requireUser);

/** GET /api/alerts — my alerts, with the price today so the list is meaningful. */
alertRoutes.get('/', async (c) => {
  const user = c.get('user')!;
  const rows = (await db
    .prepare(
      `SELECT a.id, a.variant_ref, a.target_price_minor, a.status, a.created_at, a.updated_at,
              v.variant_label, p.title AS product_title, p.slug AS product_slug
         FROM price_alerts a
         LEFT JOIN product_variants v ON v.id = a.variant_ref
         LEFT JOIN catalogue_products p ON p.id = v.product_id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
        LIMIT 100`,
    )
    .all(user.id)) as unknown as Array<{
    id: string;
    variant_ref: string;
    target_price_minor: number;
    status: string;
    created_at: string;
    updated_at: string;
    variant_label: string | null;
    product_title: string | null;
    product_slug: string | null;
  }>;

  const alerts = await Promise.all(
    rows.map(async (r) => {
      const best = await bestOfferForVariant(r.variant_ref);
      return {
        id: r.id,
        variantId: r.variant_ref,
        productTitle: r.product_title,
        productSlug: r.product_slug,
        variantLabel: r.variant_label,
        targetPriceMinor: r.target_price_minor,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        bestPriceMinor: best?.priceMinor ?? null,
        bestPlatform: best?.platformSlug ?? null,
        /** Computed here so the interface cannot disagree with the engine. */
        isBelowTarget: best !== null && best.priceMinor < r.target_price_minor,
      };
    }),
  );

  return c.json({
    alerts,
    rules: {
      firesOn: 'The cheapest live offer for this exact variant, not an average or an index.',
      oneShot: 'An alert fires once, then closes. Set a new target to watch the price again.',
      delivery: 'Email only, and only when the price is genuinely below your target.',
    },
  });
});

/** POST /api/alerts — set a target price for one variant. */
alertRoutes.post('/', requireCsrf, requireVerifiedUser, async (c) => {
  await setLimiter(c, async () => {});
  const user = c.get('user')!;
  const parsed = createBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? 'Enter a target price.');
  }

  const variant = (await db
    .prepare('SELECT id, variant_label FROM product_variants WHERE id = ?')
    .get(parsed.data.variantId)) as { id: string; variant_label: string } | undefined;
  if (!variant) throw badRequest('That variant is not in our catalogue.');

  const best = await bestOfferForVariant(variant.id);
  if (!best) throw badRequest('Price alerts require a live store price for this exact variant. Browse current store offers instead.');
  const targetMinor = Math.round(parsed.data.targetPrice * 100);

  // One alert per variant per shopper: setting a second target for the same
  // variant replaces the first rather than sending two emails later.
  const existing = (await db
    .prepare('SELECT id FROM price_alerts WHERE user_id = ? AND variant_ref = ? AND status = ?')
    .get(user.id, variant.id, 'active')) as { id: string } | undefined;

  if (existing) {
    await db
      .prepare('UPDATE price_alerts SET target_price_minor = ?, updated_at = ? WHERE id = ?')
      .run(targetMinor, nowIso(), existing.id);
    return c.json({ ok: true, updated: true, id: existing.id, targetPriceMinor: targetMinor });
  }

  const id = newId();
  await db
    .prepare(
      `INSERT INTO price_alerts (id, user_id, variant_ref, target_price_minor, currency, country_code, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'INR', 'IN', 'active', ?, ?)`,
    )
    .run(id, user.id, variant.id, targetMinor, nowIso(), nowIso());

  return c.json(
    {
      ok: true,
      id,
      targetPriceMinor: targetMinor,
      bestPriceMinor: best?.priceMinor ?? null,
      message:
        best && best.priceMinor < targetMinor
          ? 'That price is already below your target — the next check will email you.'
          : 'Watching. We will email you only if the price actually falls below your target.',
    },
    201,
  );
});

/** DELETE /api/alerts/:id — cancel. */
alertRoutes.delete('/:id', requireCsrf, async (c) => {
  const user = c.get('user')!;
  const result = await db
    .prepare('DELETE FROM price_alerts WHERE id = ? AND user_id = ?')
    .run(c.req.param('id'), user.id);
  if (result.changes === 0) {
    return c.json({ error: { code: 'not_found', message: 'No such alert.' } }, 404);
  }
  return c.json({ ok: true });
});
