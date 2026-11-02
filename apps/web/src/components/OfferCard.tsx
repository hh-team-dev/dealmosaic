import { useState } from 'react';
import { inr, relativeTime } from '../lib/format';
import type { OfferView } from '../lib/search-api';
import { Icon } from './Icon';
import { HiddenCostFlag, PriceBreakdown, VerificationBadge } from './PriceTruth';
import { DealConfidence, DealPassport, TrustRadar } from './DealSignals';

/**
 * A full offer card. Desktop: three columns side by side. Mobile: stacked cards
 * that the user swipes between, with snap points — the mobile-first comparison a
 * shopper actually uses in a shop aisle.
 */
export function OfferCard({ offer, featured = false }: { offer: OfferView; featured?: boolean }) {
  const [tab, setTab] = useState<'cost' | 'trust' | 'passport'>('cost');

  return (
    <article className={`offer-card${featured ? ' offer-card-featured' : ''}`} aria-labelledby={`offer-${offer.offerId}-title`}>
      <header className="offer-card-head">
        <div className="offer-rank">
          <span className={`rank-pill rank-${offer.rank}`}>{offer.rank}</span>
          <div>
            <h3 id={`offer-${offer.offerId}-title`} className="offer-platform">
              {offer.platform.name}
            </h3>
            <p className="offer-seller tiny muted">{offer.sellerName}</p>
          </div>
        </div>
        <div className="offer-price">
          <strong className="numeric">{inr(offer.price.knownTotalMinor)}</strong>
          <span className="tiny muted">known total</span>
        </div>
      </header>

      <div className="offer-flags">
        <VerificationBadge state={offer.price.verificationState} compact />
        {offer.price.verificationState !== 'complete' && (
          <span className="badge badge-neutral" title="The total excludes a charge this store does not publish per item">
            Conditional
          </span>
        )}
        {!offer.inStock && <span className="badge badge-coral">Out of stock</span>}
        {offer.dataOrigin !== 'live' && (
          <span className="badge badge-sun" title={offer.sourceLabel}>
            {offer.dataOrigin === 'demo' ? 'Illustrative' : 'Shopper report'}
          </span>
        )}
      </div>

      <HiddenCostFlag offer={offer} />

      <div className="offer-tabs" role="tablist" aria-label="Offer detail">
        {(
          [
            ['cost', 'Cost break-up', 'Cost', 'receipt'],
            ['trust', 'Trust radar', 'Trust', 'radar'],
            ['passport', 'Deal passport', 'Passport', 'passport'],
          ] as const
        ).map(([key, label, shortLabel, icon]) => (
          <button
            key={key}
            role="tab"
            type="button"
            id={`tab-${offer.offerId}-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${offer.offerId}-${key}`}
            className={`offer-tab${tab === key ? ' is-active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon name={icon} size={15} />
            <span className="tab-label-full">{label}</span>
            <span className="tab-label-short">{shortLabel}</span>
          </button>
        ))}
      </div>

      <div
        className="offer-panel"
        role="tabpanel"
        id={`panel-${offer.offerId}-${tab}`}
        aria-labelledby={`tab-${offer.offerId}-${tab}`}
      >
        {tab === 'cost' && <PriceBreakdown price={offer.price} dense />}
        {tab === 'trust' && (
          <div className="stack-sm">
            <TrustRadar offer={offer} />
            <DealConfidence score={offer.confidenceScore} breakdown={offer.confidenceBreakdown} />
          </div>
        )}
        {tab === 'passport' && <DealPassport offer={offer} />}
      </div>

      <footer className="offer-card-foot">
        <span className="tiny muted">
          <Icon name="clock" size={13} /> Checked {relativeTime(offer.lastCheckedAt)}
        </span>
        <a
          className="btn btn-primary btn-sm"
          href={offer.productUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
        >
          <span aria-hidden="true">Visit store</span>
          <span className="sr-only">Visit {offer.platform.name}</span>
          <Icon name="external" size={14} />
        </a>
      </footer>
    </article>
  );
}

/** Mobile swipe deck — the primary mobile experience. */
export function OfferDeck({ offers }: { offers: OfferView[] }) {
  return (
    <div className="offer-deck" role="list">
      {offers.map((offer) => (
        <div key={offer.offerId} className="offer-deck-item" role="listitem">
          <OfferCard offer={offer} featured={offer.rank === 1} />
        </div>
      ))}
    </div>
  );
}
