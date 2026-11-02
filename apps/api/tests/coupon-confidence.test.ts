import { describe, expect, it } from 'vitest';
import { assessConfidence, assessQuality, nextTrustState, type CouponEvidence } from '../src/services/coupon-confidence.js';

/**
 * TWO ANSWERS, NOT ONE SCORE.
 *
 * Every coupon site blends "how good is this deal" with "does this code work" into
 * a single badge, and the badge always resolves upwards. These tests keep the two
 * apart, and keep the label on the evidence rather than on optimism.
 */

function evidence(overrides: Partial<CouponEvidence> = {}): CouponEvidence {
  return {
    source: 'affiliate',
    trustState: 'listed',
    successCount: 0,
    failCount: 0,
    verifiedAt: null,
    statedPercent: null,
    percentIsCap: false,
    statedPriceMinor: null,
    discountType: 'percent',
    discountValue: 20,
    ...overrides,
  };
}

describe('confidence — what we actually know', () => {
  it('says plainly that an untouched feed row is not verified', () => {
    const c = assessConfidence(evidence());
    expect(c.level).toBe('unreported');
    expect(c.label).toBe('Not yet reported');
    // The sentence must not imply the code works.
    expect(c.detail).toContain('do not know that it does');
    expect(c.detail.toLowerCase()).not.toContain('verified');
  });

  it('never calls anything verified without a report or a person', () => {
    for (const trustState of ['listed', 'community_verified', 'expired', 'rejected']) {
      const c = assessConfidence(evidence({ trustState }));
      expect(c.label).not.toMatch(/verified/i);
    }
    expect(assessConfidence(evidence({ trustState: 'moderator_verified' })).label).toBe('Checked by us');
  });

  it('refuses to compute a success rate from one or two reports', () => {
    const one = assessConfidence(evidence({ successCount: 1 }));
    expect(one.level).toBe('thin');
    expect(one.workedPct).toBe(100);
    expect(one.label).not.toContain('%');
    expect(one.detail).toContain('Too few reports');

    const two = assessConfidence(evidence({ successCount: 2 }));
    expect(two.level).toBe('thin');
    expect(two.detail).toContain('Too few reports');
  });

  it('promotes to community only at three reports and a clear majority', () => {
    const good = assessConfidence(evidence({ successCount: 3, failCount: 0, trustState: 'community_verified' }));
    expect(good.level).toBe('community');
    expect(good.detail).toContain('3 shoppers reported it working');

    // 3 of 5 is 60%: below the threshold, so still not confirmed.
    const tipped = assessConfidence(evidence({ successCount: 3, failCount: 2 }));
    expect(tipped.level).toBe('thin');

    const failing = assessConfidence(evidence({ successCount: 2, failCount: 3 }));
    expect(failing.level).toBe('thin');
    expect(failing.label).toBe('Often fails');
  });

  it('describes a mixed record without hiding the failures', () => {
    const c = assessConfidence(evidence({ successCount: 3, failCount: 3 }));
    expect(c.detail).toContain('3 worked, 3 did not');
  });

  it('reports the counts rather than a percentage while the sample is small', () => {
    const c = assessConfidence(evidence({ successCount: 1, failCount: 1 }));
    expect(c.detail).toContain('1 worked, 1 did not');
    expect(c.detail).not.toContain('50%');
  });
});

describe('quality — how big the merchant’s number is', () => {
  it('attributes the percentage to the store, never to us', () => {
    const q = assessQuality(evidence({ statedPercent: 60 }));
    expect(q.level).toBe('strong');
    expect(q.detail).toContain('store’s own published figure');
  });

  it('treats “up to” as a ceiling, not a saving', () => {
    const capped = assessQuality(evidence({ statedPercent: 60, percentIsCap: true }));
    expect(capped.label).toContain('up to');
    expect(capped.level).toBe('solid'); // a ceiling is never scored as strong
    expect(capped.detail).toContain('may be smaller');
  });

  it('keeps cashback off the discount scale entirely', () => {
    const q = assessQuality(evidence({ discountType: 'cashback', discountValue: 500, statedPercent: 40 }));
    expect(q.level).toBe('unknown');
    expect(q.detail).toContain('not taken off the bill');
  });

  it('says so when the store published no figure', () => {
    const q = assessQuality(evidence());
    expect(q.level).toBe('unknown');
    expect(q.detail).toContain('will not invent one');
  });

  it('does not call a stated price a good price', () => {
    const q = assessQuality(evidence({ statedPriceMinor: 19900 }));
    expect(q.label).toContain('199');
    expect(q.detail).toContain('have not compared');
  });
});

describe('promotion — what a report does to a code', () => {
  it('needs three agreeers before confirming', () => {
    expect(nextTrustState('listed', 1, 0)).toBeNull();
    expect(nextTrustState('listed', 2, 0)).toBeNull();
    expect(nextTrustState('listed', 3, 0)).toBe('community_verified');
  });

  it('retires a code that mostly fails', () => {
    expect(nextTrustState('listed', 0, 5)).toBe('expired');
    expect(nextTrustState('community_verified', 1, 6)).toBe('expired');
  });

  it('never overrules a person', () => {
    // A moderator's decision is not a majority vote.
    expect(nextTrustState('moderator_verified', 0, 9)).toBeNull();
    expect(nextTrustState('rejected', 9, 0)).toBeNull();
  });

  it('does not retire on a small, evenly split sample', () => {
    expect(nextTrustState('listed', 2, 3)).toBeNull();
  });
});
