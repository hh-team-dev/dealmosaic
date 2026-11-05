# DealMosaic 2.2.0 — Hotels, Dining and the universal destination dock

> **Current release — 2.6.0, 5 November:** [Document 42](42-hospitality-business-and-native-comparison.md) records the deployed native personal hotel/dining comparison workspaces and owner business desk. Runtime `c54a98d` / `pwa-v2.6.0`; Pages `5924e0cb`; API `dep-dbm6d549v7es7390s8tg`. Live supplier rates, booking and new hospitality earnings are not activated. Previous dated receipts remain historical.


> **Previous hospitality field-test review — 4 November 2026:** [40-hospitality-revenue-reset.md](40-hospitality-revenue-reset.md) records the owner’s ongoing device tests, provider failures, fresh campaign access, reversible withdrawal of five hotel promotions and the on-site revenue blueprint. Runtime at that review remained 2.4.0; the proposed booking/merchant platform was not deployed. Read document 41 for the later 2.5.0 repair release.

> **Current 2.4.0 release:** [39-pet-friendly-directory.md](39-pet-friendly-directory.md) covers the sourced pet-friendly directory, separate eligible-offer panels, private planning, verification and recovery. The preceding 2.3.0 destination expansion is preserved in document 38; earlier release evidence below is historical.

**Date:** 4 November 2026. **Release scope:** one DealMosaic website, one shared PWA/classic application, two new hospitality destinations. This document records the 2.2.0 enhancement; the later expansion is in document 38, while documents 35–36 retain the install/offline architecture and preceding release evidence.

## 1. Approved scope and the launch boundary

The owner approved implementation, not a separate website: stronger benefit-led copy, premium and distinct Hotels & Stays and Restaurants & Dining experiences, major food chains, and recognizable entry points on every application screen at every scroll depth. Hospitality opens only when selected. The shopping layout, existing brand assets and warm no-black/no-blue rule remain intact.

The agreed **nine city regions** are Delhi NCR, Mumbai, Bengaluru, Chennai, Hyderabad, Kolkata, Pune, Ahmedabad and Jaipur. This is the owner-approved commercial grouping, not a claim that these are India's only or officially defined metropolitan regions.

The named food chains are KFC, McDonald’s, Domino’s, Pizza Hut, Wow! Momo, Mainland China, Chinese Wok and Taco Bell. The owner clarified that “Chinese bowl” meant **Chinese Wok**. Barbeque Nation adds a restaurant/buffet discovery option alongside the requested restaurant and quick-service chains.

**What is launched:** city-context discovery, official provider destinations, selected existing provider-feed offers, precise hotel-search preparation and input-based cost calculators. **What is not claimed:** an approved hotel inventory API, native bookings, a live restaurant reservation feed, verified city-by-city outlet inventory, checkout-tested discounts or guaranteed availability. There were no programme applications, merchant contacts, paid services, bookings or real payments during implementation.

## 2. Persistent navigation, without another mobile bar

A single global destination dock provides **Shop · Hotels · Dining · Deals · Saved**. It replaces the previous page-specific phone bottom bar, rather than stacking with it. It remains visible on public, account, owner, error and offline application screens.

- Phone: compact full-width dock with five minimum 44px touch targets and bottom safe-area spacing.
- Desktop: a compact centered floating dock; the content reserves bottom space.
- The existing install invitation and deals strip remain fixed at the top. Their breathing animation, pause preference, reduced-motion behavior and typing/dialog quieting are preserved.
- The active destination has a warm highlighted state. Hotels uses gold; Dining uses berry/rose.
- Switching directly between Hotels and Dining carries the selected city in the URL. It does not carry dates, guest details, calculator amounts or dining-brand filters into the other section.
- The global dock/ticker/installation-guide navigation checks unfinished sensitive forms. Hospitality additionally warns before discarding date/calculator entries. This is not a claim that every browser-close action or arbitrary link is guarded.
- Hotels and Dining are lazy route modules, not additional homepage feeds. The original shopping page is not redesigned. PWA static precaching may download their public code; it does not open the sections or cache their live API data.

## 3. Hotels & Stays: /stays

**Headline:** “Make the stay worth the trip.” Ivory, warm gold, editorial serif headings and an original architectural illustration create the distinct hotel experience without introducing black, blue, stock photography or unlicensed property imagery.

### Search preparation

Choose one of the nine city regions. Delhi NCR additionally offers New Delhi, Gurugram or Noida for the prepared search. Enter arrival/departure, 1–8 adults, 1–4 rooms and up to four children with explicitly entered ages 0–17.

