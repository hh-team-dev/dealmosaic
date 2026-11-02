# DEALMOSAIC — MASTER HANDOVER

**Everything, from first principle to the last commit, in one document.**

Last updated: **3 November 2026** · Version **1.0.0** · All figures verified live
against production at the time of writing, not recalled from memory.

> **If you are a new developer, read this file top to bottom before touching
> anything.** It is written so you can continue immediately without asking the
> owner a single question. Where something is genuinely blocked on a human, it
> says so and names the exact steps. Where the agent made a mistake, the mistake
> is recorded rather than tidied away — those are the places where the next person
> is most likely to repeat it.

---

## PART 1 — WHAT THIS PRODUCT IS

### 1.1 The idea

A shopper types a product name. DealMosaic shows the **three best ways to buy it
in India**, ranked by **what they will actually pay** — item price plus delivery
plus fees plus tax, minus real discounts — and explains *why* each offer ranks
where it does.

The differentiator is not coverage. It is **arithmetic honesty**. Every
comparison site shows a headline price that turns out to be wrong at checkout.
DealMosaic's entire premise is that the number you see is the number you pay, and
that anything unknown is displayed as unknown rather than quietly counted as zero.

### 1.2 The non-negotiable rules

These were set by the owner and are enforced in code wherever possible, not just
in prose. A future developer must not relax them without an explicit decision.

| Rule | How it is enforced |
|---|---|
| **Zero operational cost** | Everything on a free tier. See `08-zero-cost-ledger.md`. |
| **Never black or near-black** | `npm run audit:design` fails the build; darkest permitted is Mosaic Plum `#452b5e` (L\* 23.0). |
| **No invented data** | Every offer carries `data_origin`. The API computes `dataMode` for the whole comparison and the UI cannot show a demo price without labelling it. |
| **No scraping, no CAPTCHA bypass, no bot-protection circumvention** | No scraper exists in the codebase. All data arrives via authorised feeds or human reports. |
| **No fake SEO** | No `aggregateRating` anywhere (we do not own reviews). No page-per-city doorway pages. |
| **Commission never affects ranking** | `packages/core/src/ranking.ts` is a pure function with unit tests and takes no commercial input. |
| **Cashback is never subtracted from a payable price** | Modelled as its own `discount_type`; the API returns `reducesPayablePrice: false` for it. |
| **India only** | `COUNTRIES` in `packages/core/src/countries.ts` has one enabled market. |
| **Mobile-first** | Single-column layout below 620px, 48px minimum tap targets. |
| **Owner owns everything** | Public GitHub repo, all accounts in the owner's name, every credential documented in `16-owner-credentials-register.md`. |

---

## PART 2 — WHAT IS LIVE RIGHT NOW

Every value below was fetched from production while writing this document.

### 2.1 The stack

| Layer | Service | Address | Verified |
|---|---|---|---|
| Website | Cloudflare Pages (+ Pages Function worker) | `https://dealmosaic.pages.dev` | 200 in ~0.13 s |
| API | Render free web service | `https://dealmosaic-api.onrender.com` | `{"ok":true,"version":"1.0.0","database":"connected"}` |
| Database | Turso (libSQL), `aws-ap-south-1` | `libsql://dealmosaic-hh-team-dev.aws-ap-south-1.turso.io` | connected |
| Code | GitHub (public) | `github.com/hh-team-dev/dealmosaic` | 45+ commits |
| Email | Brevo over HTTPS | — | real delivery confirmed |
| Keep-alive | Cloudflare Worker + cron | `dealmosaic-keepalive.hh-team-dev.workers.dev` | 20 pings, all 2xx, 245 ms avg |
| Affiliate | Cuelinks (publisher 283346, channel 333531) | — | API key live in Render |
| Affiliate | Admitad / Mitgo ID | ad space "Dealmosaic" **Active** | no API access |
| Search | Google Search Console | property verified, sitemap submitted | 51 URLs |

### 2.2 Page-level verification

All 20 routes were requested on 3 November; the full list is in §2.8. Representative rows:

| Route | Status | Time | Its own `<h1>` |
|---|---|---|---|
| `/` | 200 | 0.15 s | DEALMOSAIC — one search, three real deals |
| `/deals` | 200 | 0.14 s | Today's live coupon codes and deals across Indian stores |
| `/saved` | 200 | 0.11 s | Your saved deals |
| `/browse` | 200 | 0.13 s | (browse) |
| `/p/aashirvaad-atta` | 200 | 0.09 s | Aashirvaad Shudh Chakki Atta price comparison in India |
| `/c/staples` | 200 | 0.21 s | Staples price comparison in India |
| `/nope-xyz` | **404** (genuine, not a soft 404) | 0.09 s | That page isn't here |

### 2.3 Data in production

| Table | Rows | Meaning |
|---|---|---|
| `users` | 1 | one real signup the owner made while testing |
| `catalogue_products` | 25 | demo catalogue |
| `product_variants` | 46 | sizes/packs |
| `offers` | 170 | demo offers |
| **`coupons`** | **1,089** | **real, live, from Cuelinks — 282 with codes, 245 merchants, 375 stating a price, all 1,089 with an expiry** |
| `offer_snapshots` | 340 | two daily observations per offer — the price history, accruing |
| `price_alerts` | 0 | the engine works; no shopper has set one yet |
| `community_prices` | 0 | awaiting real shopper reports |

### 2.4 Quality gates — all green

```
214 tests passing
33 design assertions passing
typecheck clean across 3 packages (web, api, core)
0 secrets in 184 scanned files
52 prerendered pages, verified unique and sitemap-complete (scripts/verify-prerender.mjs)
backup verified: 194 files, checksums match
```

---

### 2.5 Discovery block — added 3 November 2026

The homepage now has a browsable board of **14 shelves built from live rows**, not a brochure
around a search box. Read `docs/25-competitive-gap-analysis.md` for the audit that produced it.

