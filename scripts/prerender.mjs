#!/usr/bin/env node
/**
 * PRERENDER — the difference between "a website" and "a website Google can read".
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * DealMosaic is a React single-page app. Before this script, every route —
 * /p/aashirvaad-atta, /c/staples, /deals — served the *same* 6.6 kB HTML shell:
 *
 *     <title>DEALMOSAIC — One search. Three real deals...</title>
 *
 * No product name. No price. No description. Twenty-five product pages sharing
 * one title and zero unique content is textbook duplicate content, and Google
 * has to execute JavaScript before it can see anything at all. That is a
 * materially different (worse) situation than being indexed slowly: at scale it
 * is grounds for "Crawled – currently not indexed", which no amount of
 * Search Console submission can fix.
 *
 * WHAT THIS DOES
 * --------------
 * At build time it asks the API for the catalogue, then writes a real HTML file
 * per route into dist/. Each file carries:
 *   - a unique <title> and meta description
 *   - a correct self-referencing canonical
 *   - Product / Offer / BreadcrumbList structured data with real prices
 *   - readable body content, so a crawler that never runs JS still sees the page
 *   - the SPA bundle, so a human gets the full interactive app on top
 *
 * The static markup is replaced when React mounts. That is fine: crawlers read
 * the served HTML, humans get the app.
 *
 * Zero cost, no service, no dependency. It runs in the normal build.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'apps/web/dist');
const SITE = (process.env.SITE_URL ?? 'https://dealmosaic.pages.dev').replace(/\/+$/, '');
const API = process.env.PRERENDER_API ?? 'https://dealmosaic-api.onrender.com';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const inr = (minor) =>
  minor === null || minor === undefined ? null : `₹${(minor / 100).toLocaleString('en-IN')}`;

async function api(path) {
  const res = await fetch(`${API}${path}`, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

/**
 * Take the built SPA shell and replace the head + add crawlable body content.
 * We keep the hashed asset tags exactly as Vite produced them.
 */
