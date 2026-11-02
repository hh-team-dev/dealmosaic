# DealMosaic — Full Audit, Gap Analysis & Redesign

**Date:** 2 November 2026 · **Audited by:** lead developer · **Status:** Phase 3 live

This is an audit of the running system, not a proposal. Everything marked
**FIXED** was broken in production and is now fixed and verified live. Everything
marked **GAP** does not exist yet. Nothing here is aspirational language standing
in for work.

---

## 1. What already exists and works

Verified live today, not inferred from the code.

| Component | State | Evidence |
|---|---|---|
| Website | Live | `dealmosaic.pages.dev` — 200s, genuine 404s |
| API | Live | `dealmosaic-api.onrender.com/api/health` → `database: connected` |
| Database | Live | Turso `aws-ap-south-1` — 25 products, 170 offers, 0 personal rows |
| Auth | Works | register → emailed link → verify → login → session, tested end to end |
| Email | Works | Brevo over HTTPS; real delivery confirmed in the owner's inbox |
| Comparison engine | Works | "Amul Taaza Toned Milk 1L" → 3 ranked offers with landed cost |
| Matching / ranking / money | Works | 336 + 228 + 268 lines of pure logic, unit tested |
| Location API | Works | `/api/location/pincode/400001` → Mumbai; invalid PIN → 400 |
| SEO generation | Works | 50 sitemap URLs, robots.txt, per-page JSON-LD |
| Safety net | Works | **153 tests**, 33 design assertions, secret scanning, verified backups |

The engineering underneath is sound. The problem is not code quality — it is
**data, access, and one self-inflicted SEO wound**.

### The three things that were actively wrong

**a) SEO was sabotaged by one constant — FIXED.**
`seo.tsx` hardcoded the canonical origin as `https://dealmosaic.in`, a domain
that is not owned and does not resolve, while `robots.txt` and `sitemap.xml`
pointed at `dealmosaic.pages.dev`. So every page told Google "the real version of
me lives at a host that does not exist." That is a canonical pointing into a void
and it can suppress indexing outright. It is now resolved at runtime from
`location.origin`, which is correct on pages.dev, on any future domain, and on
localhost — with nothing to remember later. Verified: **zero references to
`dealmosaic.in` remain in the shipped bundle.**

**b) The product was hidden behind a signup wall — FIXED.**
Search returned `401` to anyone without a verified account. That meant a visitor
could not evaluate the site's entire promise, and a crawler could not index a
single comparison. Search is now public, rate-limited per IP at 30 requests/minute.
Accounts still gate **history and alerts** — the parts that genuinely need an
identity. Verified: anonymous POST to `/api/search` returns three ranked offers.

**c) Coupons did not exist — BUILT.**
Your brief treats coupons, bank offers and cashback as central. There was no
table, no endpoint, no UI. Now there is a `coupons` table, a public read API, a
community submission endpoint and a checkout-outcome endpoint. Two rules are
enforced in the schema and the API, not just the prose:
- Nothing is seeded. An empty, honest list beats invented codes.
- **Cashback is not a discount.** It returns days later and can be refused, so it
  is modelled as its own type and can never be subtracted from a payable total.

---

## 2. The central finding: we have no live prices, and that is not a coding problem

This is the honest headline of the audit.

`dataMode: demo` on every comparison is not a placeholder we forgot to remove. It
is the truth: **no Indian retailer sells authorised API access to their prices.**

| Retailer | Reality | Zero-cost route? |
|---|---|---|
| Amazon India | PA-API needs ~10 qualifying affiliate sales in 30 days first; still does not expose every seller offer | Partial, after sales |
| Flipkart | Affiliate sign-ups closed for years; Minutes pricing is per-pincode | Via Cuelinks/AdmitAd only |
| Blinkit | Per-dark-store prices, change through the day, no public API | Partnership only |
| Zepto | No public consumer or affiliate price API identified | Partnership only |
| Swiggy Instamart | Affiliate programme is a link layer, not a price feed | Attribution only |
| BigBasket | Affiliate rates vary, short cookie windows, no documented price API | Partnership only |
| **eBay India** | **Dead marketplace** — the API exists but there is nothing to buy on it | Must target eBay GB/US |
| eBay (global) | Browse API, 5,000 calls/day, genuinely free | **Yes — needs your keyset** |

So the "three best deals across all Indian stores" promise is **not deliverable
today by legal, zero-cost means**. Anyone who claims otherwise is either scraping
against terms of service or making the numbers up. We will not do either.

**What is deliverable at zero cost, in descending order of value:**