| Section | Live rows behind it (verified from `/api/coupons/discover`) |
|---|---|
| Today's best deals | 8 of 1,089 live offers, codes first |
| Biggest savings on the board | ranked by the store's own published percentage |
| Under ₹99 / ₹199 / ₹499 / ₹999 | 9 / 22 / 73 / 127 offers whose headline states a price |
| Grocery, Electronics, Fashion, Beauty, Home | 120 / 123 / 167 / 275 / 18 |
| Bank, card & UPI offers | 26 offers whose copy names a bank, card or UPI app |
| Newly discovered | added in the last 14 days |
| Ending in the next seven days | 63 offers with a real expiry date |

Plus `/saved` — a wishlist and recently-viewed board in `localStorage`, no account required.

**The rule that makes it safe to ship:** the server withholds any shelf that cannot meet its
`minItems` floor and says so in a `withheld` array. On a thin day the wall gets shorter, never
fictional. Percentages keep the store's "up to"; prices keep "from" / "under" / "at".

### 2.6 Return-visit block — added 3 November 2026

| Feature | Status | Verified how |
|---|---|---|
| Price alerts (email) | **live** | `POST /api/alerts` → `POST /api/alerts/run` fires once, then closes |
| Wishlist + recently viewed | **live, device-local** | `/saved`, `lib/saved.ts` |
| Price-history chart | **live, accruing daily** | `offer_snapshots`: +170 rows/day, never backfilled |
| Pincode control | **live** | product page → `/api/location/summary` |
| Community price reports | **live** | form on product page → `/api/community-prices` |
| Coupons on product pages | **live** | `CouponStrip` on `/p/:slug` |

**The daily job schedules itself.** It is not a cron: the keep-alive worker already
calls `/api/health` every five minutes, so the API asks "am I due?" on that ping and
runs at most once per 20 hours. The claim is a conditional UPDATE in `job_runs`, so
two pings cannot both start a run, and the outcome of every run is queryable:
`GET /api/maintenance/daily` with the sync token. Production measurement: full job
**5.5 s**, health response unaffected at **0.25 s**.

**Owner-only, optional:** the Cloudflare token in use can read Workers but not write
them, so the two-trigger cron worker in `deploy/keepalive` is committed but not
deployed. Granting *Workers Scripts: Edit* would let `npx wrangler deploy` replace the
self-scheduling trick with a real cron. Nothing is blocked while it is missing.

### 2.7 What the 3 November verification sweep found

Every route, every endpoint and the whole prerendered output were checked against
production rather than remembered from a previous build. Two real defects surfaced, both
invisible to the green gates:

| # | Defect | Why it mattered | Fix |
|---|---|---|---|
| 1 | **44 prerendered pages carried the homepage body.** `page()` re-read `dist/index.html` on every call, so after the homepage was written the shell's `#root` was already full — the injection `replace` matched nothing and returned the homepage body unchanged. Titles, canonicals and JSON-LD were all still correct, which is why nobody noticed. | The exact duplicate-content defect this project was built to avoid, shipped silently. A crawler saw 44 copies of the front page. | The shell is read **once**, before the first write; the injector now **throws** if a body cannot be placed. |
| 2 | **`https://dealmosaic.in` was still hardcoded** in 7 places in `index.html` and in the Vite default, so the built `og:image` pointed at `dealmosaic.in/og.png` — a host we do not own. | Every share on WhatsApp/X showed no image. | Host parameterised as `%SITE_URL%`, default corrected to `pages.dev`. |

`scripts/verify-prerender.mjs` now runs as the last step of `npm run build` and **fails the
build** if any page lacks a body, repeats another page's `<h1>`, or names the unowned host.
A prerender that stops working must not be able to report success.

Full sweep results are in §2.8.

### 2.8 Verified live, 3 November 2026

**Web** — 20 routes, all correct: `/`, `/deals`, `/saved`, `/search`, `/browse`, `/how-we-rank`,
`/data-sources`, `/contact`, `/privacy`, `/terms`, `/disclosure`, `/login`, `/register`,
`/forgot-password`, `/reset-password`, `/verify-email`, `/app`, `/app/settings`, `/c/staples`,
`/p/aashirvaad-atta` → **200** in 0.09–0.21 s; `/nope-xyz` → **404** with its own page.

**API** — 18 endpoints exercised, all as designed:

| Endpoint | Result |
|---|---|
| `/api/health` | 200, 0.27 s, database connected |
| `/api/meta/platforms`, `/countries`, `/currencies` | 200 |
| `/api/catalogue/{categories,products,trending,connectors}` | 200 |
| `/api/catalogue/products/aashirvaad-atta` | 200, `{product, offersByVariant, history, community}` |
| `/api/coupons`, `/discover`, `/merchants` | 200 |
| `/api/fx/rates` | 200, live rate date |
| `/api/location/pincode/400001`, `/summary` | 200 |
| `/api/alerts`, `/api/me` (anonymous) | **401** — correctly closed |
| `/api/maintenance/daily` (no token) | **403** |

**Discovery wall** — 14 shelves, 0 withheld, every row traceable to a live feed row:

```
totals   live 1089 · withCode 282 · withStatedPrice 375 · endingThisWeek 63 · bankOrUpi 26
shelves  today 8 · biggest 6 · under-₹99/199/499/999 6 each · grocery/electronics/fashion/
         beauty/home 6 each · bank 6 · new 6 · ending 6
```

**Search** — `"noise earbuds"` → 2 live offer listings; `"kurta"` → 8; `"aashirvaad atta"` →
a real ranked comparison (the fallback never runs when the catalogue hits).

**Daily job** — last run `lastOk: true`, 5,540 ms, affiliate `seen 1085 / updated 1085`,
snapshots `170 offers`, alerts `checked 0`. Next due in 20 h.

