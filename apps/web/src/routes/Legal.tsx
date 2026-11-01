import { Link } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '../components/Chrome';
import { Icon } from '../components/Icon';
import { Seo } from '../lib/seo';

/**
 * Every legal page declares its own title, description and canonical URL. Without
 * that they inherit the homepage canonical from index.html and tell Google that
 * /privacy is a duplicate of / — which is wrong, and quietly costs indexation.
 */
function LegalPage({
  title,
  updated,
  path,
  description,
  children,
}: {
  title: string;
  updated?: string;
  path: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Seo title={title} description={description} path={path} />
      <SiteHeader />
      <main className="container section" id="main">
        <div className="prose">
          <Link to="/" className="small">
            ← Back to home
          </Link>
          <h1 style={{ fontSize: 'clamp(1.6rem, 5.6vw, 2.3rem)', marginTop: 12 }}>{title}</h1>
          {updated && <p className="updated">Last updated {updated} · Written in plain English on purpose.</p>}
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Privacy() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="2 November 2026"
      path="/privacy"
      description="What DEALMOSAIC collects, why, how long it is kept, and how to export or delete everything in one click. Written in plain English, compliant with India's DPDP Act."
    >
      <div className="callout callout-info">
        <div className="callout-title">
          <Icon name="info" size={16} /> The short version
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          We collect what an account genuinely needs: your email, a display name, a password hash and your preferences.
          We do not run ad networks or third-party trackers. You can export everything or delete everything, instantly,
          from your settings.
        </p>
      </div>

      <h2>What we collect, and why</h2>
      <ul>
        <li>
          <strong>Email address</strong> — to sign you in, confirm the account, and send price alerts you asked for.
        </li>
        <li>
          <strong>Display name</strong> — so the product can address you. A first name is fine.
        </li>
        <li>
          <strong>Password</strong> — stored only as a salted scrypt hash. We cannot read it, and we will never ask you
          to send it anywhere.
        </li>
        <li>
          <strong>Preferences</strong> — country, display currency, notification choices, and optionally a 6-digit PIN
          code (needed only because quick-commerce prices differ per dark store).
        </li>
        <li>
          <strong>Phone number</strong> — strictly optional, used only for account recovery if you choose to add it.
        </li>
        <li>
          <strong>Session metadata</strong> — a hash of your IP address and your browser’s user-agent, used to protect
          your account and detect abuse. Hashed means we cannot read your IP back out of it.
        </li>
        <li>
          <strong>Activity you create</strong> — searches, saved products, alerts and reports, so the product works.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <ul>
        <li>Your date of birth. We ask a single age confirmation instead.</li>
        <li>Card, UPI, bank or payment details. DEALMOSAIC never processes a payment.</li>
        <li>Retailer account credentials. We never ask for them, and never will.</li>
        <li>GPS location. A PIN code is typed by you, optionally, and nothing else.</li>
        <li>Advertising identifiers, cross-site trackers, session recording or heatmaps.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Exactly one cookie is set: <code>dm_session</code>, which keeps you signed in. It is <code>HttpOnly</code>,{' '}
        <code>SameSite=Lax</code> and <code>Secure</code> over HTTPS. It contains no personal data — only an opaque
        token. There are no analytics or advertising cookies, so there is nothing to “accept”.
      </p>

      <h2>Who else sees data</h2>
      <ul>
        <li>
          Our hosting and database providers process data on our instructions. They are configured on free tiers and do
          not receive more than the minimum needed to serve the site.
        </li>
        <li>
          Exchange rates come from Frankfurter, which receives no personal data — we request public currency rates
          server-side.
        </li>
        <li>
          When you click through to a retailer, you leave DEALMOSAIC and the retailer’s own privacy policy applies. Some
          of those links carry affiliate parameters.
        </li>
        <li>We do not sell, rent or share personal data with data brokers. Ever.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        We design for India’s Digital Personal Data Protection Act, 2023 (and its phased rules) and for the GDPR-style
        expectations of internationally mobile users. In practice, from your account settings you can:
      </p>
      <ul>
        <li>Access and correct your profile and preferences.</li>
        <li>Export everything we hold as a JSON file.</li>
        <li>Delete the account, which removes your profile, preferences, PIN code, sessions and activity immediately.</li>
        <li>Withdraw consent for optional items (phone, PIN code, email notifications) at any time.</li>
      </ul>
      <p>
        We keep no shadow copies. Some security logs are retained in a minimal, hashed form for abuse prevention, and
        records required for legal compliance would be disclosed to you if they existed.
      </p>

      <h2>Children</h2>
      <p>
        DEALMOSAIC is for people aged 13 and over. We ask for a single confirmation rather than a date of birth, because
        we do not need to know when your birthday is.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes materially, we will tell you inside the product before the change takes effect. The date
        at the top always reflects the current version.
      </p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage
      title="Terms of use"
      updated="2 November 2026"
      path="/terms"
      description="The rules for using DEALMOSAIC: what our prices are and are not, what we promise about ranking, and the limits of that promise."
    >
      <h2>What DEALMOSAIC is</h2>
      <p>
        DEALMOSAIC is an independent price-comparison and purchase-decision tool. We do not sell products, take
        payments, hold stock, or arrange delivery. Every purchase happens on the retailer’s own website, under the
        retailer’s terms.
      </p>

      <h2>What we promise — and what we cannot</h2>
      <ul>
        <li>
          We show where every price came from and when we last observed it. Freshness is displayed, not implied.
        </li>
        <li>
          We compute a known total from the costs we can verify, and we label anything missing as missing rather than
          zero.
        </li>
        <li>
          We rank offers by verified total, match quality, seller reliability, delivery and freshness. Ranking is never
          sold and never influenced by commission.
        </li>
        <li>
          <strong>We cannot guarantee a retailer’s price.</strong> Prices, stock, delivery fees and promotions change
          minute to minute, especially on quick-commerce platforms. Always confirm the final amount at checkout.
        </li>
        <li>
          Where an authorised data source does not exist, we say so plainly instead of filling the gap with a guess.
        </li>
      </ul>

      <h2>Accounts</h2>
      <p>
        Search and personal features require a confirmed account. Keep your password to yourself; we will never ask for
        it. You are responsible for activity under your account. You may delete it at any time from settings.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not scrape, automate bulk requests, or attempt to bypass rate limits.</li>
        <li>Do not submit knowingly false community price reports or fake corrections.</li>
        <li>Do not attempt to access another person’s data, or probe the service for vulnerabilities without asking.</li>
      </ul>
      <p>
        We suspend accounts that attack the integrity of the comparison data, because that data is the product.
      </p>

      <h2>Community-reported prices</h2>
      <p>
        Where a platform publishes no authorised price feed, shoppers can report prices. These appear in a clearly
        separate trust tier, expire from ranking after 90 minutes, and are never presented as verified retailer data.
        They are information, not a quote.
      </p>

      <h2>Affiliate links</h2>
      <p>
        Some outbound links earn us a commission. It never changes what you pay and never influences our ranking. See
        the <Link to="/disclosure">affiliate disclosure</Link> for the detail.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided “as is”. To the extent permitted by law, we are not liable for pricing errors made by
        retailers, or for decisions you take based on our comparison. Where liability cannot be excluded, it is limited
        to the amount you paid us — which is nothing, because DEALMOSAIC is free.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, with courts in West Bengal having jurisdiction.</p>
    </LegalPage>
  );
}

