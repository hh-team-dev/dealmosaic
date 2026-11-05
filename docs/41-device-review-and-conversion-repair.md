# DealMosaic 2.5.0 — Guest, member and administrator repair

> **Current release — 2.8.0, 5 November:** [Document 46](46-traffic-first-hotel-discovery.md) records the traffic-first hotel discovery rebuild: Vijayawada as the 18th destination, evidence-grouped results, six extra checks and consent-gated anonymous analytics. No live supplier feeds, prices, stars or bookings; no new payable programme. The owner's phone DNS failure stays open. Runtime `63d50e8` / `pwa-v2.8.0`; PWA `2.8.0-39e7c8d2dd33`, classic `2.8.0-b026ca0e4176`. 824 unit and 385 browser checks passed; production verification without external clicks follows in the release receipts.

> **Previous release — 2.7.1, 5 November:** [Document 45](45-store-link-recovery-and-connection-desk.md) records explicit direct-store recovery, bounded analytics/edge-proxy safeguards and the category-separated owner connection desk. Campaign access, India-listed access, published offers and homepage placement are separate. Hotel live-rate APIs remain unconnected. The owner’s phone DNS failure is not dismissed or marked solved by automated checks; physical testing has begun and remains incomplete. Runtime `492e98b` / `pwa-v2.7.1`; Pages `0c9c7b7e`; Render `dep-dbma2k0ae00c738pqjqg`. 793 unit and 379 browser checks passed; production repair/general/hospitality checks passed without external clicks. See the click-repair release receipts.

**5 November 2026 · Website / installed PWA / classic website share this release**

**Release status:** **2.5.0 deployed and production-verified** at https://dealmosaic.pages.dev. The owner's order is current defects first, hotels second, restaurants third. This is the first repair phase, not a claim that a hotel booking engine has been delivered.

## 1. Evidence and limits

The supplied silent Android recording lasts 637.179 seconds. Review covered its whole timeline through 127 five-second samples plus the final frame, then one-second samples across 304–328, 359–374 and 628–636 seconds. All six supplied screenshots were viewed. This was frame-based inspection, **not continuous playback or a new physical-device test**. Local video, screenshots, frames, OCR and contact sheets were deleted after review. The owner's Drive originals were not modified.

Observed journeys include guest home, hotels, dining, pet-friendly discovery, deals and saved notes; a Nike comparison; store visits and returns; sign-in; the administrator area; installation, dashboard, saved offers, settings and sign-out. Guest and administrator states were distinguished: the signed-in header at around 370 seconds is not evidence of a guest acquiring administrator access.

The denser frames confirm a readable store button becoming a blank pink rectangle after return, the home page appearing briefly at `/login`, and two sign-out messages at the end. A recorded FirstCry visit did reach the merchant from the redirect route. It is not proof of a sale, attribution settlement or payment.

### Intermittent outbound failure

The owner's report that every outbound link failed before refresh remains valid evidence. Read-only production inspection at **09:38:41 UTC, 5 November** found **1,123 eligible offer rows**, all with HTTPS links at `linksredirect.com`, no credential-bearing/absent URLs and no malformed end dates. Workspace and public DNS checks resolved the host earlier in this investigation. These facts narrow the problem; they do **not** prove that the owner's phone, resolver, network or affiliate service worked during the failure.

All 1,123 links share a network host, so a shared DNS/network failure can affect every offer. The exact intermittent cause is **not established or claimed fixed**. A redirecting site cannot reliably detect or repair a failure after navigation to another origin. Do not bypass tracking, strip signed parameters or call an ordinary merchant URL an attributed visit. Evidence counts are in `docs/source/2026-11-05-link-provenance-audit.json`.

## 2. Implemented repairs