**SEO** — `robots.txt` 200, `sitemap.xml` 200 with **51 URLs**, canonical on every page points
at `dealmosaic.pages.dev`, Googlebot receives the real product title
(`Aashirvaad Shudh Chakki Atta price in India — from ₹242.06`), and the homepage's static HTML
carries **55 real offer lines** so a crawler and a phone with JavaScript off see the same board.

### 2.9 A search that matches no product now shows real offers

`services/offer-search.ts` runs only when the catalogue returns nothing. It looks for live
merchant offers whose own copy mentions **every** meaningful word typed, and renders them
as *listings* — the store's words, the store's stated price, no ranking and no total. That
boundary is the whole point: a comparison says "this is the same product and here is the
cheapest"; a listing says "a store published this and we are repeating it".

Production check: `"noise earbuds"` → 2 offers, `"kurta"` → 8, `"aashirvaad atta"` → still a
real comparison. Twelve tests; empty results stay empty rather than being padded.

---

### 2.10 Grandmaster audit 2.0 — 3 November 2026

Full report: `docs/26-grandmaster-audit-2.md`. The short version, with every number
fetched from production:

| Found | Severity | State |
|---|---|---|
| 56 of 282 coupon codes carried trailing whitespace, so copying one pasted `NEW200       ` into checkout | critical | fixed at three layers, rows cleaned, 3 tests |
| 7 sitemap URLs (`/browse`, `/how-we-rank`, `/data-sources`, `/contact`, `/privacy`, `/terms`, `/disclosure`) were never prerendered and served the homepage body | critical | each now has its own real body; the build fails if a sitemap URL is unrendered |
| Product JSON-LD published demonstration prices as `Offer` + `InStock` | critical | `offers` emitted only for `data_origin: 'live'` prices — currently zero |
| `/deals` printed "200 offers live now" because it counted the loaded page; the truth is 1,089 | critical | server-side totals on the endpoint |
| The `affiliated` rule was documented and **never enforced**; `convertLink()` was never called | high | campaign approval synced weekly, `GET /api/meta/affiliate` |
| Deals hero claimed codes are "retired automatically" when shoppers report failure | high | copy corrected |
| Coded cards labelled "Deal" because the feed's discount value is 0 | high | they now say "Code" |

**Affiliate reality, measured:** 1,884 CPS campaigns cached — 1,543 `open`, 4 `pending`,
341 `not_applied`. Of the **241** merchants we publish offers for, **240 are approved and
earn on a completed purchase**. Cross-checked against `/links/convert`: Croma, Nykaa and
Firstcry returned `affiliated: true`; Flipkart, Myntra and Ajio returned `false`.

**Browser verification:** five viewports (360, 390, 430, 820, 1280) on home, deals, product,
the search fallback, browse and how-we-rank. No horizontal overflow anywhere, one `<h1>` per
page, 0 console errors, copy-to-clipboard confirmed writing the trimmed code.

---

## PART 3 — ARCHITECTURE, AND WHY IT IS SHAPED THIS WAY

### 3.1 Repository map

```
dealmosaic/
├── apps/
│   ├── web/                    React 18 + Vite SPA, deployed to Cloudflare Pages
│   │   ├── index.html          ← ownership meta tags live here (Cuelinks,
│   │   │                          Admitad, Google) — must be STATIC
│   │   ├── public/
│   │   │   ├── _worker.js      Pages Function: API proxy + real 404s
│   │   │   │                   + serves prerendered pages
│   │   │   ├── robots.txt      generated by scripts/generate-seo.mjs
│   │   │   └── sitemap.xml     generated, 51 URLs
│   │   └── src/
│   │       ├── routes/         Landing, Deals, Browse, Product, Search,
│   │       │                   Legal, auth pages, Dashboard, Settings
│   │       ├── components/     Chrome, DealsTicker, OfferCard, Podium, Ui, Icon…
│   │       ├── design/theme.css  design tokens + all layout (see 04)
│   │       └── lib/            api, coupons-api, search-api, seo, session
│   └── api/                    Hono on Node, deployed to Render
│       ├── src/
│       │   ├── app.ts          route registration, /api/health
│       │   ├── routes/         auth, search, catalogue, coupons, community,
│       │   │                   location, meta, fx, me, dev
│       │   ├── services/       search.ts (the comparison engine, 729 lines)
│       │   ├── connectors/     demo, ebay, feed, index (registry + honest status)
│       │   ├── lib/            mailer, outbox, http, rate-limit, cuelinks, security
│       │   ├── middleware/     session
│       │   └── db/             index.ts (adapter + migrations), schema.sql, catalog.sql
│       └── tests/              auth, coupons, mailer, feed, db-safety
├── packages/core/              Pure logic, zero I/O, fully unit-tested
│   └── src/                    matching, ranking, money, location, countries, validate
├── scripts/                    generate-seo, prerender, backup, db-backup,
│                               audit-design, secrets-scan, vault, dev
├── deploy/                     render.yaml, keepalive, feeds
├── docs/                       this documentation set (25 files)
└── secrets/                    encrypted vault (gitignored)
```

### 3.2 Request path, end to end

```
Browser
  │  same-origin request to /api/*
  ▼
Cloudflare Pages Function (_worker.js)
  │  proxies /api/* to API_ORIGIN  (no CORS, first-party cookies)
  ▼
Hono API on Render
  │  session cookie (httpOnly) → CSRF header check → rate limit → origin allowlist
  ▼
Turso (libSQL over HTTPS)
```

**Why the proxy matters:** the browser only ever talks to one origin. Cookies stay
first-party, CORS disappears entirely, and changing the API host later is a
Cloudflare environment variable rather than a front-end rebuild.

**Why the origin allowlist matters:** see §9.1. This is the bug that blocked every
registration for hours.

### 3.3 The comparison engine

`apps/api/src/services/search.ts` orchestrates:

1. `findCandidateVariants(query)` — matches the query against the catalogue.
2. If several plausible variants exist → returns `kind: 'needs_selection'` and
   **refuses to guess**. Silently picking 128 GB when the user meant 256 GB is
   showing the wrong price half the time.
