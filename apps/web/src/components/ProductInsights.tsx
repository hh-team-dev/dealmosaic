import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CommunityPrice, PricePoint, ProductCoupon, VariantOffer } from '../lib/search-api';
import { createAlert } from '../lib/alerts-api';
import { inr } from '../lib/format';
import { useAuth } from '../lib/session';
import { useLocationSummary, usePincode } from '../lib/pincode';
import { apiRequest } from '../lib/api';
import { Icon } from './Icon';

/**
 * THE FOUR THINGS THAT TURN A PRODUCT PAGE INTO SOMETHING WORTH RETURNING TO:
 * the live offers behind the price, the history behind the price, the ability
 * to watch the price, and a way to contribute a price.
 *
 * Every one of them has an honesty constraint baked into the markup:
 *
 *  · an offer says where its number came from (`dataOrigin`), so demonstration
 *    data can never masquerade as a retailer quote;
 *  · the chart refuses to draw a line through a single point, and labels the
 *    axis "observations we recorded", not "market price";
 *  · an alert fires on a real drop or it does not fire at all;
 *  · a shopper's report is visibly not a verified price.
 */

/* ------------------------------------------------------------------ offers */

const ORIGIN_LABEL: Record<string, string> = {
  live: 'Live retailer data',
  feed: 'Retailer feed',
  community: 'Shopper-reported',
  demo: 'Illustrative — feed pending',
};

