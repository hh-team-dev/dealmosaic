# 26 — Grandmaster audit 2.0: forensic findings and what was repaired

**Date:** 3 November 2026
**Method:** every claim below was checked against production — HTTP responses from
`dealmosaic.pages.dev` and `dealmosaic-api.onrender.com`, direct SQL against Turso, real
Chromium at five viewport widths, and live calls to the Cuelinks API. Nothing here is
copied from a previous document, and nothing is inferred from the presence of source code.

---

## 1. What was genuinely working before this assignment

These were re-verified, not taken on trust.

| Area | Evidence |
|---|---|
| All 20 web routes answer correctly | `/` `/deals` `/saved` `/search` `/browse` `/how-we-rank` `/data-sources` `/contact` `/privacy` `/terms` `/disclosure` `/login` `/register` `/forgot-password` `/reset-password` `/verify-email` `/app` `/app/settings` `/c/staples` `/p/aashirvaad-atta` → 200 in 0.09–0.21 s; `/nope-xyz` → a real 404 page |
| 19 API endpoints | health, meta ×4, catalogue ×4, coupons ×3, search, fx, location ×2, alerts, me, maintenance — all correct codes, including 401 for anonymous `/api/alerts` and 403 for an unsigned maintenance call |
| Discovery wall | 14 shelves, 0 withheld, every row traceable to a live feed row |
| Comparison engine | `/api/search` returns a ranked, itemised comparison for catalogue products; 10-minute delivery and grocery are both represented |
| Price alerts | engine + daily runner + email; 10 tests written as prohibitions |
| Price history | 340 snapshots, +170/day, never backfilled |
| Daily job | self-scheduled off the health ping; last run `lastOk: true`, 5.5 s, health unaffected at 0.25 s |
| Auth | server-side sessions, scrypt, CSRF header, single-use tokens, rate limits |
| Design | 33 assertions, no near-black anywhere, WCAG AA contrast |

---

## 2. Defects found, by severity

Every one of these was live in production. Severity is about consequence to a shopper,
a crawler or the business — not about how hard it was to fix.

### CRITICAL

**C1 — Seven sitemap URLs served the homepage.**
`/browse`, `/how-we-rank`, `/data-sources`, `/contact`, `/privacy`, `/terms` and
`/disclosure` were listed in `sitemap.xml` and never prerendered. Each returned the SPA
shell, which after the homepage body injection meant seven more copies of the front page
under different URLs — the duplicate/thin pattern Google answers with *"Crawled —
currently not indexed"*. Confirmed by requesting all seven: identical 15,267-byte
responses with the homepage `<h1>`.

**C2 — Demonstration prices were published to Google as real offers.**
Product JSON-LD emitted `"@type":"Offer"`, `"price":"242.06"`,
`"availability":"InStock"` built from offers whose `data_origin` is `demo` — the same
numbers the interface labels *illustrative*. That is handing a search engine a price we
would not let a shopper act on, and it is exactly the product-snippet / merchant-listing
confusion a comparison site must not create.

**C3 — The deals page printed a false count.**
*"200 offers live now"* was computed from the rows the page had loaded, and the request is
capped at 200. The true figure is **1,089**, with **282** codes and **245** stores. A wrong
number on the busiest page is a checkable false statement, not a rounding issue.

### HIGH

**H1 — The affiliate rule was documented but never enforced.**
The handover has said since day one that *a link is monetised only when the network reports
`affiliated: true`*. `convertLink()` existed and was **never called**; `affiliated` was
declared in a type and read by nothing. Every outbound link was therefore implicitly
treated as earning. Cross-checked live against `/links/convert`: Croma `true`, Nykaa
`true`, Firstcry `true`; Flipkart `false`, Myntra `false`, Ajio `false`.

**H2 — The deals hero claimed automatic retirement that does not exist.**
*"codes that shoppers report as failing get retired automatically"* — nothing retires them
automatically. The `/:id/outcome` endpoint records reports; no process acts on them.

### MEDIUM

**M1 — 45 vs 44 prerendered pages.** Reconciled: 45 was correct before this block; `/saved`
was added and the count became 45 with the prose pages still unrendered. It is **52** now
and the build verifies it.

**M2 — 51 sitemap URLs vs rendered routes.** Reconciled exactly: 51 = 1 home + 1 deals +
17 categories + 25 products + `/browse` + 6 prose pages. `/saved` is deliberately excluded
(device-local, no index value). The gap between *listed* and *rendered* was the seven in C1.