| Area | Implemented behaviour | Remaining boundary |
|---|---|---|
| Blank pink buttons | Explicit foreground/background across link, visited, hover, focus and active states; 44px shelf targets; hospitality keeps its gold/berry accents. | Browser regressions are not a substitute for the owner's physical Android retest. |
| Store recovery | After a visit, a recovery link preserves the offer/code. The recovery screen supports readable/manual copying, a deliberate tracked retry and support. Invalid, held, future or unsafe destinations do not create a recorded click. Browser failures use a recovery page rather than raw JSON. | It cannot repair an external DNS or retailer session error. No automatic repeated affiliate clicks. |
| Route flash | A neutral static app shell replaces the homepage fallback for client-only routes; private/auth routes remain noindex and uncached. | Must verify on the actual deployed edge, including slow JavaScript. |
| Authentication | Stale session responses cannot overwrite a newer login; session changes refresh across tabs and return-to-page; pending login/logout is protected from background refresh; failed login releases loading. | Server authorization remains authoritative. No client-side role grants. |
| Logout | One in-flight request, disabled repeat action, success only after server revocation; failure keeps the signed-in view and provides retry feedback. | An unreachable server cannot be claimed to have revoked the cookie. |
| Product truth | Demo rows cannot supply public prices, MRP, ratings, history, comparison winners, alert triggers or new daily snapshots. Production stops registering/creating demo offers. The landing sample comparison is removed. Static rendering also strips non-live prices defensively. | Existing internal demo rows remain for reversible history; there is no live product-price feed merely because the catalogue contains products. |
| Offer wording | Store-listed is not checkout-tested. Codes are not advertised as universally auto-applied. “No code listed” does not assert that a merchant never needs a code. Unsupported all-store, identical-price and privacy absolutes are removed. | A live listing still needs current merchant eligibility and checkout confirmation. |
| Calendar dates | Legacy feed end-of-day UTC encoding displays the published calendar date, not the following day in India. Saved snapshots show absolute past end dates rather than repeatedly saying “Ends today”. | Backend eligibility cutoff remains unchanged; actual merchant cutoff zones and separate booking/stay deadlines remain unconfirmed. Five held hotel rows stay held. |
| Longer terms | Import capacity increases from 400 to 8,000 characters. | This does not restore already-truncated production terms. No manual feed refresh was performed for this repair. |
| Account value | Clear guest/member distinction; explicit repair links locally saved IDs to the signed-in account for eligible reminders, with partial failures and retry visible. | The saved-card board itself remains device-local, not cross-device synchronization. |
| Consent | Optional weekly saved-offer email is unchecked at signup; missing preference fallback is off. Preferences and eligibility are visible on the saved board. | Existing users' stored choices are not silently changed. A price-target email is a separate explicit request. |
| Notification centre | Dashboard shows authenticated, user-scoped, consent-aware price-target events, loading failure/retry and honest email-delivery status. In-app off hides updates and prevents new events from being added to that inbox. | No phone push or SMS is enabled. Empty history is explained, not disguised as an error or filled with advertising. |
| Price-target delivery | Only positive, in-stock live observations from the last 24 hours qualify. The item-price timestamp and fees caveat replace “checked just now”. Failed email leaves the target active; retry updates one event rather than duplicating the inbox entry. A confirmed service acceptance closes the target. | Mail-service acceptance is not proof of inbox arrival. An external mail send cannot be given an absolute exactly-once guarantee across crashes. No live test notification was sent. |
| Dashboard claims | A saved PIN is not described as a connected quick-commerce feed. “Closed” does not falsely mean “email delivered”. Export/deletion copy respects separately retained order records. | Goods shipping/payment gates are unchanged. |

## 3. Customer-focused copy and membership

The third How-it-works point is customer-benefit copy about checking the final price and conditions, not the operator's earnings. Revenue-focused public headings and unnecessary application/payout discussion are removed. **Necessary affiliate, sponsored/Featured and conflict-of-interest disclosures remain.** Commercial campaign/account detail is owner-only, including the previously public `/api/meta/affiliate` endpoint.

Browsing, comparison, codes and retailer access remain available to guests. A forced account wall does not make a shopper committed or create a sale. Membership earns its place through verified account preferences, explicitly requested price targets, the notification centre and eligible saved-offer email linkage. We do not advertise unavailable cross-device board sync, exclusive prices, rewards or universal alerts.

### Code visibility, automatic discounts and attribution

The production offer copy inspected contained no DealMosaic-specific exclusivity statement. That is **absence of evidence for a blanket exclusivity claim**, not proof that every individual code is unrestricted. Campaign and merchant terms still decide each case.

- A generic code can often be copied and used directly. Hiding it behind a login cannot prevent copying, screenshots or shopping elsewhere.
- Link navigation does not prove a code auto-applies. Where a code is shown, customers are told to enter it and check the final total.
- Attribution can be lost through cookie restrictions, another publisher's later click, different browsers/devices, unsupported app handoffs, cancellations or ineligible orders.
- A first-party click/sub-ID helps reconciliation but is not a confirmed sale or income.
- We preserve authorised tracking and provide a deliberate return/retry path without false urgency, forced redirects or guaranteed-sales claims.

**No guaranteed sales, exclusive discounts or payout claims were added.** Improving reliability and useful reasons to return is the legitimate conversion strategy.

## 4. Administrator campaign supervision

