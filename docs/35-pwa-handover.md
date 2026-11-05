# DealMosaic 2.0.1 — PWA + website handover

> **5 November update:** the guest/member/admin repair is tracked in [document 41](41-device-review-and-conversion-repair.md). The owner now permits useful external hotel/restaurant links where there is no genuine offer or authorised internal capability. Hotels are the next phase after current defects; restaurants follow hotels. Earlier dated release and business-model evidence below is historical.


> **Current 2.4.0 release:** [39-pet-friendly-directory.md](39-pet-friendly-directory.md) covers the sourced pet-friendly directory, separate eligible-offer panels, private planning, verification and recovery. The preceding 2.3.0 destination expansion is preserved in document 38; earlier release evidence below is historical.

> **2.2.0 hospitality release:** see [37-hotels-and-dining.md](37-hotels-and-dining.md) for Hotels, Dining, the universal dock, nine-region discovery scope, verification and recovery. Earlier release evidence below is historical.

> **Preceding enhancement — 2.1.1:** [36-persistent-install-and-deals.md](36-persistent-install-and-deals.md) records the globally persistent install invitation and floating offers, motion/accessibility controls, form protection, exact release verification and recovery. The 2.0.1 details below remain the preceding release's verified history.

**Distinct release:** 2.0.1 · **Date:** 4 November 2026 · **Website baseline:** 1.4.0 (`5f85cf3`).

This is the handover for the installable app layer. The website is not replaced by a separate product. Website and PWA use one source tree, one origin, one backend, one catalogue and the same commerce rules. Read the master handover for the wider business and docs 33–34 for the shop and previous site-wide audit.

## 1. Owner: what to do on your Android phone

1. Open **https://dealmosaic.pages.dev/install** in Chrome, not inside an email or social-media app's embedded browser.
2. Tap **Install DealMosaic** if the browser offers that button. Otherwise open Chrome's menu and choose **Install app** or **Add to Home screen**. Browser wording varies.
3. Open the DealMosaic icon. The app's navigation includes Back, Home, Deals, Saved and App settings.
4. In **Install & app settings**, wait for **Offline ready** before relying on the saved-board fallback.
5. Continue using the same account. A browser or operating system may isolate installed-app storage, in which case sign in again. Guest saved lists do not automatically move between storage containers or devices.
6. When an update is ready, finish and save your current work. Apply it from app settings. You can also choose Later. Other open windows do not reload automatically.

**You do not need to activate a paid service, enter developer credentials or set up an app-store account.** Installation does not remove the shop's existing seller, banking, shipping or eligibility gates. Enter private banking details only in the existing owner Shop settings, never in this handover.

On iPhone/iPad, use Safari → Share → Add to Home Screen → Open as Web App when offered → Add. The site cannot trigger Apple's native installation flow programmatically.

## 2. Release status and precise scope

**Live and verified:** version 2.0.1 is deployed at https://dealmosaic.pages.dev . Installation, real offline behavior and required headers were checked on the production origin using Chromium and WebKit. Section 10 records exact evidence and remaining real-device limits.

| Capability | Website + PWA behavior |
|---|---|
| Search, comparisons, ranking, coupons, public information | Same existing code and backend; online data remains authoritative |
| Owner controls, direct products, checkout and order status | Same existing implementation; no offline financial operations |
| Account, sign-in and email preferences | Same server records; browser cookies may require a fresh sign-in in a separate app container |
| Home-screen launch | Manifest, existing original icons, supported install prompt and manual platform guidance |
| Installed-mode navigation | Explicit Back fallback and app links; safe-area-aware phone layout and landscape permitted |
| App shortcuts | Deals, Saved deals and Browse, where the platform supports manifest shortcuts |
| Offline access | Public app code/fonts/icons plus the saved notes already held in that browser |
| Live information while offline | Not invented: a labelled connection screen, historical saved notes and disabled shopping actions |
| Updates | Prepared in the background; an existing worker waits; applying an update is a user action |
| Recovery | Current-feature classic build with a self-removing worker at the same URL; historical website baseline also preserved |
| Push, app-store listing, automated payments/carriers | Not added by this release; see remaining limits |

