# DealMosaic 2.4.0 — Pet-friendly stays and dining

> **Current release — 2.6.0, 5 November:** [Document 42](42-hospitality-business-and-native-comparison.md) records the deployed native personal hotel/dining comparison workspaces and owner business desk. Runtime `c54a98d` / `pwa-v2.6.0`; Pages `5924e0cb`; API `dep-dbm6d549v7es7390s8tg`. Live supplier rates, booking and new hospitality earnings are not activated. Previous dated receipts remain historical.


> **Previous release — 2.5.0, 5 November:** [Document 41](41-device-review-and-conversion-repair.md) is the authoritative deployed guest/member/admin repair record: runtime `a13bac7`, Pages `b776ff72`, repaired API and matching PWA/classic packages. Older dated release evidence below is historical.


> **Previous hospitality field-test review — 4 November 2026:** [40-hospitality-revenue-reset.md](40-hospitality-revenue-reset.md) records the owner’s ongoing device tests, provider failures, fresh campaign access, reversible withdrawal of five hotel promotions and the on-site revenue blueprint. Runtime at that review remained 2.4.0; the proposed booking/merchant platform was not deployed. Read document 41 for the later 2.5.0 repair release.

**4 November 2026.** One implementation for the website, installable PWA and current-feature classic fallback. **Published and production-checked.** Exact release/recovery evidence follows below; document 38 records the preceding release.

## 1. Delivered scope and honest limits

`/pet-friendly` is a real sourced directory, not only a set of search links. There are **41 unique entries: 23 stays and 18 dining places**, visible regardless of whether a promotion exists. Hotels cover all 17 destination choices. Restaurant evidence remains insufficient for **Haridwar and Jamshedpur**. The empty state explicitly distinguishes missing evidence from absence of venues. Delhi NCR overlaps Gurugram and Noida; city totals must not be added as unique inventory.

This is not a complete or continuously verified list of every venue. Current operation, admission, availability, fees and conditions must be confirmed before travel or booking. Source-review dates do not mean the venue was contacted. Exact publishers, URLs, evidence methods and unresolved restrictions are in each card, the downloadable CSV and `docs/source/2026-11-04-pet-source-ledger.md`.

Both Hotels and Dining have a city-scoped pet entry point and an all-destinations link. The warm hospitality presentation remains distinct from shopping; shopping was not redesigned. The existing five-item navigation dock, persistent installation invitation and fixed deals bar remain. No sixth crowded phone tab, paid service, location permission, embedded map or automatic provider request was added.

## 2. Evidence, species and offers

- Official publisher and third-party publisher are distinguished. **Official does not automatically mean verified.** Current fetched page text and search-index-only text are labelled separately.
- Explicit dog/cat filters exclude unspecified pet claims; cats allowed only by request are not represented as explicit unconditional cat acceptance. Birds, rabbits and other pets require direct confirmation; the planning message supports other pets without inventing permission.
- Hotel admission is not restaurant admission. Separate hotel-restaurant entries need their own dining evidence. Brunch-only and alfresco/outdoor restrictions remain visible. Source conflicts over fees, cats or quantities are not silently resolved.
- Evidence older than 90 days, future-dated or invalid is flagged. This is a freshness check, not an automatic claim that a venue has stopped accepting pets.
- Separate hotel and dining offer panels intentionally contain **zero eligible current offers**. No date-checked named-venue match with documented pet eligibility was established. This is not a claim that no offers exist anywhere.
- Future offers require a listed, sufficiently recent venue; explicit venue match and documented pet eligibility; safe HTTPS source; nonempty title/terms; valid India-date window; and review within 30 days. The displayed date refreshes each minute. A general room discount may qualify when applicability to the exact property's permitted pet room is documented; it need not waive pet charges. Generic travel coupons, expired packages and old redirected fee-waiver news are not promoted as eligible pet deals.

## 3. Practical planning without an implied booking

The checklist asks about species, weight, breed/count limits, permitted areas, room category, vaccination records, supervision, cleaning fees, taxes, refundable deposits and written confirmation. A venue-specific message can be copied, **not sent**. Clipboard denial leaves selectable text. No contact, booking, payment or notification takes place.

The cost calculator requires all five monetary fields, including an explicit zero where appropriate. It uses integer paise and separates actual expense, refundable deposit and upfront payment. Blank or unknown charges are never silently zero. A discount exceeding eligible entered cost is rejected. Switching venues clears entered costs; changing destination clears the planning entries, as disclosed. Local back/contact links and the existing global dock protect unsaved planning input. This is not a promise to preserve values across refresh, every browser navigation, or an explicit destination/venue reset.

