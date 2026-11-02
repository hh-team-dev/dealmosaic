/**
 * HOW MUCH WE KNOW, SEPARATE FROM HOW GOOD THE DEAL IS.
 *
 * These two things are constantly conflated across the coupon web: a 70%-off
 * banner sits next to a code nobody has ever redeemed, and the banner implies the
 * code works. They are independent facts and they get independent answers here.
 *
 *   DEAL QUALITY  — how big the merchant's own number is. It is a claim by the
 *                   store, and we repeat it attributed, never as our finding.
 *   DATA CONFIDENCE — how much evidence stands behind the row: nobody has tried
 *                   it, one shopper has, four have, or a person on this team
 *                   opened it at checkout.
 *
 * Two rules, both from the product's standing constraints:
 *
 *  1. **Never call a coupon verified unless it was checked.** A feed row is
 *     `listed`. The word "verified" appears only for a report or a person.
 *  2. **A tiny sample says very little.** Two successes is not a 100% success
 *     rate; it is two people. The label states the counts, not a percentage,
 *     until there are enough counts for a percentage to mean anything.
 */

export type DataConfidenceLevel = 'unreported' | 'thin' | 'community' | 'moderated';
export type DealQualityLevel = 'unknown' | 'minor' | 'solid' | 'strong';

export interface CouponEvidence {
  /** `affiliate` = imported from the network; `community`/`moderator` = a person. */
  source: string;
  trustState: string;
  successCount: number;
  failCount: number;
  verifiedAt: string | null;
  /** The merchant's own printed figure, when the copy contained one. */
  statedPercent: number | null;
  /** True when the copy said "up to", so the ceiling is a ceiling. */
  percentIsCap: boolean;
  statedPriceMinor: number | null;
  discountType: string;
  discountValue: number;
}

export interface DataConfidence {
  level: DataConfidenceLevel;
  /** One short line for a card. */
  label: string;
  /** One sentence for a detail view, stating the evidence. */
  detail: string;
  reports: number;
  workedPct: number | null;
}

export interface DealQuality {
  level: DealQualityLevel;
  label: string;
  detail: string;
}

export interface CouponAssessment {
  confidence: DataConfidence;
  quality: DealQuality;
}

/** Below this many reports we describe the counts and refuse to compute a rate. */
const MEANINGFUL_SAMPLE = 3;
/** A code needs this share of successes, on a meaningful sample, to be called verified. */
const COMMUNITY_THRESHOLD = 0.7;

function describeReports(worked: number, failed: number): string {
  const total = worked + failed;
  if (total === 0) return 'Nobody has reported this code yet.';
  if (total === 1) return worked === 1 ? 'One shopper reported it working.' : 'One shopper reported it failing.';
  if (worked === 0) return `${failed} shoppers reported it failing.`;
  if (failed === 0) return `${worked} shoppers reported it working.`;
  return `${worked} worked, ${failed} did not.`;
}

export function assessConfidence(e: CouponEvidence): DataConfidence {
  const worked = Math.max(0, e.successCount);
  const failed = Math.max(0, e.failCount);
  const reports = worked + failed;
  const workedPct = reports === 0 ? null : Math.round((worked / reports) * 100);

  // A person checked it at checkout. This is the only path to the word "verified".
  if (e.trustState === 'moderator_verified') {
    return {
      level: 'moderated',
      label: 'Checked by us',
      detail: e.verifiedAt
        ? `Someone on our team opened this code at checkout on ${new Date(e.verifiedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}.${reports > 0 ? ` ${describeReports(worked, failed)}` : ''}`
        : `Someone on our team opened this code at checkout.${reports > 0 ? ` ${describeReports(worked, failed)}` : ''}`,
      reports,
      workedPct,
    };
  }

  if (reports >= MEANINGFUL_SAMPLE && (workedPct ?? 0) >= COMMUNITY_THRESHOLD * 100) {
    return {
      level: 'community',
      label: 'Reported working',
      detail: `${describeReports(worked, failed)} Confirmed at checkout by shoppers, not by us.`,
      reports,
      workedPct,
    };
  }

  if (reports >= MEANINGFUL_SAMPLE) {
    // Enough reports to be worth reading, and not enough successes to trust.
    return {
      level: 'thin',
      label: 'Often fails',
      detail: `${describeReports(worked, failed)} Treat it as unreliable until more shoppers confirm it.`,
      reports,
      workedPct,
    };
  }

  if (reports > 0) {
    return {
      level: 'thin',
      label: reports === 1 ? 'One report' : 'Two reports',
      detail: `${describeReports(worked, failed)} Too few reports to call it reliable either way.`,
      reports,
      workedPct,
    };
  }

  return {
    level: 'unreported',
    label: 'Not yet reported',
    detail:
      'Listed by the store, and nobody has told us whether it worked at checkout. We do not know that it does.',
    reports: 0,
    workedPct: null,
  };
}

export function assessQuality(e: CouponEvidence): DealQuality {
  // Cashback is money back later, not a smaller bill. It is never scored on the
  // discount scale, because that is the exact confusion the site exists to end.
  if (e.discountType === 'cashback') {
    return {
      level: 'unknown',
      label: 'Cashback',
      detail: 'Paid after the order completes, not taken off the bill. It is not a discount and is never scored as one.',
    };
  }

  if (e.discountType === 'free_delivery') {
    return {
      level: 'minor',
      label: 'Free delivery',
      detail: 'Saves the delivery fee, not the item price.',
    };
  }

  if (e.statedPercent !== null) {
    const pct = e.statedPercent;
    const qualifier = e.percentIsCap ? 'up to ' : '';
    const attributed = `${qualifier}${pct}% is the store’s own published figure, not our measurement.`;
    if (e.percentIsCap) {
      // A ceiling is not a saving. It is scored as the weakest band it could be.
      return { level: pct >= 50 ? 'solid' : 'minor', label: `${qualifier}${pct}% off`, detail: `${attributed} A ceiling, so the real saving may be smaller.` };
    }
    if (pct >= 40) return { level: 'strong', label: `${pct}% off`, detail: attributed };
    if (pct >= 20) return { level: 'solid', label: `${pct}% off`, detail: attributed };
    return { level: 'minor', label: `${pct}% off`, detail: attributed };
  }

  if (e.statedPriceMinor !== null) {
    return {
      level: 'solid',
      label: `At ${(e.statedPriceMinor / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}`,
      detail: 'A price the store printed in its own copy. We have not compared it against the usual price of this item.',
    };
  }

  return {
    level: 'unknown',
    label: 'No figure published',
    detail: 'The store published no percentage or price we can quote, so we will not invent one.',
  };
}

export function assessCoupon(e: CouponEvidence): CouponAssessment {
  return { confidence: assessConfidence(e), quality: assessQuality(e) };
}

/**
 * What a report does to a code. Kept here, next to the thresholds it applies, so
 * the promotion rule and the label that describes it cannot drift apart.
 */
export function nextTrustState(
  trustState: string,
  worked: number,
  failed: number,
): 'community_verified' | 'expired' | null {
  // A human's judgement outranks a tally, in both directions.
  if (trustState === 'moderator_verified' || trustState === 'rejected') return null;

  const reports = worked + failed;
  if (failed >= 5 && failed > worked * 2) return 'expired';
  if (reports >= MEANINGFUL_SAMPLE && worked / reports >= COMMUNITY_THRESHOLD) return 'community_verified';
  return null;
}