export function Disclosure() {
  return (
    <LegalPage
      title="Affiliate disclosure"
      updated="2 November 2026"
      path="/disclosure"
      description="DEALMOSAIC may earn a commission on some retailer links. It never changes the price you pay and is never an input to our ranking — here is exactly how that works."
    >
      <div className="callout">
        <div className="callout-title">
          <Icon name="shield" size={16} /> One line, no small print
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          When you buy through some retailer links on DEALMOSAIC, we may earn a commission. The price you pay is
          identical, and commission never affects which offers we rank, or in what order.
        </p>
      </div>

      <h2>How we earn</h2>
      <p>
        DEALMOSAIC is free to use. Our intended revenue is affiliate commission: if you click through to a retailer and
        buy, that retailer may pay us a percentage. This is the same model used by most comparison sites — the difference
        is what we do with it.
      </p>

      <h2>What commission cannot do</h2>
      <ul>
        <li>It cannot change the sort order. The ranker receives verified cost and quality signals, never commission.</li>
        <li>It cannot buy a “Best verified” badge, a higher position, or a better explanation.</li>
        <li>It cannot raise the price you pay. Affiliate links never inflate a retailer’s checkout price.</li>
        <li>It cannot hide a cheaper non-affiliated offer. If a plain link is the best deal, it ranks first.</li>
      </ul>
      <p>
        Sponsored placements are not part of the product today. If they are ever introduced, they will be visually
        separated from organic results and labelled as sponsored, in a way you cannot miss.
      </p>

      <h2>Where we are not affiliated</h2>
      <p>
        Several retailers we compare have no approved affiliate relationship with us. Links to those retailers are
        plain, unmonetised links, and we do not pretend otherwise. Amazon links, when they exist, follow Amazon’s
        operating agreement, which does not permit us to reward users for clicking or buying through Special Links — so
        Mosaic Rewards never applies to Amazon purchases.
      </p>

      <h2>Rewards, honestly</h2>
      <p>
        Mosaic XP is an experience system: it is not money, not cashback, and cannot be exchanged for cash. Any
        purchase-linked reward will only be switched on for merchants whose written terms permit it and whose
        attribution reliably confirms the transaction. We will never quote you a cashback rate we cannot pay.
      </p>

      <h2>Community prices and third-party data</h2>
      <p>
        Some prices shown for quick-commerce platforms are reported by other shoppers, not read from the platform. They
        are labelled as such, carry a timestamp, and expire from ranking after 90 minutes. Platforms without an
        authorised feed are never presented as verified.
      </p>
    </LegalPage>
  );
}

