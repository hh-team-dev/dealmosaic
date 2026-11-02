# 25 — Competitive gap analysis (Phase 1 of the master command)

**Date:** 3 November 2026
**Scope:** the whole live product, audited against BuyHatke, Smartprix, DesiDime, CashKaro and the
behaviour of Indian shoppers on a mid-range Android phone.
**Method:** source read, production queries against Turso, live HTTP checks against
`dealmosaic.pages.dev` and `dealmosaic-api.onrender.com`, and the live affiliate feed.

> **This file is the audit that must exist before changes.** It records what was broken, what was
> thin, what was missing, and the order things were fixed in. Section 6 lists what is *still* open,
> so this document does not go stale when the next block of work lands.

---

## 1. The one-line finding

DealMosaic was **launch-ready but not visit-worthy**: every page loaded, nothing was broken, no copy
apologised — and yet a visitor who arrived without a product name in their head had nothing to do.
The homepage was a brochure for a search box. A deal site has to be a **board you can browse**.

That is the gap this block closes. The second finding is structural and still open: the comparison
catalogue is **25 products / 46 variants / 170 offers**, so search dead-ends for almost any query.

---

## 2. What was actually broken (fixed in this block)

| # | Defect | Why it mattered | Fix |
|---|---|---|---|
| 1 | Hero search **redirected anonymous visitors to `/register`** while the copy two lines below said "Free to use. No sign-up needed to compare." | The single most valuable action on the site discarded the search and asked for an account. A direct contradiction, visible in one screen. | `Landing.tsx` navigates straight to `/search`; search was already public server-side. |
| 2 | Code-less offers linked to `/?q=<store>` — the homepage with a query string | A dead end dressed as a call to action. | Links to the merchant's own offer URL, `rel="sponsored nofollow noopener"`. |
| 3 | `/deals` held all filters in component state | A shelf link could not deep-link; the back button lost the filter; the URL a shopper shared was not the page they saw. | Filters now read from the URL; every "See all" link is a real, shareable page. |
| 4 | Deals hero claimed **"Every code here actually works"** | We do not test every code. Overclaiming in the first sentence of a trust page. | "Every code here is **live right now**" — true against the feed. |
| 5 | Homepage CTA promised "get told the moment a total drops" | Price-drop email does not exist yet. | Reworded to what ships today; the promise moves back in only when alerts are live. |
| 6 | Affiliate feed data was **discarded on import** | `original_price`, `discount_price`, `percent_off`, `categories` and `campaign_name` were dropped at sync. Nothing could be grouped, sorted or filtered by price or category, because the fields did not exist in our database. | New columns + a parser for the prices the feed states in prose. See §3. |

---

## 3. The data discovery that unlocked everything

The affiliate feed's structured price fields are **empty in practice**. Verified against 1,085 live
offers:

```
offers with original_price or discount_price : 0
offers with percent_off                      : 0
offers with an expiry date                   : 1,085   ← genuinely complete
offers with a coupon code                    : 280
offers whose headline states a rupee amount  : 406
offers whose headline states a percentage    : 491
```

So the only numbers that exist are the ones the merchant typed into the headline —
*"Noise Air Buds Pro 6 at Rs.2707"*, *"Up to 70% Off Combo Packs, Prices from Rs. 125"*.

`packages/core/src/offer-text.ts` extracts them under two rules, and refuses everything else:

1. **A discount is not a price.** `Rs.100 Off`, `Minimum purchase Rs.1299`, `Rs.200 cashback` are
   rejected. Reading a discount as a price is exactly how a ₹1,299 kurta ends up under "Deals under
   ₹199" on the sites this one is competing with.
2. **A ceiling stays a ceiling.** `Up to 80% off` is stored with `percentIsCap = true`, and the UI
   prints "up to 80%", never "80% off".

Result on live data: **268 offers carry a usable stated price**, distributed across the buckets as
`under ₹99: 9 · under ₹199: 22 · under ₹499: 73 · under ₹999: 127`. Those counts are why the ₹99
shelf's floor is three items rather than ten.

---

## 4. The requested shelves — status, with the honest number behind each

