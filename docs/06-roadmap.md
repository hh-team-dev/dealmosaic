# Part 20 — Development Roadmap & Delivery Plan

Working method: one phase at a time, each ending with **tests green → honest status note → owner review**. No phase is marked complete on the strength of a screen existing.

---

## Phase 0 — Strategy (COMPLETE)
**Deliverables:** this documentation pack, competitor matrix, connector feasibility audit, architecture, design system, data model, roadmap, test plan, zero-cost ledger, risk register.
**Exit criteria:** owner approval to build.

---

## Phase 1 — Foundation & Brand (next)
**Build**
- Monorepo (npm workspaces), TypeScript strict everywhere, lint + format, `.env.example`.
- Design tokens (`theme.css`, `tokens.ts`, `motion.ts`) implementing the dual-tone palette; self-hosted fonts.
- Logo: prism-tessera SVG mark, wordmark, favicon, OG cover, animated lockup.
- Component library v1 (~22 primitives) with documented states.
- Public landing page: animated hero, live search demo (non-functional input that explains the auth gate honestly), supported countries, how-it-works, sample comparison preview **clearly watermarked**, trust & affiliate disclosure, sign-up/login CTAs.
- Auth: register → email verification (dev outbox) → login → logout → forgot/reset password; session cookies, CSRF, rate limits, scrypt hashing; age confirmation (no DOB by default).
- Country + currency engine: 10 countries + UNIVERSAL, Frankfurter FX client with daily cache, display-currency switching.
- App shell: sidebar/nav, dashboard skeleton, profile & settings, account deletion + data export.
- Legal pages: Privacy, Terms, Affiliate Disclosure, Cookies/analytics controls, Contact.

**Exit criteria**
- Register → verify → log in → set country/currency → view dashboard → delete account, all working E2E.
- Search attempt while logged out shows the honest gate, not a fake result.
- Lighthouse a11y ≥95, contrast audit clean, no near-black tokens present in the CSS bundle.

---

## Phase 2 — Comparison Core (the heart)
**Build**
- Search pipeline: validation → PII-free query normalisation → connector fan-out → normalise → identity grouping → variant disambiguation → offers → money → rank → confidence → persistence.
- Matching engine: GTIN → EAN/UPC → ISBN → MPN → brand+model → attributes → validated text; per-match confidence; ambiguity → product-selection screen (never a silent merge).
- Money engine (integer minor units): itemised lines, `Known total`, `verification_state`, "TOTAL NOT FULLY VERIFIED".
- Ranking engine: documented weights, commission-blind, 1/2/3-offer handling with explicit reasons for a missing slot.
- Deal Confidence: 5-component formula, published in the UI tooltip.
- Comparison screen: desktop 3-column table + mobile swipeable cards, Podium, Price Truth drawer, Deal Passport, Trust Radar, product vs seller rating kept visually separate, 4 buttons per offer.
- Search page with filters, recent searches, trending (from real search counts only).

**Exit criteria**
- 2 and 3 offer scenarios rank correctly and explainably; unknown shipping renders as unknown (never ₹0).
- Ambiguous query ("Galaxy S25") shows variant selection; 512GB never compares to 256GB.
- Unit tests: money, matching, ranking (incl. "affiliate commission changes nothing"), confidence.
- Commission-blind assertion + incomplete-total-never-#1 assertion pass.

---

## Phase 3 — Connectors & Data Honesty
**Build**
- `DemoConnector` — ~40-product catalogue across 11 categories, variant splits, per-market retailer fixtures, seeded observation timeline starting at first run. Watermark component + DOM provenance attribute.
- `EbayConnector` — OAuth client-credentials, `item_summary/search`, mapping GTIN/MPN/condition/shipping/seller feedback into `NormalizedOffer`; caching, backoff, health check. Activates only when credentials exist.
- `AmazonCreatorsConnector`, `FlipkartConnector` — full interfaces, status `pending_approval`, disabled, documented activation steps.
- Connector registry: enabled+healthy gate, parallel fan-out with timeouts, partial-failure tolerance.
- Admin: Data-Source Health, connector toggles, cache TTLs, request log viewer.
- Failure UX: timeouts, zero results, all-connectors-down, stale-cache warning banner.

**Exit criteria**
- Contract tests for every connector; simulated 500/timeout/429 degrades to an honest message.
- Setting eBay env vars flips live data on with no code change; unsetting returns to demo+watermark.
- No demo price can render without its watermark (component-level test).

---

