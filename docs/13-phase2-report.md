# Phase 2 report — Comparison core

**Status:** complete and verified · **Build:** 78 tests, 33 design assertions, clean production build
**Date:** 2 November 2026

---

## 1. What was built

Phase 2 turns the Phase 1 shell into a working comparison engine. A real search
now returns three ranked offers, each with an itemised landed cost, a trust
record, and a stated reason for its position.

### The engines (pure, tested, shared by API and UI)

| Module | What it does | Tests |
|---|---|---|
| `packages/core/src/matching.ts` | Product identity ladder + variant disambiguation | 17 |
| `packages/core/src/ranking.ts` | Commission-blind ranking + Deal Confidence | 16 |
| `packages/core/src/money.ts` | Price Truth Engine (extended for conditional mandatory lines) | 14 |

**The matching ladder** — confidence per method:

```
1.00  GTIN / EAN / UPC          a barcode is an identity
0.95  Manufacturer part number
0.92  ISBN
0.86  Brand + model + all variant attributes agree
0.72  Brand + model, attributes partly agree
0.55  Brand + model only, no variant data to check
0.40  Title similarity          listed, never auto-selected
```

Anything below **0.70** is never auto-compared. Below that line we ask the user
which variant they meant. Two known, *different* barcodes score **0** — full stop.

**Ranking** — order is verification state → stock → true landed total → match
confidence → freshness. Affiliate commission is not an input, and a test permutes
every commission rate to 0 / 50 / 1200 / 9999 bps and asserts the order never
changes.

### Catalogue

25 products, 61 variants, 17 categories, spanning:

- **Electronics:** Samsung S25 Ultra, iPhone 16, OnePlus 13R, Sony WH-1000XM5,
  boAt Rockerz 450, Lenovo IdeaPad, LG split AC, Havells fan, Prestige cooker
- **Grocery / FMCG (first-class):** Lay's, Amul Taaza, Aashirvaad Atta, Tata Salt,
  Maggi, Fortune Sunflower Oil, Dettol, Colgate, Surf Excel, Forest Essentials
- **Other:** Nike, Levi's, Atomic Habits, Yonex, LEGO, Wakefit

Real identities (GTINs, MPNs, ISBNs, MRPs, net quantities). Offers are generated
**demonstration data**, deterministically (a fixed PRNG seeded from
`product:variant:platform`), so two identical searches always produce identical
results.

### New API surface

| Route | Purpose |
|---|---|
| `POST /api/search` | Comparison, variant disambiguation, or an honest no-results |
| `GET /api/catalogue/products` | Public catalogue, filterable |
| `GET /api/catalogue/categories` | Category hubs |
| `GET /api/catalogue/products/:slug` | Product page payload |
| `GET /api/catalogue/connectors` | Live connector health + every known platform |
| `GET /api/catalogue/trending` | Real aggregate search counts |
| `GET/POST /api/community-prices` | Shopper-reported quick-commerce prices |

`buildPriceTruth` is unchanged in contract but stricter in behaviour: a
**conditionally-applicable mandatory** cost (a delivery fee that only applies
below a cart threshold) now makes the total *partial* rather than silently
excluded. That single change is what makes grocery honestly representable.

### New UI

`/search` (comparison + disambiguation + no-results) · `/browse` and `/c/:slug`
(catalogue and category hubs) · `/p/:slug` (indexable product page) ·
`/how-we-rank` (the rules in full) · `/data-sources` (connector status).

Components: **Deal Podium** (3 places, winner-first reading order), **Price
Truth** itemisation, **Deal Confidence** with published weights, **Trust Radar**
(5-axis SVG), **Deal Passport** (provenance record), **OfferCard** with three
tabs, and a **swipeable mobile deck** with snap points.

---

## 2. Defects found and fixed during verification

These are worth recording because each one was a trust bug, not a cosmetic one.

1. **`"512gb".includes("12gb") === true`.** Substring matching made a 512 GB query
   match the 256 GB variant as well. Replaced with boundary-aware matching; numeric
   attributes now match only on parsed capacity tokens.
2. **Every grocery item priced ₹100.** A rupee/paise floor (`Math.max(100, rupees)`)
   flattened the whole grocery catalogue. Floor is now ₹1 in paise.
