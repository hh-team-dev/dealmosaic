# 33 — Owner-operated products, pricing and delivery

**4 November 2026 · implementation and operating handover**

## Exact release state

Implemented: an authenticated **My shop** section, product drafts/publishing, size/colour options, ready-stock and made-to-order capacity, persistent photo/short-video uploads, reference-price arithmetic, private minimum-price safeguards, product coupon codes, confirmed-quote comparison, guest single-item checkout, manual UPI reconciliation, private order tracking and audited order actions.

**Sales remain paused by default. No real direct products, delivery rates, bank recipient or live orders have been seeded.** Shipping carrier APIs are **not connected**. The selector works with actual carrier-confirmed quotes recorded in admin; it does not invent current rates or independently verify a manual attestation. Production deployment evidence is recorded at the end of this document when completed.

Owner-confirmed facts: the owner is the seller and payment recipient, may source products from multiple vendors, dispatches from **West Bengal, India**, wants nationwide delivery where permitted/serviceable, prefers the **lowest full shipping charge even if slower**, and uses **manual UPI** with both ready-stock and made-to-order inventory.

## 1. Phone-sized operating guide

Open **`/admin?tab=shop`**, signed in with the owner account. The existing administrator permission is checked on every API request; it is not just a hidden screen.

### Products

1. Tap **Add product**.
2. Add title, description, category, materials, care and actual measurements.
3. Upload real photographs or a short video and give each an accessible description.
4. Set reference-price basis, selling price and the private coupon floor.
5. Add size/colour options, available pieces or making slots, and preparation days.
6. Enter the **packed** weight and three dimensions, not the unpacked product weight.
7. Save as a draft. **No GSTIN is requested.**
8. Publish only once the shop setup and product eligibility basis are complete.

The editor detects stale saves instead of overwriting another change or a newly placed order. An option with an active reservation cannot be deleted; set availability to zero to stop further sales. Drafts and draft media are not public.

### Shop settings

One-time fields: actual seller name/address, support email/phone, grievance contact, exact origin PIN, UPI recipient name/ID, shipping policy, return policy and documented business eligibility. The state is West Bengal. The owner must supply the missing facts; do not substitute the account's display name for a legal seller name or invent an address.

The current checkout is for the owner's stated **unregistered** status. It does not charge seller GST or claim to issue a GST tax invoice. Becoming registered requires an explicit tax/invoice upgrade, not just changing text in a policy.

### Orders

Each order records its product/option, customer address, item/coupon/shipping amounts, carrier/service, quote evidence and estimated elapsed days. The owner books the selected service and enters its AWB/tracking reference. **Selection is not booking.** No courier wallet, pickup purchase or label charge is triggered.

Mark a payment verified only after matching the actual bank credit and exact amount. A customer-entered reference only changes the state to **Payment awaiting verification**. Bank references cannot be reused for a different order.

Paid orders cannot simply be cancelled and restored into stock. Record a completed full refund when it has actually happened; this button does not transfer money. Dispatched/refunded stock is not automatically made saleable. The owner inspects returns and updates stock deliberately.

## 2. Pricing: what the owner meant, precisely

The **selling price** is the item amount the buyer pays before shipping. The **minimum after coupons** is an additional private safeguard and defaults to the same amount. Lowering that floor deliberately permits an optional coupon; otherwise the system cannot discount below the owner's asking price.

Illustrative arithmetic, not a live listing:

| Component | Example |
|---|---:|
| Genuine MRP | ₹2,000 |
| Selling price | ₹1,500 |
| Saving on the item | ₹500 / 25% |
| Confirmed delivery | ₹80 |
| Buyer pays | **₹1,580** |

All calculations use integer paise. Percentage badges round down rather than exaggerating a fractional percentage. No badge appears without a valid reference-price basis. A package MRP or genuine previous selling price needs recorded evidence; an arbitrary higher number must not be represented as MRP.