function renderPage(shell, { title, description, path, jsonLd, bodyHtml, ogType = 'website' }) {
  const canonical = `${SITE}${path}`;
  let html = shell;

  // Title
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);

  // Description: replace or insert
  if (/<meta\s+name="description"/.test(html)) {
    html = html.replace(
      /<meta\s+name="description"[\s\S]*?\/?>/,
      `<meta name="description" content="${esc(description)}" />`,
    );
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${esc(description)}" />\n  </head>`);
  }

  // Canonical (the shell ships a placeholder from the SEO generator)
  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
  );

  // Open Graph
  html = html.replace(
    '</head>',
    [
      `  <meta property="og:title" content="${esc(title)}" />`,
      `  <meta property="og:description" content="${esc(description)}" />`,
      `  <meta property="og:url" content="${canonical}" />`,
      `  <meta property="og:type" content="${ogType}" />`,
      `  <meta property="og:site_name" content="DEALMOSAIC" />`,
      `  <meta property="og:locale" content="en_IN" />`,
      `  <meta name="twitter:card" content="summary_large_image" />`,
      jsonLd
        ? `  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
        : '',
      '</head>',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  // Crawlable content inside #root; React replaces it on mount.
  const before = html;
  html = html.replace(
    /<div id="root">\s*<\/div>/,
    `<div id="root">${bodyHtml}</div>`,
  );
  if (html === before && bodyHtml) {
    // Silence here is how 44 pages shipped with the homepage body.
    throw new Error(`prerender: could not inject body for ${path} — the shell is not empty`);
  }

  return html;
}

/**
 * The shell, captured ONCE, before the first page is written.
 *
 * This used to be read from disk on every call, which was silently destructive:
 * rendering the homepage writes its body into `dist/index.html`, so every later
 * page re-read a shell whose `#root` was already full. The `replace` below then
 * matched nothing and returned the homepage body unchanged — 44 pages with unique
 * <head> tags and an identical front page inside the body. That is the exact
 * duplicate-content defect this script exists to prevent, and it was invisible
 * because the title, canonical and JSON-LD were all still correct.
 */
const PRISTINE_SHELL = () => readFileSync(join(dist, 'index.html'), 'utf8');
let pristine = null;

function page({ title, description, path, jsonLd, bodyHtml, ogType }) {
  pristine ??= PRISTINE_SHELL();
  const shell = pristine;
  const html = renderPage(shell, { title, description, path, jsonLd, bodyHtml, ogType });
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  return file;
}

/* ------------------------------------------------------------------ */
/* Content builders                                                     */
/* ------------------------------------------------------------------ */

const shell = () => pristine ?? readFileSync(join(dist, 'index.html'), 'utf8');

/**
 * The homepage's static body.
 *
 * It carries the discovery shelves, not just a heading. Two reasons, both about
 * the same underlying fact — a crawler and a phone with JavaScript disabled see
 * the same HTML: 44 prerendered pages already exist so the site is indexable, and
 * a homepage that only says "type in the search box" wastes the strongest page on
 * the domain. The lists below link straight into /deals.
 */
function homeBody(discovery) {
  const shelves = (discovery?.sections ?? [])
    .slice(0, 8)
    .map((section) => {
      const items = section.items
        .slice(0, 6)
        .map((d) => {
          const bits = [];
          if (d.statedPercent) bits.push(`${d.percentIsCap ? 'up to ' : ''}${d.statedPercent}% off`);
          if (d.statedPriceMinor) bits.push(`from ₹${Math.round(d.statedPriceMinor / 100)}`);
          if (d.code) bits.push(`code <code>${esc(d.code)}</code>`);
          return `<li><strong>${esc(d.platformName)}</strong> — ${esc(d.title)}${
            bits.length ? ` (${bits.join(' · ')})` : ''
          }</li>`;
        })
        .join('');
      return `<h2>${esc(section.title)}</h2><p>${esc(section.subtitle)}</p><ul>${items}</ul>`;
    })
    .join('');

  const totals = discovery?.totals
    ? `<p>${discovery.totals.live} offers live right now · ${discovery.totals.withCode} with a copyable code · ${discovery.totals.endingThisWeek} ending this week.</p>`
    : '';

  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <h1>The price you’ll actually pay</h1>
      <p>Sticker prices leave out delivery, fees and tax. We add them, match the exact pack or
      variant, and rank what is really left to pay across Indian stores — and where a cost is
      unknown, we say so instead of guessing.</p>
      <p><a href="/deals">Every live coupon and deal</a> ·
         <a href="/browse">Browse every product we compare</a> ·
         <a href="/how-we-rank">How we rank offers</a> ·
         <a href="/saved">Your saved deals</a></p>
      ${totals}
      ${shelves}
    </main>`;
}

/** /saved — mostly a client-side board, but it needs a real page to exist first. */
function savedBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <h1>Your saved deals</h1>
      <p>Tap the heart on any deal and it is kept on this device — no account, no
      tracking, nothing sent to our servers. Recently viewed offers appear here too.</p>
      <p><a href="/deals">Find something worth saving</a> ·
         <a href="/browse">Browse every product we compare</a></p>
    </main>`;
}

function productBody(p, variants) {
  const cheapest = variants
    .map((v) => v.priceFromMinor)
    .filter((n) => typeof n === 'number')
    .sort((a, b) => a - b)[0];
  const variantList = variants
    .map(
      (v) =>
        `<li>${esc(v.label)}${v.priceFromMinor ? ` — from ${esc(inr(v.priceFromMinor))}` : ''}${
          v.mrpMinor ? ` (MRP ${esc(inr(v.mrpMinor))})` : ''
        }</li>`,
    )
    .join('');
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a> › <a href="/browse">Browse</a> ›
        <a href="/c/${esc(p.categorySlug)}">${esc(p.category)}</a></nav>
      <h1>${esc(p.title)} price comparison in India</h1>
      <p>${esc(p.description ?? '')}</p>
      ${cheapest ? `<p><strong>Prices from ${esc(inr(cheapest))}</strong> across Indian stores, delivery included.</p>` : ''}
      <h2>Available sizes</h2>
      <ul>${variantList}</ul>
      <p><a href="/browse">See every product we compare</a></p>
    </main>`;
}

/**
 * Product structured data.
 *
 * The `offers` block is emitted ONLY when every price behind it is live. Until
 * 3 November this function published demonstration prices as real `Offer` nodes
 * with `availability: InStock` — the same numbers the interface labels
 * "illustrative". That is handing Google a price we would not let a shopper act
 * on, and it is the merchant-listing/product-snippet confusion that gets rich
 * results withdrawn for the whole domain.
 *
 * A comparison site is not the merchant. We can legitimately describe the product
 * — name, brand, category, GTIN — because that is identity. We cannot describe a
 * price we have not observed.
 */
function productJsonLd(p, variants, pricesAreLive) {
  const offers = (pricesAreLive ? variants : [])
    .filter((v) => v.priceFromMinor)
    .map((v) => ({
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: (v.priceFromMinor / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${SITE}/p/${p.slug}`,
      name: `${p.title} — ${v.label}`,
    }));
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.title,
    description: p.description ?? undefined,
    brand: p.brand ? { '@type': 'Brand', name: p.brand } : undefined,
    category: p.category,
    url: `${SITE}/p/${p.slug}`,
    ...(offers.length ? { offers } : {}),
    // No aggregateRating: we do not own reviews, and inventing star ratings in
    // structured data is fabrication that Google penalises.
    //
    // With demonstration data there is deliberately no `offers` key at all: a
    // product snippet without a price is a weaker rich result and an honest one.
  };
}