3. **Unverified totals were being labelled "#1".** The ranking key nulled out the
   known total whenever verification was incomplete, so quick-commerce offers fell
   through to a *freshness* sort — arbitrary and unexplainable. Ranking now uses the
   verified **portion** when nothing can be fully verified, and says so via
   `rankingBasis: 'verified_portion_only'`.
4. **"No added delivery or fees" shown for stores with unknown delivery.** A
   straight lie, on the exact claim the product exists to protect. Now reads
   "+ delivery charged at checkout".
5. **GST rendered as "unknown".** `not_applicable` is not `not_available`; it now
   reads "already included".
6. **Legal pages canonicalised to the homepage.** `/privacy` and `/disclosure`
   declared `canonical: https://dealmosaic.in/`, telling Google they were duplicates
   of `/`. Each now declares its own canonical, title and description.
7. **Podium overflowed by 39px at 360px.** The compact mobile layout put the price
   on the same grid row as the platform name. Restructured to a two-column grid with
   the price on its own row.
8. **Screen readers heard the runner-up first.** The podium's DOM order was 2,1,3 to
   create the desktop visual shape. DOM is now always 1,2,3; the podium shape is
   pure CSS `order`.
9. **`--silver` failed AA at 4.37:1** behind white podium digits → `#5f6e82` (5.20:1),
   now covered by a new audit assertion.
10. **Anonymous visitors fired a doomed 401.** The search page now waits for the
    session probe and shows the sign-in prompt without a failed request.

---

## 3. Verification

```
npm test          → 78 tests passing (5 files)
                    money 14 · matching 17 · ranking 16 · validate 8 · API 23
npm run audit:design → PASS, 33 assertions
npm run build     → clean, 391.36 kB JS / 119.91 kB gzip, 42.44 kB CSS / 9.51 kB gzip
```

Browser-verified in Chromium (Playwright) end-to-end:

- register → dev-outbox verify → login → comparison → tabs → grocery flow
- **0 horizontal overflow** at 360 / 390 / 414 / 768 / 1024 / 1440 / 1920 px
- **0 page errors, 0 failed requests** on the authenticated run and on the
  anonymous gate
- correct per-route `title`, `description`, `canonical`, `robots` and JSON-LD on
  all seven public pages checked
- `sitemap.xml` (50 URLs), `robots.txt`, `llms.txt` all served

Live comparison output for *Samsung Galaxy S25 Ultra 12 GB / 512 GB*:

| # | Platform | True total | Verification | Confidence |
|---|---|---|---|---|
| 1 | Flipkart Minutes | ₹1,32,015.35 | Total verified | 90 |
| 2 | Amazon Now | ₹1,32,311.83 | Total verified | 91 |
| 3 | Reliance Digital | ₹1,34,434.03 | Total verified | 89 |

Note #1 has *lower* confidence than #2 and still ranks first: confidence describes
trust in the data, never desirability. That distinction is deliberate.

Grocery output for *Lay's Classic Salted 180 g*:

| # | Platform | Item price | Basis |
|---|---|---|---|
| 1 | Zepto | ₹19.55 | verified portion only |
| 2 | Swiggy Instamart | ₹32.19 | verified portion only |
| 3 | BigBasket / BB Now | ₹35.77 | verified portion only |

Every one is **PARTLY VERIFIED**, the podium note explains that delivery is
charged by cart value, and the unit price is normalised to **₹10.87 per 100 g**.

---

## 4. What is honestly not done

- **No live retailer prices.** Every offer is demonstration data, watermarked in
  the UI and stated in the API payload (`dataMode: "demo"`). The eBay connector is
  built and env-gated (`EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET`) and reports
  `disabled` with a reason until keys exist.
- **No prerendering.** The public pages are client-rendered SPA routes. Google and
  Bing execute JavaScript, so they will index correctly, but static prerendering
  would be faster and more robust. Recommended as Phase 3 work; `index.html` now
  carries site-level JSON-LD and a `<noscript>` navigation so non-JS crawlers still
  see real links.
- **Community prices** have API endpoints but no UI yet — the endpoint and the
  corroboration rule work; the form ships in Phase 3 with watchlists and alerts.
- **`routes/auth.ts` registration still does a two-step insert** (placeholder hash,
  then update). Should become one transaction before production. Unchanged from
  Phase 1 and still flagged.

---

## 5. Cost

₹0. No paid dependencies were added. Playwright used only for verification and is
not a project dependency. The stack remains Node + SQLite + Hono + React + Vite.
