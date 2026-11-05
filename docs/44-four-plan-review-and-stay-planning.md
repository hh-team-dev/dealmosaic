# 2.7.0 — Four-plan review and practical stay planning

> **Current release — 2.7.1, 5 November:** [Document 45](45-store-link-recovery-and-connection-desk.md) records explicit direct-store recovery, bounded analytics/edge-proxy safeguards and the category-separated owner connection desk. Campaign access, India-listed access, published offers and homepage placement are separate. Hotel live-rate APIs remain unconnected. The owner’s phone DNS failure is not dismissed or marked solved by automated checks; physical testing has begun and remains incomplete. Runtime `492e98b` / `pwa-v2.7.1`; Pages `0c9c7b7e`; Render `dep-dbma2k0ae00c738pqjqg`. 793 unit and 379 browser checks passed; production repair/general/hospitality checks passed without external clicks. See the click-repair release receipts.

**Review date:** 5 November 2026. **Release status:** **2.7.0 deployed and production-verified.** No new earning programme, paid service or hospitality booking operation is activated.

## 1. What was reviewed

| Source / images read | Most useful idea | Main caution |
| --- | --- | --- |
| Model03 / 64 | Whole-trip budgets | Unsupported API and fee assumptions |
| Model04 / 65 | Traveller needs; rebooking | Supplier evidence and lead workload |
| Model05 / 64 | Refund, timing and split-stay ideas | Invented rates; stacking; tax errors |
| Model06 / 19 | Clear corrections; narrower scope | Reports and leads still need staff |
| **Total / 212** | **Ideas retained from all four** | **Only supplied content assessed** |

Every screenshot was downloaded and its extracted text read in source/filename order. Twelve critical images were also visually cross-checked, including formulas, clipped revenue tables and tax assertions. Overlaps were read rather than treated as permission to skip unique text. Public-folder scrolling continued until three stable end-of-list observations. All temporary screenshot copies were deleted; the original Drive folders were not modified.

**Limitations:** Model03 starts at section II; Model05 starts partway through its layered comparison; some horizontal columns and intervening passages are outside the captures. Adjacent captures recover some, not all, of those gaps. This is complete review of the 212 supplied screenshots, not proof that the original AI conversations were supplied in full. The source-organised ledger records all substantive idea groups and decisions; private research retains the filename/hash inventory and OCR text.

## 2. The decision

Do not choose one model wholesale. Keep the earlier preferred Our Business 01 direction of practical network-first monetisation, combine it with Model04 / Model06's conditional operating discipline, and use Model03 / Model05 as sources of customer-helpful ideas—not as verified technical or commercial manuals.

**Minimum-fuss execution:** improve what travellers can actually do now without a new account, paid API, invented hotel rate, hotel contract or unstaffed customer-service queue. Three native tools are now implemented together at **`/stays/plan`**, reached from hotel discovery, dining discovery and both personal comparison workspaces. The same source serves the website, installed PWA and classic fallback.

These improve decision support. They do not establish more inventory, a higher conversion rate, market leadership or income. The existing site still lacks an authorised automatic multi-provider hotel-rate connection.

## 3. Implemented customer improvements

### A. Compare the whole trip

Two plans each accept five cost categories: whole stay, food/dining, transport including getting there, activities, and other non-refundable costs. All amounts cover the whole party and trip. Both plans must cover the same dates/travellers; differences in inclusions and cancellation require consideration.

- Blank means unknown, never zero. Every category must be entered; zero is explicit.
- Integer-paise arithmetic, bounded amounts, no negative/exponential/comma-formatted or excess-precision input.
- No default GST, service charge, taxi fare, restaurant bill or city price estimate.
- Cashback is not deducted; refundable deposits remain outside cost and need a separate cash allowance.
- Output says **lower entered budget**, not cheapest hotel or verified savings. Changing an input removes the previous output until recalculated.

This safely implements the whole-trip idea without pretending grocery prices establish restaurant expenditure or that a cheaper room is automatically a cheaper holiday.

### B. Ask before booking

Nine checklist choices cover general stays, families, accessibility/older travellers, hospital attendants/long stays, groups/weddings, pilgrimage/early arrivals, work/long stays, local-ID/check-in policy, and pets.

Common questions ask for all-guest/all-night totals, mandatory on-site costs, room/meal details, cancellation deadline and time zone, refund method/deductions/timing, support ownership and exact-address delivery acceptance. Need-specific questions add practical detail. The page never marks any listed hotel suitable on an unverified basis.

Copy and download produce **only the generic checklist**. They do not export budget/rebooking figures, submit a lead, send a WhatsApp/email, hold a room or promise a reply. Clipboard denial shows a manual-select/download fallback. The traveller supplies dates/counts and chooses a verified contact outside DealMosaic. Identity, card and medical documents are not requested.