/** True only when every offer we hold for this product came from a live source. */
function pricesAreLive(detail) {
  const byVariant = detail?.offersByVariant ?? {};
  const all = Object.values(byVariant).flat();
  if (all.length === 0) return false;
  return all.every((o) => o?.dataOrigin === 'live');
}

function categoryBody(catName, catSlug, products) {
  const items = products
    .slice(0, 60)
    .map((p) => `<li><a href="/p/${esc(p.slug)}">${esc(p.title)}</a></li>`)
    .join('');
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a> › <a href="/browse">Browse</a></nav>
      <h1>${esc(catName)} price comparison in India</h1>
      <p>Compare landed cost for ${esc(catName.toLowerCase())} across Indian stores.</p>
      <ul>${items}</ul>
    </main>`;
}

function dealsBody(coupons) {
  const rows = coupons
    .slice(0, 60)
    .map((c) => {
      const value =
        c.discountType === 'percent'
          ? `${c.discountValue}% off`
          : c.discountType === 'cashback'
            ? `${c.discountValue} cashback`
            : c.discountValue > 0
              ? `${c.discountValue} off`
              : 'Deal';
      return `<li><strong>${esc(c.platformName)}</strong> — ${esc(c.title)} (${
        c.code ? `code <code>${esc(c.code)}</code>` : esc(value)
      })${c.expiresAt ? ` · ends ${esc(String(c.expiresAt).slice(0, 10))}` : ''}</li>`;
    })
    .join('');
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <h1>Today's live coupon codes and deals across Indian stores</h1>
      <p>Every code here comes from the merchant's own campaign data. Expiry is shown
      on everything that has one, and cashback is never counted as a discount.</p>
      <ul>${rows}</ul>
      <p><a href="/browse">Compare prices for every product</a></p>
    </main>`;
}


/* ------------------------------------------------------------------ */
/* The prose pages                                                      */
/* ------------------------------------------------------------------ */

/**
 * These seven pages were in `sitemap.xml` but were never prerendered: every one
 * of them served the SPA shell, which — after the homepage body was injected —
 * meant a crawler received seven copies of the front page with the right URL.
 * That is the thin-and-duplicate pattern Google answers with "Crawled —
 * currently not indexed", so each one now gets its own real body.
 *
 * The bodies are summaries of what the React page actually says, written from the
 * component, not placeholders. If the page's substance changes, change these too.
 */
function browseBody(categories, products) {
  const cats = categories
    .map((c) => `<li><a href="/c/${esc(c.slug)}">${esc(c.name)}</a></li>`)
    .join('');
  const items = products
    .slice(0, 80)
    .map((p) => `<li><a href="/p/${esc(p.slug)}">${esc(p.title)}</a> — ${esc(p.brand ?? '')}</li>`)
    .join('');
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Browse every product we compare</h1>
      <p>${products.length} products, each with a confirmed identity — brand, size or
      storage, and a GTIN where the manufacturer publishes one. We compare a 5 kg pack
      against another 5 kg pack, never against a 10 kg one.</p>
      <h2>Categories</h2>
      <ul>${cats}</ul>
      <h2>Products</h2>
      <ul>${items}</ul>
      <p><a href="/deals">Browse live offers from ${''}Indian stores</a></p>
    </main>`;
}

function howWeRankBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>How we rank deals — the rules, in full</h1>
      <p>Ranking order: verified landed total first, then match confidence, then seller
      reliability, then delivery, then freshness. <strong>Commission is not an input.</strong>
      At most three offers are ever shown, and an offer whose total is not fully verified
      can never rank first.</p>
      <h2>How we decide two listings are the same product</h2>
      <ul>
        <li>GTIN / EAN / UPC — a barcode is an identity. Exact match.</li>
        <li>Manufacturer part number — the maker's own model code.</li>
        <li>ISBN — for books.</li>
        <li>Brand + model + variant attributes — storage, size, colour and pack count must all agree.</li>
        <li>Brand + model with partial attributes — shown, but never auto-selected.</li>
        <li>Title similarity — listed as a possible match, never presented as one.</li>
      </ul>
      <p>When the match is uncertain we ask which variant you meant. We do not average
      different products into one price.</p>
      <h2>What goes into the quality score</h2>
      <ul>
        <li>Source reliability — authorised connector, verified feed, or shopper report.</li>
        <li>Price freshness — how long ago the price was actually observed.</li>
        <li>Product match — certainty that this is the exact variant.</li>
        <li>Delivery information — whether the store publishes a delivery charge.</li>
        <li>Seller information — whether the platform publishes seller ratings at all.</li>
      </ul>
      <p><a href="/data-sources">Where the data comes from</a> · <a href="/disclosure">How we earn</a></p>
    </main>`;
}