1. **eBay Browse API** — real, live, free, 5,000 calls/day. The single biggest
   legitimate win available. It needs your developer keyset (blocked on your
   phone verification, not on me).
2. **Affiliate networks** (Cuelinks, AdmitAd) — free to join, and they solve two
   problems at once: **product feeds and commission**. This is also the revenue
   model. One application unlocks both.
3. **Community price reports** — already built. A shopper tells us what they paid
   at their pincode. Slower, but real, and the only way to cover quick-commerce
   before a partnership exists.
4. **Verified coupon intelligence** — codes that demonstrably work at checkout are
   valuable to users even without price data, and they are collectable legally.

**Recommendation:** stop positioning DealMosaic as "compares every Indian store"
until feeds exist. Position it as *"the honest price checker — we show what we can
verify and say plainly what we cannot."* That is a defensible position that gets
stronger as each feed lands, rather than a promise that is false on day one.

---

## 3. Prioritised gap analysis

| # | Gap | Impact | Cost | Owner action? |
|---|---|---|---|---|
| 1 | Canonical domain pointed at a non-existent host | **Critical** — blocks indexing | ₹0 | No — **FIXED** |
| 2 | Search behind signup wall | **Critical** — no SEO, no trial | ₹0 | No — **FIXED** |
| 3 | No coupon/discount layer | **High** — your core differentiator | ₹0 | No — **BUILT** |
| 4 | No live price feed | **Critical** — `demo` mode everywhere | ₹0 | **Yes** — eBay keyset + affiliate applications |
| 5 | Location API has no UI | High — feature exists, users cannot reach it | ₹0 | No |
| 6 | Coupon UI not wired into comparison pages | Medium — API exists, invisible | ₹0 | No |
| 7 | No brand pages (`/b/…`) | Medium — brand searches are high-intent | ₹0 | No |
| 8 | Rate limiter is in-process only | Medium — wrong the moment there are 2 instances | ₹0 | No (documented) |
| 9 | No price-history charts | Medium — retention feature, data exists in `offer_snapshots` | ₹0 | No |
| 10 | No PWA / offline | Low — deferred by your instruction | ₹0 | No |
| 11 | No moderation UI for coupon/price review | Medium — needed once submissions exist | ₹0 | No |
| 12 | Cold start 22.5 s (measured) | Low–Medium — Cloudflare cron installed | ₹0 | Done |

---

## 4. Proposed architecture (no rebuild — targeted upgrade)

The existing shape is right. Keep it.

```
Browser (React SPA, Cloudflare Pages, edge-cached)
   │  same-origin /api/* via _worker.js proxy  → no CORS, first-party cookies
   ▼
API (Hono on Render) ──► Turso (libSQL, ap-south-1)
   │                         ▲
   │                         │ normalise, dedupe, stamp provenance
   ▼                         │
Connector layer ─────────────┘
   ├── ebay     (live, free 5k/day)        → enable with keyset
   ├── feed     (affiliate product feeds)  → enable with network account
   ├── community (human reports, pincode)  → built
   └── demo     (clearly labelled)         → fallback, never disguised
```

**The invariant that makes this honest:** every offer carries `data_origin`
(`demo` / `live` / `community`), and the API computes `dataMode` for the whole
comparison. The UI cannot show a demo price without saying so — not by
convention, but because the field is required by the type.

**Upgrades worth making, in order:**
1. Wire the coupon API into comparison pages (coupon panel per platform).
2. Location UI: a pincode field in the header, stored in preferences, feeding the
   delivery estimate. Data layer already exists.
3. Brand pages generated from the catalogue, not hand-written — no thin pages.
4. Response caching at the edge for `/api/catalogue/*` and `/api/coupons`
   (already sending `Cache-Control`), so the free Render instance does less work.
5. Shared rate-limit store only when a second instance exists. Not before.

---

## 5. Integrations and their real costs

| Integration | Cost | Limit | Verdict |
|---|---|---|---|
| eBay Browse API | **₹0** | 5,000 calls/day | **Do this first** — needs your keyset |
| Cuelinks / AdmitAd | **₹0** to join | Approval required | **Highest leverage** — feeds + commission |
| Amazon Associates | ₹0 | Needs qualifying sales first | Later |
| Brevo | ₹0 | 300 emails/day | Already live |
| Turso | ₹0 | Generous free tier | Already live |
| Render | ₹0 | Sleeps after 15 min idle | Mitigated by cron |
| Cloudflare Pages/Workers | ₹0 | Very high limits | Already live |
| OpenStreetMap + Leaflet | **₹0** | Attribution required, no bulk tile scraping | For map UI |
| Google Maps | ❌ paid | — | Not used |
| Retailer direct price APIs | ❌ do not exist | — | Partnership only |

