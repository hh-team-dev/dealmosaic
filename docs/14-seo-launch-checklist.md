# SEO and search-visibility launch checklist

**Owner actions vs. what the code already does.**

You asked for the site to rank top in every search and to "make the Google listing
and everything required". This document is the honest split: everything a machine
can do is done, and here is exactly what only *you* can do — because Google verifies
identity, not code.

---

## Read this first: the one thing nobody can promise

**Nobody can guarantee a #1 ranking in Google, and any agency that promises it is
lying.** Ranking is Google's decision. It is influenced by technical quality,
content, authority, and dozens of signals outside anyone's control. What is
achievable, and what this build is built for, is:

1. **Being technically perfect** — so nothing about the site stops it ranking.
2. **Having a page for every query a shopper actually types** — product pages,
   category hubs, comparison pages, methodology.
3. **Being trustworthy enough to earn links and citations**, which is what actually
   moves rankings for a comparison site in a crowded market.

Rankings for `dealmosaic` (your own brand) should come within days of indexing.
Rankings for `iphone 16 price comparison india` are a 6–18 month competition against
established players, and depend on the content and authority work in section 4.

---

## 1. Done in code (nothing for you to do)

| Item | Where |
|---|---|
| Unique `<title>`, meta description per route | `apps/web/src/lib/seo.tsx` |
| Canonical URL on every public page | same, verified across all 7 routes |
| OpenGraph + Twitter cards | `index.html` and per-route |
| `sitemap.xml` — 50 URLs, generated from real catalogue data | `scripts/generate-seo.mjs` |
| `robots.txt` with correct allow/disallow and AI-crawler policy | same |
| `llms.txt` — a plain-language map for AI answer engines | same |
| JSON-LD `Organization`, `WebSite`, `BreadcrumbList`, `Product` | `index.html` + `seo.tsx` |
| `noindex` on `/search` result pages (thin, query-driven) | `routes/Search.tsx` |
| Semantic HTML, one `<h1>` per page, skip link, focus order | verified in browser |
| Mobile-first, no horizontal scroll at any width 360 → 1920 px | verified |
| Fast: 119.91 kB gzip JS, 9.51 kB gzip CSS, self-hosted fonts | build output |
| No fabricated `aggregateRating` in structured data | deliberate — see §5 |
| `favicon.svg` + real multi-resolution `favicon.ico` (16/32/48) | `scripts/brand/brand.py` |
| `apple-touch-icon` as a **180 px PNG** — iOS cannot read SVG here | same |
| `manifest.webmanifest` — standalone, 192 + 512 any, 512 maskable | `apps/web/public/` |
| `Organization.logo` in JSON-LD points at a 512 px PNG, not an SVG | `seo.tsx`, `index.html` |
| Social card rebuilt at 1200×630 from the brand geometry | `scripts/generate-og.py` |

---

## 2. Your actions — required before launch

These need a human with identity documents and a phone. They cannot be automated.

### 2.1 Buy the domain
Register `dealmosaic.in` (or `.com`/`.co.in`). Everything in the code assumes
`https://dealmosaic.in`; if you choose a different domain, set `SITE_URL` and re-run
`npm run seo`.

### 2.2 Deploy (free tier)
- **Web:** Cloudflare Pages or Netlify — free, global CDN, HTTPS included.
  Build command `npm run build`, output directory `apps/web/dist`.
- **API:** Render / Fly.io / Railway free tier, or Cloudflare Workers.
- Set `NODE_ENV=production`, `APP_URL=https://dealmosaic.in`, and a real
  `SESSION_SECRET`. Leave `EBAY_CLIENT_ID`/`SECRET` empty until you have them.

### 2.3 Google Search Console — **do this on day one**
1. Go to `search.google.com/search-console` → add property → **Domain** type.
2. Verify via DNS TXT record (Cloudflare makes this one click).
3. Submit `https://dealmosaic.in/sitemap.xml`.
4. Use **URL Inspection → Request indexing** for the homepage, `/browse`,
   `/how-we-rank` and `/data-sources`.
5. Watch **Pages** for exclusions and **Core Web Vitals** weekly.

### 2.4 Bing Webmaster Tools
`bing.com/webmasters` → add site → import from Search Console (one click). Bing also
powers DuckDuckGo and ChatGPT search, so this matters more than its market share
suggests.

### 2.5 Google Business Profile — **needs your real business identity**
This is the "Google listing" you asked for. Google requires a real business and
verifies it, usually by postcard, phone or video. **I cannot create or verify this
for you, and creating a fake one would get the listing suspended and could poison
your domain's reputation.**

You have two legitimate paths:

**Option A — no premises (recommended at launch).** A price-comparison site with no
customer-facing office is a *service-area / online-only* business. Many such
businesses are **not eligible** for a Business Profile at all, and Google may reject
it. If you operate from a real address you can verify, apply; otherwise skip it —
Search Console plus good content is the correct channel for a site like this.