function dataSourcesBody(platforms) {
  const rows = platforms
    .map((p) => `<li><strong>${esc(p.name)}</strong> — ${esc(p.access ?? p.mode ?? 'status unpublished')}${
      p.note ? `: ${esc(p.note)}` : ''
    }</li>`)
    .join('');
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Where our data comes from</h1>
      <p>No Indian retailer sells a public price API. A connector with no authorised
      data source is disabled and says why; we never scrape, never bypass bot
      protection, and never invent a price to fill a gap.</p>
      <h2>Stores we track</h2>
      <ul>${rows}</ul>
      <h2>What each label means</h2>
      <ul>
        <li><strong>Live</strong> — observed from an authorised source and timestamped.</li>
        <li><strong>Feed</strong> — supplied by the merchant or their network.</li>
        <li><strong>Shopper-reported</strong> — a person told us what they paid, at one pincode, at one moment.</li>
        <li><strong>Illustrative</strong> — demonstration data while a real feed is pending. Never a quote.</li>
      </ul>
      <p><a href="/how-we-rank">How we rank</a> · <a href="/deals">Live offers</a></p>
    </main>`;
}

function contactBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Contact &amp; support</h1>
      <p>Write to <a href="mailto:hh.team.dev@gmail.com">hh.team.dev@gmail.com</a>. A
      person reads it; expect a reply within two working days.</p>
      <h2>What to include</h2>
      <ul>
        <li>The page address and the store name.</li>
        <li>What you expected and what happened.</li>
        <li>For a wrong price: a screenshot of the store's own checkout, if you can.</li>
      </ul>
      <h2>Report a dead coupon</h2>
      <p>Every coupon carries a confidence state. Tell us which code failed and at which
      store, and it is checked and marked rather than left to fail for the next shopper.</p>
      <p><a href="/privacy">How we handle your data</a> · <a href="/terms">Terms</a></p>
    </main>`;
}

function privacyBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Privacy policy</h1>
      <p>Search and comparison work without an account. Saved deals and recently viewed
      offers can be stored in your browser. Signed-in saved deals are also mirrored to the server for your requested reminders.</p>
      <h2>What we collect, and why</h2>
      <ul>
        <li>An email address, if you create an account — to verify it and to send the alerts you asked for.</li>
        <li>Prices you report, if you choose to report them.</li>
        <li>Aggregate searches, to know which products people actually look for.</li>
      </ul>
      <h2>What we do not collect</h2>
      <p>No third-party advertising trackers, no cross-site profiles, no selling of data.
      A pincode is not an identity — it is shared by tens of thousands of people.</p>
      <h2>Direct-order information</h2>
      <p>Direct checkout records your name, email, phone, delivery address, product, price,
      shipping selection and payment references. The seller shares necessary delivery details
      with the booked carrier. We do not collect card numbers, bank passwords or UPI PINs.</p>
      <p>Your private order link grants access to that order. Keep it private. Direct-order
      data is separate from the account-only export and deletion; contact the seller on the
      order for access or correction. Transaction records may be retained for fulfilment,
      disputes and legal obligations.</p>
      <h2>Who else sees data</h2>
      <p>Transactional email is delivered through Brevo; the database is hosted on Turso.
      Outbound store links pass through an affiliate network, which sets its own cookie at
      the merchant.</p>
      <h2>Your rights</h2>
      <p>Export or delete your account from the dashboard at any time. Deletion removes the
      account, its sessions and its alerts.</p>
      <p><a href="/terms">Terms of use</a> · <a href="/contact">Contact</a></p>
    </main>`;
}

function termsBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Terms of use</h1>
      <h2>What DEALMOSAIC is</h2>
      <p>A comparison and discovery service with two distinct purchase paths. Retailer links lead to the retailer's own checkout. Clearly labelled owner-operated products can be purchased directly on DealMosaic, with the actual seller, policies and payable total shown before purchase.</p>
      <h2>What we promise — and what we cannot</h2>
      <p>We promise to show what we observed, dated, with the source named, and to say
      "unknown" rather than guess. We cannot promise a price will still be live when you
      click, and a demonstration price is labelled as one.</p>
      <h2>Direct purchases</h2>
      <p>UPI transaction references await a bank-credit check. The selected shipping service
      is the lowest total among the confirmed services checked for that parcel, not every
      carrier in India. Selection does not book a parcel and delivery dates are estimates.
      Do not pay after the payment window expires; contact the seller about late payments,
      corrections, cancellations, returns or refunds. Statutory consumer rights remain.</p>
      <h2>Community-reported prices</h2>
      <p>Shopper reports are opinions about one moment at one pincode. They are shown
      separately and are never merged into a ranked total.</p>
      <h2>Affiliate links</h2>
      <p>Some outbound links earn us a commission, at no cost to you. Commission never
      decides which offer ranks first — see the <a href="/disclosure">disclosure</a>.</p>
      <p><a href="/privacy">Privacy</a> · <a href="/contact">Contact</a></p>
    </main>`;
}

function disclosureBody() {
  return `
    <main style="font-family:system-ui;padding:24px;max-width:820px;margin:0 auto">
      <nav><a href="/">Home</a></nav>
      <h1>Affiliate disclosure</h1>
      <h2>How we earn</h2>
      <p>When you buy through a link on DEALMOSAIC, the store may pay us a small
      commission. The price you pay is unchanged. Separately, the operator can earn directly
      from owner-operated products. These Featured placements disclose that interest and do
      not alter organic comparison winners or rankings.</p>
      <h2>What commission cannot do</h2>
      <ul>
        <li>It cannot change the ranking. Ranking is verified landed total, then match confidence, then reliability, then delivery, then freshness.</li>
        <li>It cannot add a store to a comparison. We compare stores we can see, not stores that pay.</li>
        <li>It cannot buy a "verified" label. Verification means we checked.</li>
      </ul>
      <h2>Where we are not affiliated</h2>
      <p>Not every store here pays us — several applications are pending. Where a link
      earns nothing we still show the offer if it is genuinely the better buy, and the
      link is marked as an outbound link to the store.</p>
      <h2>Rewards, honestly</h2>
      <p>Cashback is not a discount. It arrives later, can be refused, and never reduces
      what you pay at the till. Where we show it, it is a separate line and never
      subtracted from a total.</p>
      <p><a href="/how-we-rank">The ranking rules in full</a> · <a href="/terms">Terms</a></p>
    </main>`;
}