## Phase 3B — Grocery & Quick Commerce (added at owner request)
**Build**
- Quick-commerce platform registry: Blinkit, Zepto, Swiggy Instamart, BigBasket/BB Now, JioMart, Flipkart Minutes, Amazon Now, DMart Ready — each with status, deep-link template, serviceability model and admin contact route.
- Deep-link resolution: product query → correct search/PLP URL per platform, with honest label *"price confirmed on the platform, not here."*
- **Mosaic Community Price**: report submission (price, MRP, pack size, pincode, timestamp, optional screenshot) → corroboration → admin moderation → display with community trust tier and 90-minute decay. Pincode only — no GPS, no address.
- Grocery matching: GTIN/EAN → brand + net quantity + flavour → unit-price (₹/100 g, ₹/kg, ₹/L) comparability; multi-pack variants; loose produce at reduced confidence.
- Money engine extension: **Conditional** line state and explicit cart context for delivery/handling/small-cart/surge fees.
- Serviceability: pincode capture (optional, purpose-stated) gates q-commerce comparison honestly.

**Exit criteria**
- A grocery search (e.g. "Lay's Classic Salted") returns platform comparison with unit pricing and deep links.
- Community prices render with trust tier + age, never as verified retailer data; stale reports fall out of ranking.
- Below-threshold cart adds the delivery fee instead of showing delivery as ₹0.
- Anti-abuse: duplicate/spam reports award no XP; all reports auditable.

## Phase 4 — Personal Features & Mosaic Rewards
**Build**
- Watchlist (saved products, favourite animation, optimistic updates).
- Price alerts: target price, country context, in-app notification on genuine trigger, alert management (active/triggered/expired), no paid SMS.
- Price history: snapshot capture on every observation, animated SVG chart, real observation window printed, lowest/highest/average from real data only.
- Mosaic XP: levels, badges, achievements; XP for wishlists, valid matching feedback, verified price reports, corrections; **zero XP for searches, repeated actions or affiliate clicks** (anti-gaming rules + tests).
- Notification centre, support centre, incorrect-price and incorrect-match reporting → admin queues.
- Admin: reward policy settings (per merchant, hard-disabled Amazon), conversion report skeleton, fraud/abuse report view.

**Exit criteria**
- Alert fires on a real drop and appears in-app; XP ledger reconciles; reporting awards XP once only.
- Reward policy changes take effect without code edits; Amazon rewards cannot be enabled.

---

## Phase 5 — International / Universal
**Build**
- UNIVERSAL mode: cross-market offers, retailer country shown, original + converted price, conversion date, GLOBAL SEARCH badge.
- Destination/duty handling: destination + optional postcode, import/duty lines marked `Not available` where no authorised source exists, totals labelled incomplete.
- Additional country activation, country-specific defaults, per-market connector availability panel.
- Cached FX with visible rate date; "reference rate, not amount payable" notice.

**Exit criteria**
- Universal search returns offers from ≥2 markets (demo or eBay) with correct dual currency display.
- No landed-cost total is ever shown as verified when duty is unknown.
- Switching country changes connectors, currency and content correctly.

---

## Phase 6 — QA, Security & Ship
**Build**
- All 28 mandated tests automated where possible (see `07-test-strategy.md`).
- Security pass: headers/CSP, CSRF, rate limits, session expiry, admin server-side checks, secret scan, dependency audit.
- Performance: bundle budget, image lazy-loading, skeleton→content with no CLS, 4× CPU throttle check.
- Accessibility: keyboard-only run, screen-reader labels, reduced-motion visual check.
- Deployment runbook (Cloudflare Pages + Workers + Supabase), env-var reference, migration runner, backup notes, quota monitoring.
- **Final delivery report**: feature-by-feature status — LIVE / DEMO DATA / PENDING APPROVAL / NOT IMPLEMENTED — plus the zero-cost vs future-cost ledger.

**Exit criteria**
- Test report published with real pass/fail evidence.
- A stranger can deploy from the runbook alone.

---

## Sequencing notes & dependencies

```
P0 ──▶ P1 ──▶ P2 ──┬──▶ P3 ──┐
                   │         ├──▶ P6
                   └──▶ P4 ──┤
                             │
                        P5 ──┘
```
- P3 (live eBay data) can start as soon as you provide credentials — it does not block P2/P4.
- P5 depends on P2 (money engine) and P3 (multi-market offers).
- Amazon/Flipkart activation is **not** on the critical path; it is a credential event that can happen in any phase.

## Anti-goals (things I will refuse to do)
Scrape retailers · fake a cashback percentage · invent price history · pad a 2-offer result to 3 · hide that data is demo · make commission influence ranking · ship an admin route protected only by a hidden button · ship a button that does nothing.
