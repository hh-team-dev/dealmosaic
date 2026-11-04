# DealMosaic — site-wide audit, fixes and verification

**4 November 2026.** This is the current audit handover. Read alongside [the direct-shop operating guide](33-direct-shop-release.md). The owner will enter banking/UPI details privately in Shop settings; no credentials are requested here.

## 1. Scope and evidence boundaries

The audit combines live public-page rendering, source review, isolated API/security tests, browser interactions, accessibility checks, palette/contrast checks, dependency auditing and production verification. **A rendered button is not proof that its action works.** The separate interaction suite actually clicks controls and checks resulting state.

The pre-fix live scan covered **66 URL/page states**, including the sitemap and supplementary authentication, admin, search, empty and missing-page states at 390px. It found no JavaScript page exceptions or horizontal page overflow, and two serious automated keyboard-accessibility findings: the horizontally scrollable tables on `/how-we-rank` and `/data-sources` could not receive keyboard focus. This is not a certification of accessibility for every user or device.

Evidence is retained as small JSON summaries under `docs/audits/`. Browser tests retain no screenshots, videos, traces, payment credentials or customer records. Local commerce fixtures use `.test` email addresses and a separate `/tmp` database. Mail credentials are blank and the daily job is disabled. No production product, order, payment, shipment, coupon moderation or notification is created by the interaction suite.

## 2. Flaw → implemented action → regression evidence

| Finding | Implemented correction | Verification |
|---|---|---|
| Signed-out admin page could be a blank control centre | Explicit loading, sign-in and non-admin access states; no privileged children mounted for anonymous/non-admin visitors | Browser anonymous and ordinary-user tests; API authorization suite |
| Unknown `?tab=` could render no section | Validated tab, defaulting to Overview | Browser invalid-tab test |
| Signing in lost the requested owner section | Return link retains `/admin?tab=shop` | Browser link assertion |
| Owner data-load failures could leave skeletons without a recovery action | Visible error and retry that remounts the affected loader; stale aborted loads cannot replace current errors | Browser injected API failure/retry |
| Price reports endpoint queried nonexistent `community_prices.observed_at` | Query reads `reported_at`, preserving the existing response-field contract | Real local database/API regression plus all seven owner tabs |
| Community moderation accepted coupon-only states and Confirm used an unsupported state | Separate schema-constrained validation; Confirm records moderator verification | Invalid state returns 400; API and browser report moderation |
| Owner price reports divided paise twice, showing one hundredth of the real amount | Pass integer paise directly to the shared currency formatter | Browser assertion: 123450 paise displays ₹1,234.50 |
| Admin Live/With a code filters could include rejected/expired offers | Match live validity and trust state; expired status is displayed honestly; mutations reload the selected filter and lock controls until settled | API filter tests and browser reject/restore |
| Coupon Restore silently conferred moderator verification | Restore now means `listed`, not “checked by a moderator” | API restoration regression; UI action updated |
| Horizontal owner tabs could move during pointer interaction due to scroll snapping | Remove snapping; keep each tab at its intrinsic width | Seven-tab phone/desktop navigation tests |
| Search “Try again” did not refetch an unchanged query | Explicit retry generation in effect dependencies | Browser fail → retry → success |
| Browse retained stale error state and offered no retry | Reset error on navigation/retry and add a real retry action | Browser catalogue failure/recovery |
| Product network failures were presented as “not found” | Separate 404 from temporary/network failure and offer retry for the latter | Browser product failure/recovery |
| Deals and direct collection failures lacked a recovery button | Added actual refetch controls without changing filters | Browser recovery tests |
| Initial shop-control failure lacked a recovery action | Retry reloads owner shop data with busy/error feedback | Source review; shared client failure handling; other owner views exercised |
| Explicit `disabled={false}` could override a loading button's lock | Apply the final disabled state after spread props | Browser component regression |
| Dialog effect depended on changing callback identity; delayed autofocus could steal typed characters | Stable close callback ref, immediate initial focus, enabled/visible-only keyboard trap, restored overflow/focus | Slow character-by-character input and Escape-focus browser test |
| Field hints/errors were visually present but not connected to controls | Attach description/invalid attributes to the matching control, including passwords | Browser account-field hint assertion; shared component review |
| Information tables were not keyboard-scrollable | Focusable named regions and visible warm-colour focus outline | Keyboard browser checks; final axe re-scan |
| Signed-in owner header and direct product badge/grid overflowed at 320px | Compact accessible dashboard icon on narrow phones; shrinkable grid columns and wrapping disclosure badge | Authenticated/fixture scans at 320/390/1365px |
| Several phone chips, history-range buttons, copy buttons and save hearts were small | Minimum 44×44px for these controls below 640px | CSS review, phone layout checks, palette audit |
| Clipboard failures silently looked like dead copy buttons | Honest long-press/manual-copy feedback on deal, saved and product-coupon controls; shop-link accessible text no longer falsely promises successful copying | Browser denied-clipboard test; code review of other call sites |
| Blocked/full browser storage silently reported successful list mutations | Failure feedback; do not mirror a failed device save/clear to the account | Browser blocked-storage test, normal save/remove flow |
| PIN state did not follow other tabs; old requests could clear newer loading; clearing left a spinner state | Cross-tab listener, draft-field synchronization, cancellation guards, clearing resets loading/data/errors; invalid PIN feedback | Browser cross-tab update and UI clear; source review of cancellation guards |
| An elapsed coupon could still redirect until its trust-state flag changed | Validate actual expiry at click time, including invalid dates | API tests for elapsed/invalid/future expiry; blocked links record no click |
| Redirect destinations were not protocol/credential validated | Reject non-HTTP(S), malformed and credential-bearing URLs | Six unsafe-destination regressions |
| Brevo/Resend send failures were not persisted in the outbox | Record failures for every configured transport; keep unconfigured distinct from failed | Mocked SMTP/Brevo/Resend outbox tests; no email sent |
| Login return paths were unchecked and copy wrongly said comparison required sign-in | Local-path validation and accurate public-browsing wording | Ten return-path cases and successful browser sign-in |
| Account deletion/export wording promised deletion of separately retained order/device records; phone copy promised unsupported recovery | Scope wording to account data and explain separate order/device records; email-based recovery stated | Source/copy review; settings browser checks |
| Stalled API calls could keep forms busy indefinitely; HTML responses could be treated as successful JSON | 45-second bounded request/body read, caller cancellation preserved, explicit unreadable-response errors, both API error formats supported | Client unit tests and injected browser failures |
| Notification toggles/export had no busy protection; export revoked its download URL immediately | Busy states, bounded API export, delayed URL cleanup and accurate download-ready wording | Browser preference persistence and parseable JSON download |
| Blocked session storage could lose a created order's navigation/access or crash its private page | In-memory per-tab access fallback; private fragment remains usable; token re-resolves when order/hash changes | Storage helper tests; phone guest checkout with session storage deliberately blocked |

