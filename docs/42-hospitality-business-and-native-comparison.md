# 42 — DealMosaic hospitality: business architecture and native comparison

**Owner decision:** proceed with hotels first, then restaurants; physical-device retest can follow. Research reviewed: both supplied PDFs, all 13 pages. **Design date: 5 November 2026.**

**Release status:** Website, PWA and API **2.6.0 deployed and production-verified on 5 November 2026**. Personal comparison and the owner business desk are live. Automatic supplier prices, bookings and new hospitality commission connections are not activated. The receipt below distinguishes tested implementation from future integrations.

## 1. The decision in one minute

Build **a customer-first hotel metasearch business with provider fulfilment**, not a hotel merchant-of-record operation. DealMosaic should own the useful search, comparison and decision experience; an approved provider should own booking confirmation, guest charging, vouchers, cancellation and post-booking support. Add selective direct-hotel relationships later, where written agreements establish a fulfilled-referral fee and the hotel takes the guest's payment.

Then apply the same discipline to restaurants: real venues, exact offer eligibility, the actual payable bill, and properly confirmed dining—not a food-delivery fleet or an invented reservation engine.

**The positioning:** “The right stay. The whole cost.” For dining: “Your next table. A clearer bill.” Useful differences to test are complete-cost visibility, clear unknowns, comparable conditions, room/party precision, pet-policy evidence and a straightforward hand-off. These are hypotheses about an underserved combination, **not a claim that competitors lack every individual feature**.

**The commercial truth:** an ordinary outbound link earns nothing by itself. CPA, CPC and direct-venue fees need the relevant agreement and attribution. No volume, commission percentage, rapid popularity, guaranteed sales or giant-platform earnings is promised.

### What is implemented in this release

- Native `/stays/compare` and `/dining/compare` workspaces, prominent links from existing hospitality pages and preserved destination navigation.
- **40 sourced hotels and 33 dining places**, across all 17 destination choices. Native filtering, temporary four-place shortlists, source information and a device-only personal quote collection.
- Exact-plan validation, full-cost arithmetic, matching groups, eligibility distinctions, separate refundable deposits and cashback, complete-quote budget filtering, export and explicit deletion.
- **Owner-only Hospitality business desk**: actual implementation gates, an unsent partner enquiry ready to copy, and a CPA/CPC/direct-fee scenario calculator that cannot write earnings or activate services.
- The website, installed PWA and classic build share these features. Public source links remain available where useful, without pretending they are monetised bookings.

### What is not implemented or authorised

- No automatically fetched hotel room rates, room availability feed, hotel supplier adapter, licensed hotel photo/review feed, table-reservation inventory, native hotel booking or hospitality payment collection.
- No supplier applications submitted, contracts signed, partner credentials obtained, provider certification completed or direct venue agreements recorded.
- No new venue inquiry routing, merchant extranet, booking ledger, hotel price alerts, push campaigns, live conversion postbacks or paid acquisition. These are specified below, not represented as live.
- Star, accessibility, room-facility and cuisine filters cannot be populated from guessed information. Unsourced star categories are not displayed. Native live metasearch acceptance remains gated on approved inventory.

**Important:** personal quote comparison is a useful bridge and a working customer tool; it is **not a substitute for the authorised live-rate engine** needed to complete the longer-term metasearch experience.

## 2. What the two supplied PDFs get right—and what must change

### The sound foundation

Both distinguish metasearch from OTAs, agency commissions from merchant economics, and gross booking value from platform revenue. They correctly focus attention on qualified travel demand, partner inventory, occupancy, cancellation, distribution and repeat customers. These concepts inform this architecture.

Current primary evidence supports the broad model. trivago's 3 November 2026 release reports Q3 total revenue of €192.5m, including €177.4m referral revenue and €14.0m DEALS revenue; net income is €5.4m. It describes CPC/CPA referrals, direct booking services and smaller business-tool revenues. That is evidence of **different revenue streams**, not evidence that any clicked link earns. [1](https://ir.trivago.com/news-releases/news-release-details/trivago-delivers-16-growth-q3-its-seventh-consecutive-double)