Destination/type sharing excludes pet details, weight, count and costs. Planning values remain in page memory; no new storage or server endpoint was added. The public CSV contains venue facts only, is generated from the authoritative JSON, quotes fields and neutralizes formula-leading content. An already-open directory remains reference-only after connection loss, with source/map/offer/download actions disabled. A cold offline launch of this route uses the existing saved-list safety screen, not an offline venue catalogue; the requested URL is retained. Classic remains online-only, as documented previously.

## 4. Phone-sized tour

1. Open **Hotels** or **Dining**, choose a destination, then open its pet-friendly directory link. Or visit **https://dealmosaic.pages.dev/pet-friendly** directly.
2. Choose destination and place type. Optionally filter explicit dog/cat mentions, publisher evidence or a venue/neighbourhood name.
3. Read the source method, review date, charges, restrictions and permitted areas. A hotel's pet policy is not permission to enter its restaurant.
4. Tap **Prepare questions** on a venue, select your pet and copy the questions. Contact the venue yourself using its official details; obtain current written confirmation before committing.
5. Enter the confirmed room/meal amount, pet charges, other mandatory charges, instant discount and refundable deposit to check your own total. This does not fetch a quote or reserve anything.
6. Use the separate offer panels only when an eligible offer actually appears. A listing remains useful even without a coupon.
7. Download the public sourced CSV or copy the destination/type link. Private planning entries are not included.

## 5. Files and maintenance

- `apps/web/src/data/pet-venues.json`: public venue evidence and restrictions; `pet-offers.json`: deliberately empty eligible-offer registry.
- `apps/web/src/lib/pets.ts`: filtering, freshness/offer guards, safe URLs, map query, paise arithmetic and unsent confirmation text.
- `apps/web/src/routes/PetFriendly.tsx`, `design/pets.css`: lazy directory, planning tools and warm responsive layout.
- `scripts/generate-pet-directory.mjs`: JSON-to-CSV, included in SEO/build; public file `/pet-friendly-directory.csv`.
- Route, edge router, sitemap, substantive prerender, privacy and global form protection are integrated. One canonical directory is used, not thin destination pages.
- `apps/web/tests/pets.test.ts`, `tests/hospitality/pets.spec.mjs`, `scripts/audit-pets-production.mjs`: data/guard, browser and read-only production coverage. Cold offline PWA routing includes this page.
- `scripts/verify-pwa-parity.mjs` checks shared pet/hospitality chunks in the paired packages, normalizing generated import hashes rather than masking business logic.

To update: research the exact branch/property; distinguish own-pet admission from resident animals; retain source method, date, species and restrictions; remove contradicted/closed entries rather than padding coverage; regenerate CSV; run unit, browser, design, safety, paired-build and live checks. Do not replace documented conflicts with guessed values. Do not set an offer eligibility flag merely because a travel brand has a coupon.

## 6. Verification and known boundaries

The development candidate passed **613 unit tests across 33 files**, typechecks, **48 design assertions**, secret scanning and **81 hospitality browser scenarios** across 320px Chromium, desktop Chromium and 390px WebKit. Built-flavor and production verification are recorded separately below.

A real rapid-selection defect was corrected: successive destination/type changes now read the current browser query rather than a stale React-render snapshot, so a quick second selection cannot discard the first. The same URL-construction correction applies to the hospitality handler. Browser tests exercise all 17 destinations with both pet place types. Separate initial test failures were harness issues: nested-label option/textarea contents made exact/partial label selectors ambiguous; tests now use the controls' semantic role and accessible name.

Browser and accessibility checks are not the owner's physical Android/iOS walkthrough, a venue-policy confirmation, complete inventory certification or a live booking/coupon-redemption test. No real products, orders, messages, payments or push probes were created. Direct commerce remains paused and its private seller/banking/shipping gates are unchanged. Backend and database need no change for this frontend release.

## 7. Published release and final verification

- Live directory: **https://dealmosaic.pages.dev/pet-friendly**; public download: **https://dealmosaic.pages.dev/pet-friendly-directory.csv**.
- Runtime source: **`151bc4d01ebe20ec7c5fd6d46f1341f3a7896b05`**; immutable tag **`pwa-v2.4.0`**.
- Pages: **`316dae5b`**; immutable deployment **https://316dae5b.dealmosaic.pages.dev**.
- PWA: **`2.4.0-6a89cd91fc88`**, 17 safe static assets, **828,754 bytes**. Classic: **`2.4.0-16ea84c91465`**, 826,744 metadata static bytes. The classic worker removes the PWA cache; these metadata bytes are not an offline-cache claim for classic.
- Backend read-only status confirmed unchanged: Render **`dep-dblhapnf3r2c73a5csa0`**, commit **`00711adc7557ac6882a890c7436875232cc7d656`**, live. No API/schema deployment was needed.
- Packages were built from the committed runtime source with **`workingTreeChanged: false`**. Subsequent documentation, evidence and test-harness changes do not modify the deployed application.