`/admin?tab=campaigns` provides two explicitly different sources:

1. **Local cache:** searchable campaign names/domains, access filters, linked-offer coverage, missing-offer opportunities, held rows, timestamps and pagination.
2. **Live API inventory:** paginated read-only network inventory across campaign types, rather than limiting discovery to CPS. A read-only request reported **25,066 campaigns / 251 pages**; this is the provider's reported total, not a complete review, approval count or earning opportunity count.

Each row can show network access/type, reported payout/currency/type, cookie window and deep-link permission, eligible linked offers, held offers and 30-day **site-recorded outbound clicks**. These clicks include repeat taps and owner testing; they are not unique shoppers or the network's click count. Conversion/validated/pending/paid data remains separate and is not invented from clicks.

No campaign application, paid activation or purchase is triggered by browsing the inventory. Normal accounts and guests cannot access it; upstream failures return a safe error rather than raw credential-bearing details. Campaign access does not grant hotel inventory/rate API rights. Read-only browsing does not refresh the entire cache or inspect every campaign automatically.

## 5. Hotel phase next; restaurants after that

The owner now permits useful external hospitality links where there is no genuine offer or authorised internal capability. This qualifies the earlier strict no-external preference; do not remove useful links merely to make the site appear native.

Preserve the existing premium hospitality treatment, 17 destination choices and 41 sourced pet-friendly entries. Do not redesign shopping. The next hotel phase should follow the **function**, not protected designs/assets, of major comparison operators: location/dates/guests → genuine property results → like-for-like, dated provider totals → authorised fulfilment.

Document 40 contains the researched commercial options and primary sources. A normal affiliate registration or open Cuelinks campaign is **not** permission to use Booking.com Demand or Expedia Rapid. Native rate comparison needs authorised inventory, current quotes, occupancy/cancellation/tax normalization and permitted tracking. Integrated booking adds contract, support, cancellations and payment responsibilities. Do not fabricate properties, star classifications, reviews or rates to fill this gap.

The five hotel feed rows held on 4 November remain held. This repair does not establish the exact ITC reservation-session failure, resolve every Cleartrip blank destination, sign hospitality merchants, create a hotel rate API or activate reservations/payments. Restaurants remain the third phase. No merchant was contacted and no commercial agreement accepted.

### Agoda research added on 5 November

