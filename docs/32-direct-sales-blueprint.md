# 32 — Direct sales inside DealMosaic

**Decision blueprint · 4 November 2026**

**Status update:** the scoped implementation now exists; see **`33-direct-shop-release.md`**
for what is actually built and deployment evidence. The detailed sections below are
the original design/roadmap, not a claim that every feature is shipped. In particular,
carrier APIs, multi-item basket, direct-item reminders and push are not implemented.
Sales remain paused; no real direct products or payment recipient are seeded.

**Owner's subsequent clarification:** West Bengal dispatch, owner is the seller and
payee, goods may be acquired from different vendors, nationwide intent subject to
eligibility/serviceability, and cheapest all-in delivery even if slow. Origin PIN
still required. Manual UPI and mixed ready/made-to-order inventory are confirmed.

## 1. The concept

Sell the owner's genuine handcrafted products through DealMosaic's own product pages, basket and order management. Keep them visually integrated with existing deals, while making the seller relationship and promoted placements clear. Maintain two distinct transaction paths:

- Affiliate offer → **Shop at [retailer]** → retailer checkout.
- Direct product → **Choose options / Buy here** → DealMosaic basket and checkout.

Do not collect payment for affiliate merchants' goods. Do not invent a separate merchant, label an owner-selected promotion as independent advice, or anonymously camouflage the seller. The recommended relationship label is **“Sold by DealMosaic”**, only if that accurately describes the seller; otherwise use **“Sold by [actual seller] · Operated by DealMosaic's owner.”** Legal seller details must match the payment account and receipt.

A separate shop brand is not necessary. A disclosed seller is. The existing card design, colours and navigation stay; this is an addition, not a redesign.

### Why change the camouflage element?

The CCPA's dark-pattern framework expressly covers disguised advertising and nagging. Deceptive blending and relentless prompts create avoidable compliance and trust risks. Integrated presentation is compatible with disclosure; concealed commercial preference is not the design target. [1](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2026257)

Consumer-protection rules require clear entity/contact information and purchase information, including refund, delivery and price details. The precise entity structure also needs checking before this affiliate site becomes a regular direct retailer; a gateway accepting an individual is not proof of compliance with every retail obligation. [1](https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf)

## 2. Owner experience — designed for an Android phone

Admin gains **My products, Orders, Discounts and Shop settings**. These are proposed tabs, not existing functionality.

### One-time setup, not a form repeated for every product

Record the actual seller, dispatch country/state/postcode, business contact and service address, returns address, grievance contact, permitted delivery regions, payment method and policies. Record **GST status: not registered** without asking for a GSTIN. Identity and bank verification, if required, happen directly with the payment provider; do not upload PAN/Aadhaar images into the public repository or conversation.

### Add a product in five short steps

1. **Photos:** choose real images from phone, rearrange, crop, provide accessible descriptions. Strip location metadata; compress without misrepresenting colour or texture.
2. **Details:** title, category, materials, care instructions, dimensions, country of origin and what is included. For garments: actual measurements, fit, fabric, washing and handmade variation information.
3. **Options:** size/colour SKU, quantity, ready-to-ship or made-to-order, making time, packed weight and dimensions. One-of-a-kind stock is supported.
4. **Price and offer:** actual selling price; optional defensible reference price; sale dates or a generated coupon. Private cost and minimum-margin warning are optional.
5. **Preview:** see the same phone-sized card, product page and delivery promise the buyer sees. Save a draft, publish if all launch checks pass, pause or archive.

Autosave drafts; protect against two tabs overwriting edits. No GST field on individual product forms. No invented photography, reviews, stock or inflated reference prices. Product metadata must carry any applicable packaging/label declarations; confirm product-specific requirements before publishing.

## 3. Discovery: prominent without misleading

**Working collection title: “Handcrafted finds.”** It is a collection, not a fictitious independent seller.

