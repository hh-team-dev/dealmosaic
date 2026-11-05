import { useToast } from './Toast';
import { StoreFallback } from './StoreFallback';
import { useCallback, useEffect, useState } from 'react';
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
 * THE DEAL CARD — Image Bank Edition.
 *
 * Design brief: on a 360 px phone, in bright sunlight, a shopper must know
 * three things in under two seconds — *what it is*, *how much*, and *what to
 * tap*. Everything else is secondary.
 *
 * What changed:
 *   • Each card now carries a category image from the Image Bank as its
 *     background — original SVG artwork generated in code (zero cost, no paid
 *     assets, no scraped retailer photos). The monogram tile is the fallback
 *     when no image exists yet.
 *   • A warm semi-transparent overlay sits between the image and the text so
 *     everything stays readable in bright sunlight.
 *   • The "Shop at store" button moves to the right side of the actions row,
 *     large and unmissable.
 *   • All colours stay inside the existing warm palette: ember, coral, grass,
 *     sun, magenta, pink, lime, tang. No blue, no black, no near-black.
 *
 * Four honesty decisions remain:
 *   1. **No invented product photo.** SVG shapes suggest a category; they never
 *      claim to show the merchant's actual goods.
 *   2. **The qualifier survives.** "from ₹125" and "under ₹199" are printed as
 *      written.
 *   3. **"up to" stays "up to".**
 *   4. **Commission never touches the layout.** Outbound links are marked
 *      `rel="sponsored"` and say where they go.
 */

export function DealCard({ deal, compact = false }: { deal: DealView; compact?: boolean }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [opened, setOpened] = useState(false);
  const saved = useSaved();
  const isSavedNow = saved.some((d) => d.id === deal.id);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Fetch the category image from the image bank on mount.
  useEffect(() => {
    const categorySlug = deal.categories?.split(',')[0]?.trim() ?? deal.dealGroup ?? 'other';
    if (!categorySlug) return;

    // Avoid refetching if the slug hasn't changed.
    fetch(`/api/coupons/image/${encodeURIComponent(categorySlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.imageUrl) setImageUrl(data.imageUrl);
      })
      .catch(() => {
        // Silent failure — monogram fallback is perfectly acceptable.
      });
  }, [deal.categories, deal.dealGroup]);

  const copy = useCallback(async () => {
    if (!deal.code) return;
    try {
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

  // Category colour for accents, drawn from the warm palette.
  const categorySlug = deal.categories?.split(',')[0]?.trim() ?? deal.dealGroup ?? 'other';

  return (
    <article
      className={`deal-card${compact ? ' deal-card-compact' : ''}${imageUrl ? ' has-image' : ''}`}
      style={
        imageUrl
          ? ({ '--deal-bg': `url("${imageUrl}")` } as React.CSSProperties)
          : undefined
      }
    >
      <div className="deal-card-top">
        {imageUrl ? null : (
          <span
            className={`deal-monogram deal-monogram-${monogram.tint}`}
            aria-hidden="true"
          >
            {monogram.initials}
          </span>
        )}
        <div className="deal-card-headings">
          <span className="deal-card-merchant">{deal.campaignName || deal.platformName}</span>
          <span className="deal-card-category">
            {categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)}
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
        {/* Preserve publisher tracking; sub-ids reconcile attempts with network reports.
            A recorded attempt is not a confirmed arrival, sale or commission. */}
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

      {deal.outboundUrl && <StoreFallback id={deal.id} merchantHomeUrl={deal.merchantHomeUrl} showHelp={opened} />}
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

/**
 * The loading placeholder. Fixed height, so the page does not jump on arrival.
 */
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
