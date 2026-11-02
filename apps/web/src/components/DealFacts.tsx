import type { CouponView } from '../lib/coupons-api';
import { Icon } from './Icon';

/**
 * THE FACTS A DEAL CARD SHOWS, IN ONE PLACE.
 *
 * Two cards render a coupon: `DealCard` on the homepage shelves and `/saved`, and
 * `CouponCard` behind the filters on `/deals`. They were written separately, and the
 * evidence line — the one that says whether anybody has actually confirmed the code —
 * appeared on one and not the other for exactly that reason.
 *
 * That is the failure mode this module exists to stop: not a bug, but a fact that
 * lives in two places. Everything below is the single definition of how a coupon's
 * claim and its evidence are worded, so the two cards cannot disagree about how much
 * we know.
 *
 * The rule the components enforce: **the store's claim and our evidence are always
 * visually distinct.** A percentage is never rendered as if we measured it, and a
 * lack of reports is never rendered as if it were a warning.
 */

export function ConfidenceLine({ coupon }: { coupon: Pick<CouponView, 'confidence'> }) {
  return (
    <p className={`deal-confidence is-${coupon.confidence.level}`} title={coupon.confidence.detail}>
      <Icon name={coupon.confidence.level === 'unreported' ? 'info' : 'shield'} size={12} />
      {coupon.confidence.label}
    </p>
  );
}

/** The store's own figure, attributed. `null` when the store published none. */
export function ClaimBadge({ coupon }: { coupon: CouponView }) {
  const isCashback = coupon.discountType === 'cashback';

  /*
   * When the store published no number, the badge states what the card offers
   * instead — "Code" for something copyable, "Deal" for a price cut with nothing to
   * copy. An empty badge space reads as a rendering bug, and "No figure published"
   * in a badge reads as a warning about the store rather than a gap in our data.
   */
  if (coupon.quality.level === 'unknown' && !isCashback) {
    return <span className="deal-badge deal-badge-quiet">{coupon.code ? 'Code' : 'Deal'}</span>;
  }

  return (
    <span className={`deal-badge${isCashback ? ' deal-badge-cashback' : ''}`}>
      {coupon.quality.label}
      {isCashback && <span className="deal-badge-note">paid later</span>}
    </span>
  );
}

/**
 * The copy control. It copies the code and nothing else — no "Use code" prefix, no
 * trailing space, because a clipboard that pastes `NEW200 ` into a checkout field is
 * a bug the shopper has to work around.
 */
export function CodeButton({
  code,
  copied,
  onCopy,
  compact = false,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`deal-code${compact ? ' deal-code-sm' : ''}`}
      onClick={onCopy}
      aria-label={`Copy code ${code}`}
    >
      <span className="deal-code-value">{code}</span>
      <span className="deal-code-hint">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