/* ------------------------------------------------------------------ */
/* Main                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('prerender: dist/index.html missing — run the Vite build first.');
    process.exit(1);
  }

  let products = [];
  let categories = [];
  try {
    const r = await api('/api/catalogue/products?limit=200');
    products = r.products ?? [];
    const c = await api('/api/catalogue/categories');
    categories = c.categories ?? [];
  } catch (err) {
    // A prerender failure must not break a deploy. Shipping the SPA is worse than
    // not shipping at all, and the next build will pick this up.
    console.warn(`prerender: catalogue unavailable (${err.message}) — shipping the SPA shell only`);
    return;
  }

  let count = 0;

  let discovery = null;
  try {
    discovery = await api('/api/coupons/discover');
  } catch {
    /* an API outage must not fail the build; the shelves simply stay client-side */
  }

  page({ title: 'DEALMOSAIC — the price you’ll actually pay', description: 'Compare the true landed cost of any product across Indian stores — item price, delivery, fees and tax, ranked by what you actually pay.', path: '/', bodyHtml: homeBody(discovery) });
  count++;

  page({
    title: 'Your saved deals — DEALMOSAIC',
    description: 'The deals you kept and the offers you looked at, stored on your own device. No account needed.',
    path: '/saved',
    bodyHtml: savedBody(),
  });
  count++;

  for (const cat of categories) {
    let list = [];
    try {
      const r = await api(`/api/catalogue/products?category=${encodeURIComponent(cat.slug)}&limit=60`);
      list = r.products ?? [];
    } catch {
      list = [];
    }
    page({
      title: `${cat.name} price comparison in India — DEALMOSAIC`,
      description: `Compare real prices for ${cat.name.toLowerCase()} across Indian stores, delivery and fees included. At most three ranked offers per product.`,
      path: `/c/${cat.slug}`,
      bodyHtml: categoryBody(cat.name, cat.slug, list),
    });
    count++;
  }

  // The deals page is the richest unique content on the site, so it must be in
  // the served HTML rather than assembled client-side after a fetch.
  try {
    const c = await api('/api/coupons?limit=60&codes=1');
    page({
      title: "Today's best coupon codes and deals across Indian stores — DEALMOSAIC",
      description: 'Verified coupon codes and real discounts from Indian stores. Every code shows its expiry date and how many shoppers confirmed it. We never list unverified codes.',
      path: '/deals',
      bodyHtml: dealsBody(c.coupons ?? []),
    });
    count++;
  } catch {
    /* a coupons outage must not fail the build */
  }

  // The prose pages were in the sitemap but not in the prerender, so a crawler got
  // seven copies of the homepage. Each now has its own body.
  let allProducts = products;
  try {
    const r = await api('/api/catalogue/products?limit=100');
    if (Array.isArray(r.products) && r.products.length) allProducts = r.products;
  } catch {
    /* fall back to the list already fetched */
  }

  let platformList = [];
  try {
    const r = await api('/api/meta/platforms');
    platformList = r.platforms ?? [];
  } catch {
    platformList = [];
  }

  const prose = [
    ['/browse', 'Browse every product we compare — DEALMOSAIC',
      'Every product DEALMOSAIC compares, by category, with the variant identity we matched on. At most three ranked offers per product.',
      browseBody(categories, allProducts)],
    ['/how-we-rank', 'How we rank deals — the rules, in full — DEALMOSAIC',
      'The exact ranking rules: verified totals first, at most three offers, commission is never an input, and an unverified total can never rank first.',
      howWeRankBody()],
    ['/data-sources', 'Where our data comes from — DEALMOSAIC',
      'Which stores we can see, which connectors are disabled and why, and what each provenance label means. We never scrape and never invent a price.',
      dataSourcesBody(platformList)],
    ['/contact', 'Contact and support — DEALMOSAIC',
      'How to reach DEALMOSAIC, what to include in a report, and how a dead coupon is handled.',
      contactBody()],
    ['/privacy', 'Privacy policy — DEALMOSAIC',
      'What DEALMOSAIC collects, what it deliberately does not collect, who else sees data, and how to export or delete an account.',
      privacyBody()],
    ['/terms', 'Terms of use — DEALMOSAIC',
      'What DEALMOSAIC is and is not, what we promise and what we cannot, how community prices are treated, and the affiliate model.',
      termsBody()],
    ['/disclosure', 'Affiliate disclosure — DEALMOSAIC',
      'How DEALMOSAIC earns, what commission cannot influence, where we are not affiliated, and why cashback is never a discount.',
      disclosureBody()],
  ];

  for (const [path, title, description, bodyHtml] of prose) {
    page({ title, description, path, bodyHtml });
    count++;
  }

  for (const p of products) {
    let detail;
    try {
      detail = await api(`/api/catalogue/products/${p.slug}`);
    } catch {
      continue;
    }
    const variants = detail.variants ?? [];
    const cheapest = variants.map((v) => v.priceFromMinor).filter(Boolean).sort((a, b) => a - b)[0];
    page({
      title: `${p.title} price in India${cheapest ? ` — from ${inr(cheapest)}` : ''} | DEALMOSAIC`,
      description: `Compare ${p.title} prices across Indian stores. ${p.description ?? ''} Delivery, fees and tax included, at most three ranked offers.`.slice(0, 300),
      path: `/p/${p.slug}`,
      jsonLd: productJsonLd(detail.product ?? p, variants, pricesAreLive(detail)),
      bodyHtml: productBody(detail.product ?? p, variants),
      ogType: 'product',
    });
    count++;
  }

  console.log(
    `✅ prerendered ${count} pages (home, saved, deals, browse, 4 policy pages, ${categories.length} categories, ${products.length} products)`,
  );
}

main().catch((err) => {
  console.error('prerender failed:', err.message);
  process.exit(1);
});
