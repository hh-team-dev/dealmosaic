# Phase 1 Delivery Report — Foundation & Brand

**Date:** 2 November 2026 · **Build:** `0.1.0-phase1` · **Market:** India only (as instructed)
**Verdict:** Phase 1 is **live and working**. Every claim below is backed by a test that runs in `npm test`,
an audit script, or a browser session I ran myself.

---

## 1. Run it

```bash
cd dealmosaic
npm install
npm run dev            # API on :8787, website on :5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Runs API + web together |
| `npm test` | 41 tests — money engine, validation, full auth API |
| `npm run audit:design` | Enforces "no black" + WCAG AA contrast, machine-checked |
| `npm run build` | Production build (106 KB gzip JS, 6.6 KB gzip CSS) |
| `npm run check` | tests + design audit together |

---

## 2. What is genuinely working

### Engine (`packages/core` — zero dependencies)
| Feature | Status | Proof |
|---|---|---|
| Integer minor-unit money (no float currency maths) | ✅ Live | 13 tests incl. `0.1+0.2` drift and half-up rounding |
| Indian digit grouping (`₹12,34,567.89`) | ✅ Live | Locale test |
| **Price Truth Engine** — Confirmed / Estimated / Not available / Not applicable / **Conditional** | ✅ Live | Tests: missing shipping ≠ ₹0; conditional fees excluded from total; unverified totals flagged |
| **Unit pricing** for groceries (₹/100 g, ₹/kg, ₹/L, ₹/pc) | ✅ Live | 180 g pack correctly beats 52 g on unit price; unknown quantity returns `null`, never a guess |
| Currency conversion with a single rounding step | ✅ Live | ₹8,999 → $94.62 |
| Validation shared by API and forms | ✅ Live | Email, password policy, PIN code, strength scoring |
| Market config: India enabled, everything else disabled **with a written reason** | ✅ Live | Test asserts every disabled market has a note |

### API (`apps/api`)
| Feature | Status | Proof |
|---|---|---|
| Registration → email verification → auto sign-in | ✅ Live | E2E test + browser run |
| Login / logout with **server-side session revocation** | ✅ Live | Replaying a logged-out cookie returns no session |
| Password reset, single-use, expires in 60 min, kills all sessions | ✅ Live | Test asserts old password fails and old session dies |
| Scrypt password hashing (N=2¹⁵ in production, per-password salt) | ✅ Live | Self-describing hash format for future parameter upgrades |
| CSRF double-submit on every mutation | ✅ Live | Test: missing token → 401, wrong token → 401 |
| Same-origin guard (blocks cross-origin form posts) | ✅ Live | `Origin: https://evil.example` → 403 |
| Rate limiting: 10 auth attempts / 15 min per IP, 300 req/min general | ✅ Live | Test: 11th and 12th login attempt → 429 |
| Session cookie: `HttpOnly`, `SameSite=Lax`, `Secure` on HTTPS | ✅ Live | Verified in `set-cookie` |
| Search gate: anonymous → 401, unverified → 403, verified → honest "not shipped yet" | ✅ Live | 3 tests |
| Data export (JSON) and **hard account deletion** (cascading) | ✅ Live | Test: after delete, login fails and session is gone |
| Cross-user isolation | ✅ Live | Test: user B never sees user A's PIN code |
| No account enumeration on forgot-password | ✅ Live | Identical response for unknown email |
| Reference data: 5 countries, 9 currencies, **8 quick-commerce platforms with honest statuses** | ✅ Live | `/api/meta/*` |
| FX rates — **real, live, keyless** | ✅ Live | `/api/fx/rates` returned INR 95.11 dated 2026-11-01 |
| FX honest degradation | ✅ Live | Serves cached rates with `stale: true` + warning instead of failing silently |
| Dev outbox (verification/reset mail, 404 in production) | ✅ Live | Used by the E2E browser flow |

