import { useToast } from './Toast';
import { Link } from 'react-router-dom';
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
import { ClaimBadge, CodeButton, ConfidenceLine } from './DealFacts';

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
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const saved = useSaved();
  const isSavedNow = saved.some((d) => d.id === deal.id);

  const copy = useCallback(async () => {
    if (!deal.code) return;
    try {
      // Copy the code, never the padding around it.
      await navigator.clipboard.writeText(deal.code.trim());
      setCopied(true);
      recordView(deal);
      setTimeout(() => setCopied(false), 1900);
    } catch {
      toast.push(`Copy was blocked. Long-press the code ${deal.code} to copy it manually.`, 'info');
    }
  }, [deal, toast]);

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

      <ClaimBadge coupon={deal} />

      <h3 className="deal-card-title">{deal.title}</h3>

      {/*
        The evidence line. Never a star rating, never a blended "quality" score:
        either a person confirmed this code, or nobody has told us anything, in
        which case the card says so in grey. Both are useful; only one is a
        reason to trust the code.
      */}
      <ConfidenceLine coupon={deal} />

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
          <CodeButton code={deal.code} copied={copied} onCopy={() => void copy()} />
        ) : (
          <span className="deal-code deal-code-none">No code listed</span>
        )}
        {/*
          Through our own redirect, not straight to the merchant. The feed's
          tracking URL is identical for every visitor, so a direct link tells the
          network only that somebody clicked — it cannot attribute the sale, and an
          unattributed sale is one we are never paid for. /api/go mints a unique
          sub-id per click. See apps/api/src/routes/go.ts.
        */}
        {deal.outboundUrl ? (
          <a
            className="deal-go"
            href={`/api/go/${deal.id}?src=shelf`}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            onClick={() => {
              setOpened(true);
              recordView(deal);
              if (deal.code) void navigator.clipboard?.writeText(deal.code.trim()).catch(() => {});
            }}
            aria-label={`Shop at ${deal.platformName} in a new tab`}
          >
            Shop at store <Icon name="external" size={13} />
          </a>
        ) : null}
      </div>

      {opened && <Link className="tiny store-link-help" to={`/store-link-help?offer=${encodeURIComponent(deal.id)}`}>Store not opening? Keep your code & get help</Link>}
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
