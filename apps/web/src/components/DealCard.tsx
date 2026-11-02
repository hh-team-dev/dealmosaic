import { useCallback, useState } from 'react';
import {
  expiryLabel,
  merchantMonogram,
  statedPercentLabel,
  statedPriceLabel,
  discountLabel,
  groupLabel,
  type DealView,
} from '../lib/coupons-api';
import { toggleSaved, useSaved, recordView } from '../lib/saved';
import { Icon } from './Icon';

/**
 * THE DEAL CARD.
 *
 * Design brief: on a 360 px phone, in bright sunlight, a shopper must know three
 * things in under two seconds — *what it is*, *how much*, and *what to tap*.
 * Everything else is secondary and is therefore smaller and quieter.
 *
 * Four honesty decisions are visible if you look for them:
 *
 *  1. **No invented product photo.** We have no licensed photography for
 *     affiliate offers, so each store gets a monogram tile in its own colour.
 *     A stock photo of a different product would look better and be a lie.
 *  2. **The qualifier survives.** "from ₹125" and "under ₹199" are printed as
 *     written. Flattening them to "₹125" would imply a price the merchant never
 *     offered.
 *  3. **"up to" stays "up to".** The percentage is the store's ceiling, and a
 *     card that says "70% off" when the store said "up to 70% off" is the exact
 *     manipulation this project exists to avoid.
 *  4. **Commission never touches the layout.** There is no ordering input from
 *     affiliate data here; the outbound link is marked `rel="sponsored"` and
 *     says where it goes.
 */
export function DealCard({ deal, compact = false }: { deal: DealView; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const saved = useSaved();
  const isSavedNow = saved.some((d) => d.id === deal.id);

  const copy = useCallback(async () => {
    if (!deal.code) return;
    try {
      await navigator.clipboard.writeText(deal.code);
      setCopied(true);
      recordView(deal);
      setTimeout(() => setCopied(false), 1900);
    } catch {
      // Clipboard needs a secure context and permission. The code is on screen,
      // so a failure is not worth an alert.
    }
  }, [deal]);

  const percent = statedPercentLabel(deal);
  const price = statedPriceLabel(deal);
  const urgency = expiryLabel(deal.expiresAt, deal.daysLeft ?? null);
  const saving = deal.discountType === 'cashback' ? discountLabel(deal) : null;
  const monogram = merchantMonogram(deal.campaignName || deal.platformName);

  return (
    <article className={`deal-card${compact ? ' deal-card-compact' : ''}`}>
      <div className="deal-card-top">
        <span className={`deal-monogram deal-monogram-${monogram.tint}`} aria-hidden="true">
          {monogram.initials}
        </span>
        <div className="deal-card-headings">
          <span className="deal-card-merchant">{deal.campaignName || deal.platformName}</span>
          <span className="deal-card-category">
            {deal.categories?.split(',')[0]?.trim() || groupLabel(deal.dealGroup)}
          </span>
        </div>
        <button
          type="button"
          className={`deal-save${isSavedNow ? ' is-saved' : ''}`}
          aria-pressed={isSavedNow}
          aria-label={isSavedNow ? `Remove ${deal.title} from your list` : `Save ${deal.title} to your list`}
          onClick={() => toggleSaved(deal)}
        >
          <Icon name="heart" size={16} />
        </button>
      </div>

      {percent && (
        <span className="deal-badge">
          {percent}
          {deal.percentIsCap ? <span className="deal-badge-note">listed by store</span> : null}
        </span>
      )}

      <h3 className="deal-card-title">{deal.title}</h3>

      {price && (
        <p className="deal-card-price">
          {price}
          <span className="deal-card-price-note">as stated by the store</span>
        </p>
      )}

      {saving && (
        <p className="deal-card-cashback">
          <Icon name="wallet" size={13} /> {saving} — paid later, not off the bill
        </p>
      )}

      <div className="deal-card-actions">
        {deal.code ? (
          <button type="button" className="deal-code" onClick={copy} aria-label={`Copy code ${deal.code}`}>
            <span className="deal-code-value">{deal.code}</span>
            <span className="deal-code-hint">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        ) : (
          <span className="deal-code deal-code-none">No code needed</span>
        )}
        {deal.outboundUrl ? (
          <a
            className="deal-go"
            href={deal.outboundUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => recordView(deal)}
            aria-label={`Open ${deal.campaignName} offer in a new tab`}
          >
            Go to store <Icon name="external" size={13} />
          </a>
        ) : null}
      </div>

      <footer className="deal-card-foot">
        {urgency ? (
          <span className="deal-urgency">
            <Icon name="clock" size={12} /> {urgency}
          </span>
        ) : (
          <span className="deal-urgency deal-urgency-none">No expiry published</span>
        )}
        {deal.code ? (
          <span className="deal-card-hint">
            {copied ? 'Copied — paste it at checkout' : 'Tap the code to copy it'}
          </span>
        ) : null}
      </footer>
    </article>
  );
}

/** The loading placeholder. Fixed height, so the page does not jump on arrival. */
export function DealCardSkeleton() {
  return (
    <article className="deal-card deal-card-skeleton" aria-hidden="true">
      <div className="deal-card-top">
        <span className="deal-monogram deal-monogram-0" />
        <div className="deal-card-headings">
          <span className="skeleton-line" style={{ width: '60%' }} />
          <span className="skeleton-line" style={{ width: '35%' }} />
        </div>
      </div>
      <span className="skeleton-line" style={{ width: '85%', height: 14 }} />
      <span className="skeleton-line" style={{ width: '70%', height: 14 }} />
      <span className="skeleton-line" style={{ width: '45%', height: 26, borderRadius: 8 }} />
    </article>
  );
}