| Requested | Live data available | Status | Floor before it renders |
|---|---|---|---|
| Today's best deals | 1,085 live offers | ✅ shipped | 4 |
| Biggest verified savings | 491 stated percentages | ✅ shipped as **"Biggest savings"** — see honesty note below | 4 |
| Deals under ₹99 / ₹199 / ₹499 / ₹999 | 268 stated prices | ✅ shipped | 3 per bucket |
| Grocery bargains | 120 `Food & Grocery` offers | ✅ shipped | 4 |
| Electronics offers | 76 Electronics + 14 Mobiles + 33 Gaming | ✅ shipped | 4 |
| Bank and UPI offers | **23 offers mention a bank, card or UPI app** | ✅ shipped, thin by nature | 3 |
| Newly discovered coupons | 14-day window | ✅ shipped | 4 |
| Deals expiring soon | 1,085 dated offers | ✅ shipped | 3 |
| Price alerts | needs verified email + signed-in account | ⏳ **not shipped** | — |
| Wishlist / watchlist | none needed — local | ✅ shipped (`/saved`) | — |
| Recently viewed | local | ✅ shipped | — |
| Personalised deals | no behavioural data yet, by design | ⏳ later | — |
| Cashback tracking | no cashback ledger exists | ⏳ later | — |

**Honesty note on "verified savings".** The percentage is real and it is the store's own published
figure, but *we* have not independently verified it — verification would mean buying the product.
The shelf is therefore titled **"Biggest savings on the board"** with the line *"Ranked by the
percentage the store itself published — never by what a store pays us."* Calling it "verified"
would be the one word on the page we could not defend.

**The floor rule.** Every shelf declares `minItems` and the API withholds it when it cannot be met,
returning the shortfall in a `withheld` array. On a quiet day the wall gets shorter and says so.
It never fills with a fictional deal.

---

## 5. What was built, in the order it was built

1. `packages/core/src/offer-text.ts` + 22 tests — headline parsing, group mapping, bank detection.
2. `coupons` table: 10 new columns, forward-only migration in `initDb` (production keeps its rows).
3. `cuelinks.toCouponRow()` enriched — the sync now stores price, percentage, category and campaign.
4. `apps/api/src/services/discover.ts` — shelf rules as a pure function + 10 tests.
5. `GET /api/coupons/discover` — one cacheable response, ~40 offers, nine cuts.
6. `GET /api/coupons` — `group`, `maxPrice`, `expiring`, `bank`, `sort` filters.
7. `DealCard` + `DiscoverShelves` — monogram tiles, preserved qualifiers, code copy, sponsored links.
8. `lib/saved.ts` + `/saved` — wishlist and recently-viewed in `localStorage`, no account required.
9. `/deals` URL-driven filters + the three dead-end fixes in §2.

---

## 5b. The "reason to return" block — built 3 November 2026

| Requested | Status | Where it lives |
|---|---|---|
| Price alerts | ✅ shipped, self-scheduling | `services/alerts.ts`, `routes/alerts.ts`, product page form, Dashboard list |
| Wishlist / watchlist | ✅ shipped (device-local) | `lib/saved.ts`, `/saved` |
| Recently viewed | ✅ shipped | `lib/saved.ts`, homepage + `/saved` |
| Price-history charts | ✅ shipped, chart accrues daily | `services/snapshots.ts`, `ProductInsights.tsx` |
| Pincode UI | ✅ shipped on product page | `lib/pincode.ts` (device-local PIN) |
| Community price reports | ✅ shipped (form + list) | `CommunityPanel`, existing `/api/community-prices` |
| Coupons on comparison pages | ✅ shipped | `CouponStrip` on `/p/:slug` |
| Personalised deals | ⏳ not started — needs traffic to be signal rather than noise | — |
| Cashback tracking | ⏳ not started — there is no cashback ledger to track | — |

### How the alerts actually work

`price_alerts` + `runAlerts()`: for every active alert, take the **cheapest in-stock
offer for that exact variant**, and email only if it is below the shopper's target.
One alert per variant per shopper; it fires once and closes. Ten tests assert the
negatives — no variant, no offer, price above target, already fired — because the
failure a person experiences is spam, not a missing feature.

### How the daily job runs without a cron

Three options were available, and only one was free *and* reliable:

