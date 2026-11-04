# DealMosaic 2.1.1 — persistent install invitation and floating deals

**Date:** 4 November 2026. **Scope:** the same enhancement in website, PWA and current-feature classic builds. This is the current enhancement handover; `35-pwa-handover.md` preserves the earlier 2.0.1 architecture and recovery history.

## 1. What the owner asked for

Make installation unmistakably available on every screen with an attractive breathing animation. Keep the deals ticker visible at the top even after scrolling to the bottom. Expand both ideas into a useful, polished implementation without losing existing functionality or creating misleading claims.

## 2. Delivered design

A single **Install and deals bar** owns both features globally. It is mounted outside the route switch and outside offline-disabled financial forms. There are no independent per-page tickers or install prompts to drift out of sync.

- **Phones:** a compact install row above a 44px offers row, normally 96px total plus the device safe area.
- **Wide screens:** the two features sit beside each other in a single 52px band.
- **Scrolling:** the bar is fixed to the viewport, not sticky inside a short page section. Both controls remain at the top during long-page scrolling.
- **Layout reservation:** a ResizeObserver measures the actual bar height into `--engagement-height`. The page reserves that space; deal filters, toast messages and anchor scrolling use the same offset.
- **Ordinary branding header:** scrolls away instead of creating a third permanent row on a small phone. Existing branding, site navigation and footer remain.
- **Color rationale:** the established burnt-orange action color makes installation recognizable; a pale warm/lime panel separates the invitation from the darker Roast offers strip. No new black, blue-family colors or replacement branding.

## 3. Installation: useful presence, not a disruptive prompt

The persistent **Install app** button uses the browser's native install prompt only when one is available and the person explicitly clicks. If not available, it opens an accessible in-place guide with Android or iPhone/iPad instructions. It does **not** take someone away from an unfinished checkout, account or owner form just to explain installation.

The guide closes with Escape or its close/continue controls and restores focus. A full guide/settings link is available for people who want more detail. Sensitive forms with entered fields receive a leave-page confirmation before this link or a ticker link navigates away. This guard is deliberately conservative; it may remind someone after they have already saved, rather than risk discarding edits silently.

Installed standalone mode shows **App tools**, not another install demand. Browsers do not always reveal that a separately installed app exists when someone is browsing in an ordinary tab; the guide explains how to use the existing icon in that situation.

The icon normally remains until the user or device removes it. Neither DealMosaic nor any website can guarantee a permanent icon or permanent browser storage. There is no forced installation, app-store listing claim, automatic push subscription or download-completed claim based merely on a click.

## 4. Motion system and accessibility

- A decorative ring around the orange install button breathes on a gentle four-second cycle. The hit target itself does not move or change size.
- The offers track moves at approximately **32 CSS pixels/second**, calculated from its measured width rather than making long lists race through a short fixed-duration loop.
- The permanent pause/resume control affects both breathing and ticker motion. Its preference is stored locally, survives route changes/reloads and follows storage events in other tabs. If storage is blocked, the current window still pauses and explains that the preference could not be saved.
- OS **reduced-motion** preference always wins. Resuming does not override it.
- Motion also quiets while typing, a dialog is open, a native install action is busy or the document is hidden. The offers remain available; animation is not needed to use the controls.
- Hover pauses movement. Keyboard focus turns the ticker into a stationary, horizontally scrollable row with visible focus. Decorative duplicate tracks are hidden from screen readers and removed from keyboard tab order.
- All main controls have at least 44px touch height. No flashing, audio or repeatedly opening browser prompts.
- Dialogs remain above the bar. Toasts appear below it. The top bar does not cover the consent/checkout controls.

## 5. Offers: accurate, connected and resilient

The bar fetches the existing coupons API once for its global lifetime, not once per route. It refreshes after five minutes and when the document becomes visible. Hidden tabs do not keep requesting offers. Aborted or superseded requests cannot replace the latest response.