The form rejects impossible dates, past arrival, missing child ages and stays outside the supported 1–30-night range. It does not assume child ages. A successful submission prepares an official Booking.com search URL carrying the selected destination, dates, occupancy, child ages and INR currency preference. **The user must explicitly choose the provider link.** No room is reserved or paid for. The provider must reconfirm room allocation, availability and terms.

Changing search inputs invalidates the prepared link. Dates use the India calendar boundary. Booking.com is an ordinary non-affiliate directory/search destination here, not a claim of Demand API access or an approved partner integration.

### Provider choices and offers

MakeMyTrip city guides, Cleartrip Hotels and ITC Hotels provide additional official starting points. These directory links do not carry the entered travel dates or guest details. The Delhi guide is identified as Delhi, not a promise that it includes all NCR municipalities.

The existing travel feed contained electronics and baby products misclassified as travel. The new section does **not** trust that group label alone: only the explicitly allowed **Cleartrip Hotels and ITC Hotels** merchant identities can enter the hotel offer panel. An acceptable row also needs an allowed listed/community/moderator state, a real outbound destination, a valid non-expired stated expiry and no future/malformed start date. Unknown validity is withheld rather than presented as current.

Five eligible provider listings were observed in the public feed during implementation. This is a dated observation, not a promised permanent offer count. The underlying broad travel classifier elsewhere is unchanged; the hospitality selection boundary prevents it contaminating this new panel. Generalized, mixed or overseas suppliers are deliberately withheld from this first hotel selection.

Each card says **provider listed**, exposes its published expiry and terms/unknown conditions, and says it was not checkout-tested by DealMosaic. City, property, dates, payment eligibility and offer availability must be checked externally. Imported provider headlines may combine a discount with conditional cashback; the interface explicitly keeps cashback separate from money off today.

### Full-stay quote calculator

Users enter two room totals for the entire stay plus extra mandatory charges. Results compare **entered totals**, not live quotes or guaranteed best hotels. Blank extras are treated as zero and explicitly not confirmed absent. The user must match dates, guests, room, inclusions and cancellation conditions. Changing an input clears the previous result.

## 4. Dining & Food: /dining

**Headline:** “Big cravings. Smarter spending.” A warm rose/cream surface, berry accents, original dining illustration and original generic food glyphs distinguish it from Hotels and Shopping. The artwork is decorative, not a venue photograph, menu image or copied brand logo.

The directory offers brand/cuisine search, Restaurant versus Quick bites filters, individual brand selection and a Dine in/Delivery/Takeaway preference. These choices change the relevant official destination; they do **not** manufacture outlet or service availability. When an ordering page is not listed, the action explicitly asks the user to check outlet services instead.

- McDonald’s uses the official India regional gateway, not the broken/incorrect India path on the US site. North/East and West/South services are distinguished in the copy.
- Mainland China points to its official parent, Speciality Restaurants, rather than relying on the unconfirmed mainlandchinaindia.com destination.
- KFC, Pizza Hut and Wow! Momo have official locator destinations; Domino’s has an official store-location page.
- Chinese Wok uses its official locate/order destinations. Taco Bell uses its official India domain. Barbeque Nation uses its official restaurant site.
- Select the city or exact address again at the provider. Brand inclusion is not a partnership, an offer, or verified coverage in every selected city.

Selecting a specific brand requests the existing offer feed and then applies exact allowed merchant identity matching. A grocery listing that mentions a restaurant name is not accepted as that restaurant's coupon. An empty feed result says only that no matching current code was available from the feed checked; it does not claim the merchant has no offers.

### Discount-cap bill calculator

Enter eligible food spend, discount percentage, an optional cap, optional minimum eligible spend, excluded items, and the provider's final taxes/fees. The calculation applies the percentage only to eligible items, respects the cap/minimum and adds excluded items/charges without discounting them. An explicit zero cap differs from an unspecified cap. Conditional cashback and rewards are not subtracted.

It does not calculate statutory tax or determine merchant eligibility. The input explicitly asks for **final** taxes/fees after discounts. Blank extras mean zero for the estimate; they do not prove fees are absent. Amounts are INR, limited to ₹10 lakh per field and two decimals. Negative, exponent, malformed and over-limit inputs are rejected. No payment or order is initiated.

## 5. Freshness, privacy, accessibility and commercial disclosure

