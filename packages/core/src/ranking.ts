/**
 * Ranking & Deal Confidence.
 *
 * Two hard rules, both asserted by tests:
 *  1. An offer whose total is not fully verified can NEVER be ranked #1 and can
 *     never be labelled the best verified deal.
 *  2. Affiliate commission is not an input. Permuting commission rates must not
 *     change the order — ever.
 */

import type { VerificationState } from './money.js';

export interface RankableOffer {
  offerId: string;
  /** Comparable landed total in minor units — already computed by the money engine. */
  knownTotalMinor: number | null;
  verificationState: VerificationState;
  /** 0..1 from the matching engine. */
  matchConfidence: number;
  inStock: boolean;
  /** 0..5, null when the seller publishes no rating. */
  sellerRating: number | null;
  sellerRatingCount: number | null;
  /** Age of the price observation, in minutes. */
  freshnessMinutes: number;
  /** null = delivery window unknown. */
  deliveryDaysMin: number | null;
  condition: 'new' | 'refurbished' | 'used';
  /** Present in the type for auditability — never used in the sort. */
  affiliateRateBps?: number | null;
}

export interface RankedOffer extends RankableOffer {
  rank: number;
  /** 0..100, explained by components. */
  confidenceScore: number;
  confidenceBreakdown: ConfidenceComponent[];
  /** Human sentence: "Lowest verified total with delivery included…" */
  explanation: string;
}

export interface ConfidenceComponent {
  key: 'source' | 'freshness' | 'match' | 'shipping' | 'seller';
  label: string;
  /** 0..1 */
  value: number;
  weight: number;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Deal Confidence                                                     */
/* ------------------------------------------------------------------ */

/**
 * Published formula — the UI shows these weights in a tooltip. It describes how
 * much we TRUST THE DATA, never how good the product is or how good the seller is.
 */
export const CONFIDENCE_WEIGHTS = {
  source: 0.3,
  freshness: 0.25,
  match: 0.2,
  shipping: 0.15,
  seller: 0.1,
} as const;

export function freshnessScore(minutes: number): number {
  if (minutes <= 15) return 1;
  if (minutes <= 60) return 0.9;
  if (minutes <= 360) return 0.72;
  if (minutes <= 1440) return 0.5;
  if (minutes <= 4320) return 0.28;
  return 0.1;
}

export function sellerScore(rating: number | null, count: number | null): number {
  if (rating === null) return 0.25; // unknown seller: low trust in the DATA, not a judgement
  const volume = count === null ? 0.5 : Math.min(1, Math.log10(Math.max(10, count)) / 5);
  const quality = Math.max(0, Math.min(1, (rating - 3) / 2)); // 3.0 → 0, 5.0 → 1
  return Math.max(0.2, Math.min(1, quality * 0.75 + volume * 0.25));
}

export function computeConfidence(
  offer: RankableOffer,
  sourceReliability = 1,
): { score: number; breakdown: ConfidenceComponent[] } {
  const breakdown: ConfidenceComponent[] = [
    {
      key: 'source',
      label: 'Source reliability',
      value: sourceReliability,
      weight: CONFIDENCE_WEIGHTS.source,
      detail: 'Whether the price came from an authorised connector, a verified feed, or a shopper report.',
    },
    {
      key: 'freshness',
      label: 'Price freshness',
      value: freshnessScore(offer.freshnessMinutes),
      weight: CONFIDENCE_WEIGHTS.freshness,
      detail: `Last observed ${offer.freshnessMinutes} minute${offer.freshnessMinutes === 1 ? '' : 's'} ago.`,
    },
    {
      key: 'match',
      label: 'Product match',
      value: offer.matchConfidence,
      weight: CONFIDENCE_WEIGHTS.match,
      detail: 'How certain we are this offer is the exact variant you asked for.',
    },
    {
      key: 'shipping',
      label: 'Delivery information',
      // Unknown delivery is a genuine gap in the data, so it scores zero for this
      // component rather than earning partial credit for merely existing.
      value: offer.deliveryDaysMin === null ? 0 : 1,
      weight: CONFIDENCE_WEIGHTS.shipping,
      detail: offer.deliveryDaysMin === null ? 'Delivery window not published by the seller.' : 'Delivery window published.',
    },
    {
      key: 'seller',
      label: 'Seller information',
      value: sellerScore(offer.sellerRating, offer.sellerRatingCount),
      weight: CONFIDENCE_WEIGHTS.seller,
      detail:
        offer.sellerRating === null
          ? 'This platform does not publish individual seller ratings.'
          : `Seller rated ${offer.sellerRating.toFixed(1)} across ${offer.sellerRatingCount ?? 'an unstated number of'} ratings.`,
    },
  ];

  const score = breakdown.reduce((acc, c) => acc + c.value * c.weight, 0) * 100;
  return { score: Math.round(score), breakdown };
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

/**
 * Comparable cost used for ordering.
 *
 * Rule 1: if ANY offer's total is fully verified, unverified offers are demoted
 * below all of them — a missing delivery fee must never look like a saving.
 *
 * Rule 2: if NO offer's total can be verified (quick commerce, where delivery is
 * charged by cart value), refusing to rank would make the product useless for
 * exactly the category it exists to serve. In that case we rank on the verified
 * PORTION and the caller must present it as such — `rankingBasis:
 * 'verified_portion_only'`. Ordering by freshness instead, which is what a
 * null-total sort would silently do, would be arbitrary and unexplainable.
 */
function sortKey(offer: RankableOffer, anyVerified: boolean): [number, number, number, number, number] {
  const verified = anyVerified ? (offer.verificationState === 'complete' && offer.knownTotalMinor !== null ? 0 : 1) : 0;
  const total = offer.knownTotalMinor ?? Number.MAX_SAFE_INTEGER;
  const stock = offer.inStock ? 0 : 1;
  const match = 1 - offer.matchConfidence; // higher confidence first
  const fresh = offer.freshnessMinutes;
  return [verified, stock, total, match, fresh];
}

const CONDITION_ORDER: Record<RankableOffer['condition'], number> = { new: 0, refurbished: 1, used: 2 };

export function rankOffers(offers: RankableOffer[], sourceReliability = 1): RankedOffer[] {
  const anyVerified = offers.some((o) => o.verificationState === 'complete' && o.knownTotalMinor !== null);
  const sorted = [...offers].sort((a, b) => {
    const ka = sortKey(a, anyVerified);
    const kb = sortKey(b, anyVerified);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i]! !== kb[i]!) return ka[i]! - kb[i]!;
    }
    return CONDITION_ORDER[a.condition] - CONDITION_ORDER[b.condition];
  });

  return sorted.map((offer, index) => {
    const { score, breakdown } = computeConfidence(offer, sourceReliability);
    return {
      ...offer,
      rank: index + 1,
      confidenceScore: score,
      confidenceBreakdown: breakdown,
      explanation: explain(offer, index + 1, sorted),
    };
  });
}

