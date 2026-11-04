# DEALMOSAIC — Complete Project Handover

> **Current enhancement — 2.1.1:** [36-persistent-install-and-deals.md](36-persistent-install-and-deals.md) records the globally persistent install invitation and floating offers, motion/accessibility controls, form protection, exact release verification and recovery. The 2.0.1 details below remain the preceding release's verified history.

> **PWA / website release 2.0.1 — 4 November 2026:** the distinctly marked handover is [35-pwa-handover.md](35-pwa-handover.md). It records installation, platform limits, static-only offline safety, shared-code feature parity, paired PWA/classic deployable packages and rollback. The exact pre-PWA website is preserved as `website-v1.4.0` / `release/website-v1.4.0` at `5f85cf3`, plus a complete verified Git bundle. For current deployment/test evidence read section 10 of the PWA handover; the audit release below remains historical evidence. Never roll back a PWA by serving old website files without the same-URL removal worker.

> **4 November 2026 audit:** read `34-sitewide-audit.md` for current fixes, test
> coverage and deployment evidence. Older counts below are historical.
>
> **4 November 2026 update:** for the new direct-shop routes, data model, operating
> guide and actual implementation limits, read `33-direct-shop-release.md` and the
> latest master handover first. The historical technical description below predates
> owner-operated checkout. Carrier APIs remain unconnected and direct sales paused.


> **The single entry point is [`00-MASTER-HANDOVER.md`](00-MASTER-HANDOVER.md).**
> This file remains the detailed technical log — incident history, schema notes and
> per-module detail — and is the reference the master document links into.


**For any developer, AI or human, taking over this project.**

| | |
|---|---|
| **Project** | DEALMOSAIC — price comparison for India |
| **Tagline** | One search. Three real deals. Zero price surprises. |
| **Document version** | 1.1 |
| **Handover date** | 2 November 2026 · reconciled against production 3 November 2026 |
| **Build state** | Phases 1–7 live (website + API + Turso) · **211 tests** · 33 design assertions · 45 verified prerendered pages · clean build |
| **Owner** | The project owner (see `docs/16-owner-credentials-register.md`) |
| **Secrets** | **Not in this document.** They live in an encrypted vault — §17. |

### Addendum, 3 November 2026 — what changed after this document was written

This log was written on 2 November. Everything below is newer than the body of this
file, and `00-MASTER-HANDOVER.md` §2.5–§2.9 is the authoritative state:

- **Discovery homepage** — 14 shelves built from the 1,089 live offers, with a floor per
  shelf and a `withheld` array so a thin day makes the page shorter, never fictional.
- **Return-visit block** — price alerts (email, fires only on a real drop), price history
  from our own daily observations, pincode control, community price reports, coupons on
  product pages, wishlist and recently-viewed in `localStorage`.
- **Self-scheduling daily job** — feed refresh → snapshots → alerts, claimed by a
  conditional UPDATE so two health pings cannot double-run it. 5.5 s on production.
- **Search fallback** — a query the 25-product catalogue cannot answer now returns the
  live store offers that mention those words, labelled as listings rather than a
  comparison.
- **Two shipped defects found and fixed on 3 Nov** — the prerender was writing the
  homepage body into 44 of 45 pages, and the unowned `dealmosaic.in` host was still
  emitting an `og:image` that did not resolve. Both are now impossible: the build
  verifies its own output (`scripts/verify-prerender.mjs`).
- **Accessibility and touch pass** — duplicate gradient ids in the logo removed, the
  28 px save heart made 40 px, ticker links made 36 px tall. Homepage sub-32 px
  targets 126 → 12 (the rest are inline links inside sentences, which WCAG exempts).
- **The master icon was replaced** — "Prism Tessera" → "Mosaic M", a two-polygon
  letterform. Three real defects fixed in the same pass: `apple-touch-icon` pointed
  at an SVG (so iOS had no home-screen icon), `manifest.webmanifest` did not exist,
  and the logo's per-instance gradient `useId` scaffolding became unnecessary
  because two flat fills need no ids. Reasoning, scores and asset inventory:
  `docs/brand-identity.md`; operating summary: `00-MASTER-HANDOVER.md` §2.17.

> **The 60-second version.** This is a working price-comparison web app for India.
> It resolves a product to an exact variant, itemises the true landed cost per
> retailer, ranks at most three offers commission-blind, and explains the ranking.
> It runs today with *demonstration* prices because no Indian retailer grants
> authorised price data yet — and it says so everywhere rather than pretending.
> Everything is free and open-source. Your job is to connect real data and keep the
> honesty rules intact.

---

## 1. Read this before you change anything

Five rules are load-bearing. Breaking any one of them breaks the product, not just
a feature. Each is enforced in code and covered by a test.

1. **An offer whose total cannot be fully verified never outranks a fully verified
   one.** Missing cost data is a *state*, never a zero.
2. **Affiliate commission is not an input to ranking.** A test permutes every
   commission rate to 0 / 50 / 1200 / 9999 bps and asserts the order is unchanged.
3. **Never compare different variants.** Identity is resolved by an explicit ladder
   (GTIN → MPN → ISBN → brand+model+attributes → validated title). Below 0.70
   confidence we ask the user instead of guessing.
4. **Nothing demo is presented as live.** Every demonstration offer is stamped
   `data_origin = 'demo'` and watermarked in the UI.
5. **No black, anywhere.** Enforced numerically by `npm run audit:design`, which
   fails the build if the darkest colour crosses near-black.

If a task seems to require violating one of these, the task is wrong.

---

## 2. What the product is

### 2.1 The concept

Every other comparison site shows you a **listed price**. DEALMOSAIC shows you the
**total you will actually pay**: item price + delivery + fees + tax, itemised, with
unknown costs called unknown. Then it shows **at most three** offers — not thirty —
ranked by that total, and states in plain language why each one sits where it does.

Three deliberate constraints define the product:

- **Three offers, not a list.** A wall of 40 prices is a data dump, not a decision.
  Three is a choice a person can actually make.
- **Commission-blind.** The business model cannot buy a better ranking. This is the
  product's entire claim to trust, and it is a tested invariant.
