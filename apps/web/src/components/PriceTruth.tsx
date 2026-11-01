import { inr } from '../lib/format';
import type { OfferView, PriceLine, PriceTruth } from '../lib/search-api';
import { Icon } from './Icon';

/**
 * The Price Truth Engine, rendered.
 *
 * Every line carries its state. Missing data is never drawn as ₹0, and a total
 * that cannot be verified says so in words rather than in a footnote.
 */

const STATE_META: Record<
  PriceLine['state'],
  { label: string; tone: 'turq' | 'sun' | 'coral' | 'neutral'; hint: (line: PriceLine) => string }
> = {
  confirmed: { label: 'confirmed', tone: 'turq', hint: (l) => (l.note ? l.note : 'Reported by the store for this exact item.') },
  estimated: { label: 'estimated', tone: 'sun', hint: (l) => (l.note ? l.note : 'Derived, not published by the store.') },
  not_available: {
    label: 'not available',
    tone: 'coral',
    hint: (l) => (l.note ? l.note : 'The store published nothing for this. It is not ₹0.'),
  },
  not_applicable: { label: 'included', tone: 'neutral', hint: (l) => (l.note ? l.note : 'Does not apply to this purchase.') },
  conditional: {
    label: 'conditional',
    tone: 'sun',
    hint: (l) => (l.note ? l.note : 'Applies only under the stated conditions, so it is excluded from the total.'),
  },
};

export function VerificationBadge({ state, compact = false }: { state: PriceTruth['verificationState']; compact?: boolean }) {
  if (state === 'complete') {
    return (
      <span className="badge badge-turq trust-badge">
        <Icon name="check" size={13} />
        {compact ? 'Total verified' : 'TOTAL FULLY VERIFIED'}
      </span>
    );
  }
  if (state === 'partial') {
    return (
      <span className="badge badge-sun trust-badge">
        <Icon name="alert" size={13} />
        {compact ? 'Partly verified' : 'TOTAL NOT FULLY VERIFIED'}
      </span>
    );
  }
  return (
    <span className="badge badge-coral trust-badge">
      <Icon name="alert" size={13} />
      {compact ? 'Unverified' : 'TOTAL UNVERIFIED'}
    </span>
  );
}

export function PriceBreakdown({ price, dense = false }: { price: PriceTruth; dense?: boolean }) {
  return (
    <div className={`price-breakdown${dense ? ' price-breakdown-dense' : ''}`}>
      <ul className="price-lines">
        {price.lines.map((line, i) => {
          const meta = STATE_META[line.state];
          const isCredit = line.kind === 'discount';
          return (
            <li key={`${line.kind}-${line.label}-${i}`} className="price-line">
              <span className="price-line-label">
                {line.label}
                <span className={`line-state line-state-${meta.tone}`} title={meta.hint(line)}>
                  {meta.label}
                </span>
              </span>
              <span className={`price-line-amount${line.amountMinor === null && line.state !== 'not_applicable' ? ' is-unknown' : ''}${isCredit ? ' is-credit' : ''}`}>
                {line.amountMinor !== null
                  ? inr(line.amountMinor)
                  : line.state === 'conditional'
                    ? 'depends'
                    : line.state === 'not_applicable'
                      ? 'already included'
                      : 'unknown'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="price-total">
        <span className="price-total-label">
          {price.verificationState === 'complete' ? 'Total payable' : 'Known total'}
        </span>
        <strong className="price-total-amount numeric">{inr(price.knownTotalMinor)}</strong>
      </div>

      {price.conditional.length > 0 && (
        <div className="price-caveat">
          <Icon name="alert" size={14} />
          <div>
            <strong>Not in the total:</strong>
            <ul>
              {price.conditional.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {price.missing.length > 0 && (
        <div className="price-caveat price-caveat-danger">
          <Icon name="alert" size={14} />
          <div>
            <strong>Missing from this store&rsquo;s data:</strong> {price.missing.join(', ')}.{' '}
            <span className="small">
              We do not treat an unknown cost as zero — the real total will be higher than the number above.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** "What the headline price hides" — the single most useful number on the card. */
export function HiddenCostFlag({ offer }: { offer: OfferView }) {
  // The total excludes costs this store does not publish. That is not the same as
  // those costs being zero, so we must not say "nothing hidden".
  if (offer.price.verificationState !== 'complete') {
    return (
      <p className="hidden-cost">
        <Icon name="alert" size={14} />
        <span>
          This total <strong>excludes delivery</strong>, which this store charges from your cart at checkout.
        </span>
      </p>
    );
  }
  if (offer.hiddenCostMinor <= 0) {
    return (
      <p className="hidden-cost hidden-cost-none">
        <Icon name="check" size={14} /> Headline price equals the total. Nothing hidden.
      </p>
    );
  }
  return (
    <p className="hidden-cost">
      <Icon name="alert" size={14} />
      <span>
        Headline price hides <strong className="numeric">{inr(offer.hiddenCostMinor)}</strong> of delivery and fees.
      </span>
    </p>
  );
}