Offer panels refresh after five minutes and when the document becomes visible; hidden tabs do not keep polling. Superseded requests are aborted. Expiry timers remove stale promotions without navigation. Failure states provide a real retry and do not masquerade as a successful empty feed. Offline mode removes current offers and disables official external actions. The existing cold-offline recovery screen remains authoritative; these sections are not promised as offline inventory.

City/brand selections can appear in the URL. **Copy city link** constructs a clean link with only those selections, excluding dates, child ages and calculator values. Dates and entered amounts stay in page memory and are not stored in the DealMosaic account, local storage or backend. Search details reach the named hotel provider only when its link is chosen. No location permission is automatically requested.

Official directory links are non-affiliate. Separately labelled provider-feed offer buttons reuse the existing `/api/go/{id}` tracking route and `sponsored nofollow noopener noreferrer` protections. No private affiliate approval is assumed, no new campaign application was submitted, and commission does not control directory order. Existing backend tracking/approval rules still apply. A read-only check of existing cached campaign records found Cleartrip Hotels and ITC Hotels marked `open`, last synced on 2 November 2026. This is not a live payout test, direct partnership announcement or hotel inventory API approval; campaign eligibility and validation still govern any earnings.

Privacy, terms and disclosure were updated in both React and no-JavaScript prerender content. The warm design audit includes the new stylesheet and five additional AA text pairs. The site remains usable without motion; no hospitality animation, false urgency, reviews, ratings or fabricated prices were added.

## 6. Source and recovery map

| File | Responsibility |
|---|---|
| `apps/web/src/routes/Hospitality.tsx` | Lazy Hotels/Dining screens, provider panels, forms, calculators and original vector illustrations |
| `apps/web/src/lib/hospitality.ts` | Nine-region directory, brand destinations, validation, search URL and cost/offer rules |
| `apps/web/src/design/hospitality.css` | Premium hospitality styling, responsive grids and warm contrast |
| `apps/web/src/components/EngagementBar.tsx` | One global dock, active states, city carry-over and conservative navigation guard |
| `apps/web/src/components/Chrome.tsx` | Previous BottomNav becomes a compatibility placeholder to prevent duplication |
| `apps/web/src/App.tsx` | Lazy `/stays` and `/dining` routes |
| `apps/web/public/_worker.js` | Edge SPA routing without false 404s |
| `scripts/generate-seo.mjs`, `scripts/prerender.mjs` | Two canonical pages and matching static policy content; no thin city URLs |
| `scripts/verify-pwa-parity.mjs` | Checks hospitality JavaScript and CSS parity, alongside commerce parity |
| `apps/web/tests/hospitality.test.ts` | 58 pure directory, date, money and offer-boundary cases |
| `tests/hospitality/experience.spec.mjs` | Cross-engine hospitality interaction, geometry, accessibility and privacy checks |
| `docs/audits/2026-11-04-hospitality-destinations.json` | Dated public URL observations and their limits |

The source preserves existing brand artwork; new illustrations are editable SVG markup in the repository. No paid asset, API or infrastructure was added. Backend/DB schema and direct-sales settings are unchanged. Never replace Turso with D1 as part of recovery.

Release verification, deployment identifiers and archive checksums are recorded in section 9. Recovery retains the prior verified 2.1.1 PWA/classic pair, source tag and Git bundle, as well as earlier 2.0.1 and original website references. The current-feature classic archive must retain hospitality functionality while removing the offline worker safely at the same origin.

## 7. Phone-sized owner tour

1. Open DealMosaic normally. Scroll down: **Install app** and the deals strip stay at the top; the five destination buttons stay at the bottom.
2. Tap **Hotels**. Choose Jaipur or another region, then **Plan my stay**. Enter dates and guests. Prepare the search, inspect the details, and only then choose whether to open the provider. There is no reservation at this stage.
3. Read a provider-listed offer's terms. Compare two quotes you found using the entire-stay cost and mandatory extras. Do not add conditional cashback to the instant discount.
4. Tap **Dining** directly. The selected city follows. Find Chinese Wok, a pizza chain, Mainland China or another directory brand. Select your intended dining mode and confirm the exact location on the official site.
5. Use the bill calculator with the offer actually shown to you. Include its cap, minimum and exclusions; add the final taxes/fees. The result is an estimate from your inputs.
6. Tap **Shop**, **Deals** or **Saved** without returning home first. The original shopping features remain. Unsaved hospitality inputs are not a stored trip plan.
7. For the physical-device check, use your Android browser and installed home-screen app. Check the keyboard, back button, date picker, safe areas and provider/app handoff. Browser automation does not certify a real phone or a real booking.