export function OfferList({ offers }: { offers: VariantOffer[] }) {
  if (offers.length === 0) {
    return (
      <p className="tiny muted">
        No live offer for this variant yet. We would rather show nothing than a number nobody can buy at.
      </p>
    );
  }
  return (
    <ul className="offer-list">
      {offers.slice(0, 5).map((o) => (
        <li key={o.id} className="offer-row">
          <div className="offer-row-main">
            <strong>{o.platformName}</strong>
            <span className="tiny muted">{o.sellerName}</span>
          </div>
          <div className="offer-row-price">
            <strong className="numeric">{inr(o.priceMinor)}</strong>
            <span className={`origin-tag origin-${o.dataOrigin}`}>{ORIGIN_LABEL[o.dataOrigin] ?? o.dataOrigin}</span>
          </div>
          <a
            className="btn btn-ghost btn-sm"
            href={o.productUrl}
            target="_blank"
            rel={o.affiliate ? 'sponsored nofollow noopener noreferrer' : 'noopener noreferrer'}
          >
            Open <Icon name="external" size={13} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------- chart */

/**
 * A hand-drawn SVG line: no chart library, no 90 kB dependency, no external
 * request. Zero cost, and it renders in the preview iframe where a CDN would
 * not.
 *
 * With fewer than two points there is no line to draw, and it says so. A flat
 * line across a single observation would read as "the price has been stable",
 * which is a claim we would not have earned.
 */
export function PriceChart({ points, label }: { points: PricePoint[]; label: string }) {
  if (points.length === 0) {
    return (
      <div className="chart-empty">
        <Icon name="chart" size={18} />
        <p className="small" style={{ margin: 0 }}>
          We have not recorded a price for <strong>{label}</strong> yet. Recording starts the first time we observe
          this offer, and history builds from there — we will not draw a past we did not see.
        </p>
      </div>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  if (points.length === 1) {
    const only = first;
    return (
      <div className="chart-empty">
        <Icon name="chart" size={18} />
        <p className="small" style={{ margin: 0 }}>
          One observation so far: <strong>{inr(only.priceMinor)}</strong> on{' '}
          {new Date(only.observedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. A trend needs at
          least two days of records, so we are not drawing a line yet.
        </p>
      </div>
    );
  }

  const width = 320;
  const height = 64;
  const pad = 6;
  const prices = points.map((p) => p.priceMinor);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const stepX = (width - pad * 2) / (points.length - 1);
  const y = (v: number): number => pad + (1 - (v - min) / span) * (height - pad * 2);
  const coords = points.map((p, i) => `${pad + i * stepX},${y(p.priceMinor)}`).join(' ');
  const area = `${pad},${height - pad} ${coords} ${width - pad},${height - pad}`;
  const delta = last.priceMinor - first.priceMinor;
  const cheaper = delta < 0;

  return (
    <div className="chart-wrap">
      <div className="chart-head">
        <strong className="numeric">{inr(last.priceMinor)}</strong>
        <span className={`chart-delta${cheaper ? ' is-down' : delta > 0 ? ' is-up' : ''}`}>
          {delta === 0
            ? 'unchanged over this window'
            : `${cheaper ? '▼' : '▲'} ${inr(Math.abs(delta))} since ${new Date(first.observedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img" aria-label={`Price history for ${label}`}>
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--violet)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--violet)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#chart-fill)" />
        <polyline points={coords} fill="none" stroke="var(--violet-d)" strokeWidth="2" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={p.observedAt} cx={pad + i * stepX} cy={y(p.priceMinor)} r="2.4" fill="var(--violet-d)" />
        ))}
      </svg>
      <p className="tiny muted" style={{ margin: 0 }}>
        {points.length} daily observations · lowest {inr(min)} · highest {inr(max)} · cheapest observation each day,
        our own record — not a market index.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ alerts */

export function PriceAlertForm({
  variantId,
  variantLabel,
  currentPriceMinor,
}: {
  variantId: string;
  variantLabel: string;
  currentPriceMinor: number | null;
}) {
  const { user } = useAuth();
  const [target, setTarget] = useState<string>(
    currentPriceMinor !== null ? String(Math.max(1, Math.round((currentPriceMinor * 0.9) / 100))) : '',
  );
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const suggested = currentPriceMinor !== null ? Math.round((currentPriceMinor * 0.9) / 100) : null;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const value = Number(target);
    if (!Number.isFinite(value) || value <= 0) {
      setState('error');
      setMessage('Enter a target price in rupees.');
      return;
    }
    setState('saving');
    try {
      const r = await createAlert(variantId, value);
      setState('done');
      setMessage(r.message ?? 'Watching. We will email you if the price falls below your target.');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Could not save that alert.');
    }
  }

  if (!user) {
    return (
      <div className="alert-panel">
        <div className="alert-panel-head">
          <Icon name="clock" size={16} />
          <strong>Get told when the price drops</strong>
        </div>
        <p className="small" style={{ margin: '0 0 10px' }}>
          Set a target price and we email you only if {variantLabel} actually falls below it. One email, then the alert
          closes — we do not send reminders to shop.
        </p>
        <Link className="btn btn-primary btn-sm" to={`/login?next=${encodeURIComponent(location.pathname)}`}>
          Sign in to watch this price
        </Link>
        <p className="tiny muted" style={{ margin: '8px 0 0' }}>
          A target price needs an email address to send to, which is the only reason this one needs an account.
        </p>
      </div>
    );
  }

  return (
    <div className="alert-panel">
      <div className="alert-panel-head">
        <Icon name="clock" size={16} />
        <strong>Watch this price</strong>
      </div>
      {state === 'done' ? (
        <p className="small" style={{ margin: 0 }}>
          <Icon name="check" size={14} /> {message}
        </p>
      ) : (
        <form onSubmit={submit} className="alert-form">
          <label className="sr-only" htmlFor={`alert-${variantId}`}>
            Target price in rupees for {variantLabel}
          </label>
          <div className="alert-form-row">
            <span className="alert-form-currency">₹</span>
            <input
              id={`alert-${variantId}`}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={suggested ? String(suggested) : 'e.g. 1400'}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={state === 'saving'}>
              {state === 'saving' ? 'Saving…' : 'Email me below this'}
            </button>
          </div>
          {suggested !== null && (
            <p className="tiny muted" style={{ margin: '6px 0 0' }}>
              Today’s listed price is {inr(currentPriceMinor!)}. {suggested} is 10% below it.
            </p>
          )}
          {state === 'error' && message && (
            <p className="tiny" style={{ color: 'var(--coral-d)', margin: '6px 0 0' }}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- coupons */

export function CouponStrip({ coupons }: { coupons: ProductCoupon[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (coupons.length === 0) return null;

  async function copy(c: ProductCoupon): Promise<void> {
    if (!c.code) return;
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(c.id);
      setTimeout(() => setCopied((p) => (p === c.id ? null : p)), 1800);
    } catch {
      /* clipboard may be blocked; the code is visible */
    }
  }

  return (
    <section className="card card-tint stack-sm" aria-labelledby="coupons-heading">
      <h2 id="coupons-heading" className="h4">
        Codes that work at these stores
      </h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Live codes for the stores listed above. Percentages are the store’s own published figure; “up to” stays “up to”.
      </p>
      <ul className="coupon-strip">
        {coupons.map((c) => (
          <li key={c.id} className="coupon-chip">
            <div className="coupon-chip-body">
              <strong>{c.platformName}</strong>
              <span className="tiny muted">{c.title}</span>
              {c.statedPercent !== null && (
                <span className="coupon-chip-pct">
                  {c.percentIsCap ? 'up to ' : ''}
                  {c.statedPercent}% off
                </span>
              )}
            </div>
            {c.code ? (
              <button type="button" className="deal-code" onClick={() => copy(c)}>
                <span className="deal-code-value">{c.code}</span>
                <span className="deal-code-hint">{copied === c.id ? 'Copied' : 'Copy'}</span>
              </button>
            ) : (
              <Link className="btn btn-ghost btn-sm" to="/deals">
                See deal
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------------------------------------- community */

export function CommunityPanel({
  variantId,
  variantLabel,
  reports,
  note,
}: {
  variantId: string;
  variantLabel: string;
  reports: CommunityPrice[];
  note: string;
}) {
  const { user } = useAuth();
  const [pincode, setPincode] = usePincode();
  const [draftPin, setDraftPin] = useState(pincode ?? '');
  const [platform, setPlatform] = useState('blinkit');
  const [price, setPrice] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const { data: location } = useLocationSummary(pincode);

  const visible = pincode ? reports.filter((r) => r.pincode === pincode) : reports;

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!user) {
      setState('error');
      setMessage('Sign in to report a price — reports are attributed so they can be corroborated.');
      return;
    }
    const value = Number(price);
    if (!/^[1-9][0-9]{5}$/.test(draftPin)) {
      setState('error');
      setMessage('Enter a valid 6-digit pincode.');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setState('error');
      setMessage('Enter the price you saw, in rupees.');
      return;
    }
    setState('saving');
    try {
      await apiRequest('/api/community-prices', {
        method: 'POST',
        body: { variantId, platformSlug: platform, pincode: draftPin, price: value },
      });
      setPincode(draftPin);
      setState('done');
      setMessage('Thank you — that is on the record. Another shopper confirming it is what turns it into a trusted price.');
      setPrice('');
    } catch (err) {
      setState('error');
      setMessage(err instanceof Error ? err.message : 'Could not submit that report.');
    }
  }

  return (
    <section className="card stack-sm" aria-labelledby="community-heading">
      <h2 id="community-heading" className="h4">
        What shoppers paid
      </h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        {note}
      </p>

      <div className="row wrap" style={{ alignItems: 'flex-end', gap: 8 }}>
        <label className="stack-sm" style={{ gap: 4 }}>
          <span className="tiny muted">Your pincode</span>
          <input
            className="input input-sm"
            inputMode="numeric"
            maxLength={6}
            value={draftPin}
            onChange={(e) => setDraftPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="560001"
            style={{ width: 120 }}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setPincode(/^[1-9][0-9]{5}$/.test(draftPin) ? draftPin : null)}
        >
          {pincode ? 'Update' : 'Use this pincode'}
        </button>
        {pincode && (
          <span className="tiny muted">
            {location?.location
              ? `${location.location.city ?? ''}${location.location.state ? `, ${location.location.state}` : ''}`
              : 'looking up…'}
          </span>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="small" style={{ margin: '4px 0 0' }}>
          {pincode
            ? `Nobody has reported ${variantLabel} at ${pincode} yet. Your report would be the first.`
            : `No shopper reports for ${variantLabel} yet.`}
        </p>
      ) : (
        <ul className="community-list">
          {visible.slice(0, 8).map((r) => (
            <li key={`${r.platformSlug}-${r.reportedAt}`}>
              <strong>{inr(r.priceMinor)}</strong> <span className="muted">at {r.platformName}</span>
              <span className="tiny muted">
                {' '}
                · PIN {r.pincode} ·{' '}
                {new Date(r.reportedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ·{' '}
                {r.corroborationCount > 0 ? `${r.corroborationCount} confirmed` : 'unconfirmed'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="community-form">
        <div className="row wrap" style={{ gap: 8, alignItems: 'flex-end' }}>
          <label className="stack-sm" style={{ gap: 4 }}>
            <span className="tiny muted">Store</span>
            <select className="input input-sm" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              <option value="blinkit">Blinkit</option>
              <option value="zepto">Zepto</option>
              <option value="swiggy-instamart">Swiggy Instamart</option>
              <option value="bigbasket">BigBasket</option>
              <option value="jiomart">JioMart</option>
              <option value="dmart-ready">DMart Ready</option>
              <option value="amazon-in">Amazon</option>
              <option value="flipkart">Flipkart</option>
            </select>
          </label>
          <label className="stack-sm" style={{ gap: 4 }}>
            <span className="tiny muted">Price you saw (₹)</span>
            <input
              className="input input-sm"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
              placeholder="e.g. 249"
              style={{ width: 120 }}
            />
          </label>
          <button type="submit" className="btn btn-primary btn-sm" disabled={state === 'saving'}>
            {state === 'saving' ? 'Sending…' : user ? 'Report this price' : 'Sign in to report'}
          </button>
        </div>
        {message && (
          <p className="tiny" style={{ margin: '8px 0 0', color: state === 'error' ? 'var(--coral-d)' : 'var(--turq-d)' }}>
            {message}
          </p>
        )}
      </form>
    </section>
  );
}