3. `buildComparison()` — assembles offers, computes the landed total via
   `packages/core/src/money.ts`, ranks via `ranking.ts`, explains each rank.
4. Computes `dataMode` across all offers: `'live' | 'mixed' | 'demo'`.

Response contract (`SearchOutcome`):

- `kind: 'comparison' | 'needs_selection' | 'no_results'`
- `offers[]` — at most three, each with `position`, `price`, `platform`,
  `dataOrigin`, and rank reasons.

### 3.4 The data model (abridged)

Full definitions: `apps/api/src/db/schema.sql` and `catalog.sql`.

```
catalogue_products ──< product_variants ──< offers ──< offer_snapshots
                                     └──< community_prices (reported_at, trust_state)
users ──< sessions, user_preferences, user_search_history,
          saved_products, price_alerts, notification_events
coupons (standalone: external_id, tracking_url, trust_state, success/fail counts)
```

**Read `catalog.sql`, not `schema.sql`,** for products, variants, offers,
`community_prices` and `coupons`. This has caused one production bug already (§9.2).

### 3.5 Migrations

`apps/api/src/db/index.ts` runs `CREATE TABLE IF NOT EXISTS` plus **idempotent
`ALTER TABLE` checks** on every boot, because the production database persists
across deploys and `CREATE TABLE IF NOT EXISTS` cannot add a column to an existing
table. Any new column needs an entry in that check list or production will diverge
from a fresh database.

---

## PART 4 — DATA SOURCES: THE HONEST POSITION

### 4.1 We do not have live Indian retail prices, and that is not a coding gap

No Indian retailer sells authorised API access to their prices.

| Retailer | Reality | Zero-cost route? |
|---|---|---|
| Amazon India | PA-API needs ~10 qualifying affiliate sales in 30 days first | Partial, later |
| Flipkart | Affiliate signups closed for years; Minutes pricing per-pincode | Via affiliate networks only |
| Blinkit | Per-dark-store prices, change hourly, no public API | Partnership only |
| Zepto | No public consumer or affiliate price API | Partnership only |
| Swiggy Instamart | Affiliate programme is a link layer, not a price feed | Attribution only |
| BigBasket | Short cookie windows, no documented price API | Partnership only |
| **eBay India** | **Dead marketplace** — the API exists, nothing is listed | Must target eBay GB/US |
| eBay (global) | Browse API, 5,000 calls/day, genuinely free | **Yes — keyset pending** |

So the *"three best deals across every Indian store"* promise **cannot be kept
today by legal, zero-cost means.** Anyone claiming otherwise is scraping against
terms of service or inventing numbers. DealMosaic does neither.

### 4.2 What we do have

| Source | Volume | Status | Trust tier |
|---|---|---|---|
| **Cuelinks offers feed** | **1,088 live offers, 281 codes, 241 merchants** | **live** | `moderator_verified` |
| Demo catalogue | 25 products, 170 offers | live, labelled | `demo` |
| eBay Browse API | 0 | awaiting keyset | — |
| Community price reports | 0 | built, awaiting users | `reported` |

### 4.3 The connector layer

`apps/api/src/connectors/index.ts` defines a registry where
**"disabled-but-documented" is a first-class state.** Each known platform carries
`status` (`connected` / `awaiting_credentials` / `no_public_api` /
`partnership_required`), a plain-language `note`, and `routeToAccess`. The public
`/api/catalogue/connectors` endpoint reports the truth per platform, so the site
can never imply coverage it does not have.

---

## PART 5 — AFFILIATE MONETISATION

Full detail: `23-affiliate-status.md`.

### 5.1 Cuelinks — live

- Publisher **283346**, channel **333531**, Bronze, verified.
- API key scopes: `read:campaigns`, `read:offers`, `read:reports`,
  `read:transactions`, `write:links`.
- **Rate limit is 6 requests/minute.** A 1,088-offer sync takes ~9 minutes.
  Do not "optimise" this into parallel calls; you will be throttled.

### 5.2 The distinction that governs the revenue code

`POST /links/convert` **always returns a working link.** It does not always
return a *paid* one:

| Campaign state | `affiliated` | Meaning |
|---|---|---|
| `open` | **true** | Access granted instantly. Earns from the first click. |
| `pending` | false | Application submitted. Link resolves, earns nothing. |
| `not_applied` | false | Never asked. |

Verified live: Croma → `true`, Nykaa → `true`, Flipkart (pending) → `false`.

**Rule: a link is only treated as monetised when the API says `affiliated: true`.**
"A working link" is not evidence of earnings, and the code must never infer it.

### 5.3 Current status

- **Earning now, no approval needed:** 82 open Indian CPS campaigns, ~25 relevant
  to us — Croma 3.38%, Nykaa 4.2%, Bewakoof 11.55%, Brillare 27%, Biba 6%,
  Blackberrys 9%, Boat 6%, Acer 2.63%, Bella Vita 12%, Campus Shoes 11.25%,
  Firstcry, Decathlon, Moglix, Gonoise, Cashify, AliExpress, Banggood India.