## 8. Exact remaining limits and source-check caveats

- No approved live hotel inventory API, room/amenity catalogue, native booking/payment, native restaurant reservation or confirmed outlet-level feed has been introduced.
- Discovery in nine regions is not verified inventory for all brands in all regions. No prices, stars, reviews, saving amounts or partnerships were invented to fill the gap.
- Public URL checks found some ordinary HTTP 200 destinations, but also timeouts and HTTP 202/403/429 responses. These results are recorded, not disguised as full end-to-end verification. In particular, MakeMyTrip checks timed out, Taco Bell/Cleartrip returned 403, and Chinese Wok returned 429 to direct automated requests. Readable official sources were reviewed separately where available. No CAPTCHA, rate-limit or access restriction was bypassed. A physical-browser provider handoff is still a necessary user-side check.
- The broad existing travel classification is not repaired globally in this frontend release. The new panel's tested strict merchant boundary excludes its misclassified goods. Changing upstream classification should be a separately tested backend change, not an unreviewed expansion here.
- Native install sheets, external provider apps, OS/browser chrome and a browser with all cached code removed cannot display an in-site navigation bar.
- Revenue depends on approved attribution, eligible completed transactions and programme validation; directory links alone do not earn commission. No earnings or ranking guarantees are made.
- Direct-shop owner inputs and earlier missing shipping/payment automations remain as documented in documents 33–36. This release does not silently enable the paused shop.

## 9. Verification and publication ledger

**Implementation checks completed before packaging:** 479 unit tests across 32 files; TypeScript checks; 48 warm-design assertions; 39 hospitality interaction scenarios across Chromium 320px/desktop and WebKit 390px; 48 existing shopping/owner interaction scenarios on the Vite preview. Production-built and live results are recorded separately below; these development results are not substituted for them.

All mutation-oriented business tests use the isolated local test database. The initial simultaneous API/fixture startup hit a SQLite lock; it was resolved by stopping the test API, seeding fixtures separately and restarting it. The first hospitality test pass also exposed test locator/hydration timing and currency-format expectations, corrected with accessible combobox roles, awaited rendered state and integer-friendly INR formatting. The full subsequent development suites passed without retries or skips. Screenshots were reviewed and deleted.

The production-built WebKit failure-injection checks initially bypassed page-level request mocks after the service worker took control, returning the real local empty feed instead. The hospitality interaction harness now blocks service workers for deterministic mocked API scenarios. The separate PWA suite keeps real workers enabled, including dedicated cold-offline checks on both hospitality routes; live read-only checks also use normal workers. This separates UI failure injection from actual worker certification rather than claiming a mocked request exercised the worker.

The classic-build cross-engine check also required awaiting React’s canonical-metadata effect on the local preview: prerender intentionally starts with the real public canonical, then the local runtime updates it. The assertion still requires the exact correct URL, but now waits for that effect instead of treating an intermediate hydration frame as final. This post-build test-harness refinement does not change the release application bytes.

### Production build and interaction gates

- Runtime source/tag: `882b6b31bb49c72f0fa948e5e860ea79449af5e0` / `pwa-v2.2.0`. The paired archives were generated from a clean tree (`workingTreeChanged: false`). Subsequent audit/handover commits retain the final evidence and test-harness refinements without changing application code.
- PWA build: **2.2.0-81b6e3913008**, **767,853 bytes** of safe static precache data; 14 static assets and no API data.
- Classic build: **2.2.0-60ef862eb530**, the same hospitality/commerce behavior with the network-only removal worker. Metadata lists 765,843 static bytes; this is not a classic offline cache.
- **57 HTML files per flavor**, 56 unique h1 values, 54 prerendered pages and 53 sitemap URLs. There are two new canonical hospitality pages, not nine duplicate location pages.
- **45/45 production-built hospitality cases**, **39/39 persistent-control cases**, **51/51 real-worker PWA cases**, **46/46 production-built shopping/owner flows**. No failures, skipped cases or retries in these final runs. Suites overlap; do not add them together as distinct user journeys.
- The 48-case Vite shopping run includes two component-injection cases intentionally excluded from the 46-case static-build run.
- PWA/classic parity compares hospitality JavaScript and CSS separately, alongside existing direct-commerce code, identity and cache-safety contracts.
- Vite reports a main-bundle advisory at roughly 503 KB raw / 153 KB gzip. Hospitality itself remains a lazy module (about 30 KB raw / 10 KB gzip plus 9.5 KB CSS raw / 2.3 KB gzip). No warning was hidden by raising a limit. Further splitting of legacy eager routes is a performance opportunity, not a claim of a measured user-facing failure.

