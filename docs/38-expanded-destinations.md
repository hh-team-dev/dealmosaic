# DealMosaic 2.3.0 — More destinations and local dining

**Date: 4 November 2026.** Shared website / PWA / classic release. This is the current expansion handover; document 37 retains the preceding hospitality implementation and its dated verification.

## 1. What changed

Both **Hotels & Stays** and **Dining & Food** now expose **17 selectable destinations**. The eight additions are Mysuru (Mysore), Bhubaneswar, Visakhapatnam (Vizag), Jamshedpur, Siliguri, Haridwar, Gurugram (Gurgaon) and Noida. Hyderabad was already supported and remains one choice. Delhi NCR is retained and overlaps the separate Gurugram and Noida choices: this is not a claim of 17 non-overlapping metros.

Hotel planning, date/guest validation, provider city guides, city-only sharing and Hotels–Dining carry-over apply to the expanded list. Siliguri queries explicitly specify **West Bengal, India**; other additions also include their state and country. Links using `mysore`, `bhubaneshwar`, `vizag` and `gurgaon` resolve to the canonical destination. Frontend and prerender consume one shared city JSON file, preventing the visible list and static SEO copy from drifting apart. There are still only two canonical hospitality pages, not a set of thin city pages.

## 2. Local restaurants, not only chains

Dining now starts with four city-specific discovery choices:

- Local restaurants, including places beyond the chain directory.
- Vegetarian restaurants.
- Cafés and bakeries.
- Fast food and quick bites beyond the named chains.

An optional restaurant name, cuisine or neighbourhood refines those searches. It stays in page memory, resets when the city changes, and is excluded from Copy city link. Search terms are sent to the external provider only when the visitor chooses a search. The nine named chains retain their official website/order/locator links and also gain a separate city-specific map search, including KFC and McDonald’s.

**Important boundary:** these are useful external discovery searches, not an imported restaurant inventory, a comprehensive list of every venue, verified branch coverage, live menus, live prices or guaranteed offers. Results may include independent restaurants and chains. In particular, a KFC/McDonald’s search link does not claim either chain has an outlet in that destination. Confirm the address, current hours, menu, service and conditions with the restaurant. Delivery serviceability is not established by a map result.

## 3. Cost, privacy and preservation

Google Maps is used only as an explicitly labelled external search destination. No Maps/Places SDK, embedded Google map, API key, paid API, geolocation request or automatic restaurant search request has been added. This does not change the existing preference for OSM/Leaflet for any future in-site map; there is no in-site restaurant map in this release. The documented Maps URL interface needs no API key: https://developers.google.com/maps/documentation/urls/get-started.

Outgoing links encode user text as a query parameter under a fixed HTTPS origin, open with `noopener noreferrer`, and are disabled when the app reports offline. Search text is bounded to 100 characters. Privacy disclosure and unsaved-entry navigation copy have been updated. No booking, ordering, payment, notification, restaurant contact, affiliate application or paid service was performed.

The warm hospitality designs, original illustrations, persistent install/deals bar, global five-link dock and shopping design are preserved. Backend, seller/payment/shipping configuration and the paused direct shop are outside this frontend expansion.

## 4. Browser checks and provider limits

Implementation gates: **514 unit tests / 32 files**, TypeScript checks and **48 warm-design assertions** pass. **57/57 development hospitality browser scenarios** pass across Chromium 320px, desktop and WebKit 390px. These cover all destinations, aliases, geography, local and chain searches, zero automatic Google requests, city-only copying, refinement reset, offline actions, accessibility and existing planners/calculators.

Provider URLs are not a transaction certification. Search results identified the Bhubaneswar, Visakhapatnam, Jamshedpur and Gurugram domestic guide paths: [1](https://www.makemytrip.com/hotels/bhubaneshwar-hotels.html), [1](https://www.makemytrip.com/hotels/visakhapatnam-hotels.html), [1](https://www.makemytrip.com/hotels/jamshedpur-hotels.html), [1](https://www.makemytrip.com/hotels/gurgaon-hotels.html). Direct text retrieval of the Mysore, Siliguri, Haridwar and Noida domestic paths returned only a `200-OK` body, not readable inventory. Those four pages are **not content-verified or end-to-end verified**. The hotel planner provides a separate date/guest search on Booking.com. No provider prices, reviews, availability counts or discounts were copied from search snippets. No restriction was bypassed.

## 5. Phone-sized walkthrough

1. Open **Dining** from the bottom dock, then choose a destination. Try Siliguri: searches should name West Bengal.
2. Choose **Local restaurants**, or refine with a neighbourhood. A labelled external search opens only when selected.
3. Scroll to the chains. Their official links remain; **Find [brand] in [city]** opens the separate city search. A search is not proof of a branch.
4. Switch to **Hotels**. The city carries across; add dates/guests and prepare the provider search.
5. Try Gurgaon/Mysore/Vizag city links. They select Gurugram/Mysuru/Visakhapatnam. Gurgaon and Noida are independent choices as well as part of NCR grouping.
6. Copy city link: no guest, date, bill or local-search text should appear in it. Changing city clears local refinement. Offline, provider actions show reconnect guidance.

Real Android/iPhone installation sheets, keyboards, external provider apps and provider transactions remain physical-device checks; browser automation is not represented as a physical phone test.

## 6. Publication and recovery ledger

Runtime source/tag: `e6baee38e84da6b5ef4822ecad398d4295c2b1f8` / `pwa-v2.3.0`. Packages were built from a clean source tree (`workingTreeChanged: false`).

- **57/57 production-built hospitality scenarios** and **57/57 classic hospitality scenarios** pass.
- **39/39 persistent-control**, **51/51 real-worker PWA** and **46/46 production-built shopping/owner** scenarios pass. These suites overlap, so counts are not additive unique journeys. Two Vite-only component injection cases are intentionally outside the static-build shopping suite. All mutation-oriented tests ran against the isolated local fixture database, never production.
- PWA/classic parity and both archive SHA-256 checks pass. Each flavor has 57 HTML files and 56 unique h1 values; the sitemap remains 53 URLs.
- PWA build: **2.3.0-33240826e285**, 774,037 safe static bytes, 14 assets, no API cache.
- Classic build: **2.3.0-b9f48fc99d99**, network-only removal-worker fallback with the same features. Its listed static-byte total is not an offline cache.
- Package folder: `/home/user/releases/dealmosaic-2.3.0/`.
- PWA archive SHA-256: `6a30ae19bc4028e2c96bc25889e0c0f2135a9406e8bd4653a1500cf9984e8f2d`.
- Classic archive SHA-256: `ae0ea060ff85c1878eb8545cda606aacb7f53d6949974a22c425c91b44db0263`.
- The existing main-bundle advisory remains about 503 KB raw / 153 KB gzip; no warning threshold was raised. The lazy hospitality module is about 35.5 KB raw / 11.7 KB gzip, with about 10.4 KB CSS raw.

Live verification and recovery completion are recorded below only after publication.