Booking Holdings' FY2025 report shows $186.1bn gross bookings, $26.917bn revenue and $8.186bn marketing expense. The 14.5% revenue/gross-bookings ratio is not a standard hotel commission. The 30.4% marketing/revenue ratio is a historical company-level result, not DealMosaic's acquisition budget. The full 216-page report was parsed, including the financial tables beyond the first 30 PDF pages. [2](https://s25.q4cdn.com/383369491/files/doc_financials/2026/ar/BKNG_2026-COMBO_WEB.pdf)

### Corrections before adopting the strategy

| Research claim or implication | DealMosaic treatment |
| --- | --- |
| Broad commission and CPC ranges | Do not use as contracted rates or forecasts. Enter actual net publisher payout terms only after approval; illustrations stay labelled. |
| Every incremental booking is profitable because technology is fixed-cost | Reject. Acquisition, customer service, fraud, cancellations, validation, payment and compliance can be variable and material. |
| Live inventory updates prevent overbooking | They reduce risk; they do not eliminate race conditions, stale offers or supplier failures. Recheck and obtain a supplier confirmation. |
| More sites necessarily mean independent supply | Display brand/provider identity honestly. Sister brands can share ownership or inventory; do not market them as independent hotels. |
| Paid bidding can improve recommendation order | Do not copy this into organic rankings. Commission cannot decide the winner. Any sponsorship is separate and labelled. |
| Holding guest funds creates useful float | Not a launch strategy. Guest funds can be owed to suppliers or refundable; this also introduces legal and operational obligations. |
| A free affiliate account unlocks an API | False. Programme joining, rate/content rights, credentials and certification are distinct. |
| “Nothing major left out” | Add support ownership, refund liability, cash timing, data rights, attribution loss, taxes, security, quality control, capacity and exit criteria. |

Not every ownership statement, industry average or anecdotal percentage in the PDFs was independently re-audited. Unsupported numerical ranges are not adopted as DealMosaic facts. The source ledger records exactly what was checked.

## 3. The business model, in the order to pursue it

### A. Authorised hotel referrals: first choice

1. Obtain an approved rate/search and content relationship.
2. Show native property results for the exact stay.
3. Compare permitted, sufficiently complete offers without changing the organic order for commission.
4. Use the provider's approved returned booking link and authorised attribution method.
5. Let the provider confirm, charge and service the reservation.
6. Recognise eligible commission from validated supplier/network records; separately track actual payout receipt.

**CPA** is the practical first enquiry because a new publisher cannot assume CPC advertiser contracts. A qualifying click or booking may still be rejected, cancelled or unattributed. “Up to” marketing commission is not the owner's payable rate.

### B. Direct hotel fulfilled-referral fee: second route

The hotel supplies authorised facts and an exact written offer, confirms the guest request, takes payment and handles the stay. DealMosaic charges only the mutually agreed fee at the mutually agreed fulfilment trigger. Prefer a modest, clearly documented completed-stay fee rather than inventory purchases or customer fund handling.

Do not turn an owner's “yes” into a public rate unless publication rights, validity, inclusions, cancellation, occupancy, fees and support responsibilities are recorded. A hotel request is **not confirmed** until the authorised venue representative explicitly confirms it.

### C. CPC and sponsorship: only with their own contracts

CPC needs billable-event definitions, invalid-traffic controls, reporting, invoicing and advertiser acceptance. A CPA campaign does not become CPC because we add a click counter. No paid traffic is authorised under the zero-cost instruction.

Potential hotel/restaurant sponsorship must occupy a separately labelled placement. It cannot buy the cheapest position, suppress a cheaper non-affiliated offer, purchase a trust badge or disguise an advertisement as editorial evidence. No sponsored hospitality placements are active in this release.

### D. Dining after hotel foundations

Begin with approved restaurant referrals or direct-venue **fulfilled dining fees**, not delivery logistics. Offer discovery, exact venue/meal/bill comparison and clear conditions come first. Venue payment remains with the restaurant or approved provider.

Search-index excerpts from Swiggy's published out-of-home reporting list restaurant commissions, advertising, user/subscription fees, tickets and business-enablement fees. Those two PDFs were not inspected directly; this is a secondary research lead, not a verified commercial rate. It supports considering multiple dining revenue streams; food-delivery commission ranges must not be copied into dine-in economics. [3](https://www.swiggy.com/corporate/wp-content/uploads/2025/10/Q2-FY2026-Shareholder-letter.pdf)

Defer consumer subscriptions, paid venue software, experiences and insurance until genuine recurring value, permissions and support capacity exist. No paid membership, fictional cashback or guaranteed exclusive code is needed to launch the useful comparison layer.

## 4. Supplier strategy and the approval boundary

### First technical candidate: Agoda Online Affiliates/MSE

Agoda explicitly describes a Search API model for sites aggregating and comparing hotel prices. Its published path includes feasibility, site credentials, testing, certification, a signed contract and AVRF, and traffic-capacity planning. Its Fulfill Assisted model additionally offers provider charging, vouchers and post-booking support when Book API integration is approved. [4](https://developer.agoda.com/demand/docs/getting-started)

This is the closest documented technical fit—not an approval. The ordinary affiliate FAQ describes no-cost joining, while limiting other content use to express permission. **Free ordinary signup does not establish free Demand API access or full content rights.** [5](https://partners.agoda.com/en-us/faq.html)

### Second candidate: Booking.com Demand

Demand prerequisites specify Managed Affiliate Partner status, a contract, Partner Centre access, API token and X-Affiliate-Id. Ordinary affiliate registration and managed Demand access are not interchangeable. [6](https://developers.booking.com/demand/docs/getting-started/prerequisites)

### Conditional alternative: Expedia Rapid

Evaluate only after confirming the commercial model, fees, content rights, payment/support allocation and minimum commitments. Do not select a fuller OTA integration merely because the API exists. Earlier primary-source review is retained in document 40. [7](https://partner.expediagroup.com/en-us/join-us/rapid-api)

### Eight independent gates before native rates go live

1. Signed and reviewed provider agreement recorded.
2. Written zero-fee scope, quota and overage rules compatible with the owner's instruction.
3. Rate, comparison and content-display rights confirmed.
4. Approved credentials configured privately on the server.
5. Provider-specific adapter implemented against the approved specification.
6. Sandbox validation and required certification completed.
7. Returned booking links, attribution and security validated with authorised test methods.
8. Fulfilment, cancellation and customer-support responsibility confirmed.

The shared release-gate helper fails closed if any required value is absent. It is a **checklist enforcement helper**, not automatic verification of a licence or contract. The server currently records all eight as unsatisfied for each proposed integration and makes no provider API calls.

If no suitable provider approves zero-fee access, keep the personal comparison tools and legitimate permitted referrals. Do not secretly activate a paid trial, scrape an OTA, reuse another publisher's credentials, fabricate inventory or claim the full live-comparison milestone is complete.

## 5. The customer experience and differentiation

### Working now

**Hotel flow:** Hotels & Stays → Compare hotels on DealMosaic → destination, dates, rooms, adults, child ages and room allocation → native sourced places → shortlist → add exact personal quotes → compare complete entered totals and conditions → check the official provider before paying.

**Dining flow:** Dining & Food → Compare dining on DealMosaic → city, date, time, party size and dining format → native places → quotes for the same meal/quantities and conditions → compare the entered payable total, excluding possible later cashback.

The directory includes 17 separately sourced general hotels and 15 general dining places, alongside the existing 41 pet-policy records. The native collection is not merely the pet directory renamed. Names, source references and review dates are shown; no proprietary photographs or invented reviews were imported. General restaurant additions in Haridwar and Jamshedpur do not close the separate pet-policy evidence gaps.

### What is worth testing as a differentiator

| Customer problem | Product response | Validation experiment |
| --- | --- | --- |
| A low headline rate hides extra cost | Whole-stay or whole-meal total; additional fees separate; no guessed zero | Ask 10 target users to explain the final payable components without assistance. Record errors, not praise. |
| Different offers are compared as if identical | Group only matching entered stay/meal, occupancy, inclusions, refund, payment and eligibility terms | Use controlled mixed-condition cases; a cheaper ineligible or non-equivalent offer must not win. |
| A deposit makes the trip unaffordable even if refundable | Show cost and cost-plus-refundable-deposit separately | Ask whether the traveller can identify the cash commitment and distinguish it from cost. |
| A member/app/card offer is irrelevant to the traveller | Eligibility defaults to unknown; conditional qualification and conditions must be entered | Test public versus conditional quotes and different payment/member restrictions. |
| Pet policy is vague | Preserve sourced policy statements and explicit unknowns; do not infer dining access from a hotel policy | Obtain dated written confirmations from willing venues before upgrading evidence. |
| A shopper wants to compare before registering | Guest comparison works; do not force signup or pretend signup creates attribution | Measure voluntary account interest only after actual account-based value is available. |
| A trip needs a nearby meal | Preserve city while moving between hotel and dining sections | Test whether a traveller reaches useful dining options without re-entering the city. |

These are specific tests, not assertions of globally unique functionality. Manual quote entry has friction: the live supplier integration is the important next product step, not an excuse to remain a manual directory indefinitely.

### Additional product bets: selective, not a feature shopping list

The following are **designed opportunities, not live capabilities** unless stated otherwise:

1. **Family-total comparison:** make the exact room allocation, every child's age, breakfast entitlement and extra-bed cost first-class. The personal-quote foundation is implemented; automatic supplier normalization still needs approval. Test this before adding generic “AI recommendations.”
2. **Cash-needed comparison:** the implemented deposit separation can become a fuller view of pay-now, pay-later and refundable cash commitments when the supplier exposes reliable components. Never label full-trip cash commitment as the amount due immediately.
3. **Arrival-fit stays:** compare confirmed early check-in/late check-out terms with rail/flight arrival needs. A special request is not a guaranteed early check-in. Do not display a “fits your arrival” badge without a confirmed room/rate condition.
4. **Caregiver and extended-visit stays:** research flexible extension rules, verified accessibility and genuine proximity to hospitals or other named destinations. No medical recommendations, inferred wheelchair access or guessed travel times. Launch only after specific customer interviews and property evidence.
5. **Pet-policy completeness:** show species, size/number limits, permitted areas, fee basis and written confirmation date—not just a paw icon. The evidence directory exists; a current property acceptance remains separate from historic publication.
6. **Provider-coverage honesty:** when live APIs connect, show exactly how many providers returned comparable offers, which were unavailable and the time checked. One connected provider is not multi-provider market coverage. Do not call sister brands independent supply without evidence.
7. **Direct-value alternatives:** a contracted hotel could provide an authorised breakfast, flexible checkout or family inclusion rather than an artificial discount. Compare the inclusion explicitly; do not invent a cash value or sell an unconfirmed request as a perk.
8. **A portable decision record:** the current local CSV preserves costs and conditions with personal provenance. A future share tool should require a deliberate user action and preview of what will be shared; never put private trip/child details in a public indexable URL to chase viral growth.

Prioritise **family total, cash commitment and policy completeness**. Defer maps, elaborate loyalty systems, chatbots and large-area expansion unless they demonstrably help travellers complete a better decision or improve realised contribution. A smaller accurate service is a better launch asset than a broad imitation with unsupported data.

## 6. Comparison rules and failure cases

### Current personal-quote engine

- INR only. Bounded integer-paise amounts; no invented exchange rate or tax percentage.
- Base amount is already the **whole stay/all rooms** or **whole meal/party** after any genuine instant discount. It is never multiplied again.
- Add only additional provider taxes/fees, mandatory venue charges and chosen extras not already included. Blank means unknown; explicit `0` means no additional amount entered.
- Refundable deposits affect the separate cash-commitment figure, not the cost ranking. Possible later cashback never reduces the displayed total or changes the winner.
- A matching group requires a canonical place ID, exact dates, occupancy/room allocation or dining date/time/format, normalized exact room/meal wording, inclusions, cancellation terms/deadline, payment timing and eligibility conditions.
- This is comparison of **the user's assertions**, not independent verification that two supplier room IDs are identical. Exact wording is conservative but cannot detect every omitted condition.
- At least two distinct entered provider names are needed for a group. Unknown terms, incomplete costs, past plans, future recording timestamps, passed free-cancellation deadlines and records older than 24 hours cannot win. Every equal-low entry retains its tie.
- A 24-hour recording limit is a conservative tool rule, **not a price-validity guarantee**. Quotes can change immediately. Recording time is not falsely labelled supplier observation time.
- Complete matching personal quotes can filter budget. Unpriced places remain clearly unassessed if the traveller chooses to include them. Alphabetical venue order remains independent of commission.
- CSV includes provenance, context and cost components, with formula-injection protection. No quote is posted publicly or sent to a supplier when saved or exported.

### Required future live-rate normalizer

Do not feed raw supplier prices straight into a cheapest sort. Normalize: provider/property IDs, exact per-room adult/child allocation and ages, residency/market where required, dates and hotel-local timezone, room/bed/view/occupancy identity, meal quantity, availability, inventory/rate token, currency, inclusive/exclusive mandatory charges, pay-at-property amounts, deposit, refund schedule and deadline, payment timing, member/app/card eligibility, source observation/expiry, booking URL and content rights/version.

An unknown compulsory charge means no confident all-in winner. An unmatched room is an alternative, not an exact match. Partial supplier timeouts must show partial coverage, never “no hotels exist.” Revalidate through the provider's approved mechanism before booking or hand-off where supported. Do not invent a pre-check endpoint for a model that does not provide one.

## 7. Technical architecture: present and planned

### Present data path

**Published factual records → native browser filters → personal quote form → browser validation → device storage → deterministic comparison and CSV.**

The server path added now is **authenticated administrator → read-only hospitality readiness response**. It sends no credentials and cannot enable a supplier or change money. Scenario arithmetic is a pure function, isolated from reported earnings.

### Target authorised API path—not connected yet

**Validated search → server-side capability and quota gate → approved supplier adapter → normalized observations → property/room matching → customer-first ranking → approved provider checkout → provider/network reconciliation → private earnings ledger.**

Keep credentials and affiliate IDs server-side. Use fixed allowlisted provider origins, bounded requests, timeouts, rate limits, circuit breakers, response-size limits and contract-permitted cache TTLs. Do not proxy arbitrary customer URLs. Cache rights and content deletion requirements vary by supplier; an assumed universal TTL is not a licence.

Use first-party opaque correlation IDs where permitted. Never place guest names, emails, dates of birth, child details or payment information in attribution sub-IDs. Do not create an open redirect. A convenient root URL is not a safe replacement for a broken tracked booking URL.

### Planned persistence boundaries

| Record | Required information and invariant |
| --- | --- |
| Canonical property and provider mapping | Exact IDs, geography, duplicate resolution, evidence and approved content rights. No title-only automatic merge. |
| Agreement/capability register | Legal party, signed evidence, effective dates, markets, fees/limits, display/cache permissions, payout trigger and support owner. No self-service public activation. |
| Search observation | Context hash, normalized offers, source time, expiry, completeness, errors and permitted retention. Not a permanent public price history by default. |
| Referral event | Opaque ID, approved provider/offer, consent where needed and test/bot classification. A click is not a booking. |
| Booking/conversion event | Provider event ID, booking reference, status, eligible value, commission basis, currency and reconciliation history. Deduplicate verified postbacks. |
| Commission ledger | Pending, approved, reversed and paid amounts separately; immutable adjustments, not deletion of inconvenient rows. |
| Direct-venue request | Explicit consent, exact request, expiry, authorised venue response and confirmation reference. No confirmation inferred from elapsed time. |
| Fulfilment/dispute record | Dated evidence, merchant/customer dispute handling, agreed fee, invoice and payment reconciliation. |

These future tables and services are **not deployed by this release**. They are the implementation contract for the next approved supplier/venue phase.

### Maps, media and performance

Prefer OSM/Leaflet when accurate, permitted coordinates and a compliant tile supply exist. Open geodata is not an unlimited free hosted tile service. Do not bulk-geocode beyond public-service rules or embed a paid Maps API to avoid obtaining rights. Current collection uses sourced locality text and explicit information links rather than guessed pins.

No live rate or personal data goes into public prerendered HTML, SEO price markup or the service-worker API cache. Comparison routes use neutral noindex/no-store edge shells. Website and classic/PWA builds share the same logic. The PWA can use personal notes locally with loaded app files, but outside sources require a connection; nothing is queued as a reservation or payment.

## 8. Attribution, conversion leaks and actual earnings

### Funnel to instrument after permission and contracts

Qualified search → valid result coverage → comparison opened → eligible provider hand-off → attributed booking → completed stay/meal → validated commission → received payout → optional repeat use.

Record every stage separately. Today the personal quote collection sends no quote data or comparison analytics to the server, and the new desk does not pretend to have those funnel counts. Existing Campaigns and Earnings screens remain the sources for what their network endpoints actually report; inventory counts and repeated taps are not sales.

### Leakage controls

- Preserve destination and, only through authorised supplier methods, exact dates/occupancy. Explain any hand-off that does not preserve them.
- Never force registration just to open an offer; it cannot guarantee attribution.
- Keep code-copy, provider opening, validated booking and commission receipt distinct.
- Honour app/webview, cookie, last-click and cross-device limitations instead of promising a cure.
- Use sandbox transactions or explicit provider-approved live test methods only. No self-click inflation or fake bookings.
- Reconcile rejected and missing commissions with the supplier; present pending money as pending.
- Keep the five previously held hotel offers rejected unless independent evidence resolves each problem. No replacement with an untracked homepage merely to make a button open.

The physical-phone external-link problem is still unproven at the root cause. New comparison functionality does not prove that issue resolved. Existing recovery paths remain; the owner postponed device retesting.

## 9. Unit economics and cash timing

The owner business desk implements three **mutually selected scenario modes**:

- CPA: qualified plans × outbound rate × booking conversion × completed-stay rate × attribution/validation acceptance × net publisher payout.
- CPC: qualified plans × outbound rate × billable valid-click rate × contracted payout per valid click.
- Direct venue: qualified plans × request rate × confirmation rate × fulfilment rate × fee-validation acceptance × agreed fulfilled fee.

Subtract service cost for **all plans**, per-payable-event service cost and fixed costs. The output is contribution after entered costs, **before taxes and unentered costs**, not net profit or a cash receipt. Break-even is undefined when unit contribution is non-positive. No bundled CPC+CPA double counting is permitted by the model.

### Illustration only—not DealMosaic traffic or contracted rates

1,000 qualified plans × 30% outbound × 5% booking × 80% completion × 90% acceptance = **10.8 expected payable stays** in planning arithmetic. At a purely illustrative ₹300 net publisher payout, revenue is **₹3,240**. With ₹20 servicing per payable stay and no other entered costs, contribution is **₹3,024**. Fractional events are expected values, not actual reservations.

At those unchanged illustrative assumptions, ₹1 lakh contribution would require approximately **33,069 qualified plans per month**, before additional costs and taxes. Rates, traffic quality and capacity generally change with scale. This is sensitivity arithmetic—not a growth forecast or an earnings promise.

A booking made today can complete weeks later, be validated later still and pay only after a contractual threshold or settlement cycle. Maintain separate booked value, pending commission, approved receivable and cash received. Never fund cashback, refunds or operating commitments from pending commission. Review withholding, invoicing, GST and other applicable obligations with qualified advice before transactional hospitality activity; the goods-shop setup does not confer hotel merchant-of-record authority.

## 10. Zero-cash-cost operating plan and growth experiments

### Budget rules

No new paid services, paid API trial, ad spend, minimum commitment, purchased inventory, card requirement or automatic upgrade is activated. Existing free infrastructure remains subject to its actual limits. Future supplier usage must be bounded and fail closed before an unauthorised charge. Free tools and unpaid owner time are not unlimited capacity or proof that the business has no economic cost.

### Concentrate execution without removing the 17 destinations

Retain all 17 choices. Start direct relationship discovery with a manageable **three-city pilot**, proposed Kolkata, Siliguri (West Bengal) and Jamshedpur. This is an operating hypothesis based on a smaller research scope and the owner's West Bengal goods context—not a claim that the owner lives there, has hospitality contacts or can physically service those cities. Replace a city if actual partner responsiveness and customer interviews suggest a better choice.

### Sequenced experiments, not a popularity deadline

| Stage | Action | Proceed only when |
| --- | --- | --- |
| Usability | 10 target travellers complete a realistic hotel/meal comparison task; log fee/condition mistakes and abandonment | No material false-total or false-equivalence defect remains; report actual counts, not a statistical growth conclusion. |
| Supply discovery | Prepare a shortlist of 15 relevant venues across the pilot cities and seek opt-in conversations; do not mass-spam | An authorised contact can explain the offer, restrictions, support and fee basis; business identity is verified before a contract. |
| API enquiry | Submit the prepared brief through an official provider channel after owner identity/terms review | Written approval and zero-cost scope; no invented traffic projections or acceptance guarantee. |
| Authorized inventory pilot | Test a small actual inventory subset and permitted sandbox hand-offs | All required provider tests pass; quote completeness, expiry, mapping and tracking evidence are documented. |
| Conversion measurement | Record consenting/contract-permitted funnel events; exclude test/bot traffic and distinguish repeat taps | Enough real observations to report uncertainty; zero bookings remains zero, not a simulated conversion rate. |
| Retention | Offer optional genuinely supported saved/alert features and helpful dining cross-links | Explicit consent, clear cancellation/unsubscribe and a functioning reminder path—not nagging or empty notifications. |
| Expansion | Add cities, partners and original evidence-backed guides gradually | Positive realised contribution, manageable support, compliant quotas and quality controls; no paid expansion without fresh authorisation. |

Do not publish 17 near-identical city pages for rankings. Create a smaller number of genuinely useful, source-backed guides only when there is original information. Ask communities and partners for permission before sharing. No review fabrication, bought traffic, guaranteed search positions or competitor-logo imitation.

## 11. Restaurant-specific business and operational rules

The current dining workspace contains real sourced places and personal meal quotes; the existing QSR brand directory and nine brand choices remain. It does not claim every chain has an outlet in every selected city. General restaurant evidence is separate from pet-admission evidence.

For a later direct dining pilot, capture exact outlet, date/time, party size, eligible menu items, minimum spend, discount cap, blackout dates, payment/app/member restrictions, taxes, extra charges, stacking and cancellation/no-show rules. Keep food-delivery, takeaway and dine-in arrangements distinct. No restaurant service-charge or tax rate is invented by the calculator.

Use a time-bounded, explicitly unconfirmed request until the venue confirms. A fee may become payable only at the agreed validated trigger, supported by privacy-minimised evidence. Define no-show, cancellation, disputed bill and venue-unavailable handling before publishing the offer. Do not collect customer meal funds under the unrelated goods-shop payee setup.

## 12. Security, privacy and owner operations

- All new commercial readiness/brief data is behind server-side administrator checks. Anonymous and ordinary-user requests are denied. No application button silently accepts terms.
- Personal quote data stays in the current browser unless the user exports it. It can be visible to another person using that browser after sign-out. Account deletion is not local-note deletion; Remove/Clear and browser site-data controls are provided and disclosed.
- Maximum 30 quotes across hotels and dining; corrupted records are flagged, not silently rewritten. Storage failure keeps the entry open and never says it was saved. Participating tabs use Web Locks where available, reread current storage and report conflicts. Browsers without Web Locks do not have a guaranteed cross-tab transaction.
- A temporary four-place shortlist is not a synced saved list. Source links open only on choice; local note saving sends no booking, message, payment or reminder.
- Ordinary in-site navigation protects an unsaved quote entry; browser history gestures are not promised as a persistent draft system. Save or export before leaving. No automatic PWA update reload occurs during comparison work.
- No new credentials were requested or exposed. Future provider credentials are API tokens only, server-side; the owner never supplies passwords or OTPs to the agent.
- Establish a real business grievance/support contact and operating hours before accepting transactional hospitality responsibilities. Do not advertise 24/7 support that the owner cannot provide.

### Phone-sized owner workflow

1. Open DealMosaic → sign in as owner → **Control centre → Hotels & dining**.
2. Read the actual gate list. It currently shows **0 connected room-rate APIs** and **0 recorded direct venue agreements**, not an earnings claim.
3. Copy the prepared partner enquiry. Nothing is sent by copying it. Use an official provider channel; review terms and legal identity privately.
4. When approved, provide only the required API tokens through the established private configuration process. The agent implements the exact approved adapter and certification steps; no passwords/OTPs are needed.
5. Use **Campaigns** for actual campaign access and **Earnings** for reported transactions. Use the scenario calculator only for assumptions.
6. Customer checking later: Hotels → Compare hotels → apply dates/party → add two own quotes → inspect terms and totals. Dining follows the same pattern. Do not make a real booking merely to test attribution.

No owner manual action was used as a substitute for the implementation completed here. Legal identity, consent to contracts and provider approval are the remaining actions that cannot honestly be manufactured by code.

## 13. Code, verification and recovery receipt

### Principal source files

- `apps/web/src/routes/HospitalityCompare.tsx`: native hotel/dining workspaces and local-note lifecycle.
- `apps/web/src/lib/hospitality-comparison.ts`: factual catalogue composition, validation, exact matching, money, staleness and export.
- `apps/web/src/data/hospitality-venues.json`: 32 separately sourced general place records; existing pet data unchanged.
- `apps/web/src/components/HospitalityBusiness.tsx` and `apps/api/src/routes/admin-hospitality.ts`: protected owner business desk.
- `packages/core/src/hospitality-business.ts`: scenario arithmetic and independent release-gate helper.
- New unit and browser suites cover provenance, unknown fees, condition mismatch, eligibility, tie handling, arithmetic, storage, CSV safety, access control, mobile layout and accessibility.
- Privacy, terms, ranking/data-source descriptions, prerendered pages, edge routes, global destination navigation and offline policy are updated in the same pass.

### Published release

- Runtime source/tag: `c54a98d30b46a540786477af2ef630be9c64ee85` / `pwa-v2.6.0`, pushed to the existing repository.
- Existing free Render service: `dep-dbm6d549v7es7390s8tg`, live; no new service or paid tier. Cloudflare Pages: `5924e0cb-a23e-467c-bdc9-887093f9f488`, existing production project; API origin preserved.
- Production: https://dealmosaic.pages.dev. Hotel workspace: https://dealmosaic.pages.dev/stays/compare. Dining workspace: https://dealmosaic.pages.dev/dining/compare. Owner desk: `/admin?tab=hospitality`, login and admin permission required.
- Clean-source package manifest: `docs/source/2026-11-05-hospitality-release-manifest.json`; `workingTreeChanged: false`.

| Verification | Observed result |
| --- | --- |
| Type / unit / security checks | 721 tests in 37 files; 48 design assertions; 386 files passed secret scan before receipt additions |
| Browser regressions | 292 passed across release-validation runs; 2 existing development-only skips |
| Exact final packaged hospitality | 114 passed, Chromium 320px/desktop and WebKit 390px |
| Exact final packaged PWA | 57 passed, including cold-offline personal notes and classic fallback preservation |
| Exact final persistent controls | 39 passed, installation/ticker/dock/form protection |
| Device review + general shopping | 36 + 46 passed before the final source-method-only AltAir correction; same functional implementation |
| Both PWA/classic builds | 59 HTML pages / 58 unique h1 checks each; shared implementation parity passed |
| Deployment rehearsal | 68 passed against an isolated test API; not counted as production evidence |
| Production verification | 69 checks; exact web build/API revision; private noindex/no-store shells; anonymous protected-route denial; mobile accessibility/layout and local-note persistence in Chromium/WebKit |
| Production restraint | 0 server mutations, 0 external-provider/affiliate navigation; temporary local test notes deleted |

The production script validates anonymous access denial, not a real owner's signed-in production session. Owner desk authorization and interactions were tested with isolated fixtures. The final source-method correction upgraded AltAir from an indexed excerpt to the inspected official announcement; it changed no comparison arithmetic. Physical-device installation, account-container behaviour and the deferred external-link retest remain distinct from these automated checks.

### Matched deployable packages

Directory: `/home/user/releases/dealmosaic-2.6.0/`. Both archive checksums passed. Keep the compatible API when switching frontend flavors; do not replace the database. The classic removal worker must remain at the same origin/path and preserves personal quote storage.

- **pwa** `dealmosaic-2.6.0-pwa.tar.gz`; build `2.6.0-a634124cc033`; SHA-256 `01bb6f2ce23eb7fa76816ec14361d439945ee967819cefeec1f77d278048b65e`.
- **classic** `dealmosaic-2.6.0-classic.tar.gz`; build `2.6.0-8d7b13d80939`; SHA-256 `872c40be486fac62692684609e8bb1a7ef281a02d4cdf41d5f8c9a4eafb503b8`.

### Source recovery

- Verified source snapshot: `backups/dealmosaic_2026-11-05_11-23-53.tar.gz`, **422 files / 9,020,337 bytes uncompressed**, all per-file checksums matched. SHA-256 `e4893bb57b3b7d3e3d80e6a73277713c59329e2287181f6c3f82cba2ba47e991`.
- The snapshot excludes credentials, customer/test databases, generated build output and review media. It precedes this checksum note and final PDF bookkeeping; those later records are preserved in Git and the complete-history bundle.
- Complete source/history recovery: `backups/pwa-v2.6.0.bundle` and its `SHA256` sidecar. Verify both the sidecar and `git bundle verify` before restoring. Runtime tag remains `pwa-v2.6.0`; the later documentation commit is not a new runtime deployment.
- Matching PWA/classic frontend archives are separate in `/home/user/releases/dealmosaic-2.6.0/`. No database reset or pre-PWA rollback is required. Restore the classic removal worker at the same origin/path if reverting to network-only operation; local personal quotes are preserved.
- All individual handover PDFs and their combined master are regenerated together. Isolated test servers are stopped and test databases/media removed. No screenshot is retained.




**Preserved unresolved items:** physical-device retest; intermittent external destination failure root cause; five held hotel offers; supplier approval/API rights; direct goods shop facts and banking; no hotel/restaurant booking authority implied by the goods shop.

## 14. Bottom line

DealMosaic should copy the major platforms' **useful distribution economics and disciplined fulfilment boundaries**, not their advertising budgets, opaque ranking incentives or operational burden. The working comparison layer builds trust without invented inventory. The next decisive step is approved, zero-fee supplier access—not more decorative buttons or an earnings promise.