The automatic offline layer is an enhancement, not a condition for using the website. A browser without service-worker or install support still gets the online website and installation guidance. It receives no fake install-success message.

## 3. Why this implementation helps the business

The strongest near-term benefit is **easier return visits**, not new-customer acquisition. The intended journey is discover a real deal → compare the actual payable total → save a useful offer → optionally install → return when needed. Installation is not a compulsory gate, a repeated modal or a way to force notifications.

### Implemented priorities

1. **Trust before conversion:** unchanged commission-blind ranking, disclosed affiliate links/Featured products, real-price rules and server-validated checkout. Offline notes are not presented as current prices.
2. **Low-friction repeat visits:** home-screen identity, useful app shortcuts, a visible install/offline-help link on Saved, footer and account-shell app settings, and a shareable install guide.
3. **Low operating cost:** shared React application, an original dependency-free worker, existing hosting/backend and existing brand assets. No app-store subscription or new paid infrastructure.
4. **Operational resilience:** static-only caching, bounded retained releases, user-controlled updates, online-only mode and paired release archives.
5. **Honest reminders:** existing opted-in account email mechanisms remain. No fabricated activity, silent background purchases, notification spam or permission request on installation.

### What success means, without invented numbers

Evaluate repeat visits and genuine customer feedback, then actual attributable purchases/affiliate conversions in existing reporting. Do not infer revenue from installation alone. This release does not add a tracking SDK or pretend to measure a global install-conversion rate: browser installation events are handled locally for UI state. No ranking, earnings or one-week revenue guarantee is made.

For the direct shop, launch readiness still depends on genuine products, seller details, origin PIN, policy/legal eligibility and confirmed delivery coverage. Installing an empty paused shop cannot solve those commercial prerequisites.

## 4. Platform restrictions: researched decisions

| Restriction | Design decision |
|---|---|
| Installation prompts and menu options differ by browser | Feature-detect `beforeinstallprompt`; otherwise show specific manual guidance. Never assume every Android browser exposes a prompt. |
| iOS installation is primarily manual | Safari Share instructions, including Open as Web App when shown. No pretend one-click iPhone installer. |
| HTTPS is required outside localhost | Existing HTTPS origin retained; worker registration checks secure context. |
| Storage is best-effort and can be evicted/cleared | Explain the limit, expose readiness and optional persistent-storage request, keep caches small. A browser's grant does not prevent the user clearing data. |
| Installed storage/cookies may differ from browser storage | Disclose fresh sign-in and device-local guest-list limits; do not promise automatic cross-device syncing. |
| App stores are separate distribution channels | No automatic Play Store/App Store listing claim. Packaging/review would be a separate project. |
| Web Push support is not a notification delivery system | No push permission request or backend added. iOS/iPadOS 16.4+ support requires a home-screen web app and permission initiated by user interaction. |
| Background execution is constrained | No background job, financial retry, offline order queue or guaranteed background task. Existing backend jobs remain server-side. |
| Offline users cannot receive an instant rollback | Keep the safe worker; deliver updates when they reconnect. Document close/reopen or reload after switching. |

Primary references checked 4 November 2026:

- Apple, **Turn a website into an app in Safari on iPhone**: https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios
- MDN, **Making PWAs installable**: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN, **Storage quotas and eviction criteria**: https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- WebKit, **Web Push for Web Apps on iOS and iPadOS**: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- web.dev installation guide was also reviewed: https://web.dev/learn/pwa/installation . Its old blanket statement about macOS Safari installation is not used; current platform capability must be feature-detected.

## 5. Architecture and cache safety

### One source of truth

`package.json` owns the release version. Vite injects it into the app. `npm run build` creates the PWA flavor; `VITE_PWA_MODE=classic npm run build` creates the network-only flavor. Both compile the **same** routes, components and API clients. Do not introduce separate Android, iPhone or classic feature copies.

The manifest retains **id `/`, scope `/`, start URL `/?source=pwa`** and the existing icon geometry. No branding redesign was performed. The platform's displayed installation name remains DealMosaic's established brand. Portrait-only locking was removed so landscape can remain usable.

