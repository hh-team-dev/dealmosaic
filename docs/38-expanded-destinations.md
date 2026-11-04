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

Paired build, production verification and recovery details are recorded here after their gates complete. The preceding verified release remains 2.2.0; no completion is inferred from a visible development control.
