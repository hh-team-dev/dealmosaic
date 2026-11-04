# DealMosaic 2.4.0 — Pet-friendly stays and dining

**4 November 2026.** One implementation for the website, installable PWA and current-feature classic fallback. Publication and recovery evidence is appended below after the release gates; the preceding live release is recorded in document 38.

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

Destination/type sharing excludes pet details, weight, count and costs. Planning values remain in page memory; no new storage or server endpoint was added. The public CSV contains venue facts only, is generated from the authoritative JSON, quotes fields and neutralizes formula-leading content. Offline source/map/offer/download actions are disabled; the PWA's cached reference interface does not certify current admission. Classic remains online-only, as documented previously.

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
