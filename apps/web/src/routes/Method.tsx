import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chrome } from '../components/PublicChrome';
import { Icon } from '../components/Icon';
import { Seo, breadcrumbJsonLd } from '../lib/seo';
import { getConnectors, type ConnectorHealth, type KnownPlatform } from '../lib/search-api';

/**
 * /how-we-rank and /data-sources.
 *
 * These are not marketing pages. They exist because a comparison site that will
 * not explain its ranking cannot be trusted, and because the honest answer to
 * "where do your prices come from?" is currently "authorised connectors where we
 * have them, and nothing where we don't".
 */

const LADDER = [
  { score: '1.00', method: 'GTIN / EAN / UPC', detail: 'A barcode is an identity. Exact match, no guessing.' },
  { score: '0.95', method: 'Manufacturer part number', detail: 'The maker’s own model code for that exact item.' },
  { score: '0.92', method: 'ISBN', detail: 'Books are identified by ISBN, not by title text.' },
  { score: '0.86', method: 'Brand + model + variant attributes', detail: 'Storage, size, colour and pack count must all agree.' },
  { score: '0.72', method: 'Brand + model, attributes partly agree', detail: 'Shown, but never auto-selected.' },
  { score: '0.55', method: 'Brand + model only', detail: 'No variant data to check. We tell you that.' },
  { score: '0.40', method: 'Title similarity', detail: 'Listed as a possible match, never presented as one.' },
];

const WEIGHTS = [
  ['Source reliability', 30, 'Authorised connector, verified feed, or shopper report.'],
  ['Price freshness', 25, 'How long ago the price was actually observed.'],
  ['Product match', 20, 'Certainty that this is the exact variant you asked for.'],
  ['Delivery information', 15, 'Whether the store publishes a delivery charge for the item.'],
  ['Seller information', 10, 'Whether the platform publishes seller ratings at all.'],
] as const;

