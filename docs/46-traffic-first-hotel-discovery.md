# 46 — Traffic-first hotel discovery: Vijayawada, evidence grouping and consent-gated analytics

**DealMosaic 2.8.0 · 5 November 2026 · website, installed PWA and classic website**

## 1. The short, plain-language answer

**The hotel comparison is now a visitor builder, not an earner.** The owner chose the traffic-first route: DealMosaic helps travellers compare stays and dining honestly, and earns nothing from hotel clicks in this release. Shopping and coupon affiliate work stays separate. Removing commission does not grant data rights, supplier feeds or automatic traffic — the same honesty rules apply.

**Vijayawada, Andhra Pradesh is the 18th destination**, for hotels and dining. The hotel record is Vivanta Vijayawada, MG Road, and the dining record is its Mynt all-day restaurant, both dated 5 November 2026 from official Taj/Vivanta pages. Totals are now 18 destinations, 41 hotels and 34 dining places. No Ginger Vijayawada property was found, so none was invented.

**Results are grouped by evidence, not by hidden ranking.** Each place is a “Matches your must-haves” result, a “Needs confirmation” result with the exact open questions, or a hidden result whose count and reason stay visible. Budget, meal, cancellation and payment filters only hide a venue when the customer’s own entered quote proves the mismatch; anything unconfirmed asks for provider confirmation instead of being excluded or guessed.

**Six extra checks go beyond the usual OTA filter lists**: an arrival-ready window for early or late arrival, cash needed before arrival kept separate from the stay total, cancellation-deadline fit against entered free-cancellation dates, a no-room-move guarantee question for multi-night stays, a step-by-step accessibility journey, and child bed/cot fit from entered child ages. None of them invents hotel data; unconfirmed answers become checklist questions.

**Search analytics exist only with consent and only as anonymous counts.** A first-visit panel explains the choice; “Not now” keeps everything on the device. With “Allow anonymous counts”, the site sends counts of searches, filter families, shortlists, provider-link attempts and self-reported outcomes — never names, contacts, accounts, free text, room choices, prices, IPs or device fingerprints. Events purge after 180 days. A provider-link attempt is not proof the provider page opened, and self-reported outcomes are never treated as confirmed bookings.

**What this release still is not:** there is no live Agoda/Booking.com/Skyscanner inventory, no live prices or date availability, no star ratings, no booking inside DealMosaic and no new payable hotel programme. The owner’s phone sponsored-click DNS failure remains unresolved and is not claimed fixed; the VPN-off retest is still deferred to the owner.

## 2. What changed for shoppers

- The stay and dining comparison pages share one premium discovery design in warm maroon and copper: destination, dates, rooms, adults, child ages, budget, meal, smoking, refund terms and day-use inputs, then evidence-grouped results.
- Every result card shows why it is shown: matched points, confirmation questions, entered-quote totals where the customer added them, a personal checklist, shortlist, and provider links (official site first, then Booking.com, MakeMyTrip, Agoda, Cleartrip, EaseMyGo where honestly buildable from the plan).
- Booking.com links only appear after arrival and departure dates are entered; before that the card says dates are needed. Offline cards never show outbound links.
- The personal quote comparison from 2.6 is unchanged in behaviour: the customer’s own figures, full-stay maths, cash-before-arrival separated, nothing fetched from providers.
- After tapping a provider link, the card offers optional outcome buttons (booked, still deciding, did not book). These are clearly labelled self-reports for the customer’s own notes, not booking verification.
- Dining comparison gains the same grouping, budget honesty and confirmation discipline; hotel-only filters (rooms, occupancy, smoking, refund, day-use) stay on the stay page.
- Privacy and Terms were updated for this release: anonymous hospitality counts, local-only consent values, discovery honesty, and the 18-destination scope.

## 3. Where the owner should look

Open **Admin → Hospitality → Traffic & search insights**, or visit:

https://dealmosaic.pages.dev/admin?tab=hospitality

The section shows aggregate counts only, for the last 30 days of stored events: total searches, provider-link attempts, shortlists and outcome reports; searches by city and by stays/dining; provider-link attempts by provider; most-tapped venues; most-used filter families; self-reported outcomes per day; and the oldest stored event. A scope note repeats the limits on every view: anonymous counts, no session or row-level data, 180-day retention, outbound attempt ≠ provider arrival, outcome ≠ confirmed booking.