Coupons in this release are **one fixed-amount code per product**, with an expiry and floor check. They do not stack. This release does **not** implement campaign-wide usage limits, percentage coupons or one-use-per-human claims. The UI generates a random code; the owner controls its actual saving and validity.

## 3. Delivery selection and its limits

### Implemented decision

A quote is usable only for the same product, one packed unit, origin PIN, destination PIN and current parcel dimensions. It must be unexpired, serviceable, permitted by the product's confirmed sales scope and recorded with an all-in cost/evidence.

1. Exclude unknown, expired, mismatched or unserviceable results.
2. Check product sales eligibility separately from courier availability.
3. Sort by **total shipping cost including confirmed taxes/fees**.
4. Use total elapsed time only as a tie-breaker when prices are equal.
5. Add item preparation + pickup wait + transit for the displayed estimate.
6. Preserve the selected service and prices on the order.
7. Recheck product availability, price, coupon and current cheapest eligible result before accepting an order.

Unknown coverage is not converted into “no carrier delivers there.” A confirmed negative means none of the **checked services** serves that parcel/route, not that every Indian operator was surveyed.

Unknown PIN checks are collected in an admin work queue without a buyer name/address. It is capped at 200 distinct product/PIN pairs and aged out after seven days. Adding a confirmed result clears the corresponding entry. Until a usable result exists, **no payable order is created**.

### Not connected yet

No carrier credential/account or exact origin PIN was supplied. Therefore there is no automatic live rate/serviceability fetch, pickup calendar, booking, tracking webhook or all-carrier price guarantee. Manually entered confirmed quotes are a safe operational fallback, not a claim that the requested live integration is finished.

For a later connection, use owner-authorised API tokens only—never ask for account passwords or 2FA. Check whether the account permits API access, the rate includes all charges, the service is bookable for that account and the intended dispatch date, and whether wallet funding/booking costs require approval. Never scrape a carrier site or bypass a CAPTCHA. Do not automatically book a chargeable shipment.

Shiprocket's official documentation describes authenticated account APIs and warns that valid API calls affect the real account. No account was opened or connected during this work. [1](https://apidocs.shiprocket.in/)