The initial 2.0.0 production smoke test found Cloudflare’s `.html` canonicalization returned a 404 through the existing edge-router fallback. No incomplete offline release was activated; the online website remained usable. **2.0.1 fixes this** by resolving `/pwa-shell.html` internally to the extensionless asset and returning an explicit no-store/noindex response without redirect. The 2.0.0 tag is retained as history, not the recommended deployment.

### Worker versus edge worker

- `/sw.js` is the browser service worker, generated by `scripts/build-pwa.mjs` from `apps/web/pwa/worker.js`.
- `apps/web/public/_worker.js` is the **Cloudflare edge worker**. It proxies `/api/*`, serves assets and preserves real 404 behavior. Do not confuse the two.
- `/pwa-release.json` is public, non-secret release metadata with the exact static precache list, build identifier and byte budget.
- `/pwa-shell.html` is captured **before prerendering**. It is a generic, noindex offline shell with no product prices, account data, orders or previous private page content.

### Fetch policy

1. Non-GET requests, cross-origin requests and `/api` or `/api/*` are never intercepted for caching, queueing or replay. Affiliate redirects are also excluded.
2. The installation cache contains only the explicit app shell, current hashed JS/CSS, two fonts, favicon and app icons. Credential-free installation requests reject bad/redirected assets and HTML pretending to be JS/CSS/fonts/images.
3. Navigations use the network with no-store and an eight-second abortable fallback. Real HTTP responses, including 404/5xx, are preserved. Only network failure/timeout returns the generic cached shell.
4. Visited HTML, API payloads, auth responses, order URLs, quotes, payments, customer details and uploaded media are **not** put in Cache Storage.
5. API requests through the shared client use `cache: no-store`; a device reporting offline receives an immediate honest error. No replay queue exists.
6. Offline cold starts to private/current-data routes show the safe connection screen before protected-route sign-in redirects can mount. Saved and Install remain available.
7. A connection loss during an open sensitive task keeps its entered fields in memory but locks interaction. Reconnection does not submit anything or silently reload; the customer chooses to reload current information, with a warning about unsaved fields.
8. Saved deals are labelled snapshots even online. Offline the list is read-only and store links are absent. Copying an old code remains possible with the explicit stale-data warning.

The cache identity hashes the worker source as well as the version, flavor and static asset bytes, so a worker-only fix cannot overwrite the active cache during installation. A cleared/evicted cache gets a small, self-contained branded connection page rather than a broken blank screen. Saved-record validation is used by both direct reads and the subscribed React hooks; the offline browser regression checks malformed entries.

The build fails if the static precache exceeds **4 MiB**. After activation it retains the current and one preceding DealMosaic cache so a recently opened tab can still request an earlier lazy chunk. Caches from other applications are not deleted. This bounded retention is not an indefinite guarantee for arbitrarily old tabs after many releases.

### Controlled updates

A normal worker installation never calls `skipWaiting`. An update becomes visible when the new worker is installed; explicit approval sends `ACTIVATE_UPDATE`. Only the requesting window reloads on controller change. Other windows retain their form values and receive a reload notice. Sensitive account, owner, order and payment paths do not expose the global apply-update button.

Timing regressions also guard WebKit fallback: cache reads never open/recreate a deleted cache, and a fresh classic visit does not register a needless tombstone that could race a return to PWA.

An initial test found a Chromium lifecycle bug: the first-registration "had active worker" state had been captured once and reused for later updates. This was changed to compute replacement status for **each installation**, with already-installing worker observation. The cross-browser two-tab test guards the regression.

## 6. Website/PWA fallback and recovery

### Three different things, kept distinct

| Recovery option | Intended use |
|---|---|
| **Online-only mode in app settings** | A customer's browser stops using offline files; saves and cookies stay. Reload to finish. This does not remove the OS home-screen icon. |
| **Current-feature classic release archive** | Operator switches the whole deployment to network-only while retaining all current website/customer/owner improvements. Preferred operational fallback. |
| **Historical website 1.4.0 baseline** | Exact pre-PWA source for forensic recovery or a deliberate older-code branch. Not the automatically maintained latest website. |

