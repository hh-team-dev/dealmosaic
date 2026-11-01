import { Hono } from 'hono';
import { z } from 'zod';
import { db, newId, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { runComparison } from '../services/search.js';

export const searchRoutes = new Hono<AppBindings>();

const searchBody = z.object({
  query: z.string().trim().min(1, 'Enter something to search for').max(160),
  /** Optional explicit variant choice from the disambiguation step. */
  variantId: z.string().uuid().optional(),
});

/**
 * POST /api/search
 *
 * Auth-gated and email-verification-gated (the 401 → 403 → 501 ladder from
 * Phase 1 is replaced by real results here). Launching as a public
 * search-engine-first site, the marketing pages are public but live comparison
 * stays behind a verified account, exactly as specified.
 */
searchRoutes.post('/', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json(
      { error: { code: 'unauthorized', message: 'Sign in to compare prices. Accounts are free, and search results are never public.' } },
      401,
    );
  }
  if (!user.email_verified_at) {
    return c.json(
      { error: { code: 'email_unverified', message: 'Confirm your email address to unlock comparison.' } },
      403,
    );
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
    const variant = db
      .prepare(
        `SELECT v.*, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery
           FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id
          WHERE v.id = ?`,
      )
      .get(variantId) as Record<string, unknown> | undefined;

    if (!variant) {
      return c.json({ error: { code: 'variant_not_found', message: 'That variant does not exist.' } }, 404);
    }

    const siblings = db
      .prepare(
        `SELECT v.*, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery
           FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id
          WHERE v.product_id = ?`,
      )
      .all(String(variant.product_id)) as never[];

    const { buildComparison } = await import('../services/search.js');
    const payload = buildComparison(query, variant as never, siblings);
    recordHistory(user.id, query, payload.kind === 'comparison' ? payload.variant.id : null);
    return c.json(payload);
  }

  const outcome = runComparison(query);
  recordHistory(user.id, query, outcome.kind === 'comparison' ? outcome.variant.id : null);
  return c.json(outcome);
});

function recordHistory(userId: string, query: string, variantId: string | null): void {
  db.prepare(
    'INSERT INTO user_search_history (id, user_id, query, variant_id, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(newId(), userId, query, variantId, nowIso());
}
