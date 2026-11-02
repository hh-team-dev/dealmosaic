import { useState } from 'react';
import { inr } from '../lib/format';
import { DemoFlag, useCountUp } from './Ui';
import { Icon, type IconName } from './Icon';

interface Offer {
  rank: 1 | 2 | 3;
  retailer: string;
  initials: string;
  tint: string;
  seller: string;
  priceMinor: number;
  unitPrice?: string;
  delivery: string;
  trust: string;
  sellerRating: string;
  productRating: string;
  why: string;
}

interface Dataset {
  id: 'electronics' | 'grocery';
  label: string;
  icon: IconName;
  product: string;
  variant: string;
  matchNote: string;
  offers: Offer[];
  truth: Array<{ label: string; amount: string; state: string; note?: string }>;
  truthTotal: string;
  truthNote: string;
  footnote: string;
}

const DATA: Dataset[] = [
  {
    id: 'electronics',
    label: 'Electronics',
    icon: 'phone',
    product: 'Samsung Galaxy S25 Ultra',
    variant: '12 GB / 512 GB · Titanium Black',
    matchNote: 'Exact match — GTIN verified',
    offers: [
      {
        rank: 1,
        retailer: 'Amazon India',
        initials: 'az',
        tint: 'var(--grad-lagoon)',
        seller: 'Appario Retail · official store',
        priceMinor: 12999900,
        delivery: 'Free · 2 days',
        trust: 'Community · 12 min ago',
        sellerRating: '4.6 · 2.1 L ratings',
        productRating: '4.7 · 18,432 reviews',
        why: 'Lowest verified total with delivery included, exact 512 GB variant, seller identity and rating available.',
      },
      {
        rank: 2,
        retailer: 'Flipkart',
        initials: 'fk',
        tint: 'var(--grad-sunrise)',
        seller: 'SuperComNet · marketplace seller',
        priceMinor: 13149000,
        delivery: '₹49 · 3 days',
        trust: 'Community · 26 min ago',
        sellerRating: '4.3 · 86,204 ratings',
        productRating: '4.6 · 11,208 reviews',
        why: '₹1,554 more than #1 once the ₹49 delivery is added. Stock confirmed 20 minutes ago.',
      },
      {
        rank: 3,
        retailer: 'Croma',
        initials: 'cr',
        tint: 'var(--grad-aurora)',
        seller: 'Croma · official store',
        priceMinor: 13499000,
        delivery: 'Free · same day',
        trust: 'Community · 1 hr ago',
        sellerRating: '4.4 · 12,900 ratings',
        productRating: '4.6 · 3,411 reviews',
        why: 'Highest total, but includes a 2-year extended warranty. Warranty value is not priced into the total.',
      },
    ],
    truth: [
      { label: 'Listed product price', amount: inr(12999900), state: 'Confirmed' },
      { label: 'Delivery', amount: inr(0), state: 'Confirmed', note: 'free on this order' },
      { label: 'GST', amount: 'Included', state: 'Not applicable', note: 'Indian MRP is tax-inclusive' },
      { label: 'Bank offer (HDFC credit card)', amount: `− ${inr(400000)}`, state: 'Confirmed' },
      {
        label: 'Exchange bonus',
        amount: `− ${inr(500000)}`,
        state: 'Conditional',
        note: 'requires a working device of any brand — not counted',
      },
    ],
    truthTotal: inr(12599900),
    truthNote: 'Every line is confirmed, so this total is verified for the declared context.',
    footnote:
      'A cheaper listed price is not a cheaper purchase. Offer #2 lists ₹1,491 less than #3 but costs ₹1,491 more after delivery — and only #3 includes the extended warranty.',
  },
  {
    id: 'grocery',
    label: 'Groceries',
    icon: 'cart',
    product: 'Lay’s Classic Salted',
    variant: '52 g pouch · PIN 712201',
    matchNote: 'Matched by GTIN · price is community-reported',
    offers: [
      {
        rank: 1,
        retailer: 'Blinkit',
        initials: 'bl',
        tint: 'var(--grad-mint)',
        seller: 'Dark store · PIN 712201',
        priceMinor: 2000,
        unitPrice: '₹38.46 / 100 g',
        delivery: 'Conditional',
        trust: 'Community · 12 min ago',
        sellerRating: 'Platform seller',
        productRating: 'No separate rating',
        why: 'Lowest reported price for this exact 52 g pack in your PIN code, reported 12 minutes ago.',
      },
      {
        rank: 2,
        retailer: 'Zepto',
        initials: 'zp',
        tint: 'var(--grad-aurora)',
        seller: 'Dark store · PIN 712201',
        priceMinor: 2200,
        unitPrice: '₹42.31 / 100 g',
        delivery: 'Conditional',
        trust: 'Community · 26 min ago',
        sellerRating: 'Platform seller',
        productRating: 'No separate rating',
        why: '₹2 more for the identical pack in the same PIN code. Reported 26 minutes ago.',
      },
      {
        rank: 3,
        retailer: 'Swiggy Instamart',
        initials: 'in',
        tint: 'var(--grad-lagoon)',
        seller: 'Dark store · PIN 712201',
        priceMinor: 2400,
        unitPrice: '₹46.15 / 100 g',
        delivery: 'Conditional',
        trust: 'Community · 41 min ago',
        sellerRating: 'Platform seller',
        productRating: 'No separate rating',
        why: 'Highest of the three. Delivery is usually free above a ₹199 cart — shown, never added to the total.',
      },
    ],
    truth: [
      { label: 'Reported product price', amount: inr(2000), state: 'Community' },
      {
        label: 'Delivery fee',
        amount: `${inr(2500)}`,
        state: 'Conditional',
        note: 'free above a ₹199 cart — not counted',
      },
      {
        label: 'Handling fee',
        amount: `${inr(500)}`,
        state: 'Conditional',
        note: 'waived on membership — not counted',
      },
    ],
    truthTotal: inr(2000),
    truthNote:
      'Known total is ₹20. Between ₹0 and ₹30 of fees depend on your cart, so we show them instead of guessing.',
    footnote:
      'Pack size changes everything: a 180 g family pack at ₹55 is ₹30.56 / 100 g — better value than all three above. Unit price is shown on every grocery offer, and 52 g is never ranked against 180 g.',
  },
];

