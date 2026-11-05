import { db, nowIso } from '../db/index.js';
import { toApi, type CouponRow, type CouponView } from '../routes/coupons.js';

/**
 * WHEN THE CATALOGUE HAS NOTHING, THE DEAL WALL MIGHT.
 *
 * Search compares products we can identify precisely. That is the promise, and
 * it is why the catalogue only holds 25 products: we would rather return nothing
 * than compare a 5 kg pack against a 10 kg one. But "nothing" is a terrible
 * answer on a site that holds 1,089 live retail offers. A shopper who types
 * "noise earbuds" deserves the actual Noise earbuds offer that a merchant
 * published this morning — as an *offer listing*, clearly not as a comparison.
 *
 * The distinction this file protects:
 *
 *   a comparison  = we matched a product identity and ranked landed totals
 *   an offer       = a merchant published this; we are repeating their words
 *
 * An offer listing never claims a total, never claims a winner, and never hides
 * that it is the retailer's own copy. It carries the merchant's stated price and
 * percentage only when the merchant stated them.
 *
 * Matching is keyword AND over the words that carry meaning, so "noise earbuds"
 * cannot match a kurta that happens to mention a budget. Every token must appear.
 */

/** Words that would match half the wall, so they carry no matching signal. */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'at', 'be', 'best', 'buy', 'by', 'combo', 'deal', 'deals',
  'discount', 'flat', 'for', 'from', 'get', 'in', 'india', 'is', 'it', 'latest', 'new',
  'of', 'offer', 'offers', 'on', 'only', 'online', 'or', 'pack', 'sale', 'save', 'the',
  'to', 'up', 'with', 'you', 'your', 'rs', 'inr', 'off', 'price', 'prices', 'code',
  'coupon', 'coupons', 'store', 'shop',
]);

/**
 * Turns a shopper's phrase into the tokens we will require. Anything shorter than
 * three characters is dropped — "5g" would match a thousand unrelated rows, and
 * false matches are worse than an honest empty answer.
 */
export function searchTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
    /* Four tokens is already a very specific query; more only adds AND terms
       that push the result set to empty. */
    .slice(0, 4);
}

export interface OfferMatch extends CouponView {
  daysLeft: number | null;
}

/**
 * Live offers whose own copy mentions every meaningful word of the query.
 *
 * Ordering is usefulness, never commission: something with a code first, then
 * the strongest percentage the merchant printed, then the one expiring soonest.
 * Nothing is padded to reach a number — an empty array is a valid answer.
 */
export async function findOfferMatches(query: string, limit = 8): Promise<OfferMatch[]> {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return [];

  const now = nowIso();
  const where = tokens.map(() => '(LOWER(c.title) LIKE ? OR LOWER(COALESCE(c.description, \'\')) LIKE ? OR LOWER(COALESCE(c.campaign_name, \'\')) LIKE ?)').join(' AND ');
  // Parameter order follows the SQL text exactly: the expiry check comes first.
  const params: unknown[] = [now];
  for (const t of tokens) {
    const like = `%${t}%`;
    params.push(like, like, like);
  }
  params.push(limit);

  const rows = (await db
    .prepare(
      `SELECT c.*, p.name AS platform_name, a.domain AS merchant_domain
         FROM coupons c
    LEFT JOIN platforms p ON p.slug = c.platform_slug
         LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id
        WHERE c.trust_state NOT IN ('expired', 'rejected')
          AND (c.expires_at IS NULL OR c.expires_at > ?)
          AND ${where}
        ORDER BY (c.code IS NULL), COALESCE(c.stated_percent, -1) DESC, COALESCE(c.expires_at, '9999') ASC
        LIMIT ?`,
    )
    .all(...(params as never[]))) as unknown as CouponRow[];

  const nowMs = Date.now();
  return rows.map((row) => {
    const view = toApi(row) as CouponView;
    const daysLeft = view.expiresAt
      ? Math.max(0, Math.ceil((new Date(view.expiresAt).getTime() - nowMs) / 86_400_000))
      : null;
    return { ...view, daysLeft };
  });
}