Destination-aware dining and pet research links and a shopping essentials link connect existing useful sections. They do not imply a delivery service covers the hotel or that every destination has a qualifying offer.

### C. Check rebooking economics

Inputs: original full-stay total, amount already paid, expected cash refund, replacement full-stay total, and any additional cancellation fee not already deducted from the refund.

**Switch cost = paid − expected refund + additional cancellation fee + replacement total.**

The tool compares that with keeping the original booking and shows additional cash needed before the refund arrives, assuming full replacement payment now. It rejects refund greater than payment and payment greater than the original total. The traveller must confirm matching terms, current availability, deadline/time zone, and release of any unpaid original balance.

This is arithmetic, not an instruction to cancel. It cannot verify room availability, guarantee a refund, preserve benefits, cancel, rebook or send an automatic reminder. Refundable security deposits and vouchers are outside this calculation. A lower nightly price can still produce a higher total cost.

### Privacy, offline and design

Figures are held in current-page memory, not server/account/local-storage records. Browsers may retain open pages; use Clear on a shared device. Reload starts a fresh form. Existing saved quote collections are unaffected. Generic checklist export is explicit.

The PWA can open these local tools after offline preparation, without cached API responses or background submission. Updates do not forcibly reload a planning form. Existing install invitation, ticker, navigation, shopping design and permitted warm palette remain. No blue/black redesign, external asset or paid dependency was added.

## 4. Where the existing system is stronger

| Recommendation in the screenshots | Existing safeguard retained |
| --- | --- |
| Add standard GST/service charges to a base price | Actual entered amounts; unknown charges cannot become a winning total |
| Compare different refund/breakfast offers by price | Exact plan and terms groups before selecting a lower comparable quote |
| Subtract future cashback | Cashback stays separate from payable price |
| Guess MakeMyTrip from another hotel's rate | No fabricated supplier-specific quote, even with an estimate label |
| Highlight a deal because its discount exceeds a threshold | No unsupported authenticity/safety score or false verified badge |
| Incognito protects attribution | No 100% attribution guarantee; account/country/media/deep-link rules remain visible |
| New hotel lead form immediately creates income | No unstaffed lead submission, hotel agreement or payment collection implied |
| Rebuild on Google Sheets/Supabase/new brand | Existing Cloudflare/Render/Turso, protected owner desk and DealMosaic identity preserved |

These are correctness and operational safeguards, not evidence of proven profitability.

## 5. Material corrections from current sources