**Do not simply redeploy an old website folder after shipping a worker.** That can leave the old worker controlling returning visitors. The classic build publishes a tombstone at the exact same `/sw.js` URL; it activates, deletes only `dealmosaic-pwa-*` caches, claims clients without reloading forms, and unregisters itself. It has no fetch, sync or push listener.

Paired packages retain both flavors' immutable asset files so already-open windows can finish loading their chunks during a switch. Existing installed icons may remain and may still launch an app-style window; a website cannot forcibly remove an OS icon. Offline devices see the switch only after reconnecting.

### Preserved baseline

- Tag: **`website-v1.4.0`** → `5f85cf3ea45d625679cce565a5e5ef5bc8ff8cba`.
- Branch: **`release/website-v1.4.0`**, the same immutable baseline.
- Complete-history recovery bundle: `backups/website-v1.4.0.bundle`, verified by `git bundle verify`.
- Previously verified source archive: `backups/dealmosaic_2026-11-04_11-26-58.tar.gz`, 295 files, SHA-256 `1ceb5ddd9fc12eed073ea43445c3c79a0f0efdd01316eaa768aae272083a7e47`.

A developer can recover the historical project from the bundle without GitHub:

```sh
git clone -b release/website-v1.4.0 backups/website-v1.4.0.bundle recovered-website
cd recovered-website
npm ci
```

Keep the latest shared source for ordinary development. If restoring historical code to production after a PWA release, also publish the current tombstone `/sw.js`; do not erase backend records or roll the database back just to change the frontend experience.

### Matched release packages

Run:

```sh
npm ci
npm run check
npm run package:pwa
```

Outputs under `/home/user/releases/dealmosaic-2.0.1/`:

- `dealmosaic-2.0.1-pwa.tar.gz` — website plus installable/offline layer.
- `dealmosaic-2.0.1-classic.tar.gz` — current-feature website plus removal worker.
- `SHA256SUMS`, `release.json`, `README.txt`.

`release.json` records source commit, dirty-worktree status and each flavor's build/precache metadata. Release delivery must use a committed source tree and explain any docs-only changes afterward. Packages contain deployable frontend files, not secrets or a database dump. Verify checksums, extract into an empty directory and deploy the chosen directory to the existing Cloudflare Pages project. Keep its existing `API_ORIGIN` configuration. No backend migration is part of this release.

The package command restores the PWA output to `apps/web/dist`. Temporary staging supports the local classic/PWA switch test; it is removed after verification. The `.tar.gz` packages are the retained deployable copies.

## 7. Continuing development without feature drift

1. Work on the shared `main` source, not two independently edited app trees.
2. Make customer, comparison, account and shop improvements once in the shared route/API code.
3. Only install/offline/update behavior may depend on `VITE_PWA_MODE`.
4. Run the normal checks and existing interaction regressions.
5. Build **both** flavors with `npm run package:pwa`; verify manifest identity, routes, cache exclusions and fallback.
6. Run `npm run test:pwa` against the isolated API and production-built test server. Test the actual classic archive directory too, not just a synthetic cleanup worker.
7. Publish the preferred flavor; retain both checksummed packages. Record the exact source revision, Pages deployment and smoke-check results here.
8. Update this handover and the master/recovery indexes in the same pass. Bump the single root package version on subsequent releases.

A website improvement therefore lands in the installed app and online-only build together. An offline/install improvement is additive and does not fork shared business functionality.

## 8. Verification procedure and limits

The test API refuses production data: `NODE_ENV=test`, exact `/tmp/dm-site-audit.db`, no Turso URL/token and no mail transport. `scripts/serve-pwa-test.mjs` refuses any backend whose health response is not `environment: test`. The browser suites generate no screenshots, video or traces.