| Gate | Result |
|---|---|
| Unit/type/design | 613 tests / 33 files; typechecks; 48 design assertions |
| Project dependency audit | 0 reported vulnerabilities |
| Development hospitality | 81 passed across three browser/viewport projects |
| Packaged PWA hospitality | 81 passed |
| Packaged classic hospitality | 81 passed |
| Real-worker PWA regressions | 51 passed, including cold pet-route safety fallback |
| Persistent install/deals controls | 39 passed |
| Built shopping regressions | 46 passed; 2 development-only source-import probes explicitly skipped |
| Live pet directory | 3 browser/viewport states; all 17 destinations × 2 types in each; exact venue IDs, CSV, source links, no automatic external calls, accessibility and offline action locking |
| Live Hotels/Dining | 6 states, each covering all 17 choices |
| Live PWA | 8 states across Chromium/WebKit, including cold pet-route safety fallback; no API cache |
| Live persistent controls | 45 route/viewport states at both scroll positions |
| Live public pages | 70 states; no recorded layout, runtime, API-5xx or accessibility findings |
| Build/SEO/recovery packages | Shared-chunk parity and both archive SHA-256 checks passed; 58 HTML pages / 57 unique h1 texts / 54 sitemap URLs |

Counts overlap and must not be totalled as unique scenarios. Machine-readable evidence is `docs/audits/2026-11-04-pets-*.json`; the release summary records exact metadata. A follow-up audit initially assumed a cold offline pet route rendered venue cards. That expectation was incorrect: the established PWA safety boundary deliberately shows the saved-list fallback. The audit was corrected to test the actual safety contract, then all eight live states passed. No runtime change or unsupported offline-catalogue claim was made. The development-only component probe now automatically skips when Vite source imports are unavailable instead of failing a built deployment for lacking development endpoints.

The existing main-chunk size and static/dynamic-import build advisories remain; this is not a performance-budget certification. Pet-specific UI/data is lazy-loaded. A 390px visual review was completed and its screenshot deleted.

## 8. Matched packages and recovery

Directory: `/home/user/releases/dealmosaic-2.4.0/`. Retain both archives, `release.json`, `SHA256SUMS` and `README.txt`:

- `dealmosaic-2.4.0-pwa.tar.gz`: SHA-256 **`43dbb62f4024376ec5b1ae2535628ac5a3c5b2c7262b4629815702137be8f564`**.
- `dealmosaic-2.4.0-classic.tar.gz`: SHA-256 **`7860afb14e923fca7113cc582d6c60cb109abff235cd274f9ac9dcd281acd47f`**.

Classic preserves current customer/owner features while retiring the service worker at the same origin; do not reset the backend or clear account/saved-list storage. Retain earlier release recovery points, the original website baseline and original brand vectors. The full source/history bundle and verified source archive are recorded below. Offline users cannot be recalled instantly; the usual explicit update/reconnect rules still apply.

## 9. Source backup and handover completion

- Verified source archive: `backups/dealmosaic_2026-11-04_16-48-21.tar.gz` — **386 files**, **2,061,119 archive bytes**, SHA-256 **`7fdc744328832603e20c91a4065e843ecb8b69e978877c165a77cde6848fce3c`**. Every manifest checksum passed. This archive includes published source, current release evidence and the initial updated PDF-validation report. This self-referential archive note and final PDF/cleanup bookkeeping follow the archive; their current copies are in Git and the final full-history bundle.
- Complete-history bundle: `backups/pwa-v2.4.0.bundle`, with `.sha256` sidecar, covering all **14 Git refs** through the final handover commit. The runtime tag remains pinned to `151bc4d`; later commits are documentation, evidence and audit harness only.
- Updated PDFs: `/home/user/handover-pdf/39-pet-friendly-directory.pdf` and the full `/home/user/handover-pdf/DEALMOSAIC-handover-set.pdf`, plus the individual core documents. Contents destinations and text bounds are validated by `scripts/validate-handover-pdfs.py`; results are in `docs/audits/2026-11-04-pets-pdfs.json`.
- Review screenshots are deleted. Isolated test services, fixtures, temporary build-switch files and package staging are removed after validation; the verified source/history backups and paired deployable archives remain. No production data reset is part of cleanup.
