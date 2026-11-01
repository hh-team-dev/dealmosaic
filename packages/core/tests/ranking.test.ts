import { describe, expect, it } from 'vitest';
import {
  CONFIDENCE_WEIGHTS,
  computeConfidence,
  freshnessScore,
  rankOffers,
  type RankableOffer,
} from '../src/ranking.js';

const base = (over: Partial<RankableOffer> = {}): RankableOffer => ({
  offerId: 'o1',
  knownTotalMinor: 12999900,
  verificationState: 'complete',
  matchConfidence: 1,
  inStock: true,
  sellerRating: 4.6,
  sellerRatingCount: 210000,
  freshnessMinutes: 12,
  deliveryDaysMin: 2,
  condition: 'new',
  affiliateRateBps: 200,
  ...over,
});

describe('ranking: verified total first', () => {
  it('ranks the lowest verified total first', () => {
    const ranked = rankOffers([
      base({ offerId: 'expensive', knownTotalMinor: 13499000 }),
      base({ offerId: 'cheap', knownTotalMinor: 12999900 }),
      base({ offerId: 'middle', knownTotalMinor: 13149000 }),
    ]);
    expect(ranked.map((r) => r.offerId)).toEqual(['cheap', 'middle', 'expensive']);
    expect(ranked[0]!.rank).toBe(1);
  });

  it('NEVER ranks an unverified total #1, even when it is cheaper', () => {
    const ranked = rankOffers([
      base({ offerId: 'unverified-cheap', knownTotalMinor: 100, verificationState: 'partial' }),
      base({ offerId: 'verified', knownTotalMinor: 12999900 }),
    ]);
    expect(ranked[0]!.offerId).toBe('verified');
    expect(ranked[1]!.offerId).toBe('unverified-cheap');
    expect(ranked[1]!.explanation).toContain('not fully verified');
  });

  it('ranks on the verified PORTION when no offer total can be verified at all', () => {
    // Quick commerce: every store charges delivery by cart value, so no total is
    // ever "complete". Ordering by freshness would be arbitrary, so we order by
    // the part each store does verify — and the caller labels it as such.
    const ranked = rankOffers([
      base({ offerId: 'dear', knownTotalMinor: 5168, verificationState: 'partial', freshnessMinutes: 5 }),
      base({ offerId: 'cheap', knownTotalMinor: 1955, verificationState: 'partial', freshnessMinutes: 300 }),
      base({ offerId: 'mid', knownTotalMinor: 3577, verificationState: 'partial', freshnessMinutes: 60 }),
    ]);
    expect(ranked.map((r) => r.offerId)).toEqual(['cheap', 'mid', 'dear']);
    expect(ranked[0]!.explanation).toContain('Lowest verified portion');
  });

  it('still demotes every unverified offer the moment one total IS verifiable', () => {
    const ranked = rankOffers([
      base({ offerId: 'partial-cheap', knownTotalMinor: 100, verificationState: 'partial' }),
      base({ offerId: 'partial-dear', knownTotalMinor: 200, verificationState: 'partial' }),
      base({ offerId: 'verified-dear', knownTotalMinor: 900000, verificationState: 'complete' }),
    ]);
    expect(ranked.map((r) => r.offerId)).toEqual(['verified-dear', 'partial-cheap', 'partial-dear']);
  });

  it('pushes an offer with no known total to the bottom', () => {
    const ranked = rankOffers([
      base({ offerId: 'unknown', knownTotalMinor: null, verificationState: 'unverified' }),
      base({ offerId: 'known', knownTotalMinor: 999999 }),
    ]);
    expect(ranked[0]!.offerId).toBe('known');
  });

  it('prefers an in-stock offer over an out-of-stock cheaper one', () => {
    const ranked = rankOffers([
      base({ offerId: 'oos', knownTotalMinor: 100, inStock: false }),
      base({ offerId: 'in', knownTotalMinor: 200, inStock: true }),
    ]);
    expect(ranked[0]!.offerId).toBe('in');
  });

  it('prefers the better variant match when totals are equal', () => {
    const ranked = rankOffers([
      base({ offerId: 'weak', knownTotalMinor: 500, matchConfidence: 0.72 }),
      base({ offerId: 'exact', knownTotalMinor: 500, matchConfidence: 1 }),
    ]);
    expect(ranked[0]!.offerId).toBe('exact');
  });

  it('is deterministic for identical inputs', () => {
    const offers = [base({ offerId: 'a' }), base({ offerId: 'b' }), base({ offerId: 'c' })];
    expect(rankOffers(offers).map((r) => r.offerId)).toEqual(rankOffers(offers).map((r) => r.offerId));
  });
});

