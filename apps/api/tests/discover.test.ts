import { describe, expect, it } from 'vitest';
import { buildDiscovery } from '../src/services/discover.js';
import type { CouponView } from '../src/routes/coupons.js';

/**
 * The discovery wall is where a price-comparison site is most tempted to lie, so
 * these tests are written as *prohibitions*: what the builder must refuse to do.
 *
 * A fixture offer is deliberately ugly — cashback with no price, an offer with no
 * expiry, one that expired yesterday — because the failures that matter happen on
 * days when the feed is thin, not on days when it is rich.
 */

const NOW = new Date('2026-11-03T09:00:00.000Z');

function offer(over: Partial<CouponView> & { id: string }): CouponView {
  const base: CouponView = {
    id: over.id,
    platformSlug: `store-${over.id}`,
    platformName: `Store ${over.id}`,
    code: null,
    title: `Offer ${over.id}`,
    description: null,
    discountType: 'percent',
    discountValue: 10,
    maxDiscountMinor: null,
    minOrderMinor: null,
    categorySlug: null,
    terms: null,
    source: 'affiliate',
    trustState: 'moderator_verified',
    successCount: 0,
    failCount: 0,
    expiresAt: '2026-11-30T23:59:59.000Z',
    verifiedAt: null,
    reducesPayablePrice: true,
    campaignName: `Store ${over.id}`,
    categories: null,
    dealGroup: 'other',
    offerType: 'deal',
    statedPriceMinor: null,
    statedPriceKind: null,
    statedPercent: null,
    percentIsCap: false,
    mentionsBankOrUpi: false,
    outboundUrl: `https://example.com/${over.id}`,
    startsAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  return { ...base, ...over };
}

const ids = (items: Array<{ id: string }>): string[] => items.map((i) => i.id);
const section = (result: ReturnType<typeof buildDiscovery>, id: string) =>
  result.sections.find((s) => s.id === id);

describe('price shelves', () => {
  it('never puts an offer in a bucket its stated price does not fit', () => {
    const result = buildDiscovery(
      [
        offer({ id: 'a', statedPriceMinor: 19_900, statedPriceKind: 'from', dealGroup: 'beauty' }),
        offer({ id: 'b', statedPriceMinor: 19_900, statedPriceKind: 'from', dealGroup: 'beauty' }),
        offer({ id: 'c', statedPriceMinor: 39_900, statedPriceKind: 'at', dealGroup: 'beauty' }),
        // ₹1,299 — must not appear under ₹199 or ₹499.
        offer({ id: 'big', statedPriceMinor: 129_900, statedPriceKind: 'at', dealGroup: 'fashion' }),
        offer({ id: 'd', statedPriceMinor: 19_900, statedPriceKind: 'only', dealGroup: 'beauty' }),
      ],
      NOW,
    );
    const under199 = section(result, 'under-199');
    expect(under199).toBeDefined();
    expect(ids(under199!.items)).not.toContain('big');
    expect(ids(under199!.items).every((id) => id !== 'big')).toBe(true);
  });

  it('excludes offers with no stated price from every price shelf', () => {
    const result = buildDiscovery(
      [1, 2, 3, 4].map((n) => offer({ id: `n${n}`, statedPriceMinor: null, dealGroup: 'beauty' })),
      NOW,
    );
    expect(result.sections.filter((s) => s.id.startsWith('under-'))).toHaveLength(0);
    expect(result.totals.withStatedPrice).toBe(0);
  });

  it('drops a shelf rather than padding it', () => {
    // Two offers under ₹99 is below the shelf's floor of three.
    const result = buildDiscovery(
      [
        offer({ id: 'p1', statedPriceMinor: 4_900 }),
        offer({ id: 'p2', statedPriceMinor: 9_900 }),
        ...Array.from({ length: 8 }, (_, i) => offer({ id: `x${i}`, statedPercent: 30 })),
      ],
      NOW,
    );
    expect(section(result, 'under-99')).toBeUndefined();
    expect(result.withheld.some((w) => w.id === 'under-99')).toBe(true);
  });
});

describe('savings shelf', () => {
  it('ranks by the store’s own percentage and keeps the ceiling flag', () => {
    const result = buildDiscovery(
      [
        offer({ id: 'low', statedPercent: 20 }),
        offer({ id: 'high', statedPercent: 70, percentIsCap: true }),
        offer({ id: 'mid', statedPercent: 45 }),
        offer({ id: 'none', statedPercent: null }),
        offer({ id: 'tiny', statedPercent: 5 }),
        // The shelf floor is four; three qualifying offers would (correctly)
        // hide the shelf entirely, which is asserted separately below.
        offer({ id: 'also', statedPercent: 25 }),
      ],
      NOW,
    );
    const biggest = section(result, 'biggest');
    expect(biggest).toBeDefined();
    // Strictly by the store's published percentage, descending.
    expect(ids(biggest!.items)).toEqual(['high', 'mid', 'also', 'low']);
    expect(biggest!.items[0].percentIsCap).toBe(true);
    // Under 20% is not a "biggest saving" and must not be shown as one.
    expect(ids(biggest!.items)).not.toContain('tiny');
  });
});

describe('shelf floors', () => {
  it('hides the savings shelf when fewer than four offers clear 20%', () => {
    const result = buildDiscovery(
      [
        offer({ id: 'a', statedPercent: 60 }),
        offer({ id: 'b', statedPercent: 50 }),
        offer({ id: 'c', statedPercent: 40 }),
        offer({ id: 'd', statedPercent: 3 }),
      ],
      NOW,
    );
    expect(section(result, 'biggest')).toBeUndefined();
    expect(result.withheld.some((w) => w.id === 'biggest')).toBe(true);
  });
});

describe('expiry shelf', () => {
  it('only includes offers with a real date inside seven days', () => {
    const result = buildDiscovery(
      [
        offer({ id: 'today', expiresAt: '2026-11-03T20:00:00.000Z' }),
        offer({ id: 'soon', expiresAt: '2026-11-06T20:00:00.000Z' }),
        offer({ id: 'later', expiresAt: '2026-12-06T20:00:00.000Z' }),
        offer({ id: 'noexp', expiresAt: null }),
        offer({ id: 'friday', expiresAt: '2026-11-07T20:00:00.000Z' }),
      ],
      NOW,
    );
    const ending = section(result, 'ending');
    expect(ending).toBeDefined();
    expect(ids(ending!.items)).toEqual(['today', 'soon', 'friday']);
    expect(ending!.items[0].daysLeft).toBe(1);
  });

  it('does not invent urgency when no offer has an expiry', () => {
    const result = buildDiscovery(
      [1, 2, 3, 4].map((n) => offer({ id: `e${n}`, expiresAt: null })),
      NOW,
    );
    expect(section(result, 'ending')).toBeUndefined();
    expect(result.totals.endingThisWeek).toBe(0);
  });
});

describe('bank shelf', () => {
  it('only includes offers flagged from their own copy', () => {
    const result = buildDiscovery(
      [
        offer({ id: 'b1', mentionsBankOrUpi: true }),
        offer({ id: 'b2', mentionsBankOrUpi: true }),
        offer({ id: 'b3', mentionsBankOrUpi: true }),
        offer({ id: 'plain1' }),
        offer({ id: 'plain2' }),
      ],
      NOW,
    );
    const bank = section(result, 'bank');
    expect(bank).toBeDefined();
    expect(ids(bank!.items).sort()).toEqual(['b1', 'b2', 'b3']);
  });
});

describe('editorial de-duplication', () => {
  it('does not show the same deal twice across editorial shelves', () => {
    const pool = Array.from({ length: 12 }, (_, i) =>
      offer({
        id: `d${i}`,
        statedPercent: 60,
        code: 'SAVE10',
        expiresAt: '2026-11-05T20:00:00.000Z',
      }),
    );
    const result = buildDiscovery(pool, NOW);
    const editorial = ['today', 'biggest', 'bank', 'new', 'ending']
      .map((id) => section(result, id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .flatMap((s) => ids(s.items));
    expect(new Set(editorial).size).toBe(editorial.length);
  });
});

describe('totals', () => {
  it('counts only what it can defend', () => {
    const result = buildDiscovery(
      [
        offer({ id: '1', code: 'ABC' }),
        offer({ id: '2', code: null }),
        offer({ id: '3', statedPriceMinor: 49_900 }),
        offer({ id: '4', expiresAt: '2026-11-04T20:00:00.000Z' }),
      ],
      NOW,
    );
    expect(result.totals).toEqual({
      live: 4,
      withCode: 1,
      withStatedPrice: 1,
      endingThisWeek: 1,
      bankOrUpi: 0,
    });
  });
});