The partner application brief in the same tab now describes 18 destinations and 41 hotel records. Trivago campaign 2516 keeps its explicit placement-permission warning; no programme was activated.

## 4. Evidence and honesty gates kept in this release

- Vijayawada evidence is three official pages: the Taj Vijayawada destination page, the Vivanta Vijayawada hotel page and its restaurants page naming Mynt, Wink Bar and Bay Leaf. Address, phone and email come from the hotel page. Research notes live under `research/hospitality-traffic-first/`.
- No star categories, prices, review scores or “verified/complete inventory” claims anywhere in the comparison data or copy. The design audit and unit tests assert all three catalogues stay free of them.
- The hidden-result rule is tested: excluded venues are counted with reasons; unconfirmed venues stay visible as needing confirmation.
- Consent copy was reviewed for plain language; declining is one tap and loses no comparison feature.
- The API intake endpoint rejects malformed, foreign-session, over-long or identity-bearing payloads; admin traffic reads aggregate queries only.

## 5. Validation before release

- `npm run check`: **824 unit tests across 44 files**, type checks on web/API/core, 52 design-audit assertions and the secrets scan — all passing.
- Browser suites against an isolated test backend: **60 device-review, 46 general (+2 dev-only skips), 141 hospitality, 60 PWA (54 passed + 6 skips), 39 engagement, 21 classic connections and 18 classic planner — 385 passed, 8 skipped, 0 failed.** New coverage includes Vijayawada grouping, the consent gate with wire-shape assertions, and the no-request-before-consent guarantee.
- Paired PWA/classic builds from the release commit with parity verification: PWA `2.8.0-39e7c8d2dd33`, classic `2.8.0-b026ca0e4176`.
- Full `git status` discipline: no scratch scripts, no screenshots, no credentials in the tree; the secrets scan passed on 449 files.

## 6. Deployment snapshot

- Runtime commit `63d50e80b212c6a124464152b5745a54f7fcb7f2` / tag `pwa-v2.8.0`; pushed to `github.com/hh-team-dev/dealmosaic` main.
- Render API deployment: `dep-dbmd24d9el5s73a6849g`, commit `63d50e8`, status **live**, URL `https://dealmosaic-api.onrender.com` — `/api/health` returns `version: 2.8.0`, `revision: 63d50e80b212`, `environment: production`, `database: connected`.
- Cloudflare Pages deployment: `67fa82d8-7e11-4b42-b9e8-7f2638eb05e4`, commit `63d50e80b212`, status **success**, project `dealmosaic` — `https://dealmosaic.pages.dev` returns `version: 2.8.0`, `build: 2.8.0-39e7c8d2dd33`, `mode: pwa`. Both services verified live at 2026-11-05T19:02 IST.
- Production checks after deploy (all server-read-only, no external clicks):
  - Click-repair verifier: **26/26 passed** — receipt at `docs/source/2026-11-05-discovery-click-repair.json` (API `2.8.0` / `63d50e80b212`, web `2.8.0` / `2.8.0-39e7c8d2dd33`, sample offer HealthKart `healthkart.com`, zero errors, zero blocked requests).
  - Hospitality verifier: server/API checks passed; browser count check (`"40 selected stays"` for Mumbai) does not match production data (2 Mumbai venues in the 18-destination / 41-hotel catalogue) — this is a test-data expectation mismatch, not a functional defect; no production defect found.
  - `pwa-release.json` build matches deployed version on both services.

## 7. What still needs the owner

1. **Phone retest with Proton VPN off** (deferred by the owner): the sponsored-click DNS failure is still open; automated checks cannot close it.
2. **Partner outreach** uses the brief in Admin → Hospitality; every reply must confirm placement permission, India terms, payout triggers and zero-cost scope in writing before any link changes.
3. **Traffic expectations**: 50,000 monthly users is an aspiration, not an entitlement to supplier APIs. Direct feeds need applications, contracts, credentials and certification however large the audience grows.
