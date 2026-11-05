# DEALMOSAIC — Executive Summary & Project Charter

> **Current operational handover, 5 November 2026:** This is a historical charter. Use [Document 46](46-traffic-first-hotel-discovery.md) for deployed 2.8.0, traffic-first hotel discovery across 18 destinations, consent-gated analytics and the still-open phone DNS check. [Document 45](45-store-link-recovery-and-connection-desk.md) keeps the 2.7.1 store-link recovery and owner connection inventory.

**Role:** Lead Developer / Technical Architect / Project Manager
**Owner:** Founder (product owner)
**Date:** 2 November 2026
**Status:** Phase 0 complete (research + strategy). Awaiting go-ahead to execute Phase 1.
**Source brief:** `docs/source/MASTER_BUILD_PROMPT.txt` (1,217 lines, 21 parts)

> **Status note, 3 November 2026.** This charter is the Phase-0 document and is kept for
> the record. The project shipped through Phase 16 plus a master icon and visual
> identity; the live state, and everything that has changed since this page was
> written, is in `00-MASTER-HANDOVER.md`. The identity itself is documented in
> `brand-identity.md`.

---

## 1. What we are building

DEALMOSAIC is a **price-comparison and purchase-decision platform**, not a shop and not a catalogue. A user searches a product; the platform searches every *authorised* connector for the selected market, matches the exact variant, computes comparable landed cost, and presents **at most three** ranked offers with an explainable "why this is #1".

Working promise: **"We don't just show you a cheaper listed price. We help you discover the better purchase."**

Two non-negotiables from the brief that shape every technical choice:

1. **Honesty over completeness.** Never fabricate an offer, a price, a review, a cashback rate, a confidence score or a customs estimate. Missing data is displayed as missing, never as zero. If no authorised connector is live, the product says so.
2. **Zero cost at launch.** No paid hosting, APIs, templates, UI kits, database, email or SMS. Every dependency must be open-source or free-tier, documented, and swappable.

---

## 2. My verdict on feasibility (read this first)

The brief is achievable **with one honest caveat**, and I want it stated before any code is written rather than discovered at the end.

| Layer | Verdict | Why |
|---|---|---|
| Brand, design system, 15+ animations, responsive UX | ✅ Fully achievable, zero cost | Pure frontend work; our own code |
| Auth, dashboard, watchlist, alerts, XP/badges, admin, audit log | ✅ Fully achievable, zero cost | Self-hosted; no paid dependency |
| Comparison engine, Price Truth, Deal Podium, Deal Confidence, Deal Passport | ✅ Fully achievable, zero cost | Deterministic logic we own and unit-test |
| Currency conversion (INR included) | ✅ Achievable with **live real data now** | Frankfurter v2, keyless, verified: `USD→INR = 95.11` on 2026-11-01 |
| **Live retailer prices, India** | ⚠️ **Blocked behind third-party approval** | Amazon Creators API requires 10 qualifying sales/30 days; Flipkart affiliate registrations paused. No legal free source exists. |
| **Live retailer prices, global** | ⚠️ **Available but requires YOUR credentials** | eBay Browse API: free 5,000 calls/day, no approval needed — but needs an eBay developer account in your name |
| Universal mode / international landed cost | 🟡 Partially achievable | FX + retailer-country + shipping fields work; **customs duty engines are not free/authorised** → we label totals "incomplete" instead of inventing numbers |

**The consequence:** DEALMOSAIC will launch as a fully working platform whose *engine is real* and whose *data layer is pluggable*. Until merchant approval lands, results come from a connector marked **DEMO DATA** — visibly watermarked, never disguised as live — exactly as Parts 17 and 21 demand. The moment you supply eBay keys (or Amazon approval arrives), real offers flow through the same pipeline with no rewrite.

I am building the connector socket now so that the expensive part (your approval) is the only thing left.

---

## 2b. Addendum — groceries & 10-minute quick commerce (owner request, 2 Nov)
Owner instruction: DEALMOSAIC must compare a packet of potato chips as seriously as a smartphone, including India's
instant-delivery platforms. Audit added in `10-quickcommerce-grocery.md`; summary:

- **Landscape:** Blinkit (~46%), Swiggy Instamart (~21–24%), Zepto (~22–29%), then Flipkart Minutes, Amazon Now and BB Now;
  BigBasket, JioMart, DMart Ready on the slotted/express side. **Uber Eats exited India in 2020** (sold to Zomato) and Uber
  does not deliver groceries here — excluded.
- **Verdict:** zero of them publish an authorised product/price API; their affiliate programmes monetise links, not data;
  and prices are pincode-specific, so a national grocery price would be a fiction.
- **Solution:** (1) honest **deep-link comparison**, live immediately; (2) **Mosaic Community Price** — pincode-tagged user
  reports in their own trust tier with 90-minute ranking decay (the only legal source of real Indian grocery prices at launch);
  (3) seven dormant platform connectors that activate if access ever exists.
- **Engine changes:** new **Conditional** fee line state + declared cart context; grocery matching by GTIN → brand + net
  quantity → flavour, with **unit pricing** (₹/100 g, ₹/kg, ₹/L) so 52 g is never silently compared to 180 g.
- **Cost:** one added phase (**3B**), no architectural change.

## 3. Decisions I have taken as architect

These are decisions, not open questions. Each is reversible and documented.