- One genuine offer is enough; the old three-offer minimum no longer hides the feature.
- Duplicates, rejected/expired entries, future starts and malformed dates are excluded. Expiry timers remove an offer without requiring page navigation.
- Every click carries the actual store and advertised title into `/deals?platform=…&q=…`, instead of dumping the person into an unrelated unfiltered list. The deals search reads that URL and remains editable/shareable.
- **“Up to” stays “up to.” Cashback stays cashback**, never a reduction in the checkout price. A code-only offer does not acquire an invented zero-percent discount badge.
- “Deals” means listed offer discovery, not a promise of checkout verification. Existing confidence/terms information remains on the deals page; the ticker does not manufacture a verified status.
- During loading, an empty feed, API failure or offline use, the bar stays present with an honest status. Failures provide **Retry offers**. Offline mode removes the live offer links instead of replaying stale discounts.
- No new backend, paid service, tracker, notification campaign, order queue or payment action is introduced.

## 6. Implementation map

| File | Responsibility |
|---|---|
| `apps/web/src/components/EngagementBar.tsx` | Global installation/help controls, motion preferences, form-safety navigation guard and measured fixed layout |
| `apps/web/src/components/DealsTicker.tsx` | Single live-data lifecycle, expiry/refresh, readable motion, pause/focus behavior and honest empty/error/offline states |
| `apps/web/src/lib/ticker.ts` | Pure eligibility, labeling and safe offer-context URL helpers |
| `apps/web/src/components/PwaExperience.tsx` | Mounts the shared bar before every route and offline fallback |
| `apps/web/src/routes/Deals.tsx` | Search query follows the URL so ticker context is preserved |
| `apps/web/src/design/theme.css` | Shared offsets, responsive fixed bar, breathing ring, readable ticker, safe focus and small-screen wrapping |
| `apps/web/tests/ticker.test.ts` | Unit regressions for offer eligibility, labels and URL encoding |
| `tests/engagement/bar.spec.mjs` | Cross-engine top/bottom visibility, forms, motion, accessibility, expiry, failure and install tests |

All previous per-route `<DealsTicker />` mounts were removed. The bar remains in the same shared application for both PWA and classic builds. Existing source-flavor and commerce-parity guards remain mandatory.

The initial 2.1.0 live sweep exposed the legacy standalone 404 document: it did not hydrate React and therefore had no global controls. Version 2.1.1 generates a dedicated noindex 404 document with the same application bundle, while the edge still returns HTTP 404. The raw fallback palette was corrected too, and the static 404 file is now included in the design audit. The local production-test server now returns a real 404 on unknown routes instead of masking this difference with a generic 200 shell.

An additional 320px route sweep exposed an existing unbroken connector-description string on Data sources. It is fixed with actual text wrapping on the connector card, not by hiding overflow. Ticker borders were also adjusted so its 44px controls are not clipped by half a pixel at the top/bottom.

## 7. Verification and recovery

Before release, run:

```sh
npm ci
npm run check
npm run package:pwa
# Start the documented isolated API and production-built local test server (see docs 35).
npm run test:engagement
npm run test:pwa
npm run audit:interactions -- --grep-invert 'shared busy button'
```

The complete existing interaction suite includes a Vite-only component-injection case; run it on the Vite development server as documented in the preceding handover. No production mutation, bank transfer, booking or notification is used for these checks.

**Recovery:** keep the previous verified `pwa-v2.0.1` source and its source bundle. Generate and retain both `dealmosaic-2.1.1-pwa.tar.gz` and `dealmosaic-2.1.1-classic.tar.gz`. The classic archive keeps these new persistent controls and all business functionality, but removes the offline worker safely. Do not substitute an old website folder without the same-URL removal worker.

Browser-engine tests and responsive viewports do not prove behavior on every physical phone or operating-system install sheet. Browser chrome, an external retailer/payment app, native install menus, and the minimal recovery document when all offline files have been evicted are outside the fully loaded React application. No native UI can be covered by a website's floating bar.

## 8. Final release record

### Published release