- **Explainable.** Every ranking prints its reason. "Why is this #1?" is answered
  with facts from the observation, not adjectives.

### 2.2 Who it is for

An Indian shopper deciding where to buy one specific thing — a phone, a laptop, a
packet of chips — who suspects the cheap-looking price is not the cheap total.
Grocery and quick-commerce (Blinkit, Zepto, Instamart, BigBasket, JioMart, Flipkart
Minutes, Amazon Now, DMart Ready) are **first-class**, not an afterthought:
10-minute delivery has made delivery fees, cart thresholds and pack sizes the
dominant source of price surprise in India.

### 2.3 Scope decisions already made

| Decision | Status | Why |
|---|---|---|
| **India only** at launch | Locked | International exists in the data model and country table, disabled. Do not enable without owner instruction. |
| **Mobile-first** | Locked | The purchase decision happens on a phone. Desktop is fully supported and tested to 1920px. |
| **PWA / installability** | Deferred | Architecturally ready; no service worker yet. |
| **Zero cost** | Locked | No paid dependency, no paid tier, no payment method on any account. |
| **No scraping** | Locked | Refuse it, even when it would be the easy path. |

---

## 3. Current status

### 3.1 What works, end to end

- Registration → email verification (dev outbox) → sign-in → session → dashboard
- Password reset with full session revocation; account export; hard deletion
- Product search → variant disambiguation → three ranked offers → itemised costs
- Deal Confidence, Trust Radar, Deal Passport, Deal Podium, price history
- Catalogue browse, category hubs, indexable product pages
- Methodology and data-provenance pages
- Per-route SEO: title, description, canonical, robots, JSON-LD
- Generated `sitemap.xml` (50 URLs), `robots.txt`, `llms.txt`
- Backup tooling with SHA-256 manifests; encrypted credentials vault; secret scanner

### 3.2 What does not work yet, and says so in the UI

| Not done | Where it surfaces | Blocked by |
|---|---|---|
| **Live retailer prices** | `dataMode: "demo"`, DEMO DATA watermark | No authorised API (see §12) |
| Real email delivery | `/api/dev/outbox` used in dev | Needs a free provider + integration |
| Watchlists, price alerts | — | Not built (Phase 4) |
| Rewards / XP | — | Not built (Phase 4) |
| Admin panel with audit log | — | Not built (Phase 4) |
| Support tickets | — | Not built (Phase 4) |
| Community price submission UI | API exists, no form | Not built (Phase 3) |
| PostgreSQL | SQLite only | Not built (Phase 5) |
| PWA / offline | — | Deferred by owner |

### 3.3 Verified numbers (reproduce with `npm run check && npm run build`)

```
Tests          283 passing across 20 files
Design audit   43 assertions passing
Secrets        0 found in 224 scanned files
Build          450 kB JS / 137 kB gzip
               68 kB CSS / ~12 kB gzip
Prerender      53 pages · 52 unique <h1> · own host only
Browser        0 page errors · 0 failed requests
               0 horizontal overflow at 360/390/414/768/1024/1440/1920 px
Database       21 tables
Catalogue      25 products · 46 variants · 17 categories
Coupons        1,116 live, from Cuelinks
```

(Figures re-measured on 3 November 2026. The older numbers in this section's history
were from the first build and would understate the test suite by a factor of three.)

---

## 4. Running it

### 4.1 Requirements

Node 20+ (developed on 20.20.2), npm 10+. Nothing else — no Docker, no database
server, no API keys.

### 4.2 Commands

```bash
npm install          # ~154 packages
npm run dev          # API :8787 + web :5173 together
npm run dev:api      # API only
npm run dev:web      # web only  (cwd must be apps/web — Vite resolves index.html there)
npm test             # 156 tests
npm run audit:design # colour/contrast/no-black audit
npm run secrets:scan # check for leaked credentials
npm run check        # all three gates
npm run build        # sitemap → typecheck → vite build
npm run seo          # regenerate sitemap.xml, robots.txt, llms.txt
npm run backup       # scan secrets → create verified archive
npm run vault:init   # create the encrypted credentials vault
```

### 4.3 First run

The database is created and seeded automatically on first boot
(`apps/api/data/dealmosaic.db`). Delete the file to reset to a clean demo catalogue.

### 4.4 Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/` returns 404 | Vite started from the repo root | Run with cwd `apps/web` (or use `npm run dev`) |
| `unable to open database file` | `data/` missing | Already handled in `db/index.ts` via `mkdirSync`; ensure the dir is writable |
| Verification email never arrives | No email provider | Read the link from `GET /api/dev/outbox` |
| `429` on register/login | Rate limiter: 10 auth attempts/IP/15 min | Wait, or restart the API (buckets are in memory) |
| Search returns 403 `email_unverified` | Account not verified | Verify via the dev outbox link |
| Design audit fails | A colour crossed near-black, entered the blue/violet hue window, or failed contrast | Read the assertion output; it names the hex and the hue |

---

## 5. Architecture

### 5.1 Shape

A three-package npm-workspace monorepo. The split exists so the money and ranking
logic is testable in isolation and impossible to duplicate in the UI.

```
┌─────────────────────────┐
│ packages/core           │  pure TypeScript, ZERO dependencies
│ money · matching ·      │  the only place price/identity/rank logic lives
│ ranking · countries     │  imported by BOTH api and web
└──────────┬──────────────┘
           │
     ┌─────┴──────┐
┌────▼─────┐  ┌───▼──────────┐
│ apps/api │  │ apps/web     │
│ Hono     │  │ React 19     │
│ Turso    │  │ Vite         │
│ connectors  │ routes       │
└──────────┘  └──────────────┘
```

### 5.2 Request flow — a search