describe('ranking: commission-blind (the promise, as a test)', () => {
  it('produces an identical order when affiliate rates are permuted', () => {
    const offers = [
      base({ offerId: 'no-commission', knownTotalMinor: 12999900, affiliateRateBps: 0 }),
      base({ offerId: 'huge-commission', knownTotalMinor: 13149000, affiliateRateBps: 1200 }),
      base({ offerId: 'small-commission', knownTotalMinor: 13000000, affiliateRateBps: 50 }),
    ];
    const original = rankOffers(offers).map((r) => r.offerId);

    const perms = [
      offers.map((o) => ({ ...o, affiliateRateBps: 9999 })),
      offers.map((o) => ({ ...o, affiliateRateBps: 0 })),
      [...offers].reverse().map((o, i) => ({ ...o, affiliateRateBps: [0, 5000, 1][i]! })),
    ];
    for (const perm of perms) {
      expect(rankOffers(perm).map((r) => r.offerId)).toEqual(original);
    }
  });
});

describe('Deal Confidence', () => {
  it('weights sum to 1 and are published', () => {
    const sum = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('decays with staleness', () => {
    expect(freshnessScore(5)).toBe(1);
    expect(freshnessScore(120)).toBeLessThan(freshnessScore(20));
    expect(freshnessScore(10000)).toBeLessThan(freshnessScore(1440));
  });

  it('scores a fresh, fully-sourced offer highly', () => {
    const { score, breakdown } = computeConfidence(base());
    expect(score).toBeGreaterThan(80);
    expect(breakdown).toHaveLength(5);
    expect(breakdown.find((b) => b.key === 'match')!.value).toBe(1);
  });

  it('penalises unknown delivery and unknown seller without pretending it is a quality verdict', () => {
    const { score, breakdown } = computeConfidence(
      base({ deliveryDaysMin: null, sellerRating: null, sellerRatingCount: null }),
    );
    expect(score).toBeLessThan(80);
    const shipping = breakdown.find((b) => b.key === 'shipping')!;
    expect(shipping.value).toBeLessThan(0.3);
    expect(shipping.detail).toContain('not published');
    const seller = breakdown.find((b) => b.key === 'seller')!;
    expect(seller.detail).toContain('does not publish');
  });

  it('drops confidence for a stale observation', () => {
    const fresh = computeConfidence(base({ freshnessMinutes: 10 })).score;
    const stale = computeConfidence(base({ freshnessMinutes: 5000 })).score;
    expect(stale).toBeLessThan(fresh - 10);
  });
});

describe('explanations', () => {
  it('explains the winner using real signals, not marketing', () => {
    const ranked = rankOffers([
      base({ offerId: 'a', knownTotalMinor: 100 }),
      base({ offerId: 'b', knownTotalMinor: 200 }),
    ]);
    const top = ranked[0]!.explanation;
    expect(top).toContain('Lowest verified total');
    expect(top).toContain('exact variant match');
    expect(top).toContain('price checked 12 min ago');
  });

  it('states out-of-stock and missing-seller facts plainly', () => {
    const ranked = rankOffers([
      base({ offerId: 'a', knownTotalMinor: 100 }),
      base({ offerId: 'b', knownTotalMinor: 200, inStock: false, sellerRating: null, deliveryDaysMin: null }),
    ]);
    const second = ranked[1]!.explanation;
    expect(second).toContain('out of stock');
    expect(second).toContain('seller rating not published');
    expect(second).toContain('delivery time not stated');
  });
});
