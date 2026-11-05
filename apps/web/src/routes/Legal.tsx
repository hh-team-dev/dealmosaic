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
      updated="4 November 2026"
      path="/privacy"
      description="What DealMosaic collects for accounts, comparisons and direct orders, and how to request access or deletion."
    >
      <div className="callout callout-info">
        <div className="callout-title">
          <Icon name="info" size={16} /> The short version
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          We collect what an account genuinely needs: your email, a display name, a password hash and your preferences.
          We do not run ad networks or third-party trackers. Account data can be managed from Settings. Direct orders also need delivery and payment-reconciliation records, described below.
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
          <strong>Phone number</strong> — optional on an account; required on a direct order for fulfilment and customer support.
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
        <li>Card numbers, CVV, bank passwords or UPI PINs. Direct orders record transaction references and payment status, not your payment credentials.</li>
        <li>Retailer account credentials. We never ask for them, and never will.</li>
        <li>GPS location. A PIN code is typed by you, optionally, and nothing else.</li>
        <li>Advertising identifiers, cross-site trackers, session recording or heatmaps.</li>
      </ul>

      <h2>Direct orders</h2>
      <p>When you buy directly, we store your name, email, phone, delivery address, selected product,
        price, shipping service, transaction references and order history. The seller uses these to fulfil
        the order and handle payment checks, returns and disputes, and shares the necessary delivery details
        with the booked carrier. Checking an unconfirmed PIN can record the product/PIN pair for up to seven days,
        without a name or delivery address.</p>
      <p>Your private order-access token is kept in this browser's session storage and in your private order link.
        The order database stores a hash of it. Anyone with your private link can view that order;
        do not publish it. Direct-order details are not included in the account-only export or account deletion.
        Contact the seller shown on your order for access, correction or deletion requests. Necessary transaction
        records may be retained for fulfilment, disputes and legal obligations; they are not used to enrol you
        in marketing automatically.</p>

      <h2>Saved deals and offline app files</h2>
      <p>Saved deal notes and recently viewed offers are kept in this browser. Signed-in saved deal IDs are also sent to your account, best effort, for eligible reminders when you have opted in. The local board does not automatically move between browsers, installed-app storage containers or devices.</p>
      <p>In supported browsers, DealMosaic prepares public app code, fonts and icons for offline access. It does not put API responses, private orders, shipping quotes or payment details in the offline app cache, and it never queues purchases or payments. Saved prices and codes are historical notes, not current quotes.</p>
      <p>Install & app settings lets you select online-only mode; that preference is stored locally. The persistent install/deals bar also stores your optional pause-animation preference locally; it is not sent to the server. This removes only offline app files, not your saved notes or account cookie. Your browser may evict offline files, and clearing site data can remove local notes and private order-link storage. Installation does not request notification, location, camera or microphone access.</p>

      <h2>Hotel and dining planning</h2>
      <p>City and brand selections can appear in the page address and copied city links. In the provider-search and simple calculator forms, hotel dates, guest counts, child ages and calculator amounts are held in page memory, not stored in your DealMosaic account or sent to our server. Choosing the hotel-search link sends the search details to the named provider. Official directory links do not pass your dates or guest details. We do not automatically request your location. The provider has its own privacy policy. Pet-planning form entries remain in page memory and are excluded from shared directory links. Copying a confirmation template does not send it. The public directory CSV contains venue information only. Optional local-restaurant search refinements remain in page memory and are sent to Google Maps only when you open a map search. They are not included in copied city links.</p>
      <h2>Your personal hospitality quote collection</h2>
      <p>When you choose Save my quote in the hotel or dining comparison workspace, that quote and its dates, party counts, child ages, room allocation, conditions and amounts are stored in this browser. They are not sent to our server or linked to your account. Up to 30 hotel and dining quotes can be kept together. Other people using this browser may see them, even after sign-out. Use the collection’s Remove or Clear controls to delete them; clearing site data also removes them. Account deletion does not clear device-only notes. CSV export includes your personal quote entries and is only created when you request it. Do not enter contact or payment details. A saved quote does not create a booking, price watch, reminder or message. The temporary place shortlist and unapplied form entries are not a cross-device saved list.</p>
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
        <li>Export your account data as a JSON file. Direct-order requests are handled separately by the seller.</li>
        <li>Delete the account, which removes your profile, preferences, PIN code, sessions and activity immediately.</li>
        <li>Withdraw consent for optional items (phone, PIN code, email notifications) at any time.</li>
      </ul>
      <p>
        Some security records are retained for abuse prevention. Account deletion does not automatically erase direct-order records needed for fulfilment, disputes or legal compliance. Ask the seller about your specific order.
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
      updated="4 November 2026"
      path="/terms"
      description="The rules for using DEALMOSAIC: what our prices are and are not, what we promise about ranking, and the limits of that promise."
    >
      <h2>What DEALMOSAIC is</h2>
      <p>
        DEALMOSAIC provides retailer comparisons and offers. Retailer links lead to that retailer’s checkout and terms. Separately, clearly labelled owner-operated listings can be purchased on DealMosaic. The actual seller, delivery terms, return policy and payable total are shown before that direct purchase.
      </p>

      <h2>Direct purchases</h2>
      <p>For a direct order, pay the displayed amount to the seller's displayed UPI recipient.
        Submitting a transaction reference is not proof of payment; the seller checks the bank credit.
        A delivery quote chooses the lowest total among the confirmed services checked for that parcel,
        not necessarily every carrier in India. Estimated transit includes the disclosed preparation and
        pickup wait and is not a delivery guarantee. Selecting a carrier does not book a parcel.</p>
      <p>Do not pay after an order's payment window closes. Contact the seller about late payments,
        corrections, cancellations, returns or refunds. The order preserves the policies and prices
        accepted at purchase. Product-specific policies do not remove statutory consumer rights.</p>

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

      <h2>Hotels, restaurants and food outlets</h2>
      <p>These sections provide sourced place discovery, selected provider-listed promotions, entered-value calculators and comparison of your personal quotes. They do not supply live hotel inventory, confirmed table or outlet availability, automatically fetched room prices or native bookings. A selected city does not confirm a branch, room or offer. Personal comparison groups rely on the exact plan, room or meal description, inclusions, cancellation, payment and eligibility conditions you enter; they are not independent verification of equivalent offers. Reconfirm all terms and charges with the provider. Unknown or more-than-24-hour-old entries cannot win the personal comparison. Cashback is never deducted; refundable deposits are separate from cost. The provider handles booking, ordering, fulfilment, payment, cancellation and refunds.</p>
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
        Some outbound links earn us a commission. DealMosaic adds no fee for following them, and commission never influences our ranking. Retailer prices and terms may vary. See
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
      updated="4 November 2026"
      path="/disclosure"
      description="DEALMOSAIC may earn a commission on some retailer links. DealMosaic adds no link-following fee; commission is never an input to our ranking — here is exactly how that works."
    >
      <div className="callout">
        <div className="callout-title">
          <Icon name="shield" size={16} /> One line, no small print
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          When you buy through some retailer links on DEALMOSAIC, we may earn a commission. DealMosaic adds no fee for following these links. Retailer prices and terms may vary; commission never affects our ranking.
        </p>
      </div>

      <h2>About retailer links</h2>
      <p>
        Browsing DealMosaic is free. Affiliate links may result in commission on qualifying activity under the retailer’s or network’s terms. An opened link, copied code or account registration does not guarantee a discount, an attributed sale or a payment.
      </p>

      <h2>What commission cannot do</h2>
      <ul>
        <li>It cannot change the sort order. The ranker receives verified cost and quality signals, never commission.</li>
        <li>It cannot buy a “Best verified” badge, a higher position, or a better explanation.</li>
        <li>It cannot raise the price you pay. Affiliate links never inflate a retailer’s checkout price.</li>
        <li>It cannot hide a cheaper non-affiliated offer. If a plain link is the best deal, it ranks first.</li>
      </ul>
      <p>
        Owner-operated products may appear in clearly labelled Featured placements. The operator has a direct financial interest in these sales; they are not independent recommendations or comparison winners. They do not change the lowest-price comparison ranking. Any paid third-party sponsorship will be labelled separately.
      </p>

      <h2>Where we are not affiliated</h2>
      <p>
        Several retailers we compare have no approved affiliate relationship with us. Links to those retailers are
        plain, unmonetised links, and we do not pretend otherwise. Amazon links, when they exist, follow Amazon’s
        operating agreement, which does not permit us to reward users for clicking or buying through Special Links — so
        Mosaic Rewards never applies to Amazon purchases.
      </p>

      <h2>Hospitality directory and offer links</h2>
      <p>Official hotel and restaurant directory links are not affiliate links. Separately labelled provider-feed offer links may earn a commission on qualifying transactions. Brand inclusion is not a partnership or verified city-coverage claim. Provider-listed does not mean checkout-tested by DealMosaic. Directory ordering is editorial, not commission-based.</p>
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
      <div className="callout callout-info">
        <div className="callout-title">
          <Icon name="info" size={16} /> A human reads every message
        </div>
        <p className="small" style={{ margin: 0, color: 'var(--ink)' }}>
          Email <a href="mailto:hh.team.dev@gmail.com?subject=DEALMOSAIC%20support">hh.team.dev@gmail.com</a>.
          Wrong prices, bad product matches, dead coupon codes, privacy requests or anything else — it all goes to the
          same inbox, and it is answered.
        </p>
      </div>

      <h2>What to include</h2>
      <ul>
        <li>
          <strong>A wrong price</strong> — the product page link, the store, and what you actually saw. A screenshot
          helps enormously.
        </li>
        <li>
          <strong>A wrong product match</strong> — the single most valuable correction you can send us. Two variants
          that should not be compared is a bug we want to know about.
        </li>
        <li>
          <strong>A dead coupon code</strong> — tell us the code. Codes that repeatedly fail are retired automatically,
          and your report is what starts that.
        </li>
        <li>
          <strong>A privacy request</strong> — export or deletion. You can also do both yourself, instantly, from{' '}
          <Link to="/app/settings">account settings</Link>.
        </li>
      </ul>

      <h2>Fix it yourself, faster</h2>
      <ul>
        <li>
          <strong>Your details</strong> — name, pincode, currency and notifications are editable in{' '}
          <Link to="/app/settings">account settings</Link>.
        </li>
        <li>
          <strong>Your data</strong> — &ldquo;Export my data&rdquo; downloads everything we hold as JSON.
        </li>
        <li>
          <strong>Your account</strong> — &ldquo;Delete account&rdquo; removes every row we hold, immediately. No
          retention period, no &ldquo;contact us to cancel&rdquo;.
        </li>
      </ul>

      <h2>How we handle it</h2>
      <p className="small">
        Reports that change the data get priority over reports that merely describe it. If a correction changes a price
        or a match, it is reflected in the catalogue rather than logged and forgotten.
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
        <div style={{ color: 'var(--magenta)', display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
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