- **Live:** https://dealmosaic.pages.dev — installation/settings: https://dealmosaic.pages.dev/install
- **Version:** 2.1.1; source `d608712436c056f6b9880a394c8319ea32f86997`; published tag `pwa-v2.1.1`.
- **Cloudflare Pages:** `1a0b443a` — https://1a0b443a.dealmosaic.pages.dev
- **PWA build:** `2.1.1-8a98a8e75129`; raw static precache **723,386 bytes**, 12 cached static entries, **0 API entries** observed in both engines.
- **Matched classic build:** `2.1.1-30cc987c5fce`. Both packages record the same clean source revision (`workingTreeChanged: false`).
- **Backend unchanged:** the previously verified Render release `dep-dblhapnf3r2c73a5csa0` / source `00711ad` was not redeployed. No database, banking or merchant setting was changed.
- The initial 2.1.0 deployment `17ac533c` was superseded after the 404 integration gap was discovered. Use 2.1.1, not that intermediate package, for recovery of this enhancement.

### Exact verification results

| Verification | Result |
|---|---|
| Unit/API/security tests and typechecks | **417 tests in 31 files passed**, typechecks passed |
| Color/contrast rules | **43 assertions passed**; includes the raw 404 fallback |
| Dependency and secret checks | **0 dependency vulnerabilities**, no detected source secrets |
| New persistent-bar suite | **39/39 passed**, Chromium 320px/1365px and WebKit 390px |
| Existing PWA regressions | **48/48 passed**, including offline safety and classic removal |
| Production-built business interactions | **46/46 passed**, isolated fixtures |
| Full Vite website interactions | **48/48 passed**, including Vite-only injection coverage |
| Matched package parity | **55 verified HTML files per flavor**, common commerce behavior and removal worker |
| Live fixed-bar checks | **36/36 route/viewport states**, each at top and bottom; real 404 retained |
| Live PWA checks | **6/6 online/offline states**, no accessibility findings/JS errors; Chromium installability errors empty |
| Live public rendering/accessibility | **66 states, 0 findings**, including every sitemap route |

Browser-suite totals repeat scenarios across engines and viewports; they are not counts of unique pages or physical devices. The 46- and 48-case interaction suites overlap. Production checks are read-only. No real order, payment, shipment, email or push was created. Actual OS installation remains a device-level check, not something inferred from a synthetic install event.

Visual review at live 390px and 1365px confirmed the bar stays visible at the page bottom. Both review screenshots were deleted immediately, as requested.

Machine-readable evidence:

- `docs/audits/2026-11-04-engagement-browser.json`
- `docs/audits/2026-11-04-engagement-production.json`
- `docs/audits/2026-11-04-engagement-pwa-production.json`
- `docs/audits/2026-11-04-engagement-public-pages.json`

### Matched deployment archives

Folder: `/home/user/releases/dealmosaic-2.1.1/`. Keep its `release.json`, `SHA256SUMS` and `README.txt` with the pair.

- `dealmosaic-2.1.1-pwa.tar.gz` — **631,090 bytes**; SHA-256 `7365a10607b60f6b5211850e8e04205141f85b6fb810df2ce8c5fb04d369ae88`.
- `dealmosaic-2.1.1-classic.tar.gz` — **629,447 bytes**; SHA-256 `8efa8717189552b0c350ad40cebeeb1c002637ab2c5f91f3949011a5551e760e`.

The immutable pre-PWA website baseline and verified 2.0.1 recovery point remain retained. The current complete source recovery bundle is `backups/pwa-v2.1.1.bundle`; see document 28 for the verified source archive. The full **17-file PDF set** was regenerated and its contents-page links checked. Keep the distinctly named `36-persistent-install-and-deals.pdf` with the earlier architecture handover. Review screenshots are deleted; generated dependencies, local fixtures and preview processes are removed after verification.

### Still outside this release

This completes the requested persistent invitation and floating ticker; it does not turn browser-controlled installation into a permanent guarantee or create an app-store listing. Genuine offer availability still depends on the existing feed, connection and retailer terms; a listed code is not a checkout-tested saving.

The public direct shop remains empty/paused. The seller's real origin PIN, product/media/pricing facts and private bank/UPI setup are still owner inputs. Carrier booking, automatic bank reconciliation, order emails, combined cart, direct-SKU search/saves/digest/push, partial-refund automation, profit ledger and full grievance workflow remain absent as documented in the existing shop handover. No financial or notification functionality is implied by the new bar.

