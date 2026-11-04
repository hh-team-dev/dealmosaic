# DealMosaic 2.2.0 — Hotels, Dining and the universal destination dock

**Date:** 4 November 2026. **Release scope:** one DealMosaic website, one shared PWA/classic application, two new hospitality destinations. This document supersedes document 36 as the current enhancement handover; documents 35–36 retain the install/offline architecture and preceding release evidence.

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

Official directory links are non-affiliate. Separately labelled provider-feed offer buttons reuse the existing `/api/go/{id}` tracking route and `sponsored nofollow noopener noreferrer` protections. No private affiliate approval is assumed, no new campaign application was submitted, and commission does not control directory order. Existing backend tracking/approval rules still apply.

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

Release verification, deployment identifiers and archive checksums are recorded in section 9 once publishing checks complete. Recovery retains the prior verified 2.1.1 PWA/classic pair, source tag and Git bundle, as well as earlier 2.0.1 and original website references. The current-feature classic archive must retain hospitality functionality while removing the offline worker safely at the same origin.

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

**Implementation checks completed before packaging:** 479 unit tests across 32 files; TypeScript checks; 48 warm-design assertions; 39 hospitality interaction scenarios across Chromium 320px/desktop and WebKit 390px; 48 existing shopping/owner interaction scenarios on the Vite preview. Final production-built and deployment evidence will be appended after those checks, not inferred from these development results.

All mutation-oriented business tests use the isolated local test database. The initial simultaneous API/fixture startup hit a SQLite lock; it was resolved by stopping the test API, seeding fixtures separately and restarting it. The first hospitality test pass also exposed test locator/hydration timing and currency-format expectations, corrected with accessible combobox roles, awaited rendered state and integer-friendly INR formatting. The full subsequent development suites passed without retries or skips. Screenshots were reviewed and deleted.

The production-built WebKit failure-injection checks initially bypassed page-level request mocks after the service worker took control, returning the real local empty feed instead. The hospitality interaction harness now blocks service workers for deterministic mocked API scenarios. The separate PWA suite keeps real workers enabled, including dedicated cold-offline checks on both hospitality routes; live read-only checks also use normal workers. This separates UI failure injection from actual worker certification rather than claiming a mocked request exercised the worker.
