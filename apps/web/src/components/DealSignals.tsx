import type { ConfidenceComponent, OfferView } from '../lib/search-api';
import { relativeTime } from '../lib/format';
import { Icon } from './Icon';

/**
 * Deal Confidence and Trust Radar.
 *
 * Confidence measures how much we trust the DATA — source, freshness, match,
 * delivery information, seller information. It is explicitly not a product
 * quality score, and the copy says so, because a number without a definition is
 * just another dark pattern.
 */

const WEIGHT_NOTE: Record<ConfidenceComponent['key'], string> = {
  source: 'Where the price came from: authorised connector, verified feed, or a shopper report.',
  freshness: 'How long ago the price was actually observed.',
  match: 'How certain we are that this offer is the exact variant you asked for.',
  shipping: 'Whether the store publishes a delivery charge for this item.',
  seller: 'Whether the platform publishes seller ratings at all.',
};

export function confidenceTone(score: number): 'turq' | 'sun' | 'coral' {
  if (score >= 80) return 'turq';
  if (score >= 60) return 'sun';
  return 'coral';
}

export function confidenceWord(score: number): string {
  if (score >= 85) return 'High confidence';
  if (score >= 70) return 'Good confidence';
  if (score >= 55) return 'Mixed confidence';
  return 'Low confidence';
}

export function DealConfidence({
  score,
  breakdown,
  onExplain,
}: {
  score: number;
  breakdown: ConfidenceComponent[];
  onExplain?: () => void;
}) {
  const tone = confidenceTone(score);
  return (
    <div className={`confidence confidence-${tone}`}>
      <div className="confidence-head">
        <span className="confidence-label">
          Deal confidence
          <button
            type="button"
            className="info-dot"
            aria-label="How deal confidence is calculated"
            onClick={onExplain}
          >
            ?
          </button>
        </span>
        <span className="confidence-score numeric">
          {score}
          <span className="confidence-max">/100</span>
        </span>
      </div>

      <div
        className="confidence-track"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Deal confidence ${score} out of 100`}
      >
        <span className="confidence-fill" style={{ width: `${Math.max(4, score)}%` }} />
      </div>

      <p className="confidence-word">{confidenceWord(score)}</p>

      <details className="confidence-details">
        <summary>What makes up this number</summary>
        <ul className="confidence-parts">
          {breakdown.map((part) => (
            <li key={part.key}>
              <span className="part-name">
                {part.label}
                <span className="part-weight">{(part.weight * 100).toFixed(0)}% weight</span>
              </span>
              <span className="part-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(part.value * 100)}%` }} />
              </span>
              <span className="part-detail small">{part.detail || WEIGHT_NOTE[part.key]}</span>
            </li>
          ))}
        </ul>
        <p className="tiny muted">
          Deal confidence describes how much we trust the data behind a price. It says nothing about whether the product
          or the seller is any good.
        </p>
      </details>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Trust Radar                                                         */
/* ------------------------------------------------------------------ */

/**
 * Five-axis radar. Each axis is a fact we hold about the offer, normalised to
 * 0–1. Where a platform publishes nothing, the axis collapses inward rather
 * than being filled with a friendly average.
 */
