import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '../components/Chrome';
import { SampleComparison } from '../components/SampleComparison';
import { Icon } from '../components/Icon';
import { Button } from '../components/Ui';
import { useAuth } from '../lib/session';
import { useToast } from '../components/Toast';

const PLATFORMS = [
  { name: 'Blinkit', note: 'No price API', tint: 'var(--sun)' },
  { name: 'Zepto', note: 'No price API', tint: 'var(--violet)' },
  { name: 'Swiggy Instamart', note: 'Affiliate only', tint: 'var(--tang)' },
  { name: 'BigBasket', note: 'Affiliate only', tint: 'var(--coral)' },
  { name: 'JioMart', note: 'Affiliate only', tint: 'var(--blue)' },
  { name: 'Flipkart Minutes', note: 'Closed to new', tint: 'var(--pink)' },
  { name: 'Amazon Now', note: 'Gated', tint: 'var(--turq)' },
  { name: 'DMart Ready', note: 'No price API', tint: 'var(--lime)' },
];

export default function Landing() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) {
      toast.push('Type at least two characters — try “Lay’s Classic Salted 52 g”.', 'info');
      return;
    }
    // Comparison is members-only, so an anonymous searcher is sent to create the
    // free account and then straight through to their results.
    if (user) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      return;
    }
    navigate(`/register?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />

      <main id="main">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="hero">
          <span className="hero-blob hero-blob-1" aria-hidden="true" />
          <span className="hero-blob hero-blob-2" aria-hidden="true" />
          <div className="container hero-inner">
            <span className="badge badge-lime"><span className="dot dot-turq" aria-hidden="true" />India first · private beta</span>
            <h1 style={{ marginTop: 12 }}>
              One search. <em>Three real deals.</em>
              <br />
              Zero price surprises.
            </h1>
            <p className="lede" style={{ maxWidth: '56ch' }}>
              DEALMOSAIC checks India’s marketplaces and 10-minute delivery apps, matches the exact variant, adds up
              delivery, fees and discounts — then ranks at most three offers and tells you <em>why</em> each one sits
              where it does.
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
                    placeholder="What are you hunting for today?"
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
                  <span className="dot dot-violet" aria-hidden="true" />
                  Groceries
                </span>
                <span className="chip">
                  <span className="dot dot-blue" aria-hidden="true" />
                  Electronics
                </span>
                <span className="small">Search is members-only — accounts are free.</span>
              </div>
            </form>

            <div className="hero-cta">
              <Link to="/register" className="btn btn-primary btn-lg">
                Create free account
              </Link>
              <a href="#how" className="btn btn-quiet btn-lg">
                See how ranking works
              </a>
            </div>

            <div className="hero-trust">
              <span className="chip">
                <span className="dot dot-turq" aria-hidden="true" />
                Every price timestamped
              </span>
              <span className="chip">
                <span className="dot dot-coral" aria-hidden="true" />
                Ranking never sold
              </span>
              <span className="chip">
                <span className="dot dot-violet" aria-hidden="true" />
                Itemised totals
              </span>
              <span className="chip">
                <span className="dot dot-blue" aria-hidden="true" />
                No trackers
              </span>
            </div>
          </div>
        </section>

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
              <div className="card card-top-violet">
                <h3 style={{ marginTop: 0 }}>Marketplaces</h3>
                <p className="small">
                  Amazon, Flipkart, Croma, Reliance Digital and friends. Prices are relatively stable, delivery is
                  scheduled, and the killer question is the <strong>landed total</strong> — not the listed number.
                </p>
                <div className="row">
                  <span className="badge badge-blue">Live connector: pending approval</span>
                  <span className="badge badge-sun">Community prices: yes</span>
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
                  <span className="badge badge-sun">No authorised price API</span>
                  <span className="badge badge-violet">Pincode-scoped</span>
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
                <Icon name="shield" size={16} /> Why you will not see live Blinkit prices on day one
              </div>
              <p className="small" style={{ marginBottom: 0, color: 'var(--ink)' }}>
                None of these platforms publishes an authorised price API, and their affiliate programmes monetise
                links — not data. So for quick commerce we do three honest things instead: link you straight to the
                platform’s own search, show <strong>community-reported prices</strong> in a clearly separate trust
                tier with a 90-minute expiry, and switch on a proper connector the moment legal access exists. We will
                never scrape a retailer or invent a price to look complete.
              </p>
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
                  <div style={{ color: 'var(--violet-d)', marginBottom: 8 }}>
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
              style={{ background: 'var(--grad-prism)', border: 'none', boxShadow: 'var(--sh-3)' }}
            >
              <h2 style={{ color: '#fff', textShadow: '0 2px 14px rgba(69,43,94,.35)' }}>
                Be first when the comparison engine goes live
              </h2>
              <p style={{ color: '#fff', margin: '0 auto 18px', maxWidth: '46ch', textShadow: '0 1px 8px rgba(69,43,94,.3)' }}>
                Phase 1 is live now: accounts, preferences, PIN codes and the design system. Phase 2 brings the engine.
                Create an account and your watchlist, alerts and XP will be waiting.
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
