# Part 2 — Market Research & Competitive Positioning

*Research date: 2 November 2026. Reviewed as a product strategist, not a marketer. Where I could not verify something, it is marked **unverified** — I do not invent facts about competitors either.*

---

## 1. The honest framing

Price comparison is a **mature, crowded, structurally difficult** category. We are not inventing it. Google Shopping, PriceRunner, PriceSpy, Buyhatke, MySmartPrice, camelcamelcamel, ShopSavvy, Capital One Shopping and dozens of regional players already exist, and most of them are bigger, older and better capitalised than us.

Their collective weakness is not coverage. It is **trust**: the listed price is rarely the price you pay, ranking is frequently opaque or commercially influenced, product matching silently merges variants, and data freshness is hidden. Indian users in particular have learned to distrust "deal" surfaces — Buyhatke's own app-store reviews in 2026 include users calling the deals feed "FAKE/WRONG most of the time" and complaining about unexplained charges at checkout after a comparison.

That is our opening. **We compete on verifiable truth per offer, not on catalogue size.**

---

## 2. Competitor matrix

| Platform | Model | Strength | Limitation we exploit | Monetisation |
|---|---|---|---|---|
| **Google Shopping** | Aggregator over merchant feeds | Unmatched catalogue + brand trust; free listings | Zero explanation of *why* a result ranks; shipping/tax often unknown at compare time; no total-cost framing; no variant-confidence signal; hard to save/alert precisely | Ads (paid placements dominate) |
| **Buyhatke** (IN) | Extension + app + cashback | Deep Amazon/Flipkart price history; coupon DB; mass Indian reach | Cluttered, ad-heavy UI; reviews cite wrong/fake deals; cashback delays erode trust; only 2–3 real stores | Affiliate + ads + cashback spread |
| **MySmartPrice / PriceDekho / Smartprix** (IN) | Specs + price aggregation | Strong spec sheets, SEO depth | Spec-portal feel, not decision tools; weak total-cost/landed-cost math; crowded layouts; alerts are generic | Affiliate + ads |
| **PriceRunner / PriceSpy** (EU/UK) | Comparison + history + reviews | Genuine price history, product test data, EU trust | Regionally trapped (Nordics/UK/EU); dated UI; little cross-border landed-cost thinking | Affiliate + ads |
| **camelcamelcamel** | Amazon-only price tracker | Beloved history charts, simple alerts | Amazon-only; deliberately unglamorous; no multi-retailer comparison | Affiliate |
| **ShopSavvy** | Mobile barcode scanner | Excellent in-store scanning, local + online | Mobile-first app; weak web comparison; limited India relevance | Affiliate + retail media |
| **Capital One Shopping** | Browser extension + rewards | Free, automated coupon application, real savings for US users | Banking-product funnel; US-centric; rewards opaque; not a research tool | Card acquisition + affiliate |
| **tookit.co** (IN) | Price history + cashback for Indian shoppers | Sharp price-history UX for India | Narrow scope; cashback-dependent identity | Affiliate + cashback |
| **GetMyPrice / CompareRaja / PriceHunt** (IN) | Basic aggregation | Simple, fast | Thin trust layer, stale data, weak variant matching | Affiliate + ads |

**Cross-cutting gaps (our thesis):**

1. **Total-cost blindness.** Almost nobody computes a *comparable, itemised* payable total with explicit "unknown" states. Most show the listed price and hope.
2. **Opaque ranking.** "Why is this #1?" is answered nowhere. When ranking is paid, it is often not labelled clearly enough for a normal shopper.
3. **Variant merge.** 512 GB vs 256 GB, 8 GB vs 16 GB RAM, 2024 vs 2025 model — silently blended, producing a fake "cheapest".
4. **Freshness theatre.** "Live price" claims with no timestamp, no source, no staleness punishment in ranking.
5. **Seller ≠ product reputation.** Seller rating and review count are visually muddled everywhere.
6. **Cross-border reality.** Universal/global modes convert currency and stop — they ignore duty, import fees, and destination eligibility, then imply the overseas item is cheaper.
7. **Design is either corporate-grey or ad-cluttered.** Nobody makes comparison *enjoyable*.

---

## 3. Our defensible position

Not "more retailers". **The best explanation of three offers.** Concretely:

| Differentiator | Implementation commitment |
|---|---|
| **Transparent total price** | Price Truth Engine: every line item labelled Confirmed / Estimated / Not available / Not applicable. Missing ≠ zero. Totals marked "TOTAL NOT FULLY VERIFIED" when incomplete. |
| **Exact variant matching** | Identifier-first matching (GTIN → MPN → ISBN → brand+model → attributes → validated text), with a visible confidence value and a user-selection screen when ambiguous. |
| **Maximum three offers** | Radical reduction. Three is a decision, not a dump. Ties and fallbacks show 2 or 1 rather than padding. |
| **Explainable ranking** | Deterministic, documented weights, commission-blind, with a generated "Why this is ranked #1" sentence. Enforced by tests. |
| **Honest freshness** | Every offer carries `last_checked_at`; freshness feeds a published confidence formula and decays ranking. |
| **Deal Confidence score** | A defined 5-component calculation (source, freshness, match, shipping, seller), never conflated with product quality or seller rating. |
| **International with integrity** | Country context on every retailer; original + converted currency; destination/landed-cost gaps explicitly labelled incomplete; conversion date shown. |
| **Compliant rewards** | XP + badges live from day one; monetary purchase rewards **disabled by default**, configurable per merchant, hard-disabled for Amazon per its operating agreement. |
| **Delight as a differentiator** | A coherent, colourful, motion-designed system (see `04-design-system.md`) that makes comparison feel like discovery. |

**Positioning sentence:** *For shoppers who do not trust "cheapest price" claims, DEALMOSAIC is the comparison engine that shows you three offers, proves the total, and tells you exactly why each one is ranked where it is.*

---

## 4. Monetisation reality check

- **Affiliate commission** is the only credible zero-cost revenue path at launch, and it is *earned per market approval*: eBay Partner Network, Amazon Associates, Flipkart (via network), Cuelinks. None of these can be assumed approved.
- **Ranking independence** is a product promise and a legal safeguard: commission is not an input to sorting, and any future sponsored slot must be visually separated and labelled per Part 6/16.
- **Cashback/rewards** are gated behind per-merchant written permission. Amazon's operating agreement forbids rewarding users for Special Links, so Amazon is hard-disabled in the reward policy config.
- **Ads/sponsored placements**: explicitly out of scope for launch. Revenue cannot be allowed to outrun trust in the MVP.