## 3. What was exercised, and at what level

| Area | Evidence level | Important limits |
|---|---|---|
| Homepage, deals, saved list, search, categories and all 25 catalogue product pages | Live page inventory; mobile accessibility/overflow scan; targeted browser actions and API tests | Not every one of the changing affiliate offer links was followed to an external merchant checkout |
| Ranking, source methodology, contact, terms, privacy, disclosure and missing pages | Live rendering/navigation/accessibility inventory; source and prerender checks | No claim of legal certification or guaranteed SEO ranking |
| Sign-in and account settings | Real isolated browser sign-in, password visibility, save/reload, notifications, account export, delete-dialog focus; API auth/security tests | Real inbox delivery, Android password-manager behavior and destructive production account deletion were not exercised |
| Registration, verification, forgot/reset password | Live route/invalid-state rendering plus existing isolated API tests | Not every form combination has an end-to-end browser test; no real verification/reset email sent |
| Owner Overview/Earnings/Coupons/Price reports/People/Audit log | Seven browser tabs, denied-access states, API security tests; coupon moderation and report moderation regressions | Affiliate payout provider figures are read-only; no live role changes or moderation performed |
| Owner shop | All five sections and product editor opening/closing, viewport check; commerce API suite covers product/media/settings/rate/order rules | No live product/media upload or publication; not every editor field/option combination is browser-tested |
| Guest purchase | Invalid/unknown PIN block; cheapest confirmed carrier and exact total; private order reload/access denial; reference submission; owner bank-check/dispatch/delivery **recording in isolated data** | No UPI payment, bank validation, actual carrier booking, pickup or delivery occurred |
| Direct order cancellation/expiry/refund/late credit, stock and concurrency | Existing commerce API/core tests | Not all lifecycle branches have browser-click coverage; no actual refund sent |
| Design | Established warm palette preserved; colour/contrast assertions and phone target improvements; page accessibility scan | No broad redesign, paid assets or new branding; Chromium automation is not physical Android or assistive-technology certification |
| Security/maintenance | Authorization/CSRF/rate-limit/API tests, expiry/destination checks, dependency and secret scans | No external penetration test; third-party uptime/delivery and future vulnerabilities are outside this result |