```
Browser  POST /api/search {query}
   │
   ▼
rate limiter → session loader → auth gate (401) → verification gate (403)
   │
   ▼
services/search.ts  runComparison(query)
   1. parseQuery            → normalise, extract GTIN/capacities
   2. findCandidateVariants → score products by token hits, keep the top tie
   3. resolveVariants       → if >1 variant and query names none: return
                              needs_selection with candidates
   4. load offers + snapshots from DB
   5. buildOfferPrice       → Price Truth per offer (itemised, verification state)
   6. rankOffers            → commission-blind sort, confidence, explanation
   7. slice(0,3)            → at most three, hard cap
   │
   ▼
JSON: comparison | needs_selection | no_results
```

Nothing in step 5–7 knows what a retailer is. Connectors normalise data *into*
offers; the engines never fetch.

### 5.3 Connector flow

```
connectors/index.ts  registry
   ├── demo.ts   always active  → reads seeded DB rows, dataOrigin 'demo'
   └── ebay.ts   active only when EBAY_CLIENT_ID/SECRET are set, dataOrigin 'live'

health()  → { status: live | demo | disabled | degraded | error, detail, needsCredentials }
```

A connector that cannot fetch must report **`disabled` with a reason**, never return
`[]` — an empty list reads as "no price found", which is a different and misleading
statement. `GET /api/catalogue/connectors` exposes this to the UI.

---

## 6. Repository map

```
dealmosaic/
├── package.json                 workspace root, all npm scripts
├── .env.example                 every env var, marked "read today" vs "reserved"
├── .gitignore                   ignores node_modules, dist, *.db, .env, backups/, secrets/*
├── README.md                    entry point
│
├── apps/api/
│   ├── src/app.ts               Hono app: middleware, security headers, route mounting
│   ├── src/server.ts            HTTP listener
│   ├── src/db/
│   │   ├── index.ts             connection, migrate(), seedReferenceData()
│   │   ├── schema.sql           14 core tables
│   │   ├── catalog.sql          7 catalogue tables
│   │   ├── catalog-data.ts      PURE data: 25 products, platform metadata
│   │   └── catalog-seed.ts      seeds catalogue with demo offers
│   ├── src/connectors/
│   │   ├── types.ts             Connector contract + timedFetch
│   │   ├── demo.ts              demonstration connector
│   │   ├── ebay.ts              eBay Browse API (env-gated)
│   │   └── index.ts             registry + KNOWN_PLATFORMS status
│   ├── src/lib/                 security, http, rate-limit, outbox, audit
│   ├── src/middleware/session.ts cookie session → user
│   ├── src/routes/              auth, me, meta, fx, dev, search, catalogue, community
│   ├── src/services/search.ts   THE PIPELINE (see §5.2)
│   └── tests/auth.test.ts       23 API tests
│
├── apps/web/
│   ├── index.html               site-level meta + Organization/WebSite JSON-LD + noscript nav
│   ├── vite.config.ts           0.0.0.0:5173, /api proxy → :8787, allowedHosts true
│   ├── public/                  favicon, self-hosted woff2 fonts, generated sitemap/robots/llms
│   └── src/
│       ├── design/theme.css     the whole design system (~1800 lines)
│       ├── lib/                 api.ts, session.tsx, format.ts, search-api.ts, seo.tsx
│       ├── components/          Icon, Ui, Toast, Chrome, PublicChrome, Logo, AuthLayout,
│       │                        PriceTruth, DealSignals, Podium, OfferCard, SampleComparison
│       ├── routes/              Landing, Search, Browse, Product, Method, Dashboard,
│       │                        Settings, Register, Login, VerifyEmail, ForgotPassword,
│       │                        ResetPassword, Legal
│       ├── App.tsx              router + RequireAuth + ScrollToTop
│       └── main.tsx             entry
│
├── packages/core/
│   ├── src/money.ts             integer minor units, Price Truth Engine, unit pricing
│   ├── src/matching.ts          identity ladder, grouping, variant disambiguation
│   ├── src/ranking.ts           commission-blind ranking, Deal Confidence
│   ├── src/countries.ts         India enabled; others present but disabled
│   ├── src/types.ts             shared domain types
│   ├── src/validate.ts          email/password/PIN validation
│   └── tests/                   4 test files, 55 tests
│
├── scripts/
│   ├── dev.mjs                  run API + web together
│   ├── audit-design.mjs         33 colour/contrast/no-black assertions
│   ├── generate-seo.mjs         sitemap.xml, robots.txt, llms.txt from catalogue data
│   ├── backup.mjs               archive + SHA-256 manifest + verify + retention
│   ├── vault.mjs                AES-256-GCM encrypted credential vault
│   └── secrets-scan.mjs         pre-commit/backup secret detection
│
├── docs/                        00–16 (see §18)
├── backups/                     generated archives (git-ignored)
└── secrets/                     encrypted vault only (git-ignored)
```

---

## 7. The core engines (read these files first)

### 7.1 `packages/core/src/money.ts` — the Price Truth Engine

All money is **integer minor units** (paise). No floating point ever touches
currency. `formatMoney` is the only place integers become text.

Every cost line has a state:

| State | Meaning | Effect on total |
|---|---|---|
| `confirmed` | Verified for this purchase | Included |
| `estimated` | Real number, derived not published | Included; total becomes **partial** |
| `not_available` | Source gave nothing | Excluded; total **not verified** — never zero |
| `not_applicable` | Genuinely doesn't apply | Excluded, treated as a known zero |
| `conditional` | Applies only under stated conditions | Excluded and listed in `conditional[]` |

**The subtle rule:** a `conditional` line of a *mandatory* kind (`item`, `shipping`,
`tax`) makes the total **partial**. A conditional *fee* or *discount* does not.
This is what makes quick commerce representable: Blinkit's delivery fee is real
money that depends on cart value, so a Blinkit total can never be called "complete".

```ts
buildPriceTruth(lines, 'INR') → {
  knownTotalMinor, verifiedTotalMinor, verificationState,
  missing[], conditional[], discountsAppliedMinor
}
```

`unitPrice(priceMinor, netQuantity, unit)` normalises grocery to ₹/100g or ₹/100ml.
Returns `null` when quantity is unknown — never guesses.

### 7.2 `packages/core/src/matching.ts` — identity

The ladder, and why each rung exists:

