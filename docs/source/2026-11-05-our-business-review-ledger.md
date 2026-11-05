# Our Business 01 / 02 review ledger — 5 November 2026

## Attachments

- `our business 01.pdf`: 8 pages, all available text read; pypdf and PyMuPDF both confirm the final page ends `Your Solution: Ne`. SHA-256 `5b747b03210fc57a681bff164b26e375cf9e6fbcae2d6a85c2c496a7f23cafaa`.
- `our business 02.pdf`: 9 pages, all read through the final recommendations. SHA-256 `e2c76a07995ad832f30ce03c3f224aa9beeffa0a3a6bc64d8a76ce5cafd577b1`.
- Normalized extracts and bounded account audit: `/home/user/research/our-business/`. These documents are research suggestions, not contractual permissions or evidence of earnings.

## Sources actually inspected

1. https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook — fetched chunk 0, including the explicit closure date, hotel API/widget shutdown and old white-label hotel-tab removal. No need to call retired APIs or install a broken widget. Other network brands are separate.
2. https://support.travelpayouts.com/hc/en-us/articles/360021216060-How-to-start-working-with-affiliate-programs — fetched chunk 0. April 27, 2026 workflow change: automatic relevant-programme connections, instant-access/review/unavailable categories. No blanket promise of all-brand access.
3. https://blog.google/products/adsense/evolving-how-publishers-monetize-with-adsense/ — fetched chunk 0. November 2023 announcement of per-impression publisher payments; not interpreted as guaranteed income or the pricing of every ad product.
4. https://support.google.com/adsense/answer/6242051?hl=en — fetched fully. Free participation, site review, differing ad prices, ad-click/impression distinction, no own-ad clicking; publisher policies apply.
5. https://www.cuelinks.com/campaigns/tripadvisor-1-affiliate-program — fetched fully. Germany CPC campaign 32358, paused, dynamic headline payout. Search snippet and fetched headline differed; neither is treated as DealMosaic's contractual payout.
6. https://www.stay22.com/ — both chunks read. Official FAQ: no upfront/subscription fee, no credit card required for signup, commission model, supplier availability varies by product/destination/market, completed-stay payout eligibility and threshold. Marketing testimonials are not forecasts. No account, script, map, automatic tab or rewriting installed.
7. https://www.cuelinks.com/campaigns/trivago-affiliate-program — fetched chunk 0. Campaign 2516; public CPS label and detailed “CPC (Cost-per-Clickout)” definition; View prices/View deals clicks recorded as orders; India listed; text/banner permitted, Deals/Coupons/cashback/social/email/pop/paid-search categories restricted. Public tracking symbols distinguish web/mobile web from native apps. Deep-link permission is distinct from the paid-search policy's direct-linking restriction. India-specific category payout remains account/contract dependent. Published validation 55 days from following month and payment 60 days after validation are not immediate-cash assurances or a verified DealMosaic settlement schedule.
8. https://www.cuelinks.com/campaigns/theparkhotels-affiliate-program — fetched fully. Campaign 25058; India, CPC heading, no deep linking, not-applied in account scan. Public “successful booking” payout category/purchase flow conflicts with the CPC heading. No activation without clarification.

## Failed or limited checks

- https://www.tripadvisor.com/affiliates and https://www.tripadvisor.com/affiliates.html returned 404 content. This does not establish that all Tripadvisor programmes closed. Third-party descriptions of CJ click-out arrangements are leads only; current DealMosaic approval/terms were not established.
- https://www.cuelinks.com/campaigns/tripadvisor-affiliate-program failed to fetch. Not used as confirmed evidence.
- vCommission, Admitad and EarnKaro authenticated account terms were not inspected, and no account was created.
- The first CPC-only sample covered 1,500 records and was explicitly partial. It is superseded by the completed scan below, not combined into a misleading larger count.

## Authenticated account audit

`scripts/audit-hospitality-monetisation.mjs` used the existing token privately for GET requests to the documented campaign list, spaced at least 11.5 seconds apart. The API actually returned 500 rows per full page. It followed no tracking URLs and sent no applications or mutations.

Final window: 2026-11-05T11:53:01.470Z to 2026-11-05T12:04:24.741Z. CPC: 47/47 pages, 23,127 rows, 2 open; 35 explicitly India-listed, zero India-listed/open. CPS: 4/4 pages, 1,882 rows, 1,541 open; 619 India-listed and 531 India-listed/open, across all categories. Relevant hotel records and countries are retained in the research file; compact metadata and hotel rows are in `2026-11-05-hotel-monetisation-account-audit.json`.

**Critical interpretation:** “CPS” can encode a downstream click-out as an order. Trivago's open status and India inclusion are promising, but its deals/coupons restrictions are material for this publisher. No statement that all click revenue requires a hotel booking, or that all first clicks are payable, is justified. The owner enquiry asks explicitly about DealMosaic's actual publisher type and proposed organic, coupon-free comparison placement. No page relabelling is used to bypass a restriction.

No paid service, new programme application, terms acceptance, bank/identity collection, provider scrape, CAPTCHA bypass, live booking, affiliate self-click, financial-product recommendation or customer message was performed.

A separate authenticated SELECT against the existing production Turso database returned zero coupon rows for campaign IDs 2516 and 25058. It followed no links and changed no records. The network scan is paginated and non-atomic; “complete” means all reported pages were read, not a guarantee that the catalogue could not change during the scan.