```sh
NODE_ENV=test DB_PATH=/tmp/dm-site-audit.db TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= npx tsx scripts/audit-fixtures.ts
# Start isolated API and production-built test preview in separate managed processes.
NODE_ENV=test DB_PATH=/tmp/dm-site-audit.db TURSO_DATABASE_URL= TURSO_AUTH_TOKEN= PORT=8787 MAIL_TRANSPORT=none npx tsx apps/api/src/server.ts
node scripts/serve-pwa-test.mjs
npm run test:pwa
# Production-bundle business regressions; the component injection test requires Vite.
npm run audit:interactions -- --grep-invert 'shared busy button'
# Then stop the static test preview, start npm run dev:web, and run the complete suite.
npm run audit:interactions
```

The PWA suite covers installation prompt simulation, manual instructions, standalone-navigation simulation, 320px/390px/desktop layouts, accessibility, offline cold starts, private deep links, misleading `navigator.onLine`, field preservation, API cache exclusion, mutation network failure, online-only data preservation, multi-tab waiting updates, tombstone cleanup, unsupported APIs, blocked storage and real classic/PWA package switching.

**Important coverage boundary:** Playwright Chromium and WebKit are browser-engine tests, not physical Android/iPhone installation certification. Synthetic install/standalone events do not prove OS icon creation, Android WebAPK behavior, Apple Share-menu wording, keyboard/notch behavior on every phone, native share-sheet completion or notification delivery. No paid external device farm or remote app-store service was enabled. A real-device smoke check remains appropriate after installation.

## 9. What this release does not claim to solve

- No Play Store/App Store publication or native-app binary.
- No Web Push backend, badging campaign, background synchronization or offline financial action.
- No guaranteed permanent storage or automatic guest-list migration between devices/browser containers.
- No automatic carrier discovery/booking, bank verification, order emails, combined cart, direct-SKU search/saves/digest/push, partial-refund automation, profit ledger or complete grievance workflow. These remain the previously disclosed shop gaps.
- No change to the owner-as-sole-seller/payee model, manual UPI, cheapest confirmed eligible delivery, nationwide intent subject to eligibility, no-GST collection or legal gates.
- No fabricated inventory, sales, prices, reviews, partner approval or install statistics.
- No real payment, shipment, customer message, production test product or notification is sent as a PWA test.

## 10. Final release evidence

### Published version

- **App + website version:** 2.0.1. Source commit **`2faf8e31e2fdf4c7e79a048251b64a5478a5acfa`**, tag **`pwa-v2.0.1`**. The tag, baseline tag/branch and main source were pushed to GitHub.
- **Cloudflare Pages:** **`eaa528a8`**, verified at the main production origin. Build identity **`2.0.1-ca9abf43ff28`**.
- **Backend unchanged:** existing Render deployment **`dep-dblhapnf3r2c73a5csa0`**, application commit **`00711adc7557ac6882a890c7436875232cc7d656`**, was confirmed live. No API/schema deployment or database migration was needed.
- **Classic build identity:** `2.0.1-0183d51ba830`. This is the current-feature recovery website, not the historical 1.4.0 snapshot.
- Packages were built from the committed source with **`workingTreeChanged: false`**. Later evidence/document changes do not alter the deployed application. Wrangler's dirty-worktree warning reflected generated TypeScript/evidence files, not an uncommitted application build.

### Passed checks

| Verification | Observed result |
|---|---|
| Type checking, unit/service/security tests | **409 tests / 30 files**, all passing |
| Design rules | **43 assertions**, no forbidden dark/blue-family colors |
| Dependency audit | **0 vulnerabilities**; no dependency added for PWA runtime |
| PWA browser scenarios on final 2.0.1 | **48/48**, Chromium 320px, Chromium desktop and WebKit 390px; no skips or retries |
| Production-built shared business flows on final 2.0.1 | **46/46**, phone and desktop, including isolated checkout/owner flows |
| Complete existing website suite | **48/48** on shared 2.0.0 source before the edge-only 2.0.1 correction; includes the Vite-only component-injection case |
| Both build flavors | **55 verified HTML files** each; manifest identity/commerce parity and static-cache policy checked |
| Live public-site audit | **67 page states**, no reported axe violations, horizontal overflow, JS exceptions or API 5xx findings |
| Live PWA smoke tests | **6 states across Chromium + WebKit**: install guide, offline private deep link, offline saved board; all clean |
| Chromium's live installability check | **No installability errors**; this is not a physical OS install claim |
| Actual live Cache Storage | **12 static entries per browser, zero API entries** |
| Production commerce read-only check | Products, orders, rates, media and settings each **0**; public shop remains paused |
| Release integrity | Both final deployment archive SHA-256 checks passed |