1. **Hotel data access:** Hotellook closed on 20 October 2025. A Travelpayouts login does not restore its retired API or establish a universal multi-OTA price licence. Brand-specific approved tools are still worth investigating. [1](https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook)
2. **Google Places:** pricing is SKU-dependent, not a universal free 10,000 photos/reviews/routes allowance. Attribution, display and caching restrictions apply. No Google billing or copied review/photo pipeline was enabled. [2](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) [3](https://developers.google.com/maps/documentation/places/web-service/policies)
3. **Hotel GST:** the official 56th Council FAQ says accommodation supply up to ₹7,500 per unit/day attracts 5% without ITC under the September 2025 change, not the screenshots' old 12% rule. That correction is not a licence to guess tax treatment, double-add included tax, or invent a 10% service charge. [4](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163560&reg=3&lang=2)
4. **Foreign receipts:** RBI's $250,000 LRS facility concerns permitted outward remittances by resident individuals. It is not an annual cap on receiving affiliate revenue, contrary to Model05. [5](https://rbi.org.in/Scripts/FAQDisplay.aspx?Id=115)
5. **Privacy timing:** the notified DPDP Rules have phased commencement: immediate provisions, Rule 4 after one year, and main operational rules after eighteen months. On 5 November 2026, a blanket 'everything is already in force' statement is wrong. Existing privacy safeguards are retained, not postponed. This review is not a legal compliance certificate. [6](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf)
6. **Tax/legal shortcuts:** do not rely on universal 10% TDS, automatic GST exemption below one number, sole-proprietor profession-tax exemption, or 'no payments means no legal liability'. Payout classification, aggregate activities, jurisdiction and current law matter. Obtain owner-specific advice; no legal registration or fee was initiated here.

## 6. Revenue priority remains practical

The same-day full account audit in document 43 remains the commercial baseline; it was not replaced with screenshot assertions or a second unnecessary 23,127-row scan.

1. **Resolve the specific Trivago 2516 permission question.** Existing account access is open and India appears, but the CPS-labelled campaign pays for qualified downstream click-outs and prohibits Deals/Coupons and other media. DealMosaic's actual publisher and proposed placement must be explicitly accepted. The enquiry remains unsent; no relabelling workaround or link activation.
2. **Use the easiest genuinely approved, accurate existing offer.** A suitable CPS promotion can be closer to a first validated commission than an unapproved CPC programme. Preserve CPC investigation preference without pretending every first tap is payable.
3. **Only add another network/tool for a concrete gap.** Review actual programme approval, India/PWA rules, display rights, limits, settlement and zero-upfront costs. No generic claim that all providers approve instantly.
4. **Consider a small direct-lead pilot only with response capacity and written acceptance.** Define a qualified lead, permission, fee, rejection/duplicate window, payment trigger and reconciliation. Do not launch public requests until a real supply/response arrangement exists.
5. **Ads/sponsorships/regulated finance referrals are later options**, not guaranteed traffic income. Commission does not decide the customer winner.

The new tools earn nothing merely by existing. Their business hypothesis is better usefulness and return visits, which must later be measured against real approved referrals and validated earnings.

## 7. Good ideas deferred, not discarded

- **Public paid-price reports:** need privacy/redaction, exact comparable conditions, moderation, dispute handling and lawful retention. Do not discard genuine outliers merely to create an attractive average.
- **Need-based hotel filters/pages:** require fresh property-level policy evidence; a useful checklist is not a verified accessibility/couple/medical-stay badge.
- **Refund-speed meter:** complaint samples are not measured platform refund performance.
- **Season/festival/duration/split-stay optimisers:** need authorised comparable rate observations and careful treatment of room moves, separate deposits, terms and higher total spend.
- **Card wallet/automatic stacking:** need verified eligibility, caps, timing and combinability; no card numbers or unfunded rewards.
- **Cancellation alerts:** require reliable deadline/time-zone and delivery behaviour; no silent reminder promise.
- **Mass SEO/community growth:** no thin location pages, copied reviews, false exclusivity, fake scarcity, guaranteed ranking or assumed subscriber targets. Fewer genuine pages are the sensible direction.

## 8. Validation, deployment and owner check

**Live:** https://dealmosaic.pages.dev/stays/plan

- Runtime/source tag: `42bc6f3557c852f809c536e831935dd187c13971` / `pwa-v2.7.0`.
- Cloudflare Pages deployment: `3ed88455`; Render deployment: `dep-dbm8h3rm8hqs73f1rk7g`, exact runtime revision, existing free plan.
- PWA build: `2.7.0-5f0593753792`; classic: `2.7.0-f3333371600a`. Both archives have verified SHA-256 checksums and clean-source package manifests.
- **756 unit tests** across 38 files; **48 design assertions**.
- **337 browser checks passed**: device journeys 39, general 46, hospitality 135, PWA 60, persistent controls 39, extra classic-planner 18. Two development-only source-import probes are intentionally skipped in packaged builds.
- **83 local / 84 production read-only checks** passed. Production Chromium/WebKit recorded zero browser exceptions, zero server mutations and zero external/affiliate navigation attempts; isolated personal notes were removed.
- New coverage includes all nine checklists, copy failure/download, complete/unknown budget inputs, rebooking losses/cash gap, stale-result clearing, destination links, 320px/accessibility, private memory, real offline cold start and classic fallback.
- Preliminary issues were corrected: explicit select labels, verifier currency precision, and a test harness that hard-navigated away before outstanding WebKit reads finished. No final failure was suppressed. The final packages retain the same tested application build hashes; final planner and local checks were rerun after validation-script corrections.

Evidence in `docs/source/`, using the prefix `2026-11-05-stay-planning-`:

- `release-validation.json` — test totals, limits and log hashes.
- `production-verification.json` and `local-verification.json` — read-only checks.
- `release-manifest.json` and `deployment.json` — exact artifacts and deployments.

Source coverage and the detailed model-by-model ledger accompany them. Earlier 2.6.1 evidence is historical, not reused as new tests.

Recovery: both deployable archives are in `/home/user/releases/dealmosaic-2.7.0/`. Document 28 and the dated backup/PDF receipts record source recovery and handover validation.

Physical Android/iPhone testing is still the owner's next step after deployment. Automated Chromium/WebKit checks do not prove that the earlier phone-specific external-link problem is resolved. The new planning tools have no affiliate outbound action, so testing them cannot establish advertiser attribution or payout.

Phone-sized check: Hotels & Stays → Plan the whole trip → enter both complete budgets → change one value → choose a stay-need checklist → copy/download → try rebooking with a cancellation loss → Clear. Confirm familiar ticker/install/navigation controls remain visible. No real booking or payment is needed.