1. **Brand:** "DEALMOSAIC" and the tagline are retained as working brand. A `brand` config module holds name/tagline/logo so it can be renamed without a find-and-replace. Domain and trademark checks are an owner task (see `08-zero-cost-ledger.md`) — I will not present it as a cleared commercial name.
2. **Colour constraint applied:** your instruction "colour never black or close to black" overrides the brief's Deep Ink `#24243B`. Replaced with **Mosaic Plum `#452B5E`** (11.4:1 on Warm White) — chroma-rich violet, never neutral black. No element in the product uses `#000`, near-black, or untinted grey shadows.
3. **Dual-tone palette:** 6 of the 8 brief accents fail WCAG AA as text (Lime is 1.26:1). Every hue therefore ships in two tokens — **Spark** (vivid, decorative fills/gradients only) and **Deep** (text-safe ≥4.5:1). Colour is used lavishly on backgrounds, gradients, borders, badges and motion; *prices, product names and comparison figures are always rendered in AA-compliant ink*. This is how we get "extraordinarily colourful" without an unreadable product.
4. **Architecture:** a **modular monolith** — one TypeScript repo, one API, one database, with hard internal boundaries (connectors, matching, ranking, money) that can be extracted into services later. Microservices at this stage would be professional malpractice on a zero budget.
5. **Stack:** React + TypeScript + Vite + Tailwind (frontend), **Hono** on Node (API — same code runs on Cloudflare Workers later), SQLite via `better-sqlite3` locally with a **repository interface** so Supabase Postgres can be swapped in by driver, not rewrite. Charts are hand-built SVG (zero dependency, full animation control, tiny bundle). Auth is self-hosted (scrypt + httpOnly session cookies) because Supabase Auth cannot be provisioned by me in this workspace, and a login screen I cannot test is worthless.
6. **Data honesty is enforced in the type system**, not by discipline: every offer carries `dataOrigin: 'live' | 'feed' | 'demo'` and `verificationState: 'complete' | 'partial' | 'unverified'`. The UI cannot render demo data without the watermark component, and the ranker refuses to label an incomplete total as a "verified winner".
7. **Ranking is deterministic and commission-blind.** Affiliate commission is not an input to the sort function. Ever. It is asserted by a unit test.
8. **Demo catalogue:** ~40 developed-world products across the 11 categories, each with genuine variant splits (256/512GB/1TB), seeded per-country retailer fixtures, and an *observation timeline that starts today* — so price history is real-looking but honestly empty at first (`"No observations yet — recording begins with our first check"`). No invented 12-month history.

---

## 4. Phased delivery plan (condensed)

| Phase | Content | Done when |
|---|---|---|
| **0. Strategy** ← *you are here* | Research, feasibility, architecture, design system, data model, roadmap, test plan, cost ledger | This pack approved |
| **1. Foundation** | Monorepo, design system + logo, landing page, auth (register/verify/login/reset), dashboard shell, country + currency engine | A user can register, verify, log in, pick a country, and see a dashboard |
| **2. Comparison core** | Search, product identity/variant selection, matching engine, ranking, 3-offer comparison, Price Truth, Podium, Confidence, Deal Passport | Two real offers rank correctly with an explainable breakdown; 1- and 2-offer fallbacks work |
| **3. Connectors** | eBay Browse API adapter (live), Amazon Creators + Flipkart adapters (dormant, documented), demo connector, health checks, caching, failure UX | Contract tests pass; live mode flips on by env var; outages degrade honestly |
| **4. Personal + gamification** | Watchlist, price alerts, price history snapshots, XP/badges, notifications, support/report flows | Alerts trigger on a real price drop; XP is awarded and never for clicks |
| **5. International** | Universal mode, FX cache, retailer-country display, destination/landed-cost gaps labelled | Universal returns cross-market offers with original + converted prices and honest incompleteness |
| **6. QA & ship** | 28 mandated tests, security pass, a11y, performance, deploy runbook, final feature-status report | A test report that says what actually works, and a deployment a stranger can follow |

Each phase ends with: tests green → honest status update → your review. No phase claims functionality it has not demonstrated.

---

## 5. What I need from you (the only blockers)

Nothing blocks Phase 1–2 — I start immediately on approval. These unblock live data:

1. **eBay developer account** (free, ~5 min): Client ID + Client Secret → the single fastest route to genuine live offers.
2. **Amazon Associates India signup** → then, after 10 qualifying sales/30 days, Creators API credentials.
3. **Flipkart affiliate** → registration is paused; apply via Cuelinks/AdmitAd instead (network account is free).
4. **Domain + trademark check** if you intend to keep the name commercially.
5. **Free email sender** (Brevo/Resend free tier) for real verification emails in production — until then, verification links are shown in-app in dev mode.

---

## 6. The standard I am holding myself to

- No dead buttons, no inert controls, no broken navigation, no fake data dressed as real.
- Every screen responsive from 360 px to 1920 px, keyboard navigable, reduced-motion aware.
- Every price figure goes through one money module — no floating-point currency arithmetic anywhere in the codebase (integer minor units only).
- Every admin action is authorised server-side and written to an audit log.
- Anything I could not build, I list explicitly in the final delivery report rather than hiding.

**Next action on your word:** Phase 1 — brand identity, design system, landing page, authentication, dashboard shell, country/currency engine.