export function Contact() {
  return (
    <LegalPage
      title="Contact & support"
      path="/contact"
      description="How to reach the DEALMOSAIC team, report a wrong price, or raise a privacy request."
    >
      <div className="callout callout-danger">
        <div className="callout-title">
          <Icon name="warn" size={16} /> There is no support inbox yet — and we would rather say so
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          The support centre (price reports, match corrections, retailer issues, feedback tickets) is scheduled for
          Phase 4 of the build. Creating a contact form now would give you a button that quietly does nothing, which is
          exactly what this project promised not to do.
        </p>
      </div>

      <h2>What you can do today</h2>
      <ul>
        <li>
          <strong>Fix your own account</strong> — name, PIN code, currency and notifications are editable in{' '}
          <Link to="/app/settings">account settings</Link>.
        </li>
        <li>
          <strong>Take your data with you</strong> — “Export my data” downloads everything we hold as JSON.
        </li>
        <li>
          <strong>Leave</strong> — “Delete account” removes every row we hold, immediately.
        </li>
      </ul>

      <h2>What arrives in Phase 4</h2>
      <ul>
        <li>Report an incorrect price, with evidence attached.</li>
        <li>Report an incorrect product match — the single most valuable correction you can give us.</li>
        <li>Report a retailer problem (wrong link, dead offer, misleading fee).</li>
        <li>General feedback and feature requests, with a tracked status.</li>
      </ul>
      <p className="small">
        Every report will be reviewed by a human, and the rewarded ones will be the ones that actually improve the data
        — not the ones that are merely submitted.
      </p>

      <h2>Project status</h2>
      <p>
        DEALMOSAIC is in an open beta build. Phase 1 (accounts, preferences, design system, mobile shell) is live. The
        comparison engine is Phase 2, connectors Phase 3, and quick-commerce Phase 3B. Each phase ships with a written
        status of what works and what does not.
      </p>
    </LegalPage>
  );
}

export function NotFound() {
  return (
    <>
      <Seo
        title="Page not found"
        description="That page does not exist on DEALMOSAIC. Browse the catalogue or run a search instead."
        path="/404"
        index={false}
      />
      <SiteHeader />
      <main className="container section center-text" id="main">
        <div style={{ color: 'var(--violet)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <Icon name="box" size={54} strokeWidth={1.5} />
        </div>
        <h1>This tile is missing from the mosaic</h1>
        <p className="lede" style={{ margin: '0 auto 18px' }}>
          The page you asked for does not exist — or it has not been built yet. We would rather show you this than a
          fake “coming soon” screen.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link to="/register" className="btn btn-quiet">
            Create an account
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