export function SampleComparison() {
  const [active, setActive] = useState<Dataset['id']>('electronics');
  const dataset = DATA.find((d) => d.id === active)!;

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 14 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Three offers. Never thirty.</h2>
          <p className="lede" style={{ margin: 0 }}>
            A decision, not a dump. Here is the whole comparison screen — built, styled and clearly labelled as a sample.
          </p>
        </div>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <div className="row" role="tablist" aria-label="Sample category" style={{ gap: 6 }}>
          {DATA.map((d) => (
            <button
              key={d.id}
              role="tab"
              aria-selected={active === d.id}
              className={`chip`}
              onClick={() => setActive(d.id)}
              style={
                active === d.id
                  ? { background: 'var(--ink)', color: 'var(--surface)', borderColor: 'var(--ink)' }
                  : undefined
              }
            >
              <Icon name={d.icon} size={15} /> {d.label}
            </button>
          ))}
        </div>
        <DemoFlag />
      </div>

      <div className="card card-lg demo-wrap" data-origin="demo">
        <div className="row" style={{ gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
          <div
            aria-hidden="true"
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              display: 'grid',
              placeItems: 'center',
              fontSize: '1.5rem',
              background: 'var(--grad-sunrise)',
              flex: '0 0 auto',
              boxShadow: 'var(--sh-1)',
            }}
          >
            <Icon name={dataset.icon} size={26} strokeWidth={1.8} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: '0 0 2px', fontSize: '1.08rem' }}>{dataset.product}</h3>
            <p className="small" style={{ margin: 0 }}>
              {dataset.variant}
            </p>
            <span className="badge badge-turq" style={{ marginTop: 6 }}>
              {dataset.matchNote}
            </span>
          </div>
        </div>

        <div className="grid grid-3" style={{ alignItems: 'stretch' }}>
          {dataset.offers.map((offer) => (
            <OfferCard key={offer.retailer} offer={offer} />
          ))}
        </div>

        <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
          <div className="card" style={{ background: 'var(--surface)' }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <h4 style={{ margin: 0 }}>Price Truth — offer #1</h4>
              <span className="badge badge-blue">Expandable in the real app</span>
            </div>
            <div className="pt-list">
              {dataset.truth.map((line) => (
                <div className="pt-row" key={line.label}>
                  <span className="pt-label">
                    {line.label}
                    <StateBadge state={line.state} />
                    {line.note && <span className="tiny">{line.note}</span>}
                  </span>
                  <span className="pt-amount numeric">{line.amount}</span>
                </div>
              ))}
            </div>
            <div className="pt-total">
              <span>Known total</span>
              <span className="numeric" style={{ color: 'var(--turq-d)' }}>
                {dataset.truthTotal}
              </span>
            </div>
            <p className="tiny" style={{ margin: '8px 0 0' }}>
              {dataset.truthNote}
            </p>
          </div>

          <div className="stack">
            <div className="callout-info callout">
              <div className="callout-title">
                <Icon name="search" size={16} /> Why offer #1 is ranked first
              </div>
              <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
                {dataset.offers[0]!.why}
              </p>
              <p className="tiny" style={{ margin: '8px 0 0' }}>
                Ranking is computed from verified total, variant match, seller reliability, delivery and freshness.
                Affiliate commission is never an input.
              </p>
            </div>
            <div className="callout">
              <div className="callout-title">
                <Icon name="bulb" size={16} /> What this sample is teaching
              </div>
              <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
                {dataset.footnote}
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="tiny" style={{ marginTop: 12, maxWidth: '62ch' }}>
        This is a hand-built sample with fictional prices, sellers and timestamps — it is not live retailer data and it
        is labelled as such in the interface and in the DOM (<code>data-origin="demo"</code>). Nothing here is
        presented as a real quote.
      </p>
    </div>
  );
}

