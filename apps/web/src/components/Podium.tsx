import { inr } from '../lib/format';
import type { Comparison, OfferView } from '../lib/search-api';
import { Icon } from './Icon';
import { VerificationBadge } from './PriceTruth';

/**
 * The Deal Podium.
 *
 * Three places, and the order is the ranking. Place 1 is never a decorative
 * flourish: it is the lowest fully-verified total, and if no offer's total can be
 * fully verified the whole podium changes its headline rather than quietly
 * presenting a partial number as the winner.
 */

const MEDALS = [
  { place: 1, label: 'Best deal', tone: 'gold' },
  { place: 2, label: 'Runner-up', tone: 'silver' },
  { place: 3, label: 'Third', tone: 'bronze' },
] as const;

export function Podium({ comparison, onSelect }: { comparison: Comparison; onSelect?: (offer: OfferView) => void }) {
  const byRank = new Map(comparison.offers.map((o) => [o.rank, o]));

  // DOM order is always 1st, 2nd, 3rd so a screen reader hears the winner first
  // and a phone (single column) shows it at the top. The podium *shape* — winner
  // in the middle, raised — is achieved on desktop with CSS order only.
  const ordered = [byRank.get(1), byRank.get(2), byRank.get(3)].filter(Boolean) as OfferView[];
  if (ordered.length === 0) return null;

  return (
    <section className="podium" aria-labelledby="podium-title">
      <div className="podium-head">
        <h2 id="podium-title" className="podium-title">
          The three deals
        </h2>
        <p className="small muted">
          {comparison.rankingBasis === 'verified_total'
            ? 'Ordered by the true total you pay, delivery and fees included.'
            : 'Ordered by the item price each store verifies. Delivery is extra and depends on your cart.'}
        </p>
      </div>

      {comparison.podiumNote && (
        <p className="podium-note">
          <Icon name="alert" size={15} />
          <span>{comparison.podiumNote}</span>
        </p>
      )}

      <ol className="podium-grid">
        {ordered.map((offer) => {
          const medal = MEDALS[offer.rank - 1]!;
          return (
            <li key={offer.offerId} className={`podium-col podium-${medal.tone}`}>
              <div className="podium-plinth">
                <span className="podium-place" aria-hidden="true">
                  {offer.rank}
                </span>
                <span className="podium-label">{medal.label}</span>

                <span className="podium-platform">{offer.platform.name}</span>
                <strong className="podium-total numeric">{inr(offer.price.knownTotalMinor)}</strong>

                {offer.price.verificationState !== 'complete' ? (
                  // Delivery exists but the store does not publish it per item.
                  // Saying "no added fees" here would be a straight lie.
                  <span className="podium-itemprice podium-itemprice-warn">+ delivery charged at checkout</span>
                ) : offer.price.knownTotalMinor !== offer.itemPriceMinor ? (
                  <span className="podium-itemprice">listed at {inr(offer.itemPriceMinor)}</span>
                ) : (
                  <span className="podium-itemprice">no added delivery or fees</span>
                )}

                <VerificationBadge state={offer.price.verificationState} compact />

                <button type="button" className="btn btn-primary btn-sm podium-cta" onClick={() => onSelect?.(offer)}>
                  See the full break-up
                  <Icon name="arrow-right" size={15} />
                </button>

                <a
                  className="podium-link small"
                  href={offer.productUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                >
                  Open on {offer.platform.name}
                  <Icon name="external" size={13} />
                </a>
              </div>

              {offer.rank === 1 && (
                <div className="why-one">
                  <span className="why-one-label">
                    <Icon name="spark" size={14} /> Why this is #1
                  </span>
                  <p>{offer.whyRanked}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