These are different suites, not 142 distinct pages or a certification of every physical phone. The 46 production-built business tests exclude only the two viewport runs of a component-injection test that intentionally imports Vite development modules. The complete 48-case suite covers that component separately.

The raw static precache is **710,078 bytes**, about **0.68 MiB**, before HTTP compression; classic metadata lists 708,068 bytes but classic does not install that cache. Runtime caches are bounded to current plus one preceding release. No Lighthouse performance score or unmeasured speed improvement is claimed.

Live `/sw.js` returned JavaScript, `no-cache, no-store, must-revalidate` and `Service-Worker-Allowed: /`. The manifest returned the correct manifest MIME type with revalidation. Both offline-shell aliases are no-store/noindex; release metadata is no-store. Offline private navigation stayed on its requested URL without an unintended login redirect.

### Fixes caught during implementation

| Failure exposed | Root fix | Regression evidence |
|---|---|---|
| Later Chromium update did not appear | Compute active-worker replacement status for each install; observe already-installing workers | Two-tab update test in both engines |
| Corrupt saved record crashed the subscribed board | Use validated readers in the React subscriptions as well as direct reads | Offline malformed-record tests and storage unit tests |
| Cleanup could recreate an empty cache | Cache reads use non-creating `caches.match` | Worker unit test and WebKit tombstone test |
| Classic cold visit could race a return to PWA | Do not create a removal worker if no registration exists | Actual classic-package → PWA switch test |
| Local production-build proxy changed the browser-facing origin | Preserve forwarded host in the isolated test proxy; production security rules unchanged | Same-origin probe and 46 passing business flows |
| Cloudflare canonicalized the fixed shell URL | Internal extensionless resolution with explicit no-store/noindex response | Two edge-routing tests plus live offline installation in both engines |

### Retained delivery and recovery files

Directory: `/home/user/releases/dealmosaic-2.0.1/`.

- `dealmosaic-2.0.1-pwa.tar.gz` — SHA-256 `27c95cb27ad1e1e559b319f1d695174e36bd12d369fd8a23b93af800b090af0c`.
- `dealmosaic-2.0.1-classic.tar.gz` — SHA-256 `2cb135cf2eeeeabac99de30fdc11b1e011c9724adaaeb263b87eda5f7caff927`.
- `release.json`, `SHA256SUMS`, and `README.txt` describe the matched pair.
- Distinct handover: `docs/35-pwa-handover.md` and `/home/user/handover-pdf/35-pwa-handover.pdf`; the full 16-PDF set was regenerated together and all 325 contents headings were verified.
- Compact evidence: `docs/audits/2026-11-04-pwa-browser.json`, `2026-11-04-pwa-production.json`, and `2026-11-04-pwa-public-pages.json`.
- Original website complete-history bundle: `backups/website-v1.4.0.bundle`, SHA-256 `464b6cebecda158ede9eba745fa00dd91b9b1024b60bd62d7b3129a6e3a0741c`.
- Current source recovery: `backups/dealmosaic_2026-11-04_12-30-38.tar.gz` (314 verified files, SHA-256 `ed9dd82d71a79969eb9f5967dc6da22e401c8fb9629697d1b3cd86ea3617ed79`) and `backups/pwa-v2.0.1.bundle`. The archive precedes its own checksum note and final PDF/cleanup bookkeeping; those final document changes are in Git and the complete-history bundle.

The temporary test database, fixture sessions, package staging, dependency/browser caches, review screenshot and test servers are removed/stopped after evidence and PDFs are saved. The superseded 2.0.0 deployment archives are removed to prevent an accidental rollback to the rejected candidate. The historical website baseline and final 2.0.1 matched archives remain. No screenshot is retained and no real purchase, payment, shipment or notification was generated.