**This audit does not claim that every possible line, state, button/data combination or third-party integration is proven.** It provides reproducible page coverage and named interaction coverage, with the gaps above kept visible rather than treating a screenshot as a passing functional test.

## 4. Reproducing the checks

Normal project checks:

```sh
npm ci
npm run check
npm run build
npm audit
```

Read-only production scan:

```sh
npm run audit:browser -- --base https://dealmosaic.pages.dev --all --output /tmp/dm-live-audit.json
```

`--width 320` changes the viewport. `--paths-from docs/audits/2026-11-04-before.json` reuses the recorded path inventory, including when scanning a local server without a sitemap. This scanner does not perform mutating actions and does not claim interaction coverage.

Isolated browser suite, using separate terminals/processes:

```sh
# API: test mode cannot use Turso; mail and scheduled maintenance are disabled.
NODE_ENV=test DB_PATH=/tmp/dm-site-audit.db PORT=8787 DAILY_JOB=off BREVO_API_KEY='' RESEND_API_KEY='' SMTP_USER='' SMTP_PASS='' npx tsx apps/api/src/server.ts

# Web dev server (API proxy defaults to the local API).
npm run dev:web

# Fixtures refuse non-test execution, a different DB path, or a remote DB URL.
NODE_ENV=test DB_PATH=/tmp/dm-site-audit.db TURSO_DATABASE_URL='' BREVO_API_KEY='' RESEND_API_KEY='' SMTP_USER='' SMTP_PASS='' npx tsx scripts/audit-fixtures.ts
npx playwright install --with-deps chromium
npm run audit:interactions
```

The suite asserts `http://127.0.0.1:5173` and an API environment of `test` before any mutation. Configuration disables screenshots/video/traces. The fixture file contains **temporary local** sessions and goes to `/tmp`, not the repository. Stop the local servers and remove the isolated DB, fixture JSON and transient test output after use. Never substitute production endpoints or credentials.

## 5. Commercial gates and remaining work — unchanged, not silently marked fixed

- **Direct sales remain paused in production.** No real products, carrier rates or orders have been seeded.
- **Automatic live carrier discovery/serviceability/rates and booking are not integrated.** Only current carrier-confirmed quotes entered by the owner can support checkout. “Unknown” remains different from “unavailable”; lowest confirmed eligible cost wins, not speed. Carrier selection is not booking.
- Owner still needs to supply the exact West Bengal dispatch PIN and real seller/contact/grievance/return details, verify the business/product eligibility basis, privately configure the UPI recipient, and list real products/media/measurements/packed parcels.
- No automatic bank verification, direct-order emails, multi-item cart, direct-SKU search/save/digest/push integration, partial-refund automation, profit ledger, or complete returns/grievance case-management workflow. These are explicit functional gaps, not working buttons hidden somewhere in the UI.
- Affiliate approval, qualified purchases, attribution accepted by the network and actual payout remain external gates. Restoring a coupon does not verify it. Commission never determines ranking, and direct selling remains disclosed.
- No test notification, real financial transaction, shipment booking, paid service or published sample product was authorized or used for this audit.

## 6. Validation and deployment record

Completed pre-deployment checks:

- **381 unit/API/core/client tests in 27 files passed** (36 more than the preceding release).
- **48 browser interactions passed**: 24 scenarios each at 390px and 1365px, including injected failures and local mutations. These are scenarios, not a count of every individual button.
- **45 authenticated/fixture rendering states passed**: 15 states at 320px, 390px and 1365px; zero page exceptions, page overflow or detected axe WCAG A/AA/2.1-AA violations.
- **43 design assertions passed.** Warm Roast remains the darkest colour; no black/near-black or forbidden blue/teal/violet hues were introduced. Specified text/solid-fill contrast pairs pass their thresholds.
- Full `npm audit`: **zero reported vulnerabilities**, including development dependencies. Secret scan and typecheck passed.
- Build/prerender verification: **53 pages**; sitemap **51 URLs**, including the unchanged 25-product comparison catalogue.
- Main bundle **471.74 kB / 142.86 kB gzip**; CSS **77.61 / 15.71 kB gzip**. DirectShop **14.81 / 4.88 kB gzip** and ShopControl **26.88 / 8.27 kB gzip** remain separate chunks. The main compressed bundle grew about 1.31 kB from the previous release; no performance-score claim is made.
- Non-fatal build notes: shared API modules are both statically and dynamically imported, so those particular imports do not split another chunk. Commerce chunks still split normally.

The pre-audit production code was `44163ea` (Pages `31f0d19a`, Render `dep-dblgk25g1s2s73elut8g`), with documentation at `d407e5b`. Production deployment and live re-verification are recorded below when observed; local passing tests alone are not deployment evidence.