1. **GitHub Actions `schedule`** — already documented in this repo as never firing
   on a quiet repository. Abandoned.
2. **A second Cloudflare Cron Trigger** — correct, but the Cloudflare token in use
   has Pages permission and not Workers: `PUT` returns *"No access to the specified
   service"*. **Owner action if wanted:** add *Workers Scripts: Edit* to the token,
   then `cd deploy/keepalive && npx wrangler deploy` ships the two-trigger worker
   that is already written and committed.
3. **Piggyback on the keep-alive ping** — what runs today. The worker that already
   exists calls `/api/health` every five minutes; the API asks "am I due?" and runs
   the job at most once per 20 hours. An in-DB claim prevents overlap, `job_runs`
   records the outcome, and the health response is sent before the work starts.

Measured on production: the full job (feed refresh + snapshots + alerts) takes
**5.5 s**, and `/api/health` still answers in **0.25 s** while it runs.

### What the price history can and cannot say

`offer_snapshots` gains one row per offer per day, **never backfilled**. The chart
refuses to draw a line through fewer than two points and prints *"our own record —
not a market index"* underneath. At the time of writing the catalogue has one day
of history, so most charts correctly say so instead of drawing a flat line and
implying stability we never observed.

## 5c. A dead-end search is no longer a dead end

The catalogue holds 25 products and the wall holds 1,089 live merchant offers. When a
search matched nothing, the site used to answer with an apology and six random product
chips. That is the wrong answer on a site this size: *"noise earbuds"* is not in our
catalogue, but a Noise earbuds offer was published by a merchant this morning.

`services/offer-search.ts` now runs when the catalogue returns nothing, and returns the
live offers whose own copy mentions every meaningful word of the query.

The distinction that makes it honest:

| | Comparison | Offer listing |
|---|---|---|
| What it is | we matched a product identity and ranked landed totals | the store published this; we are repeating their words |
| Claims a winner | yes, with a reason | **never** |
| Claims a total | yes, with each line's source | **never** — only the price the store itself printed |
| Shown when | the product is identified | the product is not |

Matching rules: every token must appear (AND, not OR), stopwords dropped, tokens under
three characters dropped, four-token ceiling, expired and rejected rows excluded, and an
empty array is a valid answer — no padding to reach a round number.

Verified on production the same hour it shipped:

```
"noise earbuds"     → 2 offers   (Gonoise "Noise Air Buds Pro 6 at Rs.2707", …)
"kurta"             → 8 offers   (Pantaloons 75% off, Libas, Ajio Gram …)
"aashirvaad atta"   → still a comparison (catalogue hit, fallback never runs)
```

Twelve tests cover it, testing the boundary rather than the feature: a one-word overlap
must not match, an expired row must not appear, a rejected row must not appear, and a
query made only of punctuation must return nothing.

## 6. Still open, in priority order

1. **Catalogue depth (the real gap).** 25 products / 46 variants / 170 offers. Browsing now works,
   and a miss now falls back to live listings (see §5c) instead of an apology — but only 25 products
   can be *compared*, which is still the honest limit. Target: several hundred products across
   grocery, electronics, fashion, beauty and home before any paid marketing.
2. **Price alerts** — the schema (`price_alerts`) exists, the mailer exists (Brevo over HTTPS), the
   UI does not. Needs: signed-in target price → daily check against `offer_snapshots` → email.
   This is the single strongest return-visit mechanic and it is one focused block of work.
3. **Price history charts** — `offer_snapshots` already records every observation, so the data is
   accruing while nobody can see it.
4. **Pincode UI** — `/api/location` exists and works; no interface reaches it, so "pincode-aware
   pricing" is currently a claim without a control.
5. **Community price reports** — endpoint and table exist, form does not.
6. **Personalisation** — deliberately last. It needs enough traffic to be signal rather than noise,
   and it must never become the thing that decides ranking.

---

## 7. Non-negotiables this block did not move

- Commission is not an input to any ordering decision, and `rel="sponsored"` discloses the link.
- Cashback is never subtracted from a payable total.
- No shelf renders fabricated data; no price is invented; no countdown is manufactured.
- No dark patterns: no fake scarcity, no invented "only 2 left", no pre-ticked anything.
- ₹0 spent: no new service, no paid API, no hosting change.