| Surface | Proposed placement | Guardrail |
|---|---|---|
| Home | One collection tile near the first deals shelf when eligible stock exists | Explicit seller relationship; no compulsory pop-up |
| Deals feed | One **Featured · Sold by …** card within each 12-card block, at most | Maximum two featured slots in the first 24 cards; never repeat the same SKU within a loaded feed |
| Category/search | Relevant direct products plus a separately labelled featured slot | A sweater is not inserted into washing-machine results; price-sort and comparison winners remain truthful |
| Product page | Materials, making process, sizing and delivery detail | Only substantiated claims; no fake reviews or popularity counters |
| Saved list | Direct products saved by that shopper, beside affiliate saves | Saving is not automatic enrolment in all marketing channels |
| Sold-out page | Keep useful product information; optional restock request | No active buy button for unavailable stock |

Eligibility comes first: published product, available stock/capacity, deliverable region, active price, adequate photography, accurate disclosures. Only then consider relevance, freshness and engagement. Promoted positions remain separate from the existing lowest-payable-price ranking. Owner margin must never decide that ranking.

Use stable rotation, not reshuffling every time a user goes back. Offer “Show less like this.” Suppress promoted repetitions after dismissal or purchase; normal search results remain available. If there is only one eligible product, show it once rather than filling slots with copies.

### Differentiation worth testing

- **Fit-first discovery:** size availability and real measurements before checkout.
- **Small-batch releases:** honest scheduled drops based on actual making capacity.
- **Matching pieces:** scarves or accessories with a garment only when genuinely available; no automatic basket additions.
- **Gift readiness:** disclose packaging, gift note and delivery timing before charging.
- **Making details:** real process photos and material provenance, not a manufactured artisan story.
- **Restock by demand:** an optional request for a particular size helps decide what to make next.

These are commercial hypotheses, not promises of conversion or income. Start with the smallest useful version; expand from observed demand.

## 4. Discounts that cannot leak money

Support fixed-rupee and percentage codes, public automatic offers, start/end times, eligible SKUs, minimum spend, maximum discount, total redemption cap and per-account limits. Generate unpredictable codes for private offers; memorable codes are suitable for public campaigns.

Server calculates every amount in integer paise. Default: one offer per eligible line, no stacking unless deliberately configured. Recheck price, eligibility, stock and coupon at final submission. Reserve limited coupon uses with the order; release on expiry/cancellation according to an explicit policy. Paid-order discounts are snapshotted and cannot change retrospectively.

Guest one-per-person rules cannot be guaranteed from cookies or email alone. For high-value restricted coupons, require a verified account and accept that this is abuse mitigation, not proof of unique human identity. Rate-limit guessing and order creation. Do not leak private code existence through public endpoints.

Show subtotal, discount, shipping and final payable amount before payment. No invented MRP or unsupported crossed-out price. When a prior/reference price is not substantiated, use the actual price without a savings claim. Shipping is not secretly increased to fund a coupon.

## 5. Checkout: your site, with verifiable money movement

Flow: **Basket → address and delivery eligibility → final total and policy summary → payment → order status.** Guest checkout should work. Optional account creation follows, not precedes, the purchase. Affiliate offers do not enter this basket.

### Payment decision — unresolved

| Route | Strength | Limitation |
|---|---|---|
| Gateway with server verification | Smooth UPI/card flow, automated confirmation and reconciliation | Merchant approval/KYC and transaction fees; needs explicit cost approval |
| Direct UPI with manual reconciliation | Checkout and order tracking stay on DealMosaic; no gateway integration required | Bank/merchant terms must permit it; owner verifies credit; confirmation is not instant |
| COD | Some buyers prefer it | Courier fees, return-to-origin exposure and cash reconciliation; not a default free option |

