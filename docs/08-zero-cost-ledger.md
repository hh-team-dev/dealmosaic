# Part 17/21 — Zero-Cost Ledger & Feature Status Contract

## 1. Launch cost: ₹0 / $0 — itemised

| Component | Choice | Free tier / licence | Limit we must respect | Cost today |
|---|---|---|---|---|
| Frontend hosting | Cloudflare Pages | Free | 500 builds/mo, unlimited requests, 100 GB/mo bandwidth | ₹0 |
| API runtime | Cloudflare Workers (Hono) | Free | 100,000 requests/day, 10 ms CPU/req | ₹0 |
| Database | Supabase Postgres | Free | 500 MB DB, 5 GB egress, pauses after 7 days inactivity | ₹0 |
| Auth | Self-hosted (scrypt + sessions) | Our code | none | ₹0 |
| FX rates | Frankfurter v2 | Free, keyless, open source (MIT) | fair use, daily rates | ₹0 |
| Product data | eBay Browse API | Free dev tier | 5,000 calls/day | ₹0 |
| Product data (fallback) | Demo connector | Our fixtures | clearly watermarked | ₹0 |
| Charts | Hand-built SVG | Our code | — | ₹0 |
| UI/design | Tailwind v4 + own components | MIT | — | ₹0 |
| Fonts | Outfit, Plus Jakarta Sans, JetBrains Mono | SIL OFL | self-hosted | ₹0 |
| Animation | CSS + Motion | MIT | — | ₹0 |
| Email (production) | Brevo / Resend free tier | Free | ~300/day | ₹0 |
| Tests | Vitest (+Playwright) | MIT / Apache-2 | — | ₹0 |
| Version control / CI | GitHub free | Free | 2,000 Actions min/mo | ₹0 |
| Monitoring | Cloudflare + admin health page | Free | — | ₹0 |

**Development environment note:** this workspace runs the whole stack locally at zero cost (Node + SQLite + Vite). Nothing here requires a paid service to demonstrate.

## 2. Future costs — only when you choose to grow

| Item | When it becomes necessary | Indicative cost | Trigger |
|---|---|---|---|
| Custom domain | Branded launch | ~₹800–1,200/yr | Owner decision |
| Supabase Pro | >500 MB DB or no-pause requirement | ~$25/mo | Traffic/data growth |
| Workers Paid | >100k req/day | ~$5/mo | ~3M req/mo |
| Email provider paid tier | >300 emails/day | ~$10–20/mo | User growth |
| eBay API limit raise | >5,000 calls/day | $0 (compatibility check) | Apply before scaling |
| Amazon Creators API | After 10 sales/30 days | $0 | Eligibility met |
| Legal review (privacy/terms) | Commercial launch | varies | Owner decision |
| Trademark filing | Commercial launch | varies | Owner decision |

**Billing guardrails:** no service is configured with a payment method by me; nothing auto-upgrades; the README lists exactly which dashboards to watch for quota.

## 3. Feature status contract

This table is the single source of truth and will be updated at the end of every phase. It is the honest answer to "does it actually work?".

### Will be LIVE at MVP completion (built and tested in this project)
Landing page · registration, login, logout, verification (dev outbox), password reset · sessions, rate limiting, CSRF · country selector (10 + UNIVERSAL) · display currency + live FX (Frankfurter, real) · dashboard + profile/settings · account export & deletion · search gate · search pipeline with variant disambiguation · matching engine · money/Price Truth engine · ranking + explanations · Deal Confidence · comparison screen (3/2/1 offers) · podium · price history capture & chart · Deal Passport · Trust Radar · watchlist · price alerts (in-app) · notification centre · Mosaic XP + badges · reward policy admin (monetary rewards OFF) · support centre + correction reports · full admin area with audit log · privacy/terms/disclosure pages · security & accessibility hardening · test suite.

### DEMO DATA at launch (functional UI, clearly labelled data — not live prices)
All retailer prices and offers for **India**, and for any market without an authorised connector. Watermark + per-offer badge + `data-origin="demo"`. Never presented as live, never counted as a verified winner without the demo label attached.

### LIVE once you supply credentials (code ready, env-gated)
eBay offers in US/GB/DE/FR/AU/CA/IT/ES/NL/IE + UNIVERSAL. Requires: eBay developer Client ID + Secret (free).

### GROCERY & QUICK COMMERCE at launch
| Item | Status |
|---|---|
| Compare chips/staples/dairy across Blinkit, Zepto, Instamart, BigBasket, JioMart, Flipkart Minutes, Amazon Now, DMart Ready | ✅ LIVE (platform registry + unit pricing + matching) |
| Platform price data | ⚠️ **COMMUNITY-REPORTED only** — pincode-tagged, 90-min decay, distinct trust tier, never shown as verified |
| One-tap deep link to the platform's own search | ✅ LIVE, labelled "price confirmed on the platform, not here" |
| Fee-aware totals with cart context + Conditional lines | ✅ LIVE (unconditional fees only; conditional fees shown, not summed) |
| Verified platform prices | ❌ Pending authorised access / ONDC participation |
| Quick-commerce affiliate revenue | 🟡 Only where a programme approves you (Instamart, BigBasket, JioMart via network). Blinkit reported paused; Zepto none found. |

### PENDING THIRD-PARTY APPROVAL (interface built, disabled)
Amazon (any marketplace) via Creators API · Flipkart · Myntra/Nykaa/Tata CLiQ via affiliate networks · Walmart/Target/Best Buy.

### NOT IMPLEMENTED / NOT POSSIBLE AS SPECIFIED (stated now, not hidden later)
| Item | Status | Reason |
|---|---|---|
| Real-time customs/duty calculation | Not implemented | No free authoritative source; we label totals incomplete instead of inventing |
| Purchase cashback payouts | Structure only, disabled | Requires written merchant permission + confirmed attribution; Amazon forbids it |
| Email sending in production | Dev outbox until you add a free-tier provider | No paid dependency allowed |
| Live retailer data for India | Blocked | Amazon 10-sales gate; Flipkart registration paused; no authorised free source exists |
| Retailer login/purchase automation | Refused | Prohibited by brief and by merchant terms |
| Search while logged out | Intentionally gated | Part 8 requirement |
| Any price for a market with no connector | Honest "connection unavailable" | Parts 17, 21 |

## 4. Quota watchlist (documented in the deployment runbook)
Cloudflare Workers requests/day · Pages builds/mo · Supabase DB size + egress + inactivity pause · eBay calls/day · Frankfurter fair use · email sends/day · GitHub Actions minutes.
