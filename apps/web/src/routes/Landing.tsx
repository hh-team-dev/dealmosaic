import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '../components/Chrome';
import { DealsTicker } from '../components/DealsTicker';
import { DiscoverShelves } from '../components/DiscoverShelves';
import { SampleComparison } from '../components/SampleComparison';
import { Icon } from '../components/Icon';
import { Button } from '../components/Ui';
import { useToast } from '../components/Toast';

const PLATFORMS = [
  { name: 'Blinkit', note: 'No price API', tint: 'var(--sun)' },
  { name: 'Zepto', note: 'No price API', tint: 'var(--magenta)' },
  { name: 'Swiggy Instamart', note: 'Affiliate only', tint: 'var(--tang)' },
  { name: 'BigBasket', note: 'Affiliate only', tint: 'var(--coral)' },
  { name: 'JioMart', note: 'Affiliate only', tint: 'var(--ember)' },
  { name: 'Flipkart Minutes', note: 'Closed to new', tint: 'var(--pink)' },
  { name: 'Amazon Now', note: 'Gated', tint: 'var(--grass)' },
  { name: 'DMart Ready', note: 'No price API', tint: 'var(--lime)' },
];

/**
 * Live totals for the proof strip.
 *
 * Fetched rather than written into the markup: a hard-coded "1,089 offers" is
 * wrong the next time the feed runs, and a stale number on the first screen is
 * the exact kind of over-claim the rest of the site refuses to make. If the
 * request fails the strip simply does not render — no number is better than an
 * unverified one.
 */
type Proof = { live: number; withCode: number };

function useProof(): Proof | null {
  const [proof, setProof] = useState<Proof | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/coupons/discover')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d?.totals) return;
        const { live: count, withCode } = d.totals as Proof;
        if (typeof count === 'number' && count > 0) setProof({ live: count, withCode });
      })
      .catch(() => {
        /* offline or a cold API: leave the strip out rather than invent a number */
      });
    return () => {
      live = false;
    };
  }, []);
  return proof;
}