Razorpay documents an eligible no-GST individual/unregistered-business route, but identity, banking and activity checks still apply; approval is not guaranteed. [1](https://razorpay.com/blog/minimum-documents-payment-gateway-onboarding-india/)

Its published standard domestic gateway price is 2% plus applicable GST. No setup/annual fee is not the same as free processing, and promotional onboarding terms can add charges. No provider will be activated without the owner's express approval of the actual terms. [1](https://razorpay.com/blog/razorpay-payment-gateway-pricing-explained/)

For gateway payments, “own checkout” means DealMosaic owns the order journey while a regulated provider handles payment credentials. Never collect card numbers, CVV or UPI PIN on our server. A UPI app switch is normal and must survive the browser being backgrounded.

For manual UPI: a submitted reference, app return or screenshot is **not** proof of payment. Display **Awaiting payment verification** until the owner matches an actual bank credit. Use one order/reference and exact amount; reject reuse; audit confirmations. Do not collect bank-login credentials or scrape banking notifications. Expired orders that later receive payment go to an exception/refund queue, not silently back into stock allocation.

## 6. No-GST route: convenient input, careful eligibility

There is **no GSTIN requirement to create drafts** in this design. That does not grant an exemption from registration or permit all-India taxable sales automatically.

Distinguish own-account retail from a third-party marketplace. Section 52 marketplace TCS does not ordinarily apply merely because the owner sells their own goods on their own website; ordinary registration rules still matter. Do not use Notification 34/2023's marketplace enrolment route as a blanket answer for this direct-store design. [1](https://www.smvchambers.com/blog/gst-compliance-for-e-commerce-businesses-in-india)

CBIC guidance describes different thresholds for exclusive goods versus services/mixed supplies and particular interstate handicraft exceptions. Consequently, **do not assume a ₹40 lakh threshold for an owner who also earns affiliate/service revenue under the same PAN**. Review aggregate business turnover and supply classification, including relevant off-site business. [5](https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf)

Specified handicrafts can qualify for interstate registration relief under Notification 03/2018–Integrated Tax, subject to its scope and conditions. Calling a sweater or dress “handmade” does not prove eligibility; verify manufacturing method, HSN, turnover and documentation requirements for each relevant category. [5](https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf) [2](https://abcaus.in/gst/exemption-igst-registration-handicraft-craftsmen-dealers.html)

**Launch gate:** confirm seller location/legal structure, applicable threshold, present aggregate turnover and product eligibility. If a lawful intra-state unregistered route is established, start with that delivery region; do not assume even that route without checking compulsory-registration triggers. Interstate checkout stays blocked until the relevant basis is confirmed. Outside-India dispatch requires a different import/export assessment.

Unregistered sales must not separately collect GST or claim to provide a GST tax invoice. Generate an accurately labelled sales receipt with seller, order, items, amounts and refund information. CBIC explicitly states that an unregistered person cannot collect GST. [5](https://gstcouncil.gov.in/sites/default/files/e-version-gst-flyers/Registration_under_GST_Law_new.pdf)

This is a system-design assessment, not a tax opinion. Record the confirmed eligibility basis, date and reviewer. Track sales and allow off-site turnover input; warn before the confirmed threshold and pause checkout if eligibility becomes unresolved. Listing drafts remain available.

## 7. Notifications: repeated relevance, not repeated interruption

Proposed defaults:

- Separate controls for saved-item emails, new handcrafted drops, back-in-stock alerts and browser push.
- Request push permission only after a meaningful action and an explanation; respect browser denial permanently unless the user reopens settings.
- At most **one discretionary promotional contact per rolling seven days per identified shopper across email and push**, including saved-item promotional reminders. Queue/coalesce competing events rather than sending one per campaign.
- A specific, explicitly requested back-in-stock alert may arrive sooner, once per genuine restock event, with its own disclosed preference.
- Quiet hours 9 pm–9 am in the shopper's known timezone; default India time for the India launch when timezone is unknown.
- Cancel queued promotions after purchase, unsubscribe, unavailable stock, invalid price or ineligible delivery.
- Email unsubscribe without login; channel and category controls; expiring push subscriptions removed.
- Order confirmations, shipping and refund updates are transactional, not vehicles for hidden marketing.

Browser push availability depends on device/browser permission and support. Never describe notifications as delivered merely because the provider accepted a request. No SMS or WhatsApp cost/service activation in this scope.

**Existing-code issue found:** `services/saved-digest.ts` currently says “Nothing here is an advert”. That cannot remain as a blanket assertion if owner-promoted content joins the digest. Replace it with accurate item-level seller/relationship copy when integrating direct saves. Existing saves reference coupons; direct product saves need typed targets rather than fake coupon rows. The current seven-day email mechanism is not a browser-push implementation or a cross-channel frequency controller.

## 8. Order operations and failure handling

Track three independent states, rather than one ambiguous “completed” flag:

- Payment: awaiting / pending verification / paid / partially refunded / refunded / disputed.
- Fulfilment: unfulfilled / making / packed / dispatched / delivered / returned.
- Order: open / cancelled / closed / exception.

Owner dashboard puts action items first: verify payment, dispatch due, stock low, refund requested, delivery problem. Include bulk dispatch updates, tracking link allowlists, a holiday/pause switch and CSV export with spreadsheet-formula injection protection.

Made-to-order products need capacity slots and explicit lead time, not unlimited fictional stock. Show dispatch and transit estimates separately. Stop taking orders when capacity is full. Size exchanges and custom-item change-of-mind restrictions must be clear before payment, without removing remedies for defects, wrong goods or other legal rights.

Consumer rules set grievance acknowledgement at 48 hours and redress within a month; provide deadline tracking rather than just a contact footer. [1](https://consumeraffairs.gov.in/public/upload/files/E%20commerce%20rules_1732703966.pdf)

Revenue is not profit. Separate direct sales and affiliate commission. Direct dashboard: paid sales, refunds, pending settlements, payment/shipping costs, materials, packaging and optional labour estimate. Missing cost inputs mean **margin unknown**, not zero cost. Keep an allowance for returns/refunds; do not imply every receipt is immediately spendable.

## 9. Architecture fitted to the existing application

Retain React web, Hono API and Turso. No microservice split, no D1 port, no paid dependency by default.

Proposed modules/tables:

- `direct_products`, `direct_variants`, `product_media`, `inventory_movements`, `stock_reservations`.
- `direct_discounts`, `discount_reservations`, `discount_redemptions`.
- `orders`, immutable `order_lines`, `payments`, `payment_events`, `refunds`, `shipments`.
- Private `seller_settings`, `shop_policies` with versions, `order_events` audit trail.
- Typed direct saved items, `notification_consents`, event deduplication and delivery ledger.

Suggested public routes: `/handcrafted`, `/handcrafted/:slug`, `/cart`, `/checkout`, `/orders/:secureAccess`. Admin API uses the existing authentication/role/CSRF model, with extra confirmation for refunds and payment changes. Guest order access uses short-lived high-entropy tokens; no sequential-order lookup or email enumeration. PII never goes into public feed JSON, analytics URLs, screenshots or a public repository.

Pricing and stock decisions are server-authoritative. Conditional stock decrement/reservations and coupon caps must be atomic. Handle parallel tabs, last-unit races and libSQL transactions explicitly. Follow existing tests' awaited app readiness; do not reintroduce boot races.

Gateway webhooks need signature validation, timestamp/replay safeguards, unique provider-event IDs, order/amount/currency matching and idempotent processing. Browser success callbacks are not settlement proof. Late payment after stock release must enter a reconcilable exception path. Audit manual changes. Refund requests and confirmed refunds are separate events.

Uploads: authenticated limits, content-type/magic-byte checks, decode/re-encode, dimension limits, EXIF stripping, non-executable storage and alt text. Production needs persistent media storage; **Render's ephemeral disk is not an acceptable photo store**. Select a genuinely compatible free-tier storage option after checking quotas and billing exposure; stop new uploads gracefully before limits rather than silently creating charges.

Reuse existing mail transport but review outbox failure logging and retries for all transport types. Transactional order mail must be prioritised within provider quotas. A mail acceptance timestamp does not prove inbox delivery. Add reconciliation jobs that can catch up after scheduler downtime; do not rely on perfect cron timing.

Existing public catalogue has 25 comparison products. Track direct handcrafted products separately; do not pad counts or force a handmade garment into a misleading like-for-like retailer comparison. Only published real product pages enter the sitemap and Product structured data. No fabricated ratings. Cart/checkout/private order pages are noindex and protected; canonicalise variant URLs.

## 10. Flaw → action register

| Flaw/risk | Action specified | Current status |
|---|---|---|
| Concealed owner preference | Disclosed featured slots, seller relationship and untouched comparison ranking | Designed; not implemented |
| No product editor or direct checkout | Phone-first drafts, variants, pricing, orders and cart modules | Not implemented |
| No GSTIN mistaken for unrestricted eligibility | No-GST draft flow; one-time eligibility and destination gate | Awaiting seller facts |
| “Handmade” assumed to exempt every garment | Product-specific classification and documented basis | Unverified |
| Affiliate plus goods income ignored | Aggregate/mixed-supply review; external turnover input | Unverified |
| Zero fees confused with automatic payments | Explicit gateway-vs-manual choice | Awaiting owner decision |
| Fake payment proof / duplicate callbacks | Server/bank verification and idempotent events | Not implemented |
| One-off product sold twice | Atomic reservations and late-payment exception handling | Not implemented |
| Repeated promotions annoy shoppers | Consent, suppression, cross-channel limits, useful events only | Not implemented |
| Existing digest disclaimer becomes misleading | Replace blanket disclaimer during direct-save integration | Identified, not changed |
| Photos disappear on restart | Persistent quota-controlled media storage | Provider not selected |
| Sales counted as profit | Costs, refunds, settlement and unknown-margin treatment | Not implemented |

## 11. Delivery sequence and acceptance gates

**First — foundation:** settle the three owner decisions below; confirm seller/eligibility details; build phone-friendly drafts, media and variant inventory. No dummy products published.

**Second — a real sale:** direct product pages, basket, server pricing, discounts, delivery gate, selected payment adapter, order management, receipts, policy/disclosure updates. Launch only when one actual product and seller details are complete. No automatic paid-service activation.

**Third — discovery:** disclosed featured placements and integrated typed saves. Preserve affiliate redirects and the existing visual design. Measure relevance and checkout completion before increasing placement frequency.

**Fourth — retention:** cross-channel caps and consent, then push if browser support and free-tier delivery are verified. Start with useful email/restock notices rather than delaying checkout for a complex notification system.

Release must prove: unauthorised admin denied; price tampering rejected; expired/overused codes rejected; concurrent last-unit sale handled; duplicate and invalid webhooks safe; late payment reconciled; manual UPI stays unconfirmed until verified; refunds preserve ledger integrity; unsupported postcode rejected; unregistered receipt has no GST charge; image access safe; no PII in public APIs; unsubscribe suppresses queued marketing; sold-out promotions stop; guest order access isolated; disclosure visible; affiliate regressions absent.

Test Android Chrome back/app-switch behaviour, slow network and double taps, keyboard overlap, 320–430px layouts, readable labels, 48px tap targets and reduced motion. Run typecheck, tests, design/secret checks and build, then verify the deployed commit. Payment sandbox tests are not a claim that a live charge/refund worked. A live financial test needs owner approval and any real fee disclosed. Delete screenshots and scratch files after verification.

## 12. Owner decisions and remaining setup facts

**Confirmed in the owner's answers, 4 November 2026:** dispatch from **India**;
payment route **manual UPI, strict no gateway fees**; inventory **both ready stock
and made-to-order**. No fee-bearing gateway is authorised. Payment remains awaiting
verification until an actual bank credit is matched. Bank terms and shipping costs
still need checking; no-gateway-fee does not mean fulfilment is free.

**Subsequently resolved:** West Bengal and the owner personally as seller/payee.
**Still missing:** exact origin PIN, one-time seller/contact/payment details, real product
data and documented sales eligibility. See doc 33 for the implemented setup screens.
The following records the full setup decision checklist (payment and stock choices
above are resolved):


1. **Where will goods actually ship from, and who is the legal seller?** Country and Indian state if applicable; confirm whether the maker/seller is the same individual operating DealMosaic. Exact address and turnover are one-time private setup inputs, not per-product fields.
2. **Payment priority:** strict no-gateway-fee/manual UPI confirmation, or approve a fee-bearing gateway for automatic confirmation subject to actual terms. No credentials needed to choose.
3. **Inventory:** ready stock, made-to-order, or both; representative making time for custom work.

Then provide the first real product photos, materials, sizes/measurements, price, quantity and delivery/return terms. The agent builds and verifies; the owner supplies facts and completes any provider KYC directly.

**Bottom line:** direct sales can become a prominent second revenue stream without pretending to be independent merchant recommendations. The strongest version is easy to buy, easy to operate, honest about who sells it and reliable when payment, stock or delivery goes wrong.