India Post is worth including in the comparison, not assuming it is always cheapest. Its current official retail parcel page has weight and geographic bands; the official Speed Post page distinguishes retail and contractual rates and states tariff changes effective 1 August 2026. Some third-party summaries returned older conflicting figures. **No tariff from those summaries was hard-coded.** A tariff table alone is not parcel-specific serviceability or a confirmed booking price. [1](https://www.indiapost.gov.in/mailproducts/domesticservices/indiapostparcel) [2](https://www.indiapost.gov.in/mail&Parcel/mailproducts/domesticservices/speedpostparceldomestic)

Made-to-order and scheduled-pickup quotes must be checked against the actual future handover date. A current rate does not guarantee a price weeks later. If a booking price rises after the order, do not add an unagreed surcharge or silently substitute a service. Resolve with the buyer or absorb the difference. A carrier integration should enforce dated quote coverage before enabling its automated results.

## 4. Sourcing from vendors changes the checks

The owner remains the customer-facing seller and UPI payee. Vendor procurement is an internal operation, not a fake separate public seller. Keep supplier invoices, accurate maker/packer declarations, product origins and material claims. “Acquired from vendors” is the default sourcing option; the software does not claim the owner made every garment.

A sourced item is not automatically eligible for an interstate handicraft registration exception. Product classification, the relevant conditions, business structure and aggregate turnover still need review. Nationwide checkout is allowed only for products whose sales scope has been set to India with a documented basis; it is not inferred from carrier coverage. The underlying GST assessment and sources remain in doc 32 §6.

## 5. Useful lessons taken from established seller workflows

Etsy distinguishes preparation time from carrier transit and supports ready-to-ship/made-to-order processing at listing or variation level. This implementation adopts that separation and makes the preparation time visible to buyers, with limited making slots rather than imaginary unlimited stock. [1](https://help.etsy.com/hc/en-us/articles/115015588087-How-to-Set-Processing-Times-Processing-Profiles-and-Ship-By-Dates)

Other design decisions are DealMosaic's own: cheapest all-in service before speed, an explicit private price floor, unknown-coverage work queue, and two distinct payment states for a shopper's claim versus verified bank credit. No competitor assets or proprietary code were copied.

## 6. Security, storage and commercial safeguards

- Admin role, same-origin checks and session-bound CSRF on every admin write.
- Bounded request sizes and rate-limited public quote/order/reference endpoints.
- Versioned product/settings writes; transaction-scoped stock and coupon validation.
- Idempotent order creation, single-use checkout quotes, unpredictable private order tokens stored as hashes in the order table.
- Two pending orders per email plus IP request limiting; this mitigates abuse but does not prove unique human identity.
- Default unpaid reservation window: 24 hours. Expired unpaid orders release stock during maintenance. Submitted payment claims stay reserved for manual review, so money is not overlooked by automatic cancellation.
- Late bank credits after cancellation/expiry enter **refund required**, never silently allocate released stock again.
- Images decoded/re-encoded as WebP, with orientation corrected and EXIF removed. Up to 4 MB input / 600 KB stored per photo; decoded pixel limit 20 million.
- MP4/WebM videos limited to 3 MB with file-signature validation and range serving. No server transcoding/metadata scrub for videos yet; the owner must remove private metadata/audio before upload.
- Media persists in Turso, not Render's ephemeral filesystem. Atomic 20 MB total budget blocks further uploads instead of adding paid storage. Eight media items per product. This is a small-shop storage choice; review database quotas before expansion.
- Unused uploads can be removed from admin; product-linked files are protected. Historical recovery archives are not silently deleted.
- Direct sales and comparison rankings stay separate. The floor, reference evidence, eligibility notes and reconciliation evidence are not exposed by public product endpoints.
- Privacy, terms and commercial disclosure were updated in both React and prerendered HTML; the old “we never sell anything” assertion no longer describes the whole site.

## 7. Presentation and scope boundaries

Same existing warm design. Green savings labels use the established accessible green; warm amber panels identify checks and important conditions; orange remains the main action colour. The palette audit still rejects black/near-black and blue/near-blue hues.

Two disclosed direct-product cards can appear in a featured collection on home and the unfiltered deals page, only when genuine published stock exists. Products do not manipulate the comparison ranking. No fake store identity, reviews, countdown, purchase counter or manufactured scarcity.

**Deliberate current limits:** one item/option per order (no combined-parcel basket), no carrier API, no automatic bank verification, no automated courier booking, no direct-product search integration, no direct-product save/digest integration, no browser push, no transactional order emails, no automated partial-refund processing, no direct-sales profit ledger, and no direct-product sitemap/prerender yet. These are not described as shipped. Private order status and a printable order record work; buyers must retain their private order link. The broader doc 32 remains a roadmap for these unimplemented items.

Product drafts are saved explicitly, not autosaved. The editor warns before leaving. New direct URLs are noindex while the catalogue is empty and the launch requirements remain unresolved. The existing comparison catalogue remains **25 products**; no test stock was added to that count.

## 8. Flaw → action → exact result

| Flaw | Action | Result |
|---|---|---|
| No owner product editor | Phone-sized product/options/media form | Implemented and exercised in an isolated browser test |
| MRP arithmetic could exaggerate savings | Integer-paise calculation, evidence field, rounded-down percentage | Automated tests pass |
| Discounts could eat the asking price | Private floor + server-side coupon validation | Automated tests pass |
| A fast expensive service could win | All-in-cost sort; speed only breaks ties | Cheaper 15-day service won in browser test |
| PIN format mistaken for serviceability | Confirmed route/parcel results; unknown separated from negative | Implemented; live data connection pending |
| Courier coverage mistaken for interstate eligibility | Independent product scope and documented setup | Implemented gate; real eligibility not asserted |
| Fake payment confirmation | Shopper reference = review; admin actual-credit check = paid | Browser/API tests pass; no real money moved |
| Last item could sell twice | Transactional reservation and stale-quote rejection | Concurrent test passes |
| Late payment after stock release | Refund-required exception path | Automated test passes |
| Drafts/media could leak | Admin-only draft access, public publication checks | Automated tests pass |
| Browser-specific lazy-load failure | Move declarations after imports | Caught and fixed in the browser, not inferred from typecheck |
| Old legal pages denied any direct selling | Update both client and prerender copies | Source updated |
| Known dependency advisories | Upgrade Hono Node adapter, Zod and Vitest; rerun all tests | npm audit: zero reported vulnerabilities at verification |
| Heavy/untidy workspace | Lazy-load shop screens; remove old screenshots and temporary test artefacts | No new screenshots retained; source and recovery archives preserved |

## 9. Verification and handoff

- **38 targeted commerce tests**, including a true concurrent last-unit checkout.
- **345 tests / 23 test files** pass overall.
- Typecheck clean; **43 design assertions** pass; secret scan clean.
- Isolated Chromium phone test: draft creation/saving, 320/360/390/430px overflow checks, guest checkout, slow-cheapest selection, exact total, payment claim, admin-confirmed payment and private-link reload. No browser exceptions after the loading fix.
- These are isolated tests with labelled fixtures, **not evidence of an actual bank payment, carrier quote, dispatch or tax eligibility**.

Remaining owner facts: exact dispatch PIN, actual seller/contact/return address details, UPI ID + recipient name, first real product/photos/measurements/packed weight, fulfilment policies and the confirmed sales-eligibility basis. The agent can implement/integrate; it cannot invent those facts or manufacture carrier access.

### Deployment evidence

**Production code commit:** `44163ea`.
**Cloudflare Pages:** `31f0d19a` — `https://31f0d19a.dealmosaic.pages.dev`.
**Render:** `dep-dblgk25g1s2s73elut8g`, observed `live` on commit `44163ea`.

Live checks on 4 November 2026:
- `/`, `/deals`, `/admin?tab=shop`, `/handcrafted`: HTTP 200; new frontend bundle served.
- `/api/direct/products`: HTTP 200, `{products: [], seller: null}`.
- Anonymous `/api/direct-admin/overview`: HTTP 401.
- A private order lookup without its token: HTTP 404.
- Quote attempt while paused: HTTP 503, code `shop_paused`.
- Production Turso direct products/orders/rates/media/settings tables each contain **zero rows**.
- Actual signed-in owner admin read-only browser check: My shop and Add product editor render;
  overview reports paused, zero products/orders and no carrier API connection. Editor has no
  horizontal overflow at 320/390/430px. Live home, deals and collection checked as well;
  no browser exceptions. A five-minute verification session was removed immediately afterwards.
- No product save, media upload, seller setup, real payment or shipping booking was performed in production.
- Updated terms/privacy/disclosure were verified in the production prerendered HTML.
- Build verified 53 pages (52 prerendered); original comparison catalogue remains 25 products.

Documentation-only commits after `44163ea` do not imply a new code deployment. The broader
checkout flow was exercised in the isolated browser/database test described above, not with
real money or actual carrier bookings. The temporary browser database, scripts and screenshots
were removed. All 10 obsolete working-tree screenshots were removed; immutable recovery
archives remain preserved.


Latest source backup: `dealmosaic_2026-11-04_10-36-14.tar.gz`, **278 files verified**, SHA-256 `d3d6c65c6ea997a4df1f6daa428de63df01728606bf404d6f9366e07f9955d71`. The normal backup retention policy pruned the oldest `18-42-30` archive; retained recovery archives and branding backups remain.
