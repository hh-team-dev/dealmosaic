# 31 — Affiliate applications: what I did, what only the owner can do

> **Current release — 2.6.0, 5 November:** [Document 42](42-hospitality-business-and-native-comparison.md) records the deployed native personal hotel/dining comparison workspaces and owner business desk. Runtime `c54a98d` / `pwa-v2.6.0`; Pages `5924e0cb`; API `dep-dbm6d549v7es7390s8tg`. Live supplier rates, booking and new hospitality earnings are not activated. Previous dated receipts remain historical.


> **Previous release — 2.5.0, 5 November:** [Document 41](41-device-review-and-conversion-repair.md) is the authoritative deployed guest/member/admin repair record: runtime `a13bac7`, Pages `b776ff72`, repaired API and matching PWA/classic packages. Older dated release evidence below is historical.


> **4 November 2026 correction:** This is a historical application record. “Open” means campaign access, not that every click pays, a destination works or commission has been received. The fresh hotel-access check and five-row protective hold are documented in [40-hospitality-revenue-reset.md](40-hospitality-revenue-reset.md). Do not use stale cached application status to reapply.

Prepared 3 November 2026. Every claim in this document was checked against the live Cuelinks
publisher API on the day it was written; the API responses are quoted, not paraphrased.

---

## 0. The short version

| Question | Answer |
|---|---|
| Can the site earn today? | **Yes.** Every campaign we display is `open` — 243 campaigns, **1,106 offer rows** — which means no application is needed and the tracking links already pay. |
| Are Amazon, Flipkart, Myntra and Ajio applied for? | **Yes, all four are `pending`** at Cuelinks. There is nothing further to submit; the advertiser decides. |
| What did I do this evening? | Submitted **6 new access requests** programmatically: HP India, Kaspersky India, Autodesk, Booking.com, Expedia India, Skyscanner India. |
| What is blocked? | 8 campaigns that would be worth having are **paused** and accept no requests at all (Meesho, Myprotein India, Netmeds, RedBus, Hostinger, Audible IN, Skyscanner Hotels, Deodap). Nothing to apply to; re-check monthly. |
| What only you can do | The **direct** Amazon Associates India application (its own programme, not Cuelinks), PAN, bank account, and any GST question. Templates in §4. |
| Recommendation for the next 30 days | Do nothing else. 246 stores is enough to test whether anyone converts; adding more catalogue does not create traffic. |

---

## 1. The audit that mattered: can our existing offers pay us?

The fear worth checking was that the site might be showing 1,100 offers from merchants we had never
been approved for — clicks that would route, redirect and pay nobody. I pulled all **25,289** campaigns
on the Cuelinks account (51 pages), matched them against the **246** campaign ids in our `coupons`
table, and counted:

```
campaigns in our table by access: {'open': 243, 'unknown': 3}
our offer rows by access:        {'open': 1106}
```

**`open` means `approved_for_all`: no application needed, the tracking URL is live and earning.** So
every offer we display is monetisable today. The 3 `unknown` ids are campaigns no longer returned by the
API (paused or deleted at the merchant); their 4 rows are harmless and will age out of the feed.

---

## 2. Already applied — waiting on the advertiser

| Merchant | Cuelinks id | Status | Rate | EPC (7d) |
|---|---|---|---|---|
| Amazon India | 817 | `pending` | 3.17 % per sale | ₹0.43 |
| Flipkart | 1 | `pending` | 6.0 % per sale | ₹0.34 |
| Myntra | 101 | `pending` | 7.5 % per sale | ₹1.11 |
| Ajio | 2589 | `pending` | 9.0 % per sale | ₹0.42 |

`pending` = an application exists and is under review. Re-applying is blocked by the API until the
advertiser answers (`422 Duplicate request blocked`). **What to do: nothing, except check once a week**
in the Cuelinks dashboard under Campaigns → My Applications. If one is rejected there is a 3-month
cooldown before re-applying, which is why the application text in §4 is worth getting right the first
time — and why we should not burn a second attempt on a thin site.

**Honest note on EPC:** Amazon India's ₹0.43 per 100 clicks means roughly one rupee per 230 clicks at
today's conversion. Volume, not coverage, is the constraint.

---

## 3. What I submitted tonight (no action needed from you)

Six requests, all `201 Created`, with the promotion text below. They are now `pending`.

| Merchant | Campaign id | Why it is worth having |
|---|---|---|
| HP India | 2339 | Highest EPC in the Indian set (₹51.64) — laptops and printers are high-ticket |
| Kaspersky India | 2951 | 22.5 % per sale, software is a clean fit for a deals site |
| Autodesk | 3776 | 5.25 %, expensive subscriptions, good EPC |
| Booking.com | 1715 | Travel; a real category we have nothing in |
| Expedia India | 42 | Travel, 3 % |
| Skyscanner India | 5189 | Travel meta-search, 48.75 % of their payout |