| Confidence | Method | Note |
|---|---|---|
| 1.00 | GTIN/EAN/UPC | A barcode is an identity. Two *different* known barcodes → score 0. |
| 0.95 | MPN | The maker's own model code |
| 0.92 | ISBN | Books are identified by ISBN, not title |
| 0.86 | Brand + model + all variant attributes agree | The workhorse |
| 0.72 | Brand + model, attributes partly agree | Shown, not auto-selected |
| 0.55 | Brand + model only | No variant data to check; we say so |
| 0.40 | Title similarity | Listed as a possibility, never presented as fact |

`AUTO_MATCH_THRESHOLD = 0.7`. Below it, `resolveVariants()` returns
`needsSelection` and the UI asks.

**Critical implementation detail:** attribute matching must be boundary-aware.
A naive `includes()` makes `"512gb".includes("12gb")` true and silently selects the
wrong variant. `attributeMentioned()` matches numeric attributes only against parsed
capacity tokens. Do not "simplify" this.

For grocery, the same ladder is applied with `size`/`flavour` attributes, so a 52 g
packet is never grouped with a 180 g family pack.

### 7.3 `packages/core/src/ranking.ts` — commission-blind ranking

Sort key, in order:

```
1. verification state   (complete before partial — but see the exception below)
2. in stock
3. known total (minor units)
4. match confidence
5. freshness
```

**The exception, and why it exists.** If *no* offer's total can be verified — all of
quick commerce, always — demoting everything would leave an empty page in the
product's flagship category. In that case we rank on the verified **portion** and
the payload reports `rankingBasis: 'verified_portion_only'`, which changes the
podium copy. Ranking by freshness instead (what a null-total sort silently does)
would be arbitrary and unexplainable to a user.

Deal Confidence, published weights:

| Component | Weight | Meaning |
|---|---|---|
| Source reliability | 30% | Authorised connector > feed > shopper report |
| Freshness | 25% | Age of the observation |
| Product match | 20% | Certainty of exact-variant identity |
| Delivery information | 15% | Does the store publish a delivery charge? |
| Seller information | 10% | Does the platform publish seller ratings? |

Confidence describes **trust in the data**. It is not a product score and not a
seller score, and the UI says so. Note that a #1 offer can legitimately have lower
confidence than #2 — that is the design working.

---

## 8. API reference

Base path `/api`. All responses JSON. Errors are `{ error: { code, message, fields? } }`.

### Auth (`/api/auth`)

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | email, password, passwordConfirm, displayName, ageConfirmed, consent → 201 |
| POST | `/verify-email` | `{ token }` |
| POST | `/resend-verification` | |
| POST | `/login` | 403 `email_unverified` + fresh `devActionUrl` if unverified |
| POST | `/logout` | revokes the session server-side |
| GET | `/session` | `{ user, preferences, csrfToken }`, 200 with `user: null` when anonymous |
| POST | `/forgot-password` | identical response for unknown emails (no enumeration) |
| POST | `/reset-password` | revokes **all** sessions |

### Me (`/api/me`)

`GET /` · `PATCH /` (profile) · `PATCH /preferences` (rejects non-IN `countryCode`) ·
`GET /export` (full data export) · `DELETE /` (requires correct password **and** the
literal string `DELETE`)

### Search & catalogue

| Method | Path | Notes |
|---|---|---|
| POST | `/api/search` | `{ query, variantId? }`. 401 anonymous · 403 unverified · 200 otherwise |
| GET | `/api/catalogue/products` | `?category=&q=&limit=` |
| GET | `/api/catalogue/categories` | |
| GET | `/api/catalogue/products/:slug` | product + variants |
| GET | `/api/catalogue/connectors` | connector health + every known platform + policy |
| GET | `/api/catalogue/trending` | real aggregate counts |
| GET | `/api/community-prices/:variantId` | `?pincode=` |
| POST | `/api/community-prices` | reports; auto-corroborates within 2 h and 5% |

### Meta & dev

`GET /api/meta/countries` · `/currencies` · `/platforms` ·
`GET /api/fx/rates` (Frankfurter, keyless, live) ·
`GET /api/dev/outbox` (**development only** — exposes verification links) ·
`GET /api/health`

### Security posture

Security headers on `/api/*`; CSRF token required on state-changing requests;
same-origin assertion; rate limiting (general + stricter auth); scrypt password
hashing; sessions stored hashed and revocable; `X-Robots-Tag: noindex` on API
responses. XSS is prevented by React's escaping; SQL injection by parameterised
statements throughout (`@libsql/client`, SQLite-compatible prepared statements only).

---

## 9. Frontend

### 9.1 Routes

| Path | Component | Auth | Indexed |
|---|---|---|---|
| `/` | `Landing` | public | yes |
| `/search` | `Search` | **required** | **no** (`noindex`) |
| `/browse`, `/c/:slug` | `Browse` | public | yes |
| `/p/:slug` | `Product` | public | yes, + `Product` JSON-LD |
| `/how-we-rank` | `Method` | public | yes |
| `/data-sources` | `Method` | public | yes |
| `/app`, `/app/settings` | `Dashboard`, `Settings` | required | no |
| `/register`, `/login`, `/verify-email`, `/forgot-password`, `/reset-password` | auth | public | no |
| `/privacy`, `/terms`, `/disclosure`, `/contact` | `Legal` | public | yes |

### 9.2 Comparison components

- **`Podium.tsx`** — three places. **DOM order is always 1, 2, 3** so screen readers
  and phones get the winner first; the desktop podium *shape* is CSS `order` only.
  Do not reintroduce DOM order 2,1,3.
- **`PriceTruth.tsx`** — `PriceBreakdown` (itemised lines with state badges),
  `VerificationBadge`, `HiddenCostFlag` (respects verification state — it must never
  say "nothing hidden" when delivery is merely unknown).
- **`DealSignals.tsx`** — `DealConfidence` (bar + published weights),
  `TrustRadar` (5-axis SVG), `DealPassport` (provenance rows).
- **`OfferCard.tsx`** — three tabs (Cost / Trust / Passport); `OfferDeck` makes them
  a snap-scrolling swipe deck under 900 px.

### 9.3 Design system