Agoda explicitly documents an **Online Affiliates / MSE** model using its Search API for native availability/rate results, and a different Fulfill Assisted model in which Agoda charges customers and handles post-booking service. These are different contractual integrations, not widgets to copy. [1](https://partners.agoda.com/DeveloperPortal/APIDoc)

The official guide now resolves to https://developer.agoda.com/demand/docs/getting-started. It requires partner credentials, sandbox testing, certification, commercial/operational feasibility and signed contract/vendor-registration documents before live operation. The ordinary affiliate FAQ says joining is free and applications are reviewed; that does **not** establish approved or fee-free Demand API access for DealMosaic. Source: https://partners.agoda.com/en-us/faq.html.

The Search schema exposes local-hotel check-in dates, occupancy/child ages, currency and separately described taxes, fees and mandatory or pay-at-property surcharges. These fields support a genuine like-for-like comparison, not comparison of a headline nightly rate against a tax-inclusive stay total. [3](https://partners.agoda.com/DeveloperPortal/APIDoc/SearchJsonAPI)

**Next technical preference:** evaluate authorised Search/MSE integration first for native priced results with provider fulfilment; it is a closer fit to the owner's comparison request and a smaller operational burden than taking payments and managing bookings ourselves. This is an engineering recommendation, not partner approval. Preserve useful external links until rights, credentials, pricing and content permissions are established. No Agoda application or contract was submitted in this repair.

## 6. Validation and deployment record

Final checks ran on the clean-source packages from **`a13bac718781569f04f1b997d63e5d5b9d910858`**, with `workingTreeChanged: false` in their release manifest.

| Gate | Final result |
|---|---|
| TypeScript | Passed |
| Unit suite | **639 passed, 35 files** |
| Colour / contrast audit | **48 assertions, 0 failures**; no black/near-black or hues 158–320 degrees |
| Device-review browser suite | **36 passed**: touch Chromium, phone WebKit and desktop; expanded campaign cards also checked at 320px with a long domain |
| Existing interaction suite | **46 passed, 2 skipped**; the skips are development-source-only imports, deliberately unavailable in a production build |
| Hospitality / pet browser suite | **81 passed** |
| Installed-PWA / offline / real classic-switch suite | **51 passed** |
| Total browser results | **214 passed, 2 intentional skips, 0 failures** |
| Prerender | Both builds passed; 59 HTML pages, 58 distinct non-404 headings |
| Website / PWA parity | Passed for both deployable flavors |
| Secret scan | Passed; production credentials and private media are not in source |
| Published production verification | **94 read-only checks passed**, no browser exceptions and no external destination requested |

**Runtime source / tag:** `a13bac718781569f04f1b997d63e5d5b9d910858` / `pwa-v2.5.0`.

**API:** Render `dep-dbm55dlg1s2s73c5h9pg`, live on 5 November. Health confirms version `2.5.0`, revision `a13bac718781`, environment `production`. The existing service plan was checked as **free**. Although the service reported automatic deploy enabled, no deployment for this commit was present; one explicit deployment was requested, then observed live.

**Website / PWA:** Cloudflare Pages **`b776ff72`**, https://b776ff72.dealmosaic.pages.dev; canonical production https://dealmosaic.pages.dev. The exact verified PWA archive was extracted and uploaded. No backend setting, paid plan or API origin was changed for the frontend deployment.

### Production findings

- All 25 reference products remain, but there are **zero live product-price observations** at verification. Unsupported sample prices and MRPs are absent; this is containment, not a newly connected retailer feed.
- Administrator inventory, commercial account detail and notifications reject anonymous requests with 401.
- `/login`, `/app/settings`, `/admin?tab=campaigns` and store-link recovery return neutral, noindex, no-store HTML—not the homepage—before JavaScript.
- A nonexistent store link returns local recovery, without generating a merchant visit.
- The published focused store button has white text on berry, **6.30:1** contrast and **44px** height. No phone-width page overflow was observed in the read-only home check.
- The five previously held hotel records were independently re-read and remain **rejected**. No restoration was performed.
- No live test account, campaign application, affiliate visit, booking, order, payment or test notification was created. Browser mutations were isolated to the guarded local test database.

Reproduce the read-only published checks with `node scripts/verify-device-release.mjs` after installing test dependencies. Results: `docs/source/2026-11-05-production-repair-verification.json`. Summary and package receipts: `2026-11-05-repair-validation.json` and `2026-11-05-release-manifest.json` in the same folder. This does not validate an authenticated owner session on the physical phone or the full advertiser attribution chain.

### Paired archives and recovery

Location: `/home/user/releases/dealmosaic-2.5.0/`. `SHA256SUMS` was verified before deployment.

- **PWA:** `2.5.0-d493517c016c`; 18 precached assets, 841,975 bytes. Archive `dealmosaic-2.5.0-pwa.tar.gz`.
  SHA-256: `4e68f78cc18b58220b79870a121ad5f9b17986f2313d29fe22c6e0ff12d3574e`.
- **CLASSIC:** `2.5.0-0c6e18f7e1e9`; 18 precached assets, 839,965 bytes. Archive `dealmosaic-2.5.0-classic.tar.gz`.
  SHA-256: `c526d3ed0585fc3bca6939a9f92da846e8cf916243be5806527eff6a4fea950f`.

The frozen source tag, verified **405-file source snapshot** (`dealmosaic_2026-11-05_10-05-14.tar.gz`) and recovery bundle are recorded in document 28. The final handover updates may be a later Git commit than the runtime source; do not confuse a documentation commit with a newly deployed application.

## 7. Recovery and phone retest

Keep the exact 2.4.0 archives and branding vectors. **Do not revert the API to bring back fake public prices.** If the new frontend needs recovery, prefer the matched 2.5.0 classic package while retaining the repaired API. It contains the same-URL removal worker needed to retire an installed worker safely. Switching flavors is not a database reset.

On the owner's Android phone after deployment:

1. Open App settings, check the release version, finish any unsaved form, and apply an available update. Refresh an ordinary browser tab too.
2. As a guest, open a deal, return, and confirm every store button remains readable. If the destination fails, use **Store not opening?** and retain the code. Do not purchase merely to test.
3. Open Sign in directly; it should not briefly show the homepage. Sign in, open the dashboard and inspect the notification centre.
4. Save an offer, open Saved and check account-link/reminder status. Use the explicit repair action if this device's older saves were not linked. Optional weekly email is your choice.
5. As administrator, open Campaign inventory, inspect source/freshness, missing coverage and a later API page. Do not treat the reported payout as money earned.
6. Sign out once; confirm one success message. A network failure must not pretend sign-out succeeded.

A successful automated deployment does not complete the owner's physical test. Keep the remaining phone/provider failures open until reproduced and verified.