### Paired deployable archives

Directory: `/home/user/releases/dealmosaic-2.2.0/`. Both archive checksums were verified with `sha256sum -c SHA256SUMS`.

- PWA SHA-256: `f30a8e808e43c2db8bc52de1e20a12ce5b600ce083a29108502e8becab08e8aa`.
- Classic SHA-256: `9cd2cf448446e58ae07ebf56fd9f72bb1a72efd8823ca65d7705dc16c3c8d448`.

Keep the 2.1.1, 2.0.1 and original website recovery bundles. Do not deploy old website files alone over a PWA: use the appropriate classic archive/removal worker and preserve the backend and user storage.

### Published release and live verification

- Published at **https://dealmosaic.pages.dev**, with **/stays** and **/dining**. Cloudflare Pages deployment **07ae339c**, immutable URL **https://07ae339c.dealmosaic.pages.dev**. Live metadata matches **2.2.0-81b6e3913008**.
- The first immediate post-deployment check still saw the preceding 2.1.1 metadata and stopped, rather than certifying the wrong release. A subsequent read confirmed the new build before the complete live checks ran. No redundant deployment or application rollback was needed.
- **45/45 classic hospitality interaction cases** also passed, with no skipped/flaky cases. Both deployable flavors retain the same new features.
- **6/6 live hospitality route/viewport states**, checked at top and bottom in Chromium 320px, Chromium desktop and WebKit 390px: one five-link dock, correct selected city/canonical, truthful offer labels, secure outgoing-link attributes, no overflow, no JavaScript errors and no accessibility violations. Five currently eligible hotel-feed listings were visible in these dated checks; no dining inventory count was invented.
- **42/42 live persistent-bar route/viewport states**, each at top and bottom, including Hotels, Dining and the real 404 page.
- **6/6 live PWA online/offline states** across Chromium and WebKit, 14 safe static cache entries, **zero API cache entries**, and no Chromium installability errors.
- **69 live public rendering/accessibility states, zero findings**, including the 53 sitemap URLs and additional account/error/install entry states. This is read-only rendering coverage, not a claim of 69 separate transactional tests.
- Backend remains Render **dep-dblhapnf3r2c73a5csa0** / **00711adc7557ac6882a890c7436875232cc7d656**. The direct shop remains paused/empty; no production test products, orders, payment references, email probes or push notifications were created.
- Evidence is in `docs/audits/2026-11-04-hospitality-*.json`. Physical Android/iPhone OS installation, keyboard behavior and real provider/app handoff are not certified by these browser checks.

### Recovery artifacts and final housekeeping

The source backup and complete-history Git bundle described in the recovery dossier accompany the paired deployment archives. Final handover/PDF bookkeeping may follow the source archive; the final Git bundle includes those subsequent documentation commits. All screenshots are reviewed then deleted, and isolated test servers are stopped.

The final PDF audit exposed several pre-existing long command lines and table-code fragments running past the page edge in older handover chapters. The shared renderer now wraps preformatted lines for visual display and wraps long table words; the Markdown remains the authoritative unaltered code. `scripts/validate-handover-pdfs.py` checks every contents entry against its actual page and checks text bounds in all individual documents and the combined set. This is a documentation fix only; no additional frontend deployment is required.

**Verified 2.2.0 source archive:** `backups/dealmosaic_2026-11-04_15-15-37.tar.gz` — 348 files, 1,872,272 bytes; SHA-256 `b87da9aa98a91ce205c96d3b188c0734cba05efd10fcabc40f54ffc0756240a2`. The archive contains application source, final test/live evidence, the PDF wrapping fix and the first complete PDF validation. Final backup notes and PDF bookkeeping follow the archive and are included in the final Git history/bundle.

**Complete-history recovery bundle:** `backups/pwa-v2.2.0.bundle`, with `.bundle.sha256`; it preserves the runtime tag and final documentation commits. The preceding source bundles and paired deployment packages are retained.

**PDF delivery:** `37-hotels-and-dining.pdf` plus the fully regenerated `DEALMOSAIC-handover-set.pdf`; 18 PDFs in the set. All contents entries and text bounds are checked by the committed validator.
