/**
 * Location endpoints.
 *
 * Deliberately small. A location system that guesses is worse than one that
 * admits ignorance, so these endpoints answer exactly two questions:
 *
 *   1. "Is this a real Indian pincode, and roughly where is it?" — checkable fact.
 *   2. "Will <platform> deliver here, and when?" — answered ONLY from data we
 *      actually hold. Where we hold none, the answer is `unknown` with a reason,
 *      and the UI is expected to say so rather than show a delivery promise.
 */
import { Hono } from 'hono';
import { etaBand, ETA_BAND_LABELS, parsePincode } from '@dealmosaic/core';
import { db } from '../db/index.js';
import { loadSession, type AppBindings } from '../middleware/session.js';
import { badRequest } from '../lib/http.js';

export const locationRoutes = new Hono<AppBindings>();

locationRoutes.use('*', loadSession);

/** Look up a pincode. Cheap, cached by the browser, no auth required. */
locationRoutes.get('/pincode/:code', (c) => {
  const parsed = parsePincode(c.req.param('code'));
  if (!parsed.valid || !parsed.info) {
    throw badRequest(parsed.error ?? 'Enter a valid 6-digit pincode.');
  }
  c.header('Cache-Control', 'public, max-age=86400');
  return c.json({ location: parsed.info });
});

/**
 * Everything the UI needs once a pincode is known: where it is, which platforms
 * claim a delivery style, and — explicitly — what we cannot confirm.
 */
locationRoutes.get('/summary', async (c) => {
  const raw = c.req.query('pincode');
  if (!raw) throw badRequest('Add ?pincode= to see local information.');

  const parsed = parsePincode(raw);
  if (!parsed.valid || !parsed.info) {
    throw badRequest(parsed.error ?? 'Enter a valid 6-digit pincode.');
  }
  const pincode = parsed.info.pincode;

  // Platforms that publish a delivery promise. The promise is generic — it is
  // not per-pincode, and it is labelled as such.
  const platforms = await db
    .prepare(
      `SELECT slug, name, kind, status, delivery_promise
         FROM platforms
        WHERE kind IN ('quick_commerce','grocery','marketplace')
        ORDER BY sort_order`,
    )
    .all();

  const deliveryStyles = platforms.map((p) => {
    const days = parseDeliveryPromise(String(p.delivery_promise ?? ''));
    const band = etaBand(days);
    return {
      slug: String(p.slug),
      name: String(p.name),
      kind: String(p.kind),
      status: String(p.status),
      publishedPromise: (p.delivery_promise as string | null) ?? null,
      band,
      bandLabel: ETA_BAND_LABELS[band],
      /**
       * Whether this platform serves THIS pincode. Almost always 'unknown':
       * the answer lives in the platform's own app and changes by dark store.
       */
      serviceability: 'unknown' as const,
      serviceabilityNote:
        'Which PINs a store serves is decided by the platform and changes as dark stores open and close. We do not claim it on their behalf.',
    };
  });

  // Prices other shoppers reported at this exact PIN — the only genuinely
  // location-specific data we hold, and it is labelled as reported.
  const reported = await db
    .prepare(
      `SELECT platform_slug, COUNT(*) AS reports, MAX(reported_at) AS latest,
              MIN(price_minor) AS lowest_minor
         FROM community_prices
        WHERE pincode = ? AND trust_state != 'rejected'
        GROUP BY platform_slug`,
    )
    .all(pincode);

  return c.json({
    location: parsed.info,
    deliveryStyles,
    communityReports: reported.map((r) => ({
      platformSlug: String(r.platform_slug),
      reports: Number(r.reports),
      latestAt: String(r.latest),
      lowestMinor: r.lowest_minor === null ? null : Number(r.lowest_minor),
    })),
    /** Stated plainly, in the payload, so no client can quietly overstate it. */
    disclaimer:
      'Delivery times are each platform’s published promise, not an estimate for your pincode. Serviceability per PIN is only confirmable in the platform’s own app.',
  });
});

/** "10–20 min", "1–2 days", "Slotted" → a number of days (upper bound). */
export function parseDeliveryPromise(text: string): number | null {
  const t = text.toLowerCase();
  if (!t) return null;
  if (t.includes('min')) {
    const nums = t.match(/\d+/g);
    if (!nums) return null;
    const maxMinutes = Math.max(...nums.map(Number));
    return maxMinutes / (60 * 24);
  }
  if (t.includes('day')) {
    const nums = t.match(/\d+/g);
    if (!nums) return null;
    return Math.max(...nums.map(Number));
  }
  return null;
}