**Option B — you have a registered business address.**
1. `business.google.com` → Add business.
2. Category: **"Price comparison service"** (or "Shopping service").
3. You will need: registered business name, verifiable address, a phone number you
   answer, and a website.
4. Verification: postcard (5–14 days), or phone/video if offered.
5. After verification, add: description, hours, logo, 3+ real photos.

**Do not** list a virtual office, a friend's flat, or a fake address. Google removes
listings and applies penalties to the domain.

### 2.6 Register the business (needed for the above and for payments later)
- **Udyam registration** (free, online, ~10 min) — MSME certificate, useful for
  bank/gateway applications.
- **GST registration** if turnover will cross ₹20 lakh, or immediately if you plan to
  invoice retailers (GST is required for B2B invoicing).
- A current account in the business name.

### 2.7 Brand consistency (helps entity recognition)
Use the exact same name, logo and description on: the site, Search Console, Bing,
LinkedIn, X, Instagram, Crunchbase, and any directory. Google builds an "entity" from
consistent mentions; inconsistency dilutes it.

---

## 3. Free tools to install after launch

| Tool | Why |
|---|---|
| **Cloudflare** (free) | CDN, HTTPS, bot protection, analytics without cookies |
| **Bing Clarity** (free) | Heatmaps and session recordings, no cookie banner needed |
| **PageSpeed Insights** | Core Web Vitals, field data once you have traffic |
| **Schema Markup Validator** | Confirm your JSON-LD parses |
| **Google Analytics 4** or Plausible | Traffic — but this adds a consent requirement under DPDP. Prefer Cloudflare Web Analytics (cookie-free). |

---

## 4. The work that actually moves rankings (ongoing, free)

Technical SEO gets you *indexed*. This gets you *ranked*.

1. **Programmatic comparison pages.** Every product × variant is a distinct query —
   "samsung galaxy s25 ultra 512gb price". The `/p/:slug` route is built for this;
   adding hundreds of real products is the single highest-leverage SEO action
   available to you. It needs real catalogue data (§ "Data reality" below).
2. **Category hubs become buying guides.** `/c/snacks` should not be a bare grid —
   add "cheapest chips per 100 g in India" tables computed from your own data. That
   is a page nobody else has.
3. **Original data = links.** Publish a monthly "India quick-commerce price index"
   from aggregated, anonymised observation data. Journalists link to original data
   and not to marketing pages. This is the realistic path to authority.
4. **Answer the questions people ask.** "Why is Blinkit cheaper than Zepto in my
   area?", "Is a 180 g chips pack better value than 52 g?" — each is a page.
5. **Earn reviews, never fake them.** Ask real users for feedback. Fabricated
   `aggregateRating` markup is a manual-action risk and is not in this codebase.

---

## 5. Deliberate refusals

These are things I will not do, because each would trade a short-term gain for a
penalty or a lie:

- **No guaranteed-rank claims.** Not achievable, and a claim I cannot meet.
- **No fake Google Business Profile.** Requires your real identity; faking it causes
  suspension.
- **No fabricated reviews or rating stars in structured data.** We do not own
  reviews. Emitting `aggregateRating` without them is a violation.
- **No scraped prices presented as live.** No scraping, no bot-protection bypass.
- **No doorway pages.** Every page in the sitemap is genuinely useful on its own.
- **No `Disallow` on `/search`.** It carries `noindex`, and a blocked crawler can
  never read that tag — it would get indexed as an empty page instead.

---

## 6. Data reality (the honest constraint on all SEO plans)

The page templates are ready for thousands of products. **Real catalogue data is the
bottleneck, not the code.** Today:

- eBay is the only platform with a self-serve, free, authorised price API
  (`EBAY_CLIENT_ID` + `SECRET` — you can create these yourself in ~15 minutes at
  `developer.ebay.com`).
- Amazon PA-API / Creators API needs ~10 qualifying affiliate sales in 30 days first.
- Flipkart affiliate sign-ups have been closed for years.
- Blinkit / Zepto / Instamart / BigBasket publish no price API; access requires
  commercial partnerships.
- **ONDC** is the credible zero-cost route to real Indian catalogue data and needs
  network onboarding as a participant.

Until at least one real feed is connected, product pages describe real products with
demonstration prices, clearly labelled. That is indexable and honest. It is not yet
a competitive advantage — connecting eBay is the fastest way to change that.

---

## 7. Order of operations

```
Week 1   domain → deploy → Search Console → Bing → request indexing
Week 1   create eBay developer keys → set env vars → connector goes live
Week 2   Udyam registration → decide on Google Business Profile eligibility
Week 3+  add catalogue depth (real products) — the main SEO engine
Monthly  publish a price index → earn links → check Search Console coverage
```
