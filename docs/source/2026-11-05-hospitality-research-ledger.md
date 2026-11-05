# Hospitality research and factual-source ledger — 5 November 2026

## Owner-supplied research reviewed

- **How they earn01.pdf:** all 7 pages read, normalized extract retained outside the repository in the workspace research folder.
- **how to earn 02.pdf:** all 6 pages read, normalized extract retained outside the repository.
- Both are research inputs, not supplier agreements, content licences or evidence of DealMosaic earnings.

## Primary business sources and the exact inference permitted

| Source | Finding | What it does not establish |
| --- | --- | --- |
| [1](https://developer.agoda.com/demand/docs/getting-started) Agoda Demand, Getting Started | Online Affiliates/MSE uses Search API. Feasibility, credentials, testing, certification, signed contract/AVRF and traffic planning precede live use. Fulfill Assisted adds provider-led charging/support. | DealMosaic approval, free Demand API entitlement, content/photo rights or operational certification. |
| [2](https://partners.agoda.com/en-us/faq.html) Agoda affiliate FAQ | Ordinary affiliate joining is described as no-cost; applications are reviewed; supplied tools/content have terms. Commission follows completed stays. | A universal payout rate, current account terms, payment threshold or automatic API rights. The FAQ also contains historical inventory figures; these are not used as current scale claims. |
| [3](https://developers.booking.com/demand/docs/getting-started/prerequisites) Booking Demand prerequisites | Managed Affiliate Partner; agreed contract; Partner Centre; API token and X-Affiliate-Id. | Ordinary affiliate signup being sufficient for Demand API. |
| [4](https://www.booking.com/affiliate-program/v2/index.html) Booking affiliate page | Free ordinary signup through CJ and commission on eligible referred bookings. Returned page localized to Japanese; the steps and ownership section were read. | Approval, an account payout schedule, native hotel inventory or a signed contract for DealMosaic. |
| [5](https://partner.expediagroup.com/en-us/join-us/rapid-api) Expedia Rapid | Candidate partner technology; evaluate business, operational and commercial terms before selection. Previously reviewed 4 November; no fresh account approval check. | Zero-fee access or fit for the owner's support capacity. |
| [6](https://ir.trivago.com/news-releases/news-release-details/trivago-delivers-16-growth-q3-its-seventh-consecutive-double) trivago, 3 November 2026, Q3 results, chunks 0–1 | €192.5m total revenue; €177.4m referral; €14.0m DEALS; €1.1m other; €5.4m net income; €18.7m adjusted EBITDA. CPC/CPA referrals, direct booking services and smaller hotel-tool revenues. | A transferable click price or an earnings forecast for a new publisher. |
| [7](https://ir.bookingholdings.com/financials/annual-reports/default.aspx) Booking annual-report index; [8](https://s25.q4cdn.com/383369491/files/doc_financials/2026/ar/BKNG_2026-COMBO_WEB.pdf) 2026 proxy / FY2025 report | Full 216-page PDF parsed locally. PDF p10: $186.1bn gross bookings, $26.9bn revenue. P157/p179: $26,917m revenue, $8,186m marketing. P157: 14.5% revenue/gross bookings, 30.4% marketing/revenue. | A standard hotel commission, profit margin or DealMosaic's acquisition costs. Not represented as the latest 2026 quarter. |
| [9](https://www.swiggy.com/corporate/wp-content/uploads/2025/10/Q2-FY2026-Shareholder-letter.pdf) Swiggy Q2 FY2026 shareholder letter — search-index excerpt only, PDF not inspected | Out-of-home definition includes agreed restaurant commissions, ads, user/subscription fees, tickets and business-enablement fees. | Food-delivery commission percentages applying to dine-in; current DealMosaic contracts; a latest-quarter 2026 performance claim. |
| [10](https://www.swiggy.com/corporate/wp-content/uploads/2026/01/Q3-FY2026-Shareholder-letter.pdf) Swiggy Q3 FY2026 letter — search-index excerpt only, PDF not inspected | Confirms a distinct out-of-home business and advertising contribution. | A guarantee of profitability for a smaller dining startup. |

The large Booking PDF was deleted after extraction to keep the workspace light. Its source URL, SHA-256 and relevant page excerpts remain in `/home/user/research/hospitality-architecture/Booking-primary-excerpts.json`. No source financial tables are copied wholesale into the customer application.

## New hotel and dining facts

New data: `apps/web/src/data/hospitality-venues.json` — **17 hotels and 15 dining places**. Existing pet records remain unchanged: **23 hotels and 18 dining places**. Combined native collection: **40 hotels, 33 dining places, 73 unique IDs**. No property prices, reviews, stars, copied photographs, inferred availability or partnerships were added.

### Ginger group directory

[1](https://www.gingerhotels.com/sitemap), fetched and rechecked chunks 0–2 on 5 November 2026, explicitly names the following hotels and their Qmin restaurant links. Facts are limited to names, broad locality in the name and official information URLs. This is **directory-level evidence**, not a fresh visit to every property's page or confirmation of operating hours, menus, accessibility, pet policy, walk-in access or reservation inventory.

| City | Hotel ID; Qmin ID is prefixed `qmin-` |
| --- | --- |
| Delhi NCR | ginger-delhi-chanakyapuri |
| Mumbai | ginger-mumbai-airport |
| Bengaluru | ginger-bangalore-irr |
| Chennai | ginger-chennai-vadapalani |
| Hyderabad | ginger-hyderabad-airport-road |
| Pune metropolitan area | ginger-pune-pimpri |
| Ahmedabad | ginger-ahmedabad-sg-road |
| Jaipur | ginger-jaipur-ajmer-road |
| Mysuru | ginger-mysore |
| Bhubaneswar | ginger-bhubaneshwar |
| Visakhapatnam | ginger-visakhapatnam-gajuwaka |
| Jamshedpur | ginger-jamshedpur |
| Gurugram | ginger-gurugram-sector-1 |
| Noida | ginger-noida-city-centre |

Jamshedpur's [11](https://www.gingerhotels.com/hotels/ginger-jamshedpur/restaurants) restaurant page was additionally fetched: it names Qmin, locates the hotel on Bistupur Main Road and provides current publisher information. Its indicative “price for two” and operating hours were deliberately **not imported as a live meal quote**. It does not establish pet admission.

### Other additions

- Kolkata: **Taj City Centre New Town**, property and address confirmed in [12](https://www.tajhotels.com/en-in/destination/hotels-in-kolkata), chunk 0. Hotel URL taken from that page, with dynamic search parameters removed. **Taj Bengal was not added twice**; its earlier canonical pet-record ID remains.
- Haridwar: **Hari Ganga Niwas**, property/address in [13](https://www.tajhotels.com/en-in/destination/hotels-in-haridwar), chunk 0. Its displayed default-date “sold out” state was **not** treated as general availability information.
- Siliguri, West Bengal: **AltAir House**, opening announcement and Uttorayon Township in [14](https://www.ihcltata.com/press-room/ihcl-ambuja-neotia-announce-the-opening-of-altair-house-ihcl-seleqtions-in-kolkata-and-siliguri), official announcement page dated **30 October 2026**, freshly fetched and read on 5 November. This supersedes the earlier search-index-only evidence. This entry links to the information announcement; no guessed booking endpoint was added. The site does not classify it as a pet-friendly property.
- Haridwar dining: **The Dining Room — Pilibhit House**, named in [15](https://www.seleqtionshotels.com/en-in/hotels/pilibhit-house-haridwar/restaurants), chunk 0. The page's room-calendar rates were **not** imported into hotel comparisons. Pet admission is not established.

New general dining records cover Haridwar and Jamshedpur. **The previous pet-dining evidence gaps in those cities remain**; adding a general restaurant is not pet-policy evidence. Other existing records and their precise page/index review method are in `2026-11-04-pet-source-ledger.md` and `pet-venues.json`.

## Research restraint

No application, contract acceptance, account creation, live reservation, payment, affiliate self-click, new paid service, provider scraping pipeline or CAPTCHA bypass was performed. Source links are not monetised merely because they lead to a hotel. Exact source facts, scope and uncertainty take precedence over marketing claims.

## Final catalogue reconciliation

The fresh directory reads explicitly confirm Chanakyapuri, Vadapalani and Ajmer Road and their individual Qmin URLs; these are not substitutions guessed from earlier East Delhi, OMR or Jaipur entries. The Kolkata destination page was fetched again: City Centre Newtown, Action Area II D, Plot no. 11/5, Newtown, Rajarhat, and the exact canonical Taj City Centre URL match the catalogue. The AltAir announcement was read in full through its relevant property section; its evidence method is now page inspection. Swiggy findings remain explicitly search-index-only secondary evidence, not a claimed inspection of either PDF.
