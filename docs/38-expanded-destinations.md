# DealMosaic 2.3.0 — More destinations and local dining

> **Current 2.4.0 release:** [39-pet-friendly-directory.md](39-pet-friendly-directory.md) covers the sourced pet-friendly directory, separate eligible-offer panels, private planning, verification and recovery. The preceding 2.3.0 destination expansion is preserved in document 38; earlier release evidence below is historical.

**Date: 4 November 2026.** Shared website / PWA / classic release. This records the preceding destination expansion; document 37 retains the preceding hospitality implementation and its dated verification.

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

If an already-open app shows the earlier release, use **Update this window** when offered and when your current form is safe to leave. Do not clear browser data or saved lists.

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

Live publication and recovery details follow below.


The first live audit's fast WebKit city loop read the preceding render immediately after native selection. A focused reproduction confirmed all 17 exact queries after the React route transition committed. The live harness now waits for the exact destination suffix on all four local-search links before its assertions, rather than accepting stale links or adding retries. Application/release bytes are unchanged by this audit-only correction.


## 7. Published release and live checks

- Live pages: **https://dealmosaic.pages.dev/stays** and **https://dealmosaic.pages.dev/dining**.
- Cloudflare Pages deployment: **76a560fc**; immutable URL: **https://76a560fc.dealmosaic.pages.dev**. Public release metadata matches **2.3.0-33240826e285**.
- **6/6 live hospitality route/viewport states** passed across Chromium 320px, desktop and WebKit 390px. All **17 selections in each section** were exercised in each engine/viewport, with exact city-specific local/chain queries checked on Dining, secure outgoing links, one dock, no overflow and no accessibility violations.
- **6/6 live PWA online/offline states** passed across Chromium/WebKit, with 14 safe static entries, zero API entries and no Chromium installability errors.
- **42/42 persistent-bar states** passed at top and bottom, including both hospitality routes and the real 404 page.
- **69 public rendering/accessibility states, zero findings**. Rendering coverage is not transaction certification; suites overlap.
- Read-only Render verification confirms the unchanged live backend **dep-dblhapnf3r2c73a5csa0** / **00711adc7557ac6882a890c7436875232cc7d656**. Public direct-shop state remains products `[]`, seller `null`. No production test product, order, email, payment or push was created.
- Live mobile and desktop layouts were visually reviewed. A separate 390px viewport check confirmed the local-discovery anchor leaves the title below the fixed top controls. All screenshots were deleted; local test servers were stopped.
- Evidence: `docs/audits/2026-11-04-expansion-*.json`. Physical-device/provider handoff remains outside these automated checks.

## 8. Recovery and handover

Retain both 2.3.0 deployable archives, their `SHA256SUMS`, the source archive and the complete-history `backups/pwa-v2.3.0.bundle` with its SHA-256 sidecar. Keep the older recovery points too. Serve the classic removal worker at the same origin if reverting to online-only operation; do not reset the backend or clear user storage.

The source archive contains application source, paired-build evidence, live audit results and the audit timing correction. The final Git bundle also includes subsequent archive/PDF bookkeeping and the PDF validation report. Printable delivery is `38-expanded-destinations.pdf` plus the regenerated full `DEALMOSAIC-handover-set.pdf`; `scripts/validate-handover-pdfs.py` checks contents-page references and text bounds throughout the set.


**Verified 2.3.0 source archive:** `backups/dealmosaic_2026-11-04_15-49-31.tar.gz` — 360 checksum-verified files, 1,943,811 bytes; SHA-256 `ef595dd2c5f7b5678f39be4bcbc9ef87a7af6e8ed8b1cd7ce38bc507595445f2`. Final self-referential archive notes and PDF verification follow this archive and are retained in the complete-history 2.3.0 Git bundle.