export function TrustRadar({ offer, size = 132 }: { offer: OfferView; size?: number }) {
  const freshness = 1 - Math.min(1, (Date.now() - Date.parse(offer.lastCheckedAt)) / (7 * 24 * 3600_000));
  const axes = [
    { key: 'Match', value: offer.matchConfidence, note: 'Exact variant identity' },
    { key: 'Freshness', value: freshness, note: `Checked ${relativeTime(offer.lastCheckedAt)}` },
    {
      key: 'Seller',
      value: offer.sellerRating === null ? 0 : Math.max(0, Math.min(1, (offer.sellerRating - 3) / 2)),
      note: offer.sellerRating === null ? 'Not published by this platform' : `Rated ${offer.sellerRating.toFixed(1)}`,
    },
    {
      key: 'Delivery',
      value: offer.deliveryDaysMin === null ? 0 : 1,
      note:
        offer.deliveryDaysMin === null
          ? 'Window not stated'
          : offer.deliveryDaysMin === 0
            ? 'Minutes (quick commerce)'
            : `In ${offer.deliveryDaysMin}–${offer.deliveryDaysMax} days`,
    },
    {
      key: 'Returns',
      value: offer.returnWindowDays === null ? 0 : Math.min(1, offer.returnWindowDays / 15),
      note: offer.returnWindowDays === null ? 'No return window published' : `${offer.returnWindowDays}-day returns`,
    },
  ];

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 18;
  const angle = (i: number): number => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const point = (i: number, value: number): [number, number] => [
    cx + Math.cos(angle(i)) * radius * value,
    cy + Math.sin(angle(i)) * radius * value,
  ];

  const polygon = axes.map((a, i) => point(i, Math.max(0.06, a.value)).join(',')).join(' ');
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <div className="radar">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Trust radar: ${axes.map((a) => `${a.key} ${Math.round(a.value * 100)}%`).join(', ')}`}
      >
        {rings.map((r) => (
          <polygon
            key={r}
            points={axes.map((_, i) => point(i, r).join(',')).join(' ')}
            fill="none"
            stroke="var(--hairline)"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = point(i, 1);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--hairline)" strokeWidth="1" />;
        })}
        <polygon points={polygon} fill="var(--radar-fill)" stroke="var(--violet-d)" strokeWidth="1.6" />
        {axes.map((a, i) => {
          const [x, y] = point(i, Math.max(0.06, a.value));
          return <circle key={a.key} cx={x} cy={y} r="2.6" fill="var(--violet-d)" />;
        })}
      </svg>
      <ul className="radar-legend">
        {axes.map((a) => (
          <li key={a.key}>
            <span className={`radar-dot${a.value === 0 ? ' is-empty' : ''}`} aria-hidden="true" />
            <span className="radar-name">{a.key}</span>
            <span className="radar-note tiny muted">{a.note}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Deal Passport                                                       */
/* ------------------------------------------------------------------ */

/**
 * The provenance record. If a user cannot answer "where did this number come
 * from, and when?", the comparison is not trustworthy — so every field here is
 * real data from the observation, or it is absent.
 */
export function DealPassport({ offer }: { offer: OfferView }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['Platform', offer.platform.name],
    ['Seller', offer.sellerName],
    ['Seller type', offer.sellerType.replace(/_/g, ' ')],
    ['Data origin', offer.sourceLabel],
    ['First observed', new Date(offer.firstObservedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })],
    ['Last checked', relativeTime(offer.lastCheckedAt)],
    ['Observations', `${offer.observationCount} recorded price point${offer.observationCount === 1 ? '' : 's'}`],
    ['Identifier', rows0(offer)],
    ['Condition', offer.condition],
    ['Returns', offer.returnWindowDays === null ? 'Not published' : `${offer.returnWindowDays} days`],
    ['Warranty', offer.warrantyMonths === null ? 'Not published' : `${offer.warrantyMonths} months`],
    ['Affiliate link', offer.affiliate ? 'Yes — commission never affects rank' : 'No affiliate relationship'],
  ];

  return (
    <div className="passport">
      <div className="passport-head">
        <Icon name="passport" size={16} />
        <strong>Deal passport</strong>
        <span className={`badge ${offer.dataOrigin === 'live' ? 'badge-turq' : 'badge-sun'} passport-origin`}>
          {offer.dataOrigin.toUpperCase()}
        </span>
      </div>
      <dl className="passport-rows">
        {rows.map(([label, value]) => (
          <div key={label} className="passport-row">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function rows0(offer: OfferView): string {
  // GTIN/model isn't on the offer view; the variant carries it. Show what we have.
  return offer.matchMethod === 'exact_variant' ? 'Exact variant match' : offer.matchMethod;
}
