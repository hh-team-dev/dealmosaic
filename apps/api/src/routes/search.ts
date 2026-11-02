import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { runComparison } from '../services/search.js';
import { createRateLimiter } from '../lib/rate-limit.js';

/**
 * Anonymous search limiter.
 *
 * Search is public: the whole promise of the site is "type a product, see the
 * three best deals", and a signup wall in front of that means a visitor cannot
 * evaluate the product without committing, and a crawler cannot index a single
 * comparison. What was private was the *history* and the *alerts*, and those
 * still require an account.
 *
 * The limiter is per-IP and deliberately generous — a human comparing prices
 * fires a handful of requests, while a scraper does not. It keys on IP only, so
 * it costs nothing and needs no shared store at launch scale.
 */
const anonSearchLimiter = createRateLimiter({ name: 'anon-search', windowMs: 60_000, max: 30 });

export const searchRoutes = new Hono<AppBindings>();

const searchBody = z.object({
  query: z.string().trim().min(1, 'Enter something to search for').max(160),
  /** Optional explicit variant choice from the disambiguation step. */
  variantId: z.string().uuid().optional(),
});

/**
 * POST /api/search
 *
 * Public. Anyone can compare, signed in or not — a signup wall in front of the
 * one thing the site exists to do means nobody can evaluate it, and nothing can
 * be indexed. What still requires an account is anything that remembers you:
 * saved comparisons, history and price alerts.
 */
searchRoutes.post('/', async (c) => {
  // Signed-in users get history recorded; everyone else gets the same results.
  const user = c.get('user');

  if (!user) {
    await anonSearchLimiter(c, async () => {});
  }

  const parsed = searchBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json(
      { error: { code: 'invalid_request', message: parsed.error.issues[0]?.message ?? 'Invalid search' } },
      400,
    );
  }

  const { query, variantId } = parsed.data;

  // Explicit variant choice short-circuits disambiguation.
  if (variantId) {
    const variant = await (db
      .prepare(
        `SELECT v.*, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery
           FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id
          WHERE v.id = ?`,
      )
      .get(variantId)) as Record<string, unknown> | undefined;

    if (!variant) {
      return c.json({ error: { code: 'variant_not_found', message: 'That variant does not exist.' } }, 404);
    }

    const siblings = await (db
      .prepare(
        `SELECT v.*, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery
           FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id
          WHERE v.product_id = ?`,
      )
      .all(String(variant.product_id))) as never[];

    const { buildComparison } = await import('../services/search.js');
    const payload = await buildComparison(query, variant as never, siblings);
    if (user) {
      await recordHistory(user.id, query, payload.kind === 'comparison' ? payload.variant.id : null);
    }
    return c.json(payload);
  }

  const outcome = await runComparison(query);
  if (user) {
    await recordHistory(user.id, query, outcome.kind === 'comparison' ? outcome.variant.id : null);
  }
  return c.json(outcome);
});

async function recordHistory(userId: string, query: string, variantId: string | null): Promise<void> {
  await db.prepare(
    'INSERT INTO user_search_history (id, user_id, query, variant_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(newId(), userId, query, variantId, nowIso());
}