**M3 — 211 vs 156 tests.** Reconciled: 156 was the count at the Phase-2 milestone. The
increase is 55 real tests, not duplicates — 22 for offer-text parsing, 12 for the search
fallback, 10 for alerts, 11 for discovery, plus connector and mailer cases. All 211 pass
and none are skipped.

**M4 — 1,089 coupon records vs usable codes.** Reconciled and now stated on the page:
**282** carry a code, **375** state a price, all **1,089** carry the store's own expiry.
A code-less deal is a real offer and is labelled as a deal, not a coupon.

**M5 — 1,089 live offers vs 170 comparable offers.** These are different things and the
interface says so: 170 offers sit inside the 25-product comparison catalogue and carry an
origin tag (`demo`, `feed`, `live`, `community`); 1,089 are merchant listings. The
catalogue figure has **not** been dressed up as coverage.

---

## 3. What has been repaired in this block

| Defect | Fix | Verified |
|---|---|---|
| C1 | Seven prose pages now have real bodies built from the live API (product list, category list, platform status) | `/privacy` 8,914 B · `/terms` 8,810 B · `/browse` 11,025 B · `/data-sources` 9,469 B · `/how-we-rank` 9,470 B · `/disclosure` 8,963 B · `/contact` 8,379 B, each with its own `<h1>` |
| C1 (prevention) | `scripts/verify-prerender.mjs` now also fails the build when a **sitemap URL has no prerendered file** | build step, runs every time |
| C2 | `offers` is emitted only when every price behind it is `data_origin: 'live'` | `"@type":"Offer"` count in `/p/aashirvaad-atta` = **0** |
| C3 | `GET /api/coupons` returns whole-table `totals`; the page renders those | 1,089 / 282 / 245 on the live page |
| H1 | `affiliate_campaigns` table + weekly sync + `GET /api/meta/affiliate` | **1,884** CPS campaigns cached: **1,543** open, 4 pending, 341 not applied; **240 of the 241 merchants we list are approved and earn** |
| H2 | Copy replaced with what actually happens | live page |

### Reconciliation of the affiliate picture

This is now a fact rather than an assumption:

```
campaigns synced (CPS)            1,884
  access_status = open            1,543   ← approved, earns on a completed purchase
  access_status = pending             4   ← applied, resolves, earns nothing
  access_status = not_applied       341   ← never asked, earns nothing

merchants we publish offers for     241
  of those, approved                240
```

The one merchant that is not approved keeps its offers, because the ranking is not for
sale — the link simply earns nothing, and `GET /api/meta/affiliate` says so publicly.

---

## 4. Product and retailer coverage, stated plainly

| Measure | Number |
|---|---|
| Products compared (ranked verdict) | **25** |
| Variants with confirmed identity | **46** |
| Offers inside the comparison engine | **170** (all labelled `demo`) |
| Live merchant offers | **1,089** |
| Distinct stores among live offers | **245** |
| Merchants approved as affiliates | **240** |
| Categories | 17 |
| Live price observations | 340 (2 per offer) |

**The honest sentence:** DealMosaic can *browse* 1,089 real offers across 245 stores, and
can *compare* 25 products properly. The second number is the product's real ceiling and no
interface work changes it.

---

## 5. Mobile and desktop testing, actual results

Real Chromium, five viewports, `deviceScaleFactor: 2`, touch emulation below 500 px.

| Viewport | Home | Deals | Product | Notes |
|---|---|---|---|---|
| 360×780 | ✅ | ✅ | ✅ | no horizontal overflow |
| 390×844 | ✅ | ✅ | ✅ | no horizontal overflow |
| 430×932 | ✅ | ✅ | ✅ | no horizontal overflow |
| 820×1180 | ✅ | ✅ | ✅ | no horizontal overflow |
| 1280×900 | ✅ | ✅ | ✅ | no horizontal overflow |

Structural check at every size: exactly one `<h1>` per page, 86 deal cards across 14
shelves on the homepage, 200 on `/deals`, 0 console errors, 0 page errors. The only
network anomaly was a single transient 404 on one cold load, which did not reproduce on
isolation.

Interactive checks performed: search submit → results, deal card copy-code → clipboard,
save → `/saved`, shelf arrows → scroll, filters → URL.

