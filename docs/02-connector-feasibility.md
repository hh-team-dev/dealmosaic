# Part 11 — Connector Feasibility Audit (Zero-Cost Reality)

*Audited 2 November 2026. This document exists because the brief explicitly forbids assuming a retailer has a public API just because it has an affiliate programme. Every claim below is either verified or marked as an assumption.*

---

## 1. Verified findings

### ✅ eBay Browse API — **the one real, free, no-approval data source**
- Free developer account: **5,000 API calls/day, no time limit, no approval required** to begin ([developer.ebay.com](https://developer.ebay.com/sandbox/register)).
- `item_summary/search` returns: title, price, currency, condition, image, `gtin`, `mpn`, brand, item location, shipping options, seller username + feedback score/percentage, `itemWebUrl` (and `itemAffiliateWebUrl` once affiliate campaign IDs exist).
- Auth: OAuth2 client-credentials (app token) — server-side only.
- Coverage: US, GB, DE, AU, CA, IT, FR, ES, IE, AT, CH, NL, BE + more via `X-EBAY-C-MARKETPLACE-ID`.
- **India gap:** eBay's India marketplace shut down years ago. eBay **cannot** serve our India launch market. It serves UNIVERSAL and the 9 non-India countries.
- Limits to respect: default 5,000/day; raise only via eBay's compatibility check. We cache aggressively and never retry-loop.

### ✅ Frankfurter v2 — **free FX, INR included, keyless**
- Verified live from this machine: `GET https://api.frankfurter.dev/v2/rate/usd/inr` → `{"date":"2026-11-01","base":"USD","quote":"INR","rate":95.11}`.
- No API key, no account, no published cap (fair use), daily central-bank rates, commercial use permitted, open source and self-hostable ([frankfurter.dev](https://frankfurter.dev/)).
- **Caveat we display in the UI:** these are **daily reference rates, not live trading rates**. Conversion date is always shown; converted amounts are never presented as the amount payable.

### ⚠️ Amazon Creators API — real, but gated behind sales
- PA-API 5 was deprecated **30 April 2026** and its endpoint retired **15 May 2026**; Creators API (OAuth2) is the only official route ([migration coverage](https://www.getchatads.com/blog/amazon-associates-operating-agreement-ai-apps/)).
- Eligibility: **10 qualifying referred sales in the trailing 30 days** (per locale) before credentials are issued; new Associates need 3 qualifying sales in the first 180 days to keep the account ([Creators API guide](https://paapiplugin.com/creators-api-vs-pa-api-v5-2026/)).
- Price data must be refreshed within ~1 hour or visibly disclaimed — a caching rule we must implement, not ignore.
- No `GetVariations`, no multi-seller offer/seller-identity data in Creators API → variant matching must come from our own catalogue + attributes, not from Amazon.
- **Verdict: cannot be live at launch.** Adapter written to the documented interface, shipped **disabled**, activated by credentials only.
- **Also note:** Amazon's operating agreement forbids offering users cashback/rewards for Special Links → Amazon is hard-disabled in the reward engine.

### ⚠️ Flipkart Affiliate API — documented but closed to new applicants
- API docs exist (`affiliate.flipkart.com/api-docs`) with feed/delta-feed/search endpoints, but direct affiliate registration has been **paused for new applicants since 2018**; access is realistically obtained through networks (Cuelinks/AdmitAd) ([programme status](https://www.way2earning.com/2023/04/flipkart-affiliate-program/)).
- **Verdict: adapter shipped disabled.** India launch data cannot legally come from Flipkart until approved.

### 🟡 Cuelinks — affiliate network, **not** a catalogue API
- It is a link-monetisation/deeplink network. It does **not** give a universal product catalogue or live price feed. Treat as a *link wrapper + commission source*, never as a data connector (the brief already warns about this conflation).
- Adapter type: `AffiliateLinkProvider` (separate interface from `RetailerConnector`).

### ⚡ Indian quick commerce & grocery — a separate audit
Blinkit, Zepto, Swiggy Instamart, BigBasket/BB Now, JioMart, Flipkart Minutes and Amazon Now are audited separately in
**[`10-quickcommerce-grocery.md`](10-quickcommerce-grocery.md)**. Headline: **none publishes an authorised product/price API**,
q-commerce prices are **pincode-specific**, and affiliate programmes are link-attribution only. Solution = deep links +
**Mosaic Community Price** (pincode-tagged, 90-minute decay, never styled as verified) + dormant connectors.

### ❌ Not viable at zero cost (checked and rejected)
| Source | Why rejected |
|---|---|
| Croma, Reliance Digital, Vijay Sales, Tata CLiQ, Nykaa, Ajio, Myntra | No public/authorised product APIs. Scraping them violates their terms and Part 11's prohibition on bot-protection evasion. |
| Walmart, Target, Best Buy | Affiliate/API access is approval-gated via networks (Impact/Partnerize); Best Buy's API is US-only and requires an approved key. Dormant adapters only. |
| Google Shopping | No programme for third-party comparison backends at zero cost; Content API requires merchant status. |
| Any "free price API" aggregator | Unverified licensing; redistributing scraped prices is a legal liability we will not carry. |
| Customs/duty calculation | No free authoritative engine for landed cost across 10 countries. **We will not invent duty numbers.** We show "Import duty: unknown" and mark the total incomplete. |

---

## 2. Consequence for the product

**Live-data coverage at launch, honestly stated:**

| Market | Live offers at launch | Source |
|---|---|---|
| UNIVERSAL | ✅ once eBay keys supplied | eBay Browse API |
| US, GB, DE, FR, AU, CA, IT, ES, NL, IE | ✅ once eBay keys supplied | eBay Browse API |
| **India** | ❌ **DEMO DATA until Amazon/Flipkart/network approval** | watermark enforced |
| JP, SG, AE | ❌ DEMO until an authorised connector exists | watermark enforced |

This is exactly the situation Part 17 anticipates: *"If no authorised data connector is active, show an honest connection-unavailable message rather than pretending a search succeeded."* We go one step further: the demo connector is so clearly labelled (banner + per-offer badge + `data-origin="demo"` attribute in the DOM) that it cannot be mistaken for live.

---

## 3. Connector architecture (as it will be built)

```
RetailerConnector (interface)
├── capabilities: { search, productDetail, variants, offers, stock, shipping,
│                   affiliateLink, priceUpdate, conversions }
├── searchProducts(query, market, opts)   -> RawOffer[]
├── getProduct(id)                        -> RawProduct
├── getOffers(productId, market)          -> RawOffer[]
├── checkHealth()                         -> { ok, latencyMs, message }
└── buildAffiliateUrl(url, ctx)           -> { url, attribution }

Implementations
├── EbayConnector          (live-capable, env-gated)
├── AmazonCreatorsConnector(status: 'pending_approval', disabled)
├── FlipkartConnector      (status: 'pending_approval', disabled)
└── DemoConnector          (status: 'demo_only', always watermarked)
```

Rules enforced by the connector registry:
- A connector that is not `enabled` and `healthy` is **never** called.
- Every raw response is normalised into a single `NormalizedOffer` shape — the comparison engine never sees a vendor payload.
- Cache-first: per-connector TTL by data class (search 15 min, price 60 min, product detail 24 h), SQLite-backed, with an explicit `cached_at` surfaced to the user.
- All credentials live in server-side env vars; `grep` in CI fails the build if a key pattern appears under `apps/web/`.
- Every failure is logged with connector id, operation, HTTP status and latency; the admin **Data-Source Health** page reads that log.

---

## 4. External accounts you must create (owner tasks)

| # | Account | Cost | Unblocks |
|---|---|---|---|
| 1 | eBay Developers Program | Free | Live offers in 10 markets + UNIVERSAL |
| 2 | eBay Partner Network | Free (approval) | Affiliate attribution for eBay links |
| 3 | Amazon Associates (IN/US/UK) | Free | Path to Creators API after 10 sales/30d |
| 4 | Cuelinks or AdmitAd | Free | Flipkart/Myntra/Nykaa link monetisation |
| 5 | Brevo or Resend (free tier) | Free | Real verification email in production |
| 6 | Supabase | Free | Production Postgres (optional at launch) |
| 7 | Cloudflare | Free | Production hosting (Pages + Workers) |
| 8 | Domain + trademark check | **Paid** | Commercial launch of the DEALMOSAIC name |