function StateBadge({ state }: { state: string }) {
  const map: Record<string, string> = {
    Confirmed: 'badge-turq',
    Community: 'badge-violet',
    Conditional: 'badge-sun',
    'Not applicable': 'badge-neutral',
  };
  return <span className={`badge ${map[state] ?? 'badge-neutral'}`}>{state}</span>;
}

function OfferCard({ offer }: { offer: Offer }) {
  const animated = useCountUp(offer.priceMinor);

  return (
    <article
      className="offer"
      style={offer.rank === 1 ? { borderColor: 'var(--turq)', boxShadow: '0 18px 40px -22px rgba(15,127,118,.45)' } : undefined}
    >
      <span className={`offer-rank offer-rank-${offer.rank}`}>
        {offer.rank === 1 ? '★ Best verified' : `#${offer.rank}`}
      </span>

      <div className="offer-head">
        <div className="offer-logo" style={{ background: offer.tint, color: offer.rank === 1 ? 'var(--ink)' : '#fff' }}>
          {offer.initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="offer-retailer">{offer.retailer}</div>
          <div className="offer-seller">{offer.seller}</div>
        </div>
      </div>

      <div>
        <div className="offer-price numeric">{inr(animated)}</div>
        {offer.unitPrice && (
          <div className="offer-price-note numeric">
            <strong>{offer.unitPrice}</strong> · unit price
          </div>
        )}
        <div className="offer-price-note">{offer.trust}</div>
      </div>

      <dl className="offer-meta">
        <div>
          <dt>Delivery</dt>
          <dd>{offer.delivery}</dd>
        </div>
        <div>
          <dt>Seller rating</dt>
          <dd>{offer.sellerRating}</dd>
        </div>
        <div>
          <dt>Product rating</dt>
          <dd>{offer.productRating}</dd>
        </div>
      </dl>

      <p className="offer-why" style={{ margin: 0 }}>
        <strong>Why #{offer.rank}:</strong> {offer.why}
      </p>

      <div className="row" style={{ gap: 6, marginTop: 'auto' }}>
        <span className="badge badge-neutral">Buy at store</span>
        <span className="badge badge-neutral">Breakdown</span>
        <span className="badge badge-neutral">Save</span>
      </div>
    </article>
  );
}
