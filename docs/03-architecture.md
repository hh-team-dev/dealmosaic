# Part 13/14 — Technical Architecture

## 1. Principles

1. **Modular monolith.** One deployable API, one database, hard module boundaries. Extractable later; not prematurely distributed.
2. **The engine is pure.** Matching, money and ranking are dependency-free TypeScript modules with no I/O — therefore fully unit-testable and reusable on client *and* server.
3. **Ports and adapters.** Retailers, FX, email and storage sit behind interfaces. Demo → live is a config change, not a rewrite.
4. **Honest types.** Data provenance and verification state are part of the type system, so the UI *cannot* present demo data as live.
5. **Zero-cost portability.** Local SQLite now, Postgres later, Workers later — same route handlers, same repository contracts.

## 2. Repository layout

```
dealmosaic/
├── apps/
│   ├── api/                 Hono + Node 20 (runs on Workers unchanged)
│   │   ├── src/routes/      auth, search, compare, watchlist, alerts, rewards,
│   │   │                    admin, reports, support, fx, health
│   │   ├── src/middleware/  session, csrf, rateLimit, requireUser, requireAdmin
│   │   ├── src/db/          migrations/, sqlite.ts, repositories/
│   │   ├── src/connectors/  ebay, amazon-creators, flipkart, demo, registry
│   │   ├── src/services/    search, match, rank, money, fx, alerts, rewards, audit
│   │   └── src/security/    password, tokens, headers
│   └── web/                 React 19 + TS + Vite + Tailwind
│       ├── src/routes/      public, auth, app, admin
│       ├── src/components/  ui/, comparison/, motion/, charts/
│       ├── src/design/      tokens.ts, motion.ts, theme.css
│       └── src/lib/         api client, formatters, guards
├── packages/
│   └── core/                money.ts, matching.ts, ranking.ts, confidence.ts,
│                            types.ts, countries.ts  ← zero dependencies, tested
├── data/                    demo catalogue fixtures (clearly labelled)
└── docs/
```

## 3. Stack decisions and why

| Concern | Choice | Rationale |
|---|---|---|
| API framework | **Hono** | Tiny, typed, runs on Node *and* Cloudflare Workers → the free production target needs no rewrite |
| DB (local/dev/preview) | **SQLite** via `better-sqlite3` | Verified building in this environment; zero cost, zero provisioning, real SQL + FKs + indexes |
| DB (production) | **Supabase Postgres** | Free tier, RLS; reached through the same repository interfaces (`SqliteDriver` / `PostgresDriver`) |
| Auth | **Self-hosted**: scrypt (N=2^15) + httpOnly `SameSite=Lax` session cookies + server-side session table | I cannot provision Supabase Auth in this workspace; untested auth is worthless. Designed for later migration behind `AuthPort`. |
| Charts | **Hand-built SVG** | Zero bundle cost, complete control of the animated transition language, no chart-library theming fight |
| Animation | CSS + **Motion** (Framer Motion successor, MIT) | Declarative, tree-shaken, honours `prefers-reduced-motion` globally |
| Styling | **Tailwind v4** + CSS custom-property design tokens | Tokens centralise the palette rules (Spark vs Deep) so no screen can drift |
| Validation | **Zod** | One schema shared by client forms and server handlers |
| Tests | **Vitest** (+ Playwright for E2E if browsers install) | Fast, zero cost, TS-native |
| Money | **Integer minor units** (`bigint`-safe numbers) + explicit currency | No float arithmetic on currency, ever |

## 4. Security architecture (Part 15)

- **Passwords:** scrypt, per-user salt, constant-time compare; no plaintext, no reversible storage.
- **Sessions:** opaque 256-bit token, stored hashed; httpOnly + Secure + SameSite=Lax; rotating on login; idempotent server-side revocation on logout; absolute + idle expiry.
- **CSRF:** double-submit token for all state-changing requests.
- **Rate limiting:** per-IP and per-user sliding windows on auth (strict), search (generous), reports (tight); 429 with `Retry-After`.
- **Authorisation:** every admin route calls `requireAdmin` server-side, verified against `admin_roles` — the frontend hiding a button is never the control.
- **SQL injection:** parameterised statements only; no string-concatenated SQL.
- **XSS:** React escaping by default; no `dangerouslySetInnerHTML` anywhere; strict CSP header.
- **Data isolation:** every user-scoped query filtered by `user_id` from the session (never from the request body); proven by a cross-user isolation test.
- **Secrets:** server-only env; connector registry refuses to start a live connector without credentials and logs the reason.
- **Audit:** every admin mutation and every auth event written to `admin_audit_logs` / `notification_events`.
- **PII minimisation:** no DOB by default (age confirmation instead), phone optional and labelled, export + hard-delete flows implemented.

## 5. Request flows

**Search (authenticated only):**
```
POST /api/search {query, country, currency, destination?}
  → validate (Zod) → auth gate → rate limit
  → cache lookup
  → connectors.parallel(search) [enabled+healthy only]
  → normalise → group by product identity (matching engine)
  → variant disambiguation (if ambiguous → 200 {needsSelection, candidates})
  → build offers → money.calculateTotal() per offer
  → ranking.rank() → top 3 (or fewer, never padded)
  → confidence.score() per offer
  → persist search history + price snapshots
  → 200 { query, product, offers[], rankingExplanations[], coverage }
```

**Outbound purchase:** `GET /api/out/:offerId` → validates offer → resolves affiliate URL (or plain retailer URL, labelled "no affiliate") → logs click with the offer's `dataOrigin` → 302. Never obscured, never an interstitial that hides the destination, never counted as a user reward.

**Price snapshot:** on every live or demo observation, append to `offer_price_snapshots` with `observed_at`. History charts render only what was actually observed, with the real observation window printed beneath.

## 6. Performance budget

| Metric | Target |
|---|---|
| Landing LCP (4G, mid-tier Android) | < 2.0 s |
| JS shipped, landing route | < 180 KB gzip |
| JS shipped, comparison route | < 240 KB gzip |
| Search API p95 (cached) | < 150 ms |
| Search API p95 (cold, 2 connectors) | < 2.5 s |
| Animation frame cost | transform/opacity only; no layout-thrashing properties |
| Images | lazy-loaded, `srcset`, aspect-ratio reserved (no CLS) |

## 7. Environments

| Env | Web | API | DB | Connectors |
|---|---|---|---|---|
| Local/preview (this workspace) | Vite dev | Hono on Node | SQLite file | demo (+eBay if keys present) |
| Production (zero cost) | Cloudflare Pages | Cloudflare Workers | Supabase Postgres | configured |
| Staging | Preview branch | Workers preview | Supabase branch DB | demo only |

Feature flags live in server config (`DEMO_MODE`, connector enable flags, reward policy), never in frontend code.