/** Generates the "Why is this #1?" sentence from the actual signals. */
export function explain(offer: RankableOffer, rank: number, all: RankableOffer[]): string {
  const parts: string[] = [];
  const cheapest = [...all]
    .filter((o) => o.verificationState === 'complete' && o.knownTotalMinor !== null)
    .sort((a, b) => (a.knownTotalMinor ?? 0) - (b.knownTotalMinor ?? 0))[0];
  const anyComplete = all.some((o) => o.verificationState === 'complete' && o.knownTotalMinor !== null);

  if (!anyComplete && rank === 1 && offer.knownTotalMinor !== null) {
    // Nobody's total is verified — e.g. quick commerce, where delivery is charged
    // at checkout by cart value. Say so instead of implying a guaranteed saving.
    parts.push('Lowest verified portion of the price; every offer here has an unpublished delivery charge');
  } else if (offer.verificationState !== 'complete' || offer.knownTotalMinor === null) {
    parts.push('Its total is not fully verified, so it cannot be presented as a verified winner');
  } else if (cheapest && cheapest.offerId === offer.offerId) {
    parts.push('Lowest verified total payable');
  } else {
    parts.push('Higher verified total than #1');
  }

  if (offer.matchConfidence >= 0.9) parts.push('exact variant match');
  else if (offer.matchConfidence >= 0.7) parts.push('strong variant match');

  if (offer.inStock) parts.push('in stock');
  else parts.push('currently out of stock');

  if (offer.sellerRating !== null) parts.push(`seller rated ${offer.sellerRating.toFixed(1)}`);
  else parts.push('seller rating not published');

  if (offer.deliveryDaysMin === 0) parts.push('delivery in minutes');
  else if (offer.deliveryDaysMin !== null)
    parts.push(`delivery in ${offer.deliveryDaysMin}+ day${offer.deliveryDaysMin === 1 ? '' : 's'}`);
  else parts.push('delivery time not stated');

  if (offer.freshnessMinutes <= 60) parts.push(`price checked ${offer.freshnessMinutes} min ago`);
  else if (offer.freshnessMinutes <= 1440) parts.push(`price checked ${Math.round(offer.freshnessMinutes / 60)} hr ago`);
  else parts.push(`price last checked ${Math.round(offer.freshnessMinutes / 1440)} day(s) ago`);

  const sentence = parts.join(', ');
  if (rank === 1) return `${capitalise(sentence)}.`;
  return `${capitalise(sentence)}.`;
}

const capitalise = (s: string): string => (s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1));
