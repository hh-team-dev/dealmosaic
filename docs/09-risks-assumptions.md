# Risk Register & Documented Assumptions

## 1. Assumptions I am proceeding on (correct me if wrong)

| # | Assumption | Impact if wrong |
|---|---|---|
| A1 | "Zero cost" means no paid infrastructure/API/template at launch; a custom domain may be purchased later by the owner | Minor — everything else stays free |
| A2 | "Colour never black or close to black" applies to all UI, including text, shadows and overlays | High — would require re-tokening; tokens are centralised so it is one file |
| A3 | The site must be demonstrably running, not just source code delivered | High — I am building a runnable app in this workspace with a live preview |
| A4 | Authenticated-only search (Part 8) is intentional even though it hurts SEO/discovery | Medium — easy to flip via a server flag |
| A5 | India is the primary launch market (owner location), but branding is global | Medium — demo catalogue is weighted to India + US |
| A6 | Demo fixtures are acceptable **only** when labelled; the owner prefers an honest empty state over fake data | Low — consistent with Parts 17/21 |
| A7 | Supabase/Cloudflare accounts will be created by the owner when deploying; I deliver config + runbook, not cloud provisioning | Medium — production deploy cannot be executed by me |
| A8 | "Three offers" is a hard product cap, not a target to pad | Low — explicit in brief |

## 2. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **No live India data at launch** (Amazon gate, Flipkart closed) | Certain | High | Demo connector watermarked; eBay for 10 other markets; connectors ready; clear owner checklist to unblock |
| R2 | eBay API terms constrain how offers are displayed/cached | Medium | Medium | Cache TTLs, attribution, no price inflation, compliance notes in connector code; per-market capability flags |
| R3 | Amazon Creators API caching rule (refresh within ~1h or disclaim) | Medium | Medium | Connector enforces TTL + disclaimer text; disabled until approved |
| R4 | Affiliate approval delays stall monetisation | High | Medium | Zero-cost baseline; platform valuable without revenue; links still work unmonetised and are labelled as such |
| R5 | Product matching errors create false comparisons | Medium | **High** | Identifier-first ladder, confidence values, user disambiguation screen, admin match-review queue, never silent merges |
| R6 | FX reference rates misread as payable amounts | Medium | High | Rate date shown, "reference rate, not amount payable" notice, converted ≠ total |
| R7 | Free-tier limits (Supabase 500 MB / pause, Workers 100k/day) | Medium | Medium | Aggressive caching, snapshot pruning policy, quota watchlist, no auto-billing configured |
| R8 | Colour-heavy design harms readability/accessibility | Medium | High | Dual-tone tokens, AA-verified table, automated contrast test, colour never sole signal |
| R9 | Animation hurts low-end Android performance | Medium | Medium | transform/opacity only, short durations, reduced-motion, minimal dependencies, bundle budgets |
| R10 | Scope is very large; burnout of consistency across phases | High | Medium | Design tokens + component library + written Definition of Done; phase gates |
| R11 | Legal exposure (DPDP Act, GDPR-ish expectations, affiliate disclosure) | Medium | High | Data minimisation, export/delete, consent controls, disclosures near links, no third-party trackers, documented legal review recommendation |
| R12 | Secret leakage into client bundle | Low | High | Server-only env, build-time secret scan, CSP, no keys in `apps/web` |
| R13 | Demo data leaks into a live-looking screen | Low | **Critical** | Type-level provenance + watermark component + tests asserting watermark on every demo render + DOM attribute |
| R14 | Owner expectation mismatch on what "complete" means | Medium | High | Feature-status contract in `08-zero-cost-ledger.md` §3, updated every phase |

## 3. Decisions deliberately deferred

- **Postgres migration execution** — the repository layer is written against a driver interface; the actual Supabase deploy is Phase 6 (needs your account).
- **Supabase Auth migration** — self-hosted sessions now; `AuthPort` keeps the seam open.
- **Email delivery** — dev outbox now; free-tier provider config documented.
- **Sponsored placements** — out of scope until trust is established (Part 16 permits later).
- **Browser extension / barcode scanning** — post-launch; architecture does not preclude it.
- **Native apps** — PWA-ready responsive web first.