`apps/web/src/design/theme.css` is the single source of truth. Tokens, not ad-hoc
values. Key constraints:

- Warm White background `#FFF9F0`. Darkest permitted colour: **Mosaic Plum
  `#452B5E`** (luminance 0.038).
- Eight accents ship in **dual tones** — a bright fill tone and a darker `-d` text
  tone — because six of the bright tones fail WCAG AA as text.
- White text only on plum, blue-deep and the single brand gradient `--grad-prism`
  (5.98–7.20:1). There is one gradient token, and `audit:design` fails on a second.
- Fonts are self-hosted `woff2` (Outfit, Plus Jakarta Sans). Never hotlink Google
  Fonts: the sandboxed preview iframe has no network, and production should not
  depend on a third party.
- Respect `prefers-reduced-motion`.
- **The brand mark is two polygons and four tokens.** `--brand-cobalt` aliases
  `--blue-d`, `--brand-coral` aliases `--coral`, and the on-dark pair
  (`#8FA6FF` / `#FF8A8A`) exists because the primary cobalt is 1.66:1 on plum.
  `Logo.tsx` reads the variables, so re-tinting is CSS-only. See §2 of
  `04-design-system.md` and `brand-identity.md`.

`npm run audit:design` fails the build on a near-black colour, a text unsafe
gradient, or a white-on-fill pair under 4.5:1.

---

## 10. Data model

21 tables. Core (`schema.sql`):

| Table | Purpose |
|---|---|
| `users`, `sessions`, `auth_tokens` | identity, opaque revocable sessions, one-time tokens |
| `user_preferences` | country, currency, pincode, notification flags |
| `user_search_history`, `saved_products`, `price_alerts` | user surface (partly unbuilt) |
| `notification_events` | alert dispatch queue |
| `auth_events` | security log, hashed IPs only |
| `dev_outbox` | dev-only mail capture |
| `exchange_rates`, `countries`, `currencies`, `platforms` | reference data |

Catalogue (`catalog.sql`):

| Table | Purpose |
|---|---|
| `catalogue_products` | product identity, category, description |
| `product_variants` | the comparable unit: `attributes` JSON, GTIN/MPN/ISBN, MRP, net qty |
| `offers` | one retailer offer; `data_origin`, `source_label`, tax/shipping state |
| `offer_snapshots` | immutable observation history — real only, never backfilled |
| `community_prices` | shopper-reported prices, trust state, corroboration count |
| `product_match_reviews` | human match confirmations (schema ready) |
| `trending_queries` | real aggregate search counts |

**Key design choice:** the comparable unit is the **variant**, not the product. An
offer always points at a variant. This is what makes "never compare a 256 GB to a
512 GB" structurally true rather than a rule someone has to remember.

RLS is not applicable on SQLite; it becomes relevant only with Supabase/Postgres
(§15).

---

## 11. Testing and quality gates

```bash
npm run check   # tests + design audit + secrets scan — run before every commit
npm run build   # typecheck + bundle
```

| Suite | Count | Covers |
|---|---|---|
| `money.test.ts` | 14 | minor units, all five line states, conditional-mandatory rule, unit price |
| `matching.test.ts` | 17 | ladder, barcode conflicts, 512 vs 256 GB, grocery pack sizes, disambiguation |
| `ranking.test.ts` | 16 | verified-first, the portion-only exception, stock, commission permutation, confidence |
| `validate.test.ts` | 8 | email, password strength, Indian PIN |
| `auth.test.ts` | 23 | full auth lifecycle, CSRF, rate limits, export/delete, search gates, demo labelling |

**When you add a feature, add the test that would catch its most embarrassing
failure**, not the test that documents its happy path. The existing tests are
written that way — e.g. the ranking test permutes commission rather than checking a
single ordering.

---

## 12. Connectors and the data problem (read before planning anything)

This is the single biggest constraint on the project, and the most likely place for
a new developer to be misled by a blog post claiming "X has a free API".

| Platform | Real status | Route to access |
|---|---|---|
| **eBay India** | ✅ Public Browse API, free ~5k calls/day, OAuth client-credentials. **Implemented, env-gated.** | developer.ebay.com keyset (15 min, self-serve) |
| Amazon India | PA-API v5 retired 15 May 2026; Creators API gated at ~10 qualifying sales/30 days | Associates India → qualify → apply |
| Flipkart | Affiliate API exists; **new sign-ups paused since 2018** | Licensed network (Cuelinks / AdmitAd) |
| Blinkit | No public price API; prices per dark store, change through the day | Commercial partnership with Eternal |
| Zepto | No public consumer/affiliate price API found | Commercial partnership |
| Swiggy Instamart | Affiliate programme = link attribution, **not** a price feed | Partnership for data |
| BigBasket / BB Now | Affiliate only, short cookie windows | Partnership |
| JioMart | Affiliate up to ~4%, 30-day window; no price feed | Affiliate onboarding |
| Flipkart Minutes / Amazon Now | Same as their parents | As above |
| DMart Ready | None known | Partnership |
| **ONDC** | Open Beckn protocol — the only credible **zero-cost** route to real Indian catalogue data | Apply as network participant / TSP |

Consequences you must not paper over:

- **A national Indian grocery price does not exist.** Pricing is per dark store and
  pincode. Any "national average chips price" is fiction.
- **Affiliate networks are attribution layers, not data sources.** Joining one does
  not give you prices.
- **The demo catalogue is not a placeholder to be quietly scaled.** Adding hundreds
  of demo products makes the demo bigger, not the product better. Connect a real
  source.

---

## 13. Ownership and transfer

### 13.1 What the owner owns outright

- All source code, documentation, design tokens and assets in this repository
- The catalogue data and schema
- Every generated artifact (backups, sitemap, builds)

No third party holds a licence, escrow, or claim. Nothing is vendor lock-in by
design: the stack is Node + SQLite + React, all open source, all replaceable.

### 13.2 What lives outside the repository (and how to transfer it)