export default function Landing() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const proof = useProof();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      toast.push('Type at least two characters — try “Lay’s Classic Salted 52 g”.', 'info');
      return;
    }
    // Search is public. The old flow intercepted anonymous visitors and sent
    // them to a sign-up form, which contradicted the "no sign-up needed to
    // compare" promise two lines below the input and lost the search entirely.
    // A visitor now sees prices first and is only asked for an account when
    // there is something worth saving.
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <DealsTicker />

      <main id="main">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="hero">
          <span className="hero-blob hero-blob-1" aria-hidden="true" />
          <span className="hero-blob hero-blob-2" aria-hidden="true" />
          <div className="container hero-inner">
            <span className="badge badge-lime"><span className="dot dot-grass" aria-hidden="true" />Live across India · prices in ₹</span>
            <h1 style={{ marginTop: 12 }}>
              The price you’ll <em>actually</em> pay.
            </h1>
            <p className="lede" style={{ maxWidth: '56ch' }}>
              Sticker prices leave out delivery, fees and tax. We add them, match the exact pack or variant, and rank
              what is really left to pay — and where a cost is unknown, we say so instead of guessing.
            </p>

            <form className="searchdemo" onSubmit={handleSearch} role="search">
              <div className="searchdemo-row">
                <div className="searchdemo-input">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <label className="sr-only" htmlFor="hero-search">
                    Search for a product
                  </label>
                  <input
                    id="hero-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search a product, brand or model"
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                </div>
                <Button type="submit" variant="primary" size="lg">
                  Compare prices
                </Button>
              </div>
              <div className="searchdemo-meta">
                <span className="chip">
                  <span className="dot dot-sun" aria-hidden="true" />
                  India · INR ₹
                </span>
                <span className="chip">
                  <span className="dot dot-magenta" aria-hidden="true" />
                  Groceries
                </span>
                <span className="chip">
                  <span className="dot dot-ember" aria-hidden="true" />
                  Electronics
                </span>
                <span className="small">Free to use. No sign-up needed to compare.</span>
              </div>
            </form>

            {/* One primary action (the search above) plus two quiet links.
                A third and fourth large button pushed the discovery wall below
                the fold on a 390 px phone, which defeats the point of having one. */}
            <div className="hero-links">
              <a href="#discover">See today’s best deals</a>
              <span aria-hidden="true">·</span>
              <a href="#how">How ranking works</a>
              <span aria-hidden="true">·</span>
              <Link to="/saved">Your saved deals</Link>
            </div>

            {proof && (
              <p className="hero-proof">
                <strong>{proof.live.toLocaleString('en-IN')}</strong> live store offers ·{' '}
                <strong>{proof.withCode.toLocaleString('en-IN')}</strong> with a code you can copy · every one carries
                its expiry date
              </p>
            )}

            <div className="hero-trust">
              <span className="chip">
                <span className="dot dot-grass" aria-hidden="true" />
                Every price timestamped
              </span>
              <span className="chip">
                <span className="dot dot-coral" aria-hidden="true" />
                Ranking never sold
              </span>
              <span className="chip">
                <span className="dot dot-magenta" aria-hidden="true" />
                Itemised totals
              </span>
              <span className="chip">
                <span className="dot dot-ember" aria-hidden="true" />
                No trackers
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------- discovery wall --------------------------- */}
        {/* Placed above every explanatory section on purpose: a visitor should be
            able to enjoy something real before reading anything about us. */}
        <DiscoverShelves />

        {/* --------------------------- how it works --------------------------- */}
        <section className="section-tight" id="how">
          <div className="container">
            <span className="eyebrow">How it works</span>
            <h2>Three steps, and one of them is honesty</h2>
            <div className="grid grid-3" style={{ marginTop: 18 }}>
              <div className="step-card">
                <span className="step-num step-num-1">1</span>
                <h3>Search once</h3>
                <p className="small" style={{ marginBottom: 0 }}>
                  Type a product, a model number or a GTIN. We resolve the exact variant — 512 GB is never mixed with
                  256 GB, and a 52 g packet is never compared with a 180 g one.
                </p>
              </div>
              <div className="step-card">
                <span className="step-num step-num-2">2</span>
                <h3>See the true total</h3>
                <p className="small" style={{ marginBottom: 0 }}>
                  The Price Truth engine itemises product price, delivery, taxes, fees and confirmed discounts — and
                  labels anything missing as missing, never as zero.
                </p>
              </div>
              <div className="step-card">
                <span className="step-num step-num-3">3</span>
                <h3>Get three ranked offers</h3>
                <p className="small" style={{ marginBottom: 0 }}>
                  Ranked by verified total, then match quality, seller reliability, delivery and freshness. Commission
                  is never an input. Two good offers beat three padded ones.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------- sample comparison ------------------------ */}
        <section className="section-tight" id="sample">
          <div className="container">
            <SampleComparison />
          </div>
        </section>

        {/* -------------------------- two speeds ----------------------------- */}
        <section className="section-tight">
          <div className="container">
            <span className="eyebrow">Built for India’s two shopping speeds</span>
            <h2>Marketplaces and 10-minute delivery, held to the same standard</h2>
            <p className="lede">
              Big-ticket electronics and a packet of chips deserve the same scrutiny — but they behave completely
              differently. Quick-commerce prices change by PIN code and by the hour, so a “national” grocery price
              would be fiction. Here is exactly where each platform stands.
            </p>

            <div className="grid grid-2" style={{ marginTop: 18 }}>
              <div className="card card-top-magenta">
                <h3 style={{ marginTop: 0 }}>Marketplaces</h3>
                <p className="small">
                  Amazon, Flipkart, Croma, Reliance Digital and friends. Prices are relatively stable, delivery is
                  scheduled, and the killer question is the <strong>landed total</strong> — not the listed number.
                </p>
                <div className="row">
                  <span className="badge badge-ember">Electronics · fashion · home</span>
                  <span className="badge badge-grass">Scheduled delivery compared</span>
                </div>
              </div>
              <div className="card card-top-sun">
                <h3 style={{ marginTop: 0 }}>10-minute delivery</h3>
                <p className="small">
                  Blinkit, Zepto, Instamart and the rest. Prices are per dark store and per PIN code, fees are
                  conditional on your cart, and pack size quietly decides the real value. We handle all of it —
                  including saying “we don’t know” when we don’t.
                </p>
                <div className="row">
                  <span className="badge badge-sun">Groceries · daily essentials</span>
                  <span className="badge badge-magenta">Pincode-aware pricing</span>
                </div>
              </div>
            </div>

            <div className="row" style={{ marginTop: 16 }}>
              {PLATFORMS.map((p) => (
                <span className="chip" key={p.name}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 3,
                      background: p.tint,
                      display: 'inline-block',
                    }}
                  />
                  {p.name}
                  <span className="tiny" style={{ fontWeight: 600 }}>
                    · {p.note}
                  </span>
                </span>
              ))}
            </div>

            <div className="callout" style={{ marginTop: 18 }}>
              <div className="callout-title">
                <Icon name="shield" size={16} /> How every price gets here
              </div>
              <p className="small" style={{ marginBottom: 10, color: 'var(--ink)' }}>
                Three sources, each labelled, so you always know what you are looking at:
              </p>
              <ul className="plain-list small" style={{ marginBottom: 0, color: 'var(--ink)' }}>
                <li><strong>Merchant feeds</strong> — offered prices and coupon codes pulled from the retailer&apos;s own campaign data, refreshed continuously.</li>
                <li><strong>Shopper reports</strong> — what someone actually paid at their pincode, kept separate and timestamped.</li>
                <li><strong>Illustrative pricing</strong> — clearly marked sample data while a retailer&apos;s feed is being onboarded. Never passed off as a live quote.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------------------- promise ------------------------------ */}
        <section className="section-tight">
          <div className="container">
            <span className="eyebrow">The promise</span>
            <h2>What we will never do</h2>
            <div className="grid grid-4" style={{ marginTop: 16 }}>
              {[
                { icon: 'ban' as const, title: 'Sell a ranking', body: 'Commission never touches the sort order. Sponsored slots, if they ever exist, will be separated and labelled.' },
                { icon: 'chart' as const, title: 'Show a guess as a price', body: 'Unknown delivery or duty is displayed as unknown and the total is flagged, never quietly counted as zero.' },
                { icon: 'box' as const, title: 'Invent completeness', body: 'Two verified offers beat three padded ones. Every result says how many sources actually answered.' },
                { icon: 'sparkle' as const, title: 'Disguise sample data', body: 'Anything that is not live is watermarked in the UI and tagged in the DOM. You will always know what you are looking at.' },
              ].map((item) => (
                <div className="card" key={item.title}>
                  <div style={{ color: 'var(--magenta-d)', marginBottom: 8 }}>
                    <Icon name={item.icon} size={24} />
                  </div>
                  <h4 style={{ marginBottom: 4 }}>{item.title}</h4>
                  <p className="small" style={{ margin: 0 }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ cta -------------------------------- */}
        <section className="section">
          <div className="container">
            <div
              className="card card-lg center-text"
              style={{ background: 'var(--grad-ember)', border: 'none', boxShadow: 'var(--sh-3)' }}
            >
              {/* No text-shadow: the gradient's every stop now clears 5.9:1 with
                  white, so the shadow was compensating for a contrast problem that
                  no longer exists — and a haze behind white type never reads as
                  premium. */}
              <h2 style={{ color: '#fff' }}>
                Stop overpaying on autopilot
              </h2>
              <p style={{ color: '#fff', margin: '0 auto 18px', maxWidth: '46ch', opacity: 0.94 }}>
                Keep the deals worth keeping, find them again without searching twice, and compare the exact
                variant before you pay. Free to use, and the saved list works without an account.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Link to="/register" className="btn btn-lg" style={{ background: '#fff', color: 'var(--ink)', border: 'none' }}>
                  Create free account
                </Link>
                <Link
                  to="/login"
                  className="btn btn-lg btn-ghost"
                  style={{ color: '#fff', borderColor: 'rgba(255,255,255,.6)' }}
                >
                  I already have one
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