- **Pending approval (agent-applied via API):** Flipkart (#122975), Amazon India,
  Myntra, Ajio.
- **Approval measured, not assumed (3 Nov 2026):** 1,884 CPS campaigns cached in
  `affiliate_campaigns` — **1,543 open** (approved, earns on a completed purchase),
  4 pending, 341 never applied. Of the **241** merchants whose offers we publish,
  **240 are approved**. Queryable at `GET /api/meta/affiliate`.
- **Zero earnings to date.** No traffic means no clicks. This is expected.

### 5.4 Admitad — tagged, blocked on owner

Ad space "Dealmosaic" is **Active** (verified). No publisher API key exists, so
nothing on Admitad can be automated. Two facts worth carrying forward:

1. The ruble-payment modal is **not a settings page** — it appears when joining a
   RUB-settling programme. It cannot be "undone". Not joining those programmes is
   the correct outcome for an India-only site.
2. Ad-space country settings live at **`id.mitgo.com/adspaces` → ad space → Edit**,
   not on the Admitad store dashboard. Cosmetic; affects advertiser matching only.

---

## PART 6 — SEO AND INDEXING

Full detail: `24-seo-indexing.md`.

### 6.1 The defect that mattered more than Search Console

Until 2 Nov, **every route served one identical 6.6 kB shell.** A Googlebot fetch
of `/p/aashirvaad-atta` returned the generic homepage title with no product name
and no price. 43 pages of duplicate content is grounds for
*"Crawled – currently not indexed"*, which no sitemap submission can fix.

`scripts/prerender.mjs` now runs in the build and writes a real HTML file per
route. Verified with a Googlebot user agent:

**Corrected 3 November:** the prerendered pages had unique `<head>` tags but **44 of them
carried the homepage body** — see §9.2b. The figures below are from the fixed build.

| URL | Bytes | Title |
|---|---|---|
| `/` | 15,190 | DEALMOSAIC — one search, three real deals |
| `/deals` | 8,689 | Today's best coupon codes and deals across Indian stores |
| `/c/staples` | 8,159 | Staples price comparison in India |
| `/p/aashirvaad-atta` | 9,480 | Aashirvaad Shudh Chakki Atta price in India — from ₹242.06 |

**44 pages prerendered** (1 home, 1 deals, 17 categories, 25 products). Each
carries a unique title, meta description, self-referencing canonical, Open Graph
tags, and `Product`/`Offer`/`Brand` JSON-LD with real prices. React mounts on top,
so humans get the full application.

### 6.2 The build pipeline

```
npm run build = generate-seo → vite build → prerender
```

Prerender fails soft: if the API is unreachable it logs a warning and ships the
SPA shell rather than failing the deploy.

### 6.3 Two traps, documented so they are not repeated

**The 308 trap.** Cloudflare Pages answers a request for a directory index with a
308 to the trailing-slash form. The first version of `_worker.js` passed that
through, so every prerendered page was a *redirect* rather than a page. The worker
now treats only 2xx as a match and serves the file directly.

**The canonical trap.** `seo.tsx` used to hardcode `https://dealmosaic.in` — a
domain we do not own — while `robots.txt` and `sitemap.xml` pointed at
`pages.dev`. Every page declared a canonical on a host that does not resolve.
Now resolved at runtime from `location.origin`.

### 6.4 Deliberate omissions

- **No `aggregateRating`.** We do not own reviews. Inventing star ratings is a
  structured-data violation.
- **No page-per-city.** Location is an API and a UI filter, not a URL farm.

### 6.5 IndexNow — attempted, blocked

Key file is live and correct (`/748571880d8a9f04ac688fac5bd91f59.txt`, HTTP 200)
but the API returns `403 UserForbiddedToAccessSite`. `pages.dev` is a shared
domain and cannot be attributed to us. Retry after a custom domain exists. It does
not cover Google anyway.

### 6.6 Search Console — owner-completed

Property verified (HTML tag), sitemap submitted, 51 URLs. All 51 return HTTP 200 —
verified, zero failures. "URL is unknown to Google" is the expected state for days;
it means *not yet crawled*, not *rejected*.

---

## PART 7 — OWNER-ONLY ACTIONS OUTSTANDING

Everything here needs a human with a phone and an identity. The agent has done
everything an API can do.

| # | Action | Where | Why it cannot be automated |
|---|---|---|---|
| 1 | **eBay developer keyset** | `developer.ebay.com` | Needs interactive login + phone verification. Applied 2 Nov, pending eBay approval. |
| 2 | **Cuelinks payment details** | `cuelinks.com/payment-details` | PAN + bank; deferred by owner. Nothing payable until earnings exist. |
| 3 | **Admitad payment details** | `store.admitad.com` → Payments | Same. Admitad may also require profile completion before advertiser approval. |
| 4 | **Rotate exposed passwords** | Gmail, Cuelinks, Admitad | The owner pasted a shared password into chat on 2 Nov. It must be changed. The agent declined to use it and used API tokens instead. |
| 5 | **Custom domain (optional)** | Registrar | `dealmosaic.in` is currently *referenced nowhere*, but would fix IndexNow and improve trust. Costs money — owner decision. |

**Agent will never ask for a password.** API tokens only: scoped, revocable in
seconds, and they cannot be used to take over an account.

---

## PART 8 — DEPLOYMENT AND BACKUP

### 8.1 Deploy

```bash
# web → Cloudflare Pages
npm run build
CLOUDFLARE_API_TOKEN=$CF_API_TOKEN CLOUDFLARE_ACCOUNT_ID=$CF_ACCOUNT_ID \
  npx wrangler@3.114.15 pages deploy apps/web/dist \
  --project-name=dealmosaic --branch=main

# api → Render (builds from GitHub main; push first)
git push origin main
curl -X POST "https://api.render.com/v1/services/srv-dbjrk8o473hc73anclcg/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" -H "Content-Type: application/json" \
  -d '{"clearCache":"do_not_clear"}'
```

**Wrangler note:** `wrangler@latest` requires Node ≥ 22. The sandbox has Node 20,
so **pin `wrangler@3.114.15`**. This is not a preference; `latest` exits with a
version error.

**Remote note:** `.git/config` is excluded from workspace snapshots, so
`git remote -v` is empty at the start of each session. Re-add before pushing:
`git remote add origin https://github.com/hh-team-dev/dealmosaic.git`

### 8.2 Environment variables (Render `srv-dbjrk8o473hc73anclcg`)

Present and verified — names only, values never in git:

```
NODE_ENV, SITE_URL, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN,
BREVO_API_KEY, MAIL_FROM, CUELINKS_API_KEY, CUELINKS_CHANNEL_ID, SYNC_TOKEN
```

### 8.3 Backup

```bash
npm run backup            # secrets scan + tar.gz of 172 files with checksums
npm run backup:verify <f> # verify checksums
npm run db:snapshot       # public-safe SQL dump
```

Backups live in `backups/` and are regenerated after every milestone. Everything
is additionally in the public GitHub repo. There is no state that exists only in
one place.

---

## PART 9 — BUGS FOUND, AND WHAT THEY TEACH

This section exists because the next person will otherwise repeat these. Every
one of these was found in production, not in review.

### 9.1 CRITICAL — registration was impossible from a browser

`assertSameOrigin()` compared the request's `Origin` host against its `Host`
header. Correct when one server serves both. Wrong in production, where the
browser is on `dealmosaic.pages.dev` and Cloudflare proxies `/api/*` to
`dealmosaic-api.onrender.com`. Render legitimately sees two different hosts; the
check called that an attack and returned **403 to every human signup.**

It survived the entire test suite because **every test and every curl sent no
`Origin` header at all.** The agent verified registration with curl, reported it
working, and no real person could sign up for hours.

**Fix:** an explicit allowlist (`SITE_URL`, the API's own host, localhost, plus
`ALLOWED_ORIGINS`). That is also the stronger CSRF defence — an attacker's page
cannot forge `Origin`. Three regression tests now send real browser headers.

**Lesson: test the client the user actually uses.** A passing suite against the
wrong client is worse than no suite, because it produces confidence.

### 9.2 `community_prices` lives in `catalog.sql`, not `schema.sql`

It uses `reported_at` / `trust_state`. Querying `observed_at` / `status` throws
`SQLITE_ERROR: no such column`. One production location endpoint was broken this way.

### 9.2b Every prerendered page was a copy of the homepage

Found on 3 November during a sweep that read the served HTML instead of trusting the
build log. `page()` read the shell from `dist/index.html` on **every** call. The first
call wrote the homepage body into that file, so the second call read a shell whose
`#root` was already occupied; the injection regex `/<div id="root">\s*<\/div>/` no
longer matched, `String.replace` returned the string untouched, and the file was
written with the homepage body and the *new page's* title.

The result: 45 pages, 45 correct titles, 45 correct canonicals, 45 valid JSON-LD blocks,
and **44 of them showing the front page**. The build printed a green tick every time.

**Fix:** the shell is read once into a module-level variable before the first write, and
the injector **throws** when a body cannot be placed. `scripts/verify-prerender.mjs` now
runs at the end of `npm run build` and fails on: a missing body, a repeated `<h1>`, a page
that names a host we do not own, or fewer pages than expected.

**Lesson: a build that reports success is not evidence of success.** Verify the artifact,
not the log. This one had been live for a day, and it was the exact duplicate-content
problem this project exists to avoid.

### 9.2c The unowned domain survived in three places

`seo.tsx` was fixed earlier, but `apps/web/index.html` still hardcoded
`https://dealmosaic.in` in seven JSON-LD fields and `vite.config.ts` still used it as the
`%SITE_URL%` default, so the built `og:image` was `https://dealmosaic.in/og.png` — a host
that does not resolve. Canonicals were correct, so nothing looked wrong; every WhatsApp
and X share simply showed no picture. Everything now derives from `SITE_URL`, and the
verifier fails the build if the string reappears.

### 9.2d The green build that shipped a false number

`/deals` printed *"200 offers live now"*. It was `coupons.length` — the rows that had
loaded — against a request capped at 200. The true figure was 1,089. Nothing in the
stack objected: the page rendered, the number was an integer, the design audit passed.

The same class of bug as 9.2b: a value derived from what happened to be in hand rather
than from the source of truth. Both are now impossible to reintroduce quietly, because
the endpoint returns whole-table totals and the deals page has nothing else to count.

**Lesson: any number on a page must come from a query that counts the population, not
from the array that happens to be rendered.**

### 9.3 Email: Gmail SMTP can never work on Render free

Render blocks outbound SMTP on ports 25, 465, 587 (since Sept 2025). The failure
surfaces as `Connection timeout` **before authentication**, which looks exactly
like a credentials bug and is not. Fixed by moving to HTTPS APIs
(Brevo → Resend → SMTP → none). Diagnosed by sending a real email and reading the
error, not by reasoning.

### 9.4 The absolute-URL bug in transactional email

The first genuinely delivered email contained the literal text
`/verify-email?token=…` with **no domain**. A relative path has no origin in a mail
client. Delivery worked; the link was dead. Only visible by reading the delivered
message — the API had reported success and the outbox said `sent_at`.

**Lesson: "the email was sent" and "the email is useful" are different assertions.**

### 9.5 Hosting quirks that cost time

- Cloudflare Pages answers directory indexes with **308** — see §6.3.
- `wrangler@latest` needs Node 22; the sandbox has Node 20 — pin `3.114.15`.
- Pages does not resolve an extensionless path to `index.html`; the worker must
  request `<path>/index.html` explicitly.
- The secret scanner counts test fixtures — name fake keys `test-…`, `dummy…`,
  `placeholder…` rather than weakening the rule.
- `node_modules` is not persisted between sessions; `npm install` first (~100 s).

---

## PART 10 — DESIGN SYSTEM

Full detail: `04-design-system.md`. Tokens live in
`apps/web/src/design/theme.css` (≈2,900 lines).

- **Palette:** Mosaic Plum ink `#452b5e` on warm surface `#fff9f0`; accents coral,
  blue, turquoise, sun, violet, pink, lime, tangerine. Each has a darker `-d`
  variant for text on light backgrounds.
- **Contrast:** body text 11.4:1, all checks pass WCAG 2.2 AA. Enforced by
  `npm run audit:design`, which also fails on any near-black value.
- **Layout:** single column below 620px, two up at 620px, three up at 980px.
- **The deals page** treats the coupon code as the hero element — monospace, on a
  dashed coupon edge that fills with colour on copy. Cashback gets its own edge
  colour and an explicit "not taken off the price you pay" line.
- **The ticker** (`DealsTicker.tsx`) has fixed 44px height so it cannot cause
  layout shift, pauses on hover, is disabled entirely under
  `prefers-reduced-motion`, and renders nothing below three offers.

---

## PART 11 — EMAIL

Full detail: `20-email-delivery.md`.

Precedence: **Brevo → Resend → SMTP → none**, chosen automatically from env vars.

- Brevo free: 300/day, no card, single-sender verification (no domain needed).
- Resend needs a verified domain to send to third parties — fallback only.
- `sendMail` **never throws**. The outbox row is written first, then `sent_at` or
  `send_error`. Delivery is therefore provable, not assumed.
- `settings()` strips whitespace from app passwords.
- A blocked SMTP port now produces a readable hint pointing at `BREVO_API_KEY`.

---

## PART 12 — LOCATION

Full detail: `21-location-and-maps.md`.

**Canonical location is the 6-digit pincode, not GPS.** The delivery promise is
made per-PIN by the platform; a distance radius would invent a promise the retailer
never made.

- `GET /api/location/pincode/:code` — public, `max-age=86400`.
- `GET /api/location/summary?pincode=` — 14 platforms + community reports + disclaimer.
- `serviceability` is hard-coded `'unknown'`; `quickCommerceHint` only `'likely'`
  or `'unknown'`; `etaBand(null)` → `'unknown'`.
- Maps: Leaflet + OpenStreetMap, ₹0, lazy-loaded, only where a map answers a
  question. Never Google Maps (paid).

Live proof: `400001` → Mumbai, `likely`; `560001` → 14 platforms; `012345` → 400.

---

## PART 13 — THE GAP BETWEEN CODE AND INTERFACE

Reconciled against production on 3 November 2026. Three of the five rows that used to
read ❌ in the UI column are now shipped, which is why this table is kept short: it is
the list of things that exist in the API but a shopper cannot reach.

| Capability | API | UI |
|---|---|---|
| Coupons / deals | ✅ | ✅ `/deals`, 14 homepage shelves |
| Comparison search | ✅ | ✅ `/search?q=` |
| Offers when nothing matches | ✅ | ✅ "Stores mentioning …", §2.9 |
| Price alerts | ✅ | ✅ product page → `/app` |
| Price history | ✅ | ✅ chart on the product page |
| Location / pincode | ✅ | ✅ pincode control, product page |
| Community price reports | ✅ | ✅ form + list, product page |
| Coupons on comparison pages | ✅ | ✅ `CouponStrip` |
| Wishlist / recently viewed | ✅ device-local | ✅ `/saved`, homepage shelf |
| **Coupon moderation** | ❌ | ❌ manual SQL — see §14.2 item 5 |
| **Admin panel** | partial | ❌ no admin surface exists, by design |

Owner-only actions are in PART 7; everything else on this table is the agent's work.

---

## PART 14 — ROADMAP, IN PRIORITY ORDER

**Last reconciled against production: 3 November 2026.** Everything marked done was
verified live by HTTP or SQL on that date, not inferred from a commit.

### 14.1 Done

| # | Item | Where it lives |
|---|---|---|
| 1 | Premium visual identity, mobile-first, no-black rule | `design/theme.css`, `audit:design` |
| 2 | Discovery homepage — 14 shelves from live rows | `services/discover.ts`, §2.5 |
| 3 | Comparison of three best offers with landed cost | `services/search.ts`, `Podium`, `OfferCard` |
| 4 | Smart Savings / effective price with unknown lines | `packages/core/src/money.ts`, `PriceTruth` |
| 5 | Coupon intelligence: dedupe, expiry, copy-code, trust state | `routes/coupons.ts`, `services/affiliate-sync.ts` |
| 6 | Price history (own observations, never backfilled) | `services/snapshots.ts`, `PriceChart` |
| 7 | Price alerts by email, firing only on a real drop | `services/alerts.ts`, 10 tests |
| 8 | Wishlist + recently viewed, no account needed | `lib/saved.ts`, `/saved` |
| 9 | Pincode control and published delivery promises | `lib/pincode.ts`, `/api/location/summary` |
| 10 | Community price reports (never merged into a total) | `routes/community.ts`, `CommunityPanel` |
| 11 | Coupons shown on comparison pages | `CouponStrip` |
| 12 | The whole daily job, self-scheduled off the health ping | `services/daily-job.ts`, §2.6 |
| 13 | A dead-end search falls back to live store listings | `services/offer-search.ts`, §2.9 |
| 14 | Unique prerendered body on every page, verified at build time | `scripts/prerender.mjs`, `verify-prerender.mjs` |
| 15 | All 7 prose pages prerendered (were serving the homepage body) | `scripts/prerender.mjs` |
| 16 | Structured data stops publishing demonstration prices | `productJsonLd(..., pricesAreLive)` |
| 17 | Affiliate approval made checkable; `GET /api/meta/affiliate` | `services/affiliate-campaigns.ts` |
| 18 | Coupon codes trimmed at import, read and clipboard | `cuelinks.ts`, `coupons.ts`, `DealCard.tsx` |
| 19 | Whole-table totals on `/deals` instead of counting the loaded page | `routes/coupons.ts`, `Deals.tsx` |

### 14.2 Not done, in the order they should be attempted

1. **Catalogue depth — 25 products is the real ceiling.** Everything else is now in place;
   this is the one gap a shopper feels. It is not a coding problem: no Indian retailer
   sells a price API, so more products need either an approved eBay India keyset, a
   retailer feed partnership, or shopper-contributed data. Until one exists, adding
   products means inventing prices, which is forbidden.
2. **Cashback tracking.** Not started, on purpose. There is no cashback ledger to track:
   Cuelinks pays us on conversions and settles on its own cycle. A "cashback" page built
   today would be a promise we cannot keep, and cashback is never a discount here anyway.
3. **Personalised deals.** Deliberately last. With 1 registered user and no click history,
   "personalised" would mean guessing. The device-local "Where you left off" shelf is the
   honest version of this until there is traffic to learn from.
4. **Store pages (`/s/:merchant`).** Every deal currently leads off-site. Grouping the 245
   merchants into real pages would add a browse layer and deep internal linking. Safe only
   where a merchant has enough live offers to avoid thin pages.
5. **Admin control centre.** No admin surface exists at all: moderation, verification and
   catalogue edits are SQL. At 1,089 rows that is survivable; it is the largest remaining
   build and the one the owner asked for by name.
6. **Coupon moderation panel.** Verification is manual SQL today.
7. **Sync speed.** A full 1,089-offer sync took **28 s** in the audit-2 run (batched per
   page); a cold, unbatched run was 8.5 min. Watch it rather than assume.
8. **Brand pages from the catalogue** — high-intent searches, but only once item 1 is
   solved, or they are thin by construction.

### 14.3 Not planned

- **PWA** — deferred by the owner. The site is install-ready; no service worker is shipped.
- **Cloudflare D1** — the owner chose Turso. Do not re-litigate.
- **Google Maps** — paid. Location stays OSM/pincode-based.
- **Any paid tier** — the ₹0 rule is not a phase.

---

## PART 15 — FOR THE NEXT DEVELOPER: START HERE

### 15.1 Get running in five minutes

```bash
cd /home/user/dealmosaic
npm install                    # ~100 s; node_modules is not persisted
set -a && . ~/.config/dealmosaic/deploy.env && set +a   # deploy credentials
npm run check                  # must be green before you change anything
npm run dev                    # api + web
```

If `deploy.env` is missing, the project still builds and tests; you only lose
deploy capability. Never commit it.

### 15.2 Before you push

```bash
npm run check   # typecheck ×3, 156 tests, design audit, secret scan
npm run build   # must report "prerendered 44 pages"
```

### 15.3 Things that will bite you

- `.git/config` is wiped between sessions — re-add the remote.
- `node_modules` is wiped between sessions — `npm install` first.
- `wrangler@latest` needs Node ≥ 22 — pin `3.114.15`.
- Edit `catalog.sql`, not `schema.sql`, for product/price/coupon tables.
- Adding a column requires an idempotent `ALTER` in `db/index.ts`.
- The Cuelinks API allows 6 requests/minute.
- Never commit `.local`, `secrets/`, or anything matching the scanner's rules.

### 15.4 How to tell whether something actually works

Two rules learned the hard way:

1. **Test with the client the user uses.** Curl without an `Origin` header hid a
   total signup failure (§9.1).
2. **Verify against production, not against intent.** Every claim in this document
   was fetched live. "I deployed it" is not the same as "it responds correctly".

---

## PART 16 — DOCUMENT INDEX

| File | Contents |
|---|---|
| **`00-MASTER-HANDOVER.md`** | **This file — read first** |
| `00-executive-summary.md` | Original concept and positioning |
| **`25-competitive-gap-analysis.md`** | **The audit behind the discovery block: what was broken, the price-parsing discovery, shelf-by-shelf data reality, what is still open** |
| `01-research-competitive-matrix.md` | Competitor analysis |
| `02-connector-feasibility.md` | Per-retailer API reality |
| `03-architecture.md` | Original architecture decisions |
| `04-design-system.md` | Palette, contrast, layout rules |
| `05-data-model.md` | Schema rationale |
| `06-roadmap.md` | Original phase plan (historical) |
| `07-test-strategy.md` | What is tested and why |
| `08-zero-cost-ledger.md` | Every service and its free limit |
| `09-risks-assumptions.md` | Risks and how they are handled |
| `10-quickcommerce-grocery.md` | Quick-commerce specifics |
| `11-owner-setup-guide.md` | Account setup walkthrough |
| `12-phase1-report.md` | Historical build report |
| `13-phase2-report.md` | Historical build report |
| `14-seo-launch-checklist.md` | SEO checklist |
| **`15-project-handover.md`** | **Detailed technical handover + incident log** |
| **`16-owner-credentials-register.md`** | **Every account, who owns it, recovery** |
| `17-hosting-and-deployment-plan.md` | Deployment detail |
| `18-owner-quickstart-accounts.md` | Account quickstart |
| `19-data-acquisition.md` | Feed strategy and legal constraints |
| `20-email-delivery.md` | Email setup for the owner |
| `21-location-and-maps.md` | Location master design |
| `22-audit-and-redesign.md` | Full audit and gap analysis |
| `23-affiliate-status.md` | Which merchants earn today |
| `24-seo-indexing.md` | Prerendering, IndexNow, Search Console |

**Secrets are never in this set.** They live in the encrypted vault, documented in
`16-owner-credentials-register.md`, which lists *where* each credential lives and
who owns it — never the value.

---

## PART 17 — THE HONEST SUMMARY

**What is genuinely good:** the engine, the honesty constraints enforced in code,
the test suite, the prerendering, the zero-cost stack, and documentation thorough
enough that this line of thinking survives its author.

**What is genuinely limited:** 25 products; no live Indian retail price feed; no
traffic yet; zero revenue to date; the quick-commerce promise rests entirely on a
partnership that does not exist. Every phase of the master command now has a shipped,
verifiable surface — but a shopper who searches for something outside those 25 products
still cannot get a ranked comparison, and no amount of interface work changes that.

**What that means:** the technical foundation is as good as it can be at zero
cost. The remaining work is **data and content** — catalogue depth, and pages
worth linking to. That is not a coding problem, and no amount of further
engineering substitutes for it.

**The one sentence to carry forward:** *DealMosaic wins by being the site whose
number is right, in a market where every competitor's number is a sales pitch.*

---

*End of master handover. If something in here contradicts the live system, the
live system is right — and this file should be corrected in the same commit that
corrects the system.*