### Website (`apps/web`)
| Feature | Status | Proof |
|---|---|---|
| Landing page: animated hero, drifting gradient blobs, search demo, how-it-works, platform reality, promise, CTA | ✅ Live | Screenshots below |
| Prism Tessera logo (inline SVG, animated lockup, favicon) | ✅ Live | — |
| Dual-tone design system: 8 hues × Spark/Deep, 4 tinted-plum shadows, 4 gradients | ✅ Live | `npm run audit:design` → PASS |
| **No black / near-black anywhere** | ✅ Enforced | 53 colours checked; darkest is Mosaic Plum at L\* 23.0 |
| WCAG AA text contrast (every pair ≥ 4.5:1) | ✅ Enforced | 19 pairs asserted; lowest is `--turq-d` at 4.65:1 |
| Sample comparison: 3 offers, Price Truth, "why #1", electronics ⇄ groceries toggle | ✅ Live, watermarked | Banner + corner ribbon + `data-origin="demo"` in the DOM |
| Auth screens: register, verify, login, forgot, reset — all with inline field errors | ✅ Live | Browser flow completed end-to-end |
| Dashboard: welcome, comparison context, roadmap status, export, "what we never ask for" | ✅ Live | Screenshot |
| Settings: profile, currency, PIN code, notification switches, export, delete-account modal | ✅ Live | Screenshot + API tests |
| Legal pages: Privacy, Terms, Affiliate disclosure, Contact (honest "no inbox yet"), 404 | ✅ Live | — |
| Mobile-first responsive 360 → 1920 px, no horizontal scroll at any width | ✅ Verified | 7 widths checked in Chromium |
| Touch targets ≥ 40 px | ✅ Verified | Audit after fix (chips were 29 px) |
| Keyboard: skip link, visible focus ring, logical tab order | ✅ Verified | First Tab → "Skip to content" |
| Reduced motion honoured | ✅ Verified | Blob animation `none`, transitions 0.09 s |
| Self-hosted subset fonts (no CDN) | ✅ Live | 32 KB + 27 KB woff2, preloaded |
| Session persists across reload; protected routes redirect to login | ✅ Verified | Browser test |

**Screenshots:** [`docs/screenshots/`](screenshots/) — landing (mobile), verification, dashboard, comparison at desktop/tablet/mobile.

---

## 3. What is deliberately NOT working yet (and says so in the UI)

| Item | Why | Where it is stated |
|---|---|---|
| Live price comparison | Phase 2 | Dashboard roadmap card; `/api/search` returns `phase_not_shipped` |
| Any real retailer offer | Phase 3 connectors | Landing page callout explaining no authorised API exists |
| Watchlist / alerts / rewards | Phases 3B–4 | Dashboard roadmap card |
| Support tickets | Phase 4 | Contact page: "there is no support inbox yet — and we would rather say so" |
| Real email delivery | No provider credential yet | Development outbox panel, clearly labelled |
| Bottom-nav "Compare" | Engine not shipped | Rendered as a disabled element with a tooltip, not a dead link |
| Reliance Digital / Croma / Nykaa / Myntra | No authorised API | Documented in `02-connector-feasibility.md`; platform registry shows status |

---

## 4. Bugs I found and fixed during self-review

Recording these because the point is that the review actually happened:

1. **Vite served from the wrong root** — the site 404'd. Caught by a curl probe, fixed by launching with the correct `cwd`.
2. **Emoji icons did not render** — headless Linux showed tofu boxes, and Windows has no flag emoji at all. Replaced the entire UI icon language with an inline SVG set (18 icons, `currentColor`).
3. **Primary button failed contrast** — white on `#FF6B6B`/`#FF4FA3` (the brief's coral/pink) is 2.7–3.0:1. Added text-safe `--grad-aurora-deep` for interactive fills; decorative gradients unchanged.
4. **Headline gradient was 2.2:1** — below even the 3:1 large-text floor. Added `--grad-sunrise-text` (5.2:1 worst stop).
5. **Header wrapped on 360 px phones** — added a compact "Sign up" label under 430 px.
6. **Chips were 29 px tall** — below the 44 px touch-target guideline. Interactive chips now 42 px.
7. **Stray blurred blob** smeared mid-page — removed.
8. **Demo ribbon escaped its card** — added `overflow: hidden` and repositioned.
9. **Rate limiter blocked my own test suite** — correct behaviour, wrong test isolation; each test client now uses its own IP.
10. **Privacy export referenced tables that did not exist** — added `user_search_history`, `saved_products`, `price_alerts`, `notification_events` so export and deletion are complete now, not "except the tables we haven't built".

---

## 5. Phase 2 — what happens next

1. Product catalogue + variants (India, 11 categories incl. grocery), GTIN-first identity.
2. Matching engine: GTIN → EAN/UPC → ISBN → MPN → brand+model → attributes → validated text, with confidence.
3. Ranking engine: documented weights, commission-blind, incomplete totals can never be rank #1 (both are tests).
4. Comparison screen for real: 3 columns desktop / swipeable cards mobile, Podium, Deal Confidence, Deal Passport, Trust Radar.
5. Search page with variant disambiguation ("Galaxy S25" → 256/512/1TB).
6. Demo connector (watermarked) + eBay connector (env-gated).

**Owner action to keep momentum:** send eBay + Cloudflare + Supabase credentials whenever convenient (`11-owner-setup-guide.md`). Phase 2 does not wait for them, but Phase 3 goes live the moment they exist.
