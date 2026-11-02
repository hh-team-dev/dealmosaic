/**
 * A PRICE CARRIES ITS ORIGIN WITH IT, OR IT IS A CLAIM.
 *
 * Every price on the site today is demonstration data. Inside the offer list that
 * is stated on each row — "ILLUSTRATIVE — FEED PENDING" — but the headline above
 * the list ("from ₹271.79") and the "from ₹1,299" on a browse card had no origin
 * attached at all, because the number was computed by `MIN(item_price_minor)` and a
 * minimum has no provenance.
 *
 * That is the exact shape of an accidental lie: the careful label sits one level
 * below the number people actually read.
 *
 * `combineOrigins` answers, for a set of offers behind one headline, what that
 * headline is allowed to say. It is deliberately conservative — one live offer does
 * not make a mixed set live.
 */

export type PriceOrigin = 'live' | 'demo' | 'mixed';

export interface OriginLabel {
  /** The machine-readable state, or null when there is no price at all. */
  origin: PriceOrigin | null;
  /** Short chip text. Empty string when there is nothing to disclose. */
  chip: string;
  /** One clause to place beside the number, or '' when the price is genuinely live. */
  caveat: string;
}

export function combineOrigins(origins: Array<string | null | undefined>): PriceOrigin | null {
  const known = origins.filter((o): o is string => typeof o === 'string' && o.length > 0);
  if (known.length === 0) return null;
  const live = known.filter((o) => o === 'live').length;
  if (live === known.length) return 'live';
  if (live === 0) return 'demo';
  return 'mixed';
}

export function describeOrigin(origin: PriceOrigin | null): OriginLabel {
  switch (origin) {
    case 'live':
      // The only case that gets to stay quiet: a live feed needs no asterisk.
      return { origin: 'live', chip: '', caveat: '' };
    case 'mixed':
      return {
        origin: 'mixed',
        chip: 'Mixed sources',
        caveat: 'Some of these prices come from a live feed and some are illustrative — each offer below says which.',
      };
    case 'demo':
      return {
        origin: 'demo',
        chip: 'Illustrative',
        caveat:
          'Illustrative price, not a live quote — no authorised retailer feed covers this item yet. Use it to compare shape, not to budget.',
      };
    default:
      return { origin: null, chip: '', caveat: '' };
  }
}

/** Convenience for the common case: label straight from a list of raw origins. */
export function labelFor(origins: Array<string | null | undefined>): OriginLabel {
  return describeOrigin(combineOrigins(origins));
}