| Asset | Where it must live | Transfer |
|---|---|---|
| Domain name | Registrar account (owner's name) | Registrar transfer with auth/EPP code — owner must initiate |
| Hosting (Cloudflare/Netlify) | Owner's account | Add the new developer as a member, or transfer project ownership |
| Search Console / Bing | Owner's Google/Microsoft account | Add developer as a user, or verify DNS with their account |
| Google Business Profile | Owner's Google account, **owner-verified only** | Cannot be transferred between accounts; re-verification required |
| Email provider | Owner's account | Re-issue API key for the new developer |
| eBay developer keys | Owner's developer account | Re-issue keyset; never share the secret |
| **The encrypted vault** | Owner's password manager + offline copy | **Never transfer the passphrase through chat/email.** Owner decrypts and re-issues credentials individually |

### 13.3 What cannot be exported or transferred

Being explicit so nothing is discovered later:

1. **Google rankings, indexing history and Search Console performance data.** They
   belong to the property, not to any person. Re-verification is required on any
   host or domain change.
2. **A Google Business Profile's verification status.** If ownership changes hands,
   Google re-verifies.
3. **The existing SQLite database's *demo* rows** — they are regenerated
   deterministically on boot, so there is nothing to preserve. Real observation
   history, once you have it, *is* valuable and must be exported (§15).
4. **The vault passphrase.** By design it is unrecoverable. Losing it means the
   stored secrets are lost, not that the project is.
5. **Third-party rate-limit state and IP reputation** — irrelevant to transfer but
   worth knowing when a new environment starts fresh.

### 13.4 Backup integrity

```bash
npm run backup                 # create: archives + SHA-256 manifest
npm run backup:list            # what exists
npm run backup:verify <file>   # re-hash every file against the manifest
```

A backup contains everything except `node_modules`, build output, SQLite databases,
`.env`, and the encrypted vault. Restore is `tar -xzf`, `npm install`, `npm run dev`.

---

## 14. Known issues and technical debt

Ordered by risk. Numbers match the issue tracker convention used in this project.

| # | Issue | Severity | Notes |
|---|---|---|---|
| 1 | **No live price data** | Critical (product) | Everything else on this list is smaller than this. §12. |
| 2 | Registration does a two-step insert (placeholder hash, then update) in `routes/auth.ts` | High | Must become one transaction before production — a crash mid-write leaves a user row with an unusable hash |
| 3 | No real email delivery | High (launch) | Verification links only reachable via the dev outbox |
| 4 | No prerendering / SSR | Medium (SEO) | Google executes JS, but static HTML would be faster and more robust. `index.html` carries site-level JSON-LD and a `<noscript>` nav as mitigation |
| 5 | SQLite dialect via Turso (libSQL), single writer | Medium (scale) | Fine to launch. Turso handles many readers; Postgres is the move before high write concurrency |
| 6 | In-memory rate limiter | Medium | Per-process only; resets on restart and does not coordinate across instances |
| 7 | `/search?q=` is `noindex` | Medium (SEO) | Deliberate — thin, volatile query pages. The indexed surface is `/p/:slug` |
| 8 | Community price submission has an API but no UI | Low | Endpoint, validation and corroboration logic all work |
| 9 | No admin panel | Low (until needed) | Specified for Phase 4 |
| 10 | Demo catalogue is only 25 products | Low | Deliberate: breadth without data is theatre |
| 11 | `product_match_reviews` table unused | Low | Schema ready for manual match correction |
| 12 | Playwright verification scripts are not in the repo | Low | They were scratch tooling in `/tmp`; adding a committed e2e suite is a good Phase 3 task |

### 14.0 INCIDENT: the test suite reached the production database

**What happened.** During Phase 3 the shell had `TURSO_DATABASE_URL` exported. The
test suite read that variable and connected to the **live Turso database** instead of
its in-memory one. One run wrote 4 users, 13 sessions, 6 auth tokens, 40 auth events,
9 outbox messages, 8 search-history rows and 4 trending queries into production.

**Why it was possible.** `db/index.ts` preferred a remote URL whenever the variable
was present. Tests set `DB_PATH=:memory:` but nothing prevented a remote URL from
taking priority.

**Fix.** The adapter now refuses a remote connection whenever
`process.env.VITEST` is set or `NODE_ENV === 'test'`. A regression test
(`apps/api/tests/db-safety.test.ts`) simulates the exact conditions and fails if the
guard is removed. The gate was re-run with production credentials deliberately
exported: **104 tests pass, production untouched (0 users).**

**Cleanup.** All test rows were deleted; catalogue and offers were preserved
(25 products, 170 offers). The public snapshot was regenerated afterwards.

**Lesson for the next developer.** Never run the suite with production credentials in
the environment, and never weaken the `IS_TEST` guard. A passing test run is not proof
that it touched the right database.

### 14.0b Platform constraint: Render free blocks outbound SMTP

Discovered by sending a real email and reading the result: **Render's free web
services block outbound SMTP on ports 25, 465 and 587** (in force since September
2025). A Gmail App Password therefore cannot work in production — the TLS
handshake is severed before authentication and the failure surfaces as
`Connection timeout`, not as a credential error.

Consequence: **all email must go over HTTPS.** `lib/mailer.ts` prefers Brevo
(300/day, single-sender verification, no domain, no card), then Resend, then
SMTP for hosts that allow it. See `docs/20-email-delivery.md`.

Do not "fix" a mail timeout by changing the port to 2525 for Gmail — Gmail does
not listen there. That trick only works for relays such as Brevo or SMTP2GO.

### 14.0c Email links were relative, so they were dead on arrival

The first genuinely delivered email contained the literal text
`/verify-email?token=…` with **no domain**. Delivery had worked; the link had not.
A relative path has no origin to resolve against inside a mail client, so the
confirmation could never be clicked. This was found by reading the delivered
message — the API had reported success, and the outbox said `sent_at`.

`appUrl()` in `routes/auth.ts` now builds an absolute URL from `SITE_URL`, strips a
trailing slash, and falls back to `http://localhost:5173` in development so local
links stay clickable. Three tests cover it.

**Generalisable lesson:** "the email was sent" and "the email is useful" are two
different assertions. Both need checking.

### 14.0d Keep-alive workflow is installed; its first run is unverified

`.github/workflows/keepalive.yml` is committed to `main`, and the GitHub API
reports it as `state: active`. It pings `https://dealmosaic-api.onrender.com/api/health`
every 5 minutes so Render's free tier never sleeps the API.

**Runs correctly when invoked, but GitHub's scheduler does not fire it.** Manual
run #1 (owner-triggered, 2026-11-02T09:02Z) succeeded in 32 s and its log shows
`HTTP 200 {"ok":true,"database":"connected"...}` — taking 23 s because it woke a
sleeping service, which is precisely the job. But **zero `schedule` runs appeared
in the next 57 minutes**, so the schedule itself is not dependable. Treat the
GitHub workflow as a backup, not the primary mechanism. GitHub schedules are best-effort and a new workflow's first run is
often delayed, so this is not necessarily broken — but it is *unverified*, and
should be recorded as such rather than assumed working.

Cold-start cost measured directly: **22.5 s** on the first request to `/api/health`,
**0.23 s** once warm. That is what the keep-alive is protecting against.

To confirm: GitHub → repo → **Actions** → `keepalive` → **Run workflow**.
If a banner says workflows are not being run, enable Actions for the repository.

**PRIMARY FIX: `deploy/keepalive/cloudflare-worker-keepalive.js`.** A Cloudflare
Worker with a 5-minute Cron Trigger. No new account — the owner already has
Cloudflare for Pages — no card, and Cron Triggers fire reliably. Install steps are
in the file header. Alternative if preferred: UptimeRobot free tier (5-minute
interval) pointed at the same health URL; that does need a new account.

**Manual dispatch is not available to the agent:** `POST …/dispatches` returns
403 `Resource not accessible by personal access token`, because that endpoint
needs *Actions: write*, which the token does not have. Only *Workflows: write*
was granted — that is what unblocked committing the file itself.

### 14.1 Defects found by the handover restore test (both fixed)

A backup is only proven by restoring it, so a clean-room test was run: extract the
archive into an empty directory, `npm install`, `npx vitest run`. The first attempt
**failed**, and caught two things that would have blocked a new developer on day one:

| Defect | Why it hid | Fix |
|---|---|---|
| **`zod` was a phantom dependency** — imported by `routes/search.ts` and `routes/community.ts`, but never declared in `apps/api/package.json`. It resolved locally only because npm hoisted it from another package's tree. | It worked on the machine that built it. Classic phantom dependency. | Declared `"zod": "^3.25.76"` in `apps/api/package.json`, pinned to the version the code was written against. |
| **A dead npm script** — `apps/api` declared `"migrate": "tsx src/db/migrate.ts"` but that file was never created. | Nothing ran it, so nothing failed. | Removed. Schema is applied on boot from `db/schema.sql` + `db/catalog.sql`; a separate migrate step does not exist. |

After the fix the same clean-room restore passes **102/156 tests**. Run this yourself
whenever you doubt the archive:

```bash
rm -rf /tmp/verify && mkdir -p /tmp/verify
tar -xzf backups/<latest>.tar.gz -C /tmp/verify
cd /tmp/verify && npm install && npm test
```

---

## 15. Exact next steps

### Phase 3 — real data (do this first)

**Goal:** the first genuinely live price in the product.

1. Owner creates an eBay developer keyset → `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`.
   *Acceptance:* `GET /api/catalogue/connectors` reports eBay `status: "live"`.
2. Wire `ingestConnectorOffers()` (already written in `services/search.ts`, currently
   called by nothing) into a scheduled sync per variant, writing `offers` +
   `offer_snapshots` with `data_origin: 'live'`. *Acceptance:* a search on a product
   eBay stocks returns at least one offer with `dataOrigin: 'live'` and a real
   `lastCheckedAt`; `dataMode` becomes `live` or `mixed`.
3. Build the **community price UI** on top of the existing endpoints — the form for
   reporting a Blinkit/Zepto price at your pincode. *Acceptance:* a report appears in
   the comparison page's separate "shopper reports" block, clearly not ranked.
4. Add a committed Playwright e2e suite covering the search → disambiguate → compare
   flow. *Acceptance:* `npm run test:e2e` runs headless against `npm run dev`.
5. Fix debt #2 (transactional registration) and #6 (shared rate-limit store).

### Phase 4 — retention features

Watchlist, price alerts (using `price_alerts` + `notification_events`, currently
unused), MOSAIC REWARDS XP/badges **functional with monetary rewards disabled and
Amazon excluded**, support tickets, and a secure admin panel with an audit log.

### Phase 5 — scale

Postgres migration (swap the adapter in `db/index.ts` — the SQL is plain SQLite, so this is a driver change plus RLS),
prerendering, PWA with offline caching, multi-instance rate limiting.

### Phase 6 — expansion

Country table already carries the disabled markets. Do not enable until India is
genuinely complete and the owner asks.

---

## 16. Technical decision log

Each decision records what was rejected, so nobody re-litigates it without new facts.

| # | Decision | Why | Rejected alternative |
|---|---|---|---|
| D1 | Integer minor units for all money | Float arithmetic on currency produces ₹0.01 drift that destroys trust in a price product | `number` rupees |
| D2 | The comparable unit is the **variant** | "Never compare different variants" becomes structural, not a code-review rule | Product-level comparison |
| D3 | Missing cost = a state, never zero | The core promise. `not_available ≠ 0` | Defaulting to 0 (industry norm, and the bug we exist to fix) |
| D4 | Conditional **mandatory** cost ⇒ partial total | Blinkit's delivery fee is real money and unknown. Calling it complete is a lie | Excluding silently (catches grocery wrong) |
| D5 | Three offers, hard cap | A wall of prices is not a decision | Full ranked list |
| D6 | Commission-blind, tested | The entire trust claim | Ranking by revenue (the industry norm) |
| D7 | Matching ladder with published confidences | Makes wrong-variant bugs visible instead of invisible | Fuzzy title matching |
| D8 | Boundary-aware attribute matching | `"512gb".includes("12gb")` is true and silently wrong | Naive `includes()` |
| D9 | Verified-portion ranking when nothing is verifiable | Refusing to rank would make grocery useless; freshness order is arbitrary | Refuse to show anything |
| D10 | Self-hosted fonts | Preview iframe has no network; no third-party dependency | Google Fonts hotlink |
| D11 | Hono + SQLite | Zero cost, zero ops, Workers-compatible later | Supabase from day one (cannot be provisioned from this environment; adds a dependency before it is needed) |
| D12 | Monorepo with a dependency-free `core` | Business logic testable in isolation and impossible to duplicate in the UI | Logic in the API |
| D13 | No black anywhere, machine-enforced | Owner's explicit rule; a rule without a test erodes | A style guide note |
| D14 | `/search` is `noindex` but **not** robots-disallowed | A blocked crawler cannot read `noindex`, so it indexes an empty page instead | Disallowing `/search` (a common, incorrect pattern) |
| D15 | Demo data watermarked everywhere | Honesty requirement; prevents a demo from being mistaken for a launch | Silently seeding "realistic" prices |

---

## 17. Credentials: where secrets live

**Never in this document, never in a backup, never in the repository.**

```bash
npm run vault:init    # create secrets/vault.json (12+ char passphrase)
npm run vault:edit    # decrypt → $EDITOR → re-encrypt
npm run vault:status  # presence, timestamp, algorithm
npm run vault:rotate  # re-encrypt with a new passphrase
```

- Cipher: **AES-256-GCM**; KDF: **scrypt** N=2¹⁷; random salt + IV per save.
- Auth tag verified on read — a tampered or truncated vault fails loudly instead of
  decrypting to garbage. Verified in testing.
- File mode `0600`.
- Excluded from every backup (verified with a canary string in testing).
- `npm run secrets:scan` runs in `npm run check` and before every backup.

The **non-secret** half — who owns which account, recovery paths, access
instructions — is in `docs/16-owner-credentials-register.md`. That document is safe
to share with a new developer; the vault is not.

---

## 18. Documentation index

| Doc | Contents |
|---|---|
| `00-executive-summary.md` | Charter, feasibility verdict, decisions taken |
| `01-research-competitive-matrix.md` | Competitor matrix, differentiation |
| `02-connector-feasibility.md` | What data is genuinely free and legal |
| `03-architecture.md` | Stack, security, request flows, budgets |
| `04-design-system.md` | Colour system, logo, motion, accessibility |
| `05-data-model.md` | Schema design, keys, indexes, RLS plan |
| `06-roadmap.md` | Six phases with exit criteria |
| `07-test-strategy.md` | The 28 mandated tests mapped to automation |
| `08-zero-cost-ledger.md` | Costs and the feature-status contract |
| `09-risks-assumptions.md` | Assumptions and risk register |
| `10-quickcommerce-grocery.md` | Indian quick commerce, Community Price design |
| `11-owner-setup-guide.md` | Owner account setup, step by step |
| `12-phase1-report.md` | Foundation & brand delivery report |
| `13-phase2-report.md` | Comparison core delivery report + 10 defects caught |
| `14-seo-launch-checklist.md` | SEO: done in code vs. owner-only actions |
| **`15-project-handover.md`** | **This document** |
| `16-owner-credentials-register.md` | Owner accounts, ownership, access (no secrets) |
| `17-hosting-and-deployment-plan.md` | Live topology, free-tier limits, database contract, rotation |
| `18-owner-quickstart-accounts.md` | 15-minute account setup, step by step |
| `19-data-acquisition.md` | How real prices are obtained; why scraping is rejected |
| `20-email-delivery.md` | Owner steps to turn on real email (Brevo HTTPS API, ₹0) |
| `24-seo-indexing.md` | **Prerendering fix, IndexNow status, Search Console steps** |
| `23-affiliate-status.md` | **Which merchants earn today vs which are pending** |
| `22-audit-and-redesign.md` | **Full audit, gap analysis, zero-cost strategy and roadmap** |
| `21-location-and-maps.md` | Pincode-first location design; when a map earns its place |
| `DEALMOSAIC-STRATEGY.html` | Visual strategy dossier |
| `source/MASTER_BUILD_PROMPT.txt` | The original brief, verbatim |

---

## 19. Continuity protocol (for whoever runs this project next)

After **every** significant milestone:

1. `npm run check` and `npm run build` must be green. Do not bank a milestone on a
   red gate.
2. Write `docs/NN-phaseN-report.md`: what was built, what broke, what was fixed, and
   honestly what is not done. The Phase 2 report lists ten defects caught during
   verification — that level of candour is the standard.
3. Update this document: §3 status, §14 debt, §15 next steps.
4. `npm run backup` and confirm the manifest verifies.
5. If any account or key changed, update `docs/16-owner-credentials-register.md` and
   the vault — separately, as §17 describes.

**A rule about honesty, since it is the product.** If a feature is not working,
the UI must say so. Never ship a placeholder that looks real. The demo watermark is
not decoration; it is the thing that makes everything else credible.

---

## 20. Glossary

| Term | Meaning here |
|---|---|
| **Variant** | The comparable unit — e.g. "Samsung S25 Ultra 12 GB / 512 GB", not "Samsung S25 Ultra" |
| **Price Truth** | The itemised landed-cost engine (`buildPriceTruth`) |
| **Verification state** | `complete` / `partial` / `unverified` — can this total be trusted? |
| **Deal Confidence** | 0–100 trust-in-the-data score with five published weights |
| **Deal Podium** | The three-place comparison UI |
| **Deal Passport** | Provenance record for one offer: source, first/last observed, observations |
| **Trust Radar** | Five-axis radar of match, freshness, seller, delivery, returns |
| **rankingBasis** | `verified_total` or `verified_portion_only` — what the podium is actually ordering |
| **data_origin** | `live` / `feed` / `community` / `demo` — provenance of an offer |
| **Connector** | Adapter turning one platform into normalised offers |
| **Community Price** | Shopper-reported price at a pincode; never ranked with verified offers |
| **Mosaic Plum** | `#452B5E` — the darkest permitted colour |