---

## 6. SEO and indexing status

| Item | State |
|---|---|
| Prerendered pages | **52**, each with its own `<body>` content and unique `<h1>` |
| Sitemap | **52 URLs** (the 51 plus `/browse` reconciliation), all now prerendered |
| Canonicals | every page self-referencing on `dealmosaic.pages.dev` |
| Unowned host | **0** references (was 7 in JSON-LD plus the built `og:image`) |
| `og:image` | `https://dealmosaic.pages.dev/og.png` — resolves |
| Structured data | Organization, WebSite, Breadcrumb, Product identity. **No `offers` while prices are demonstration**; no `aggregateRating` anywhere |
| Robots | `robots.txt` 200, sitemap declared, no accidental `noindex` |
| Search Console | property verified, sitemap submitted; crawl data still accruing |

---

## 7. Operating cost and free-tier limits

| Service | Plan | Limit | Headroom |
|---|---|---|---|
| Cloudflare Pages | Free | 500 builds/mo, unlimited requests | large |
| Cloudflare Workers (keep-alive) | Free | 100,000 req/day | uses 288/day |
| Render web service | Free | 750 h/mo, sleeps without traffic | keep-alive prevents sleep |
| Turso | Free | 500 MB, 1 B reads/mo | database is < 5 MB |
| Brevo | Free | 300 emails/day | used for verification, reset, alerts |
| Cuelinks | Free | 6 requests/minute | respected with 10.5 s spacing |

**Total: ₹0/month.** No paid dependency exists anywhere in the stack.

---

## 8. Revenue readiness

- **Tracking:** every affiliate offer carries the network's tracked URL; campaign approval
  is now cached and queried, so "does this earn?" has a factual answer.
- **Coverage:** 240 of 241 listed merchants are approved CPS campaigns.
- **Earnings to date: ₹0.** Not a bug — no traffic means no clicks. The funnel is built and
  verified; it has not been fed.
- **Cashback ledger: deliberately not built.** Cuelinks settles on its own cycle and there
  is no per-shopper ledger to mirror. Publishing a cashback promise before that exists
  would be exactly the fabrication this project forbids.

---

## 9. What remains, in the order it should be attempted

1. **Catalogue depth (P1).** 25 compared products. Blocked on data, not code — see §10.
2. **Admin control centre (P2).** No admin surface exists; moderation is SQL. This is the
   largest remaining build and it is genuinely useful only once there is something to
   moderate.
3. **Search intelligence (P1).** Typo tolerance, autocomplete, synonym expansion, and
   URL/barcode lookup. The fallback covers the empty case honestly today.
4. **Budget and brand filters on `/deals` (P3).** Category, store, code, expiry and sort
   exist; budget and brand do not.
5. **Personalisation (P4).** Correctly idle until there is behaviour to learn from.

## 10. What is blocked, and on whom

| Blocker | Owner action | Consequence |
|---|---|---|
| eBay India keyset | application pending with eBay | the only realistic route to a large, legal, real-price catalogue |
| Retailer feed partnerships | outreach by the owner | catalogue depth without scraping |
| Cloudflare *Workers Scripts: Edit* | token permission | would replace the health-ping scheduler with a true cron — nothing is blocked meanwhile |
| Custom domain | purchase | trust, and IndexNow |

---

## 11. Risks

| Risk | Severity | Mitigation in place |
|---|---|---|
| A comparison site with 25 products reads as a demo to a first-time visitor | **high** | fallback listings, 14-shelf board, honest labels — but this does not fix it |
| Affiliate/publisher terms change without notice | medium | approval re-synced weekly and surfaced publicly |
| Render free tier cold starts | low | keep-alive ping every 5 minutes |
| A stale demo price mistaken for a live quote | medium | origin tag on every offer, and structured data withheld entirely |
| Single owner holds every credential | medium | credential register + encrypted vault + backups |

---

## 12. Method note

When a build reports success, this audit does not believe it. The two most damaging defects
in this document — the homepage body copied into 44 pages, and the unowned domain in the
social preview — both shipped past a green build, a green test suite and a green design
audit. They were found by requesting the pages and reading the bytes.

That is now enforced rather than remembered: `npm run build` fails if a prerendered page
repeats another page's `<h1>`, lacks a body, names a host we do not own, or if the sitemap
lists a URL that was never rendered.
