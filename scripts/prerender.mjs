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
      <h1>DEALMOSAIC — one search, three real deals</h1>
      <p>Compare the true landed cost of any product across Indian stores: item price,
      delivery, fees and tax, ranked by what you actually pay.</p>
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

function productJsonLd(p, variants) {
  const offers = variants
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
  };
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

  page({ title: 'DEALMOSAIC — one search, three real deals', description: 'Compare the true landed cost of any product across Indian stores — item price, delivery, fees and tax, ranked by what you actually pay.', path: '/', bodyHtml: homeBody(discovery) });
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
      jsonLd: productJsonLd(detail.product ?? p, variants),
      bodyHtml: productBody(detail.product ?? p, variants),
      ogType: 'product',
    });
    count++;
  }

  console.log(`✅ prerendered ${count} pages (1 home, ${categories.length} categories, ${products.length} products)`);
}

main().catch((err) => {
  console.error('prerender failed:', err.message);
  process.exit(1);
});