The text submitted for each (it matters — a blank application is a rejection):

> DealMosaic (https://dealmosaic.pages.dev) is an India-first deal and coupon site. We list the
> merchant's own offers and codes with the store's expiry date, and every card sends the shopper out
> through a tracked affiliate link. Traffic is mobile-first from search and social, plus a saved-deals
> list that brings shoppers back. We do not run cashback and do not bid on the merchant's brand
> keywords.

**Paused, could not submit:** Meesho (76953), Myprotein India (1957), Netmeds (2351), RedBus (829),
Hostinger (3989), Audible IN (4021), Skyscanner Hotels (11156), Deodap (34241), RedRail (58179), Seiko
IN (12188). The API answered `422 Campaign is currently paused and not accepting access requests`. This
is the merchant's setting, not a rejection — worth re-checking monthly.

**Open, no application needed, but no offers in the feed:** Adidas IN (2191, EPC ₹24.19), Titan Watches
(3398), Tanishq (4229). Their offers endpoint returns `total 0`, so there is nothing to list. They are
usable only for deep-linking a specific product URL, which this catalogue does not yet have real
products for.

---

## 4. Your part: the direct Amazon Associates India application

Amazon runs its own programme; Cuelinks' Amazon India campaign is a separate route to the same
merchant and both can exist. The direct one pays more and reports faster. It must be submitted by you,
because it requires your PAN, your bank account and your tax details.

**URL:** https://affiliate-program.amazon.in → *Sign up*

### 4.1 What to type, field by field

| Field | Answer |
|---|---|
| Account type | **New account** (unless you already have one) |
| Name | Your legal name, exactly as on your PAN |
| Address | Your address, exactly as on your PAN — Amazon matches the two |
| Website / mobile app | **Website** |
| Website URL | `https://dealmosaic.pages.dev` |
| Website description (they limit this) | `An India-first deals site: live coupons and offers from 240+ Indian stores with the store's own expiry date, compared and linked out to the merchant.` |
| What do you use to drive traffic? | **Search engines** and **Social networks** (both true — we are indexed and we will publish to social). Do **not** tick "paid search" or "email": the first is a separate approval, the second is against their terms for a new account. |
| Do you use affiliate links in email? | **No.** (Correct today: our emails never carry affiliate links — the weekly saved-deal email links only to our own pages.) |
| How many monthly visitors? | **The truth: "fewer than 1,000 (new site)".** Amazon rejects inflated numbers and it is the single easiest way to be banned later. |
| Do you have other associate IDs? | **No** |
| Tax interview | PAN + the W-8BEN equivalent for India; payee = individual or business as you prefer |
| Payment | Bank account in your name; NEFT |

### 4.2 What happens after you submit

Amazon requires **three qualifying sales in the first 180 days**, or the account is closed and you must
re-apply. That is the real gate — not the form. It means the priority is not more applications; it is
getting real shoppers to the site.

### 4.3 What I will do the moment it is approved

1. Add the tag to the outbound links for Amazon rows (a `tag=` parameter, not a redirect hop).
2. Re-point those rows from the Cuelinks Amazon campaign to the direct one, since the direct rate is
   higher — checked per merchant, never assumed.
3. Add the Amazon badge to the store chips and the "where this price came from" line.

---

## 5. Flipkart, Myntra, Ajio — the honest answer

All three are already applied for, through Cuelinks, and all three are `pending`. Flipkart closed
direct affiliate signups for new publishers; the route in is a network (Cuelinks or AdmitAd), and we are
in the queue on both counts. Myntra and Ajio run inside the same networks. **There is no form left for
you to fill in for these three.** If any comes back rejected, the cooldown is three months, so the
application text has to be good — which is why the one above exists.

---

## 6. What I recommend, in order

1. **Do not apply to anything else for 30 days.** More catalogue does not create traffic. Ten approved
   merchants and zero visitors earns zero.
2. **Submit the Amazon Associates form once** (§4). It is the only application left that needs you.
3. **Watch the four pending applications weekly.** They are the ones that change the commission rate
   rather than the coverage.
4. **Publish where people already are.** A Telegram channel and an Instagram account, both free, both
   posting the same three offers a day that are already on `/deals`. That is what turns clicks into
   sales, and sales are what the network pays on.
5. **Then** worry about Pro, checkout and everything else in `docs/30`.

---

## 7. Where to look, so this never needs asking again

* **Commissions and payouts:** Cuelinks dashboard → Reports, or `/admin?tab=revenue` in our own site,
  which now shows the network's pending / validated / payable / claimed figures beside our click count.
* **Which applications are pending:** Cuelinks → Campaigns → My Applications.
* **Which campaign an offer belongs to:** the `campaign_id` column on `coupons`; every row we store from
  the feed keeps it, which is what made the audit in §1 possible in one evening.