export function HowWeRank() {
  return (
    <>
      <Seo
        title="How we rank deals — the rules, in full"
        description="The exact ranking rules behind DEALMOSAIC: verified totals first, at most three offers, commission is never an input, and an unverified total can never be ranked first."
        path="/how-we-rank"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'How we rank', path: '/how-we-rank' },
        ])}
      />
      <Chrome>
        <div className="container section prose">
          <span className="eyebrow">Methodology</span>
          <h1 className="h1">We show three deals. Here is exactly how they are ordered.</h1>
          <p className="lede">
            A ranking you cannot inspect is just an assertion. Every rule below is enforced in code and covered by an
            automated test — including the two that are easy to break quietly.
          </p>

          <h2 className="h2">The two rules that matter most</h2>
          <div className="rule-grid">
            <div className="card rule-card">
              <Icon name="shield" size={22} />
              <h3 className="h4">An unverified total can never be #1</h3>
              <p className="small">
                If a store publishes no delivery charge, the total is unknown — not zero. That offer is ranked below every
                fully-verified offer, however cheap it looks. Its card says{' '}
                <strong>TOTAL NOT FULLY VERIFIED</strong> instead of showing a confident number.
              </p>
            </div>
            <div className="card rule-card">
              <Icon name="ban-circle" size={22} />
              <h3 className="h4">Commission never moves a price</h3>
              <p className="small">
                Affiliate commission is not an input to the ranking function. A test permutes every commission rate to the
                extreme values and asserts the order does not change — if that ever fails, the build fails.
              </p>
            </div>
          </div>

          <h2 className="h2">Hotel and dining personal comparisons</h2>
          <p>Hotel and dining workspaces use separate rules from product ranking. Places appear alphabetically. Quotes are personal entries, not live or provider-verified prices. A matching group requires the same place, dates, party, room allocation or meal, inclusions, cancellation deadline, payment timing and eligibility conditions. Only complete entered costs with established conditions and records no older than 24 hours can take a lowest-entered-total position; every equal-low quote shares the position. The comparison depends on your entries and is not a cheapest-anywhere guarantee. Unknown fees are not zero, refundable deposits are shown separately, and cashback and commission cannot lower the ranked cost.</p>
          <h2 className="h2">How two offers are proven to be the same product</h2>
          <p>
            Most price-comparison mistakes are not arithmetic — they are identity mistakes: comparing a 256 GB phone to a
            512 GB one because the titles look alike. We resolve identity with an explicit ladder and keep the reason.
          </p>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable comparison table">
            <table className="data-table">
              <caption className="sr-only">Matching ladder with confidence values</caption>
              <thead>
                <tr>
                  <th scope="col">Confidence</th>
                  <th scope="col">Method</th>
                  <th scope="col">What it means</th>
                </tr>
              </thead>
              <tbody>
                {LADDER.map((row) => (
                  <tr key={row.method}>
                    <td className="numeric">{row.score}</td>
                    <th scope="row">{row.method}</th>
                    <td>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted">
            Anything below 0.70 is not compared automatically. We ask you which variant you meant, because a comparison
            built on the wrong variant is worse than no comparison.
          </p>

          <h2 className="h2">Deal Confidence: what the number means</h2>
          <p>
            Deal confidence measures how much we trust the <em>data</em> behind a price. It is not a product score and not
            a seller score. The weights are public:
          </p>
          <ul className="weight-list">
            {WEIGHTS.map(([label, weight, detail]) => (
              <li key={label}>
                <div className="row-between">
                  <strong>{label}</strong>
                  <span className="numeric">{weight}%</span>
                </div>
                <div className="weight-bar" aria-hidden="true">
                  <span style={{ width: `${weight}%` }} />
                </div>
                <p className="tiny muted">{detail}</p>
              </li>
            ))}
          </ul>

          <h2 className="h2">What we will not do</h2>
          <ul className="plain-list">
            <li>We will not rank a partially-known total first because it looks cheaper.</li>
            <li>We will not average different variants into a single “from” price.</li>
            <li>We will not draw a 12-month price chart for data we started collecting last week.</li>
            <li>We will not invent reviews, ratings or partnerships.</li>
            <li>We will not scrape a store that has not authorised us.</li>
          </ul>

          <p>
            <Link to="/data-sources">Where our prices actually come from →</Link>
          </p>
        </div>
      </Chrome>
    </>
  );
}

const STATUS_COPY: Record<KnownPlatform['status'], { label: string; tone: string }> = {
  connected: { label: 'Connected', tone: 'grass' },
  awaiting_credentials: { label: 'Waiting for API keys', tone: 'sun' },
  no_public_api: { label: 'No public API', tone: 'coral' },
  partnership_required: { label: 'Partnership required', tone: 'neutral' },
};

export function DataSources() {
  const [connectors, setConnectors] = useState<ConnectorHealth[] | null>(null);
  const [known, setKnown] = useState<KnownPlatform[]>([]);
  const [policy, setPolicy] = useState('');

  useEffect(() => {
    let alive = true;
    getConnectors()
      .then((d) => {
        if (!alive) return;
        setConnectors(d.connectors);
        setKnown(d.knownPlatforms);
        setPolicy(d.policy);
      })
      .catch(() => alive && setConnectors([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Seo
        title="Where our prices come from"
        description="Every price source behind DEALMOSAIC, including the ones we do not have. Connector-by-connector status, what it would take to connect each Indian platform, and why we show nothing rather than invent a number."
        path="/data-sources"
        jsonLd={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Data sources', path: '/data-sources' },
        ])}
      />
      <Chrome>
        <div className="container section prose">
          <span className="eyebrow">Transparency</span>
          <h1 className="h1">Know what you are comparing</h1>
          <p className="lede">
            Store-listed promotions, exact-item prices and shopper reports are different kinds of information. Check the source and the date before relying on a number.
          </p>

          <h2 className="h2">Hospitality places and personal quotes</h2>
          <p>The hospitality comparison workspaces contain 40 selected hotels and 33 dining places, combining our existing pet-policy research with separately sourced general places. Each place shows its publication source and review date. This is not exhaustive inventory or proof of current availability, pet admission or accessibility. There is no connected live room-rate or table-reservation feed. Monetary amounts in the personal quote collection come from your entries, not the venue directory; they are never labelled provider-verified.</p>
          <h2 className="h2">Product-price sources</h2>
          {connectors === null && <div className="skeleton skeleton-card" />}
          {connectors?.map((c) => (
            <div key={c.slug} className="card connector-card">
              <div className="row-between">
                <strong>{c.displayName}</strong>
                <span className={`badge badge-${c.status === 'live' ? 'grass' : c.status === 'demo' ? 'sun' : 'coral'}`}>
                  {c.status}
                </span>
              </div>
              <p className="small">{c.detail}</p>
              {c.docsUrl && (
                <a className="tiny" href={c.docsUrl} target="_blank" rel="noopener noreferrer">
                  API documentation
                </a>
              )}
            </div>
          ))}

          <h2 className="h2">Platform price coverage</h2>
          <div className="table-wrap" tabIndex={0} role="region" aria-label="Scrollable comparison table">
            <table className="data-table">
              <caption className="sr-only">Platform access status</caption>
              <thead>
                <tr>
                  <th scope="col">Platform</th>
                  <th scope="col">Status</th>
                  <th scope="col">Why</th>
                </tr>
              </thead>
              <tbody>
                {known.map((p) => (
                  <tr key={p.slug}>
                    <th scope="row">{p.displayName}</th>
                    <td>
                      <span className={`badge badge-${STATUS_COPY[p.status]?.tone ?? 'neutral'}`}>
                        {STATUS_COPY[p.status]?.label ?? p.status}
                      </span>
                    </td>
                    <td className="small">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="h2">Our policy</h2>
          <p>{policy}</p>
          <p className="small muted">
            Quick-commerce prices in India vary by dark store and pincode and change through the day. There is no national
            grocery price, so we will never present one as if there were.
          </p>
        </div>
      </Chrome>
    </>
  );
}