---

## 6. Coupon, cashback and revenue strategy

**The sequencing matters more than the tactics.** Cashback before traffic is a
loss-making gym membership.

**Stage 1 — now, ₹0:** verified coupons only. Community-submitted, moderator-checked,
auto-retired after repeated failure (built: 5 failures and outnumbering successes
twice over marks a code expired). Zero revenue, and that is correct: the asset
being built is *trust*, which is the only thing that makes stage 3 possible.

**Stage 2 — when a feed exists:** affiliate links. Every "Buy" click carries a
tracking parameter. Commission accrues with no cost and no user-visible change.
Disclosure is mandatory and already written into the legal pages.

**Stage 3 — with traffic:** share affiliate revenue back as cashback. This is how
the established players work: they take the retailer's commission and return part
of it, which buys loyalty that a comparison table alone cannot.

**Non-negotiables, encoded in the design:**
- Ranked by **payable price**, never by commission. The ranking function takes no
  commercial input — that is why it is a pure module with unit tests.
- Sponsored placements are labelled as sponsored or they do not ship.
- Cashback never appears in a total the user is about to pay.

---

## 7. SEO and location strategy

**Fixed today:** runtime-correct canonicals, public search, 50-URL sitemap on the
correct host, real 404s, `noindex` on private routes.

**Zero-cost build order:**
1. **Structured data already emitted** — Product, Offer, BreadcrumbList. No
   `aggregateRating`, deliberately: we do not own reviews and inventing star
   ratings is fabrication.
2. **Brand and category pages** generated from the catalogue. Each must have real
   content — a page that only reshuffles 3 products is thin and will be ignored.
3. **Location** — pincode-first, not GPS. The delivery promise is per-PIN, so a
   radius would invent a promise the retailer never made. Map tiles are lazy-loaded
   Leaflet + OSM, ₹0, and only on pages where a map answers a question.
4. **Never** generate a page per city without unique content. That is the fastest
   route to a manual action.

**Realistic expectation:** first-page rankings come from having the most accurate
answer to specific product questions. With 25 demo products there is nothing to
rank. Coverage is the SEO strategy; there is no shortcut around it.

---

## 8. Competitor position

Established players (CashKaro, GrabOn, Pricee, Smartprix) win on **coupon volume**
and **cashback**, which they can only fund because they have affiliate
relationships and traffic. We cannot beat them on volume today.

We can beat them on **honesty and clarity**: they routinely show coupon codes that
expired months ago, and mix cashback into headline prices. Our structural answers
are already built — auto-retiring dead codes, cashback kept out of totals,
provenance on every price, and a public page explaining how ranking works.

That is a real wedge, but it is a positioning wedge, not a data moat. The data
moat is the eBay feed and affiliate feeds.

---

## 9. Roadmap

**Done this session:** canonical fix · public search · coupon engine + tests ·
Cloudflare keep-alive · documented audit.

**Next, in order (all ₹0):**
1. Coupon panel on comparison pages.
2. Pincode UI wired to the existing location API.
3. Brand pages from catalogue data.
4. Edge caching for catalogue and coupon reads.
5. Admin moderation for submitted coupons.

**Blocked on you (each is a signup, not a payment):**
1. **eBay developer keyset** → 5,000 live calls/day.
2. **Cuelinks or AdmitAd** → affiliate feeds + commission.
3. **Google Search Console** verification → without it, indexing is unmeasured.

---

## 10. Test results and remaining limitations

**Green:** 153 tests · 33 design assertions · typecheck across 3 packages ·
0 secrets in 150 files · backup verified (160 files) · all three fixes confirmed
against the live deployment.

**Limitations, stated plainly:**
- **Every price shown is `demo`.** This is the dominant limitation and no amount of
  engineering removes it.
- Rate limiting is per-instance; it degrades with horizontal scaling.
- Render's free tier sleeps (22.5 s measured cold start); mitigated, not eliminated.
- Coupon data is empty until real submissions arrive.
- No moderation interface yet, so verification is manual SQL.
- India only, by design.

---

## The one-paragraph summary

The engineering is solid and the honesty rules are enforced in code rather than
in good intentions. Three real defects were found and fixed today — a canonical
pointing at a domain that does not exist, a signup wall hiding the product, and a
missing coupon layer. What remains is **not a coding problem**: without authorised
price feeds, the "three best deals across all Indian stores" promise cannot be
kept truthfully. eBay's free API and one affiliate network application unlock the
largest share of that promise at zero cost, and both need your hands, not mine.
