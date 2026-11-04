# 30 — How DealMosaic earns, and how the owner runs it

Written on 3 November 2026 in answer to the owner's questions about money, checkout and the admin
side. It states what exists in the code today, what is deliberately not built, and the one decision only
the owner can make.

---

## 1. The uncomfortable answer first

Before this evening, **tapping a coupon did not earn anything.** The card copied a code and stopped
there. The shopper then opened the retailer themselves, pasted the code, and bought. The retailer was
paid, the shopper saved money, and DealMosaic was never in the transaction at all — not even in the
retailer's logs. That is a shop window with no cash register behind it.

Nothing about that was a design philosophy. It was a missing route. It is now built, and it is live:

| Piece | Where | State |
|---|---|---|
| Tracked outbound redirect | `apps/api/src/routes/go.ts` → `GET /api/go/:couponId` | **live**, verified 3 Nov 2026 |
| Unique sub-id per click | same file, `withSubid()` | **live** — e.g. `subid=dmmw12wing41792fe6` |
| Click log | table `outbound_clicks` | **live** — first row written on the first real click |
| "Shop at store" button | every coupon card: `/deals`, home shelves, `/saved` | **live** |
| Three-step instruction | `HowItWorks`, on `/` and `/deals` | **live** |
| Earnings dashboard | `/admin?tab=revenue` | **live** |
| The network's own commission ledger | same tab, from `services/earnings.ts` | **live** |

---

## 2. How the money actually arrives

**DealMosaic is paid by the store, not by the shopper.** That is the affiliate model, and it is how
every coupon site in India works — CashKaro, GrabOn, CouponDunia, and the coupon pages of every large
publisher.

The chain, in the order it happens:

1. A shopper taps **Shop at Croma**.
2. Our server mints a sub-id and records the click (store, coupon, day, phone/desktop — no personal data).
3. The browser is sent to Croma **through the affiliate network** (Cuelinks today).
4. The shopper buys, and Croma's checkout reports the sale back through the network.
5. The network matches the sale to **our sub-id**, takes its cut, and pays us a commission — typically
   1–8 % depending on the merchant and category.
6. The commission is confirmed after the merchant's return window closes, usually 30–60 days.

**What the shopper pays does not change.** The code and the price are the same whether they arrive
through us or typed directly. That is why the language on the site is "the store pays us a small
commission", never "you save 5 % extra because of us".

### Why a unique sub-id matters more than anything else on the site

The feed's tracking URL is **identical for every visitor**. Linking to it directly tells the network
only that somebody, somewhere, clicked. Sales from that link cannot be attributed to us, and an
unattributed sale is a sale we are never paid for — the single most common way small coupon sites earn
traffic and no money. Every click now carries a unique sub-id, which is the only handle the network has
to pay against.

### The honest limits, stated plainly

- **A click is not a sale.** Conversion rates on coupon traffic are usually 1–5 %. The admin page shows
  clicks because clicks are what we can measure; it will not print a rupee figure until the network
  reports one.
- **Commission is not confirmed fast.** Expect 30–60 days from sale to payout, plus the network's payout
  threshold (Cuelinks pays monthly, above a minimum balance).
- **Nothing here is a promise of income.** The first rupee requires real traffic — that is a marketing
  problem, not a code problem, and the next section is about it.

---

## 3. The question about checkout, UPI and Razorpay

The owner asked whether shoppers should pay *on DealMosaic*, with Razorpay or UPI, so the money comes to
us directly. The answer has to be honest about three different things that look like one thing.

### 3.1 We cannot take payment for another shop's goods

Croma sells the washing machine, issues the invoice, handles the return and carries the warranty. If we
collected ₹32,999 for it we would be a reseller: we would need GST registration, inventory or a drop-ship
agreement, a payment gateway with KYC, refunds, chargebacks, and consumer-protection liability for goods
we never touch. Every Indian retailer's affiliate terms forbid it, and Razorpay's own onboarding asks
what you are selling. **Embedding their checkout inside our page is not permitted either** — the payment
must happen on the merchant's own domain; that is a condition of the affiliate programmes and of PCI
compliance.

So: no embedded checkout. Not for legal reasons we can talk our way around — it is simply not our sale.

### 3.2 What *is* ours to sell

There is one category where Razorpay/UPI is the correct answer: **our own service.** If DealMosaic ever
charges, it should charge for something we make:

| Candidate | What it is | Status |
|---|---|---|
| **DealMosaic Pro** — ₹49/month | price-drop alerts on a watchlist, a saved-price history longer than 7 days, and an early view of expiring codes | not built; needs the owner's decision |
| Sponsored placement (clearly labelled) | a store paying for a "featured" slot, always marked `Sponsored`, never affecting rank | not built; needs a store to agree |
| Data/insight reports | aggregate price trends for a category | not built; needs volume first |

None of these can be switched on tonight, and all of them need the owner's decision because they involve
his money, his GST status and his name on a payment gateway. **What I recommend: nothing.** At 1,112
offers and no traffic, a paywall would sell a product nobody has used yet. The order that works is
traffic → trust → commission → then, only if a real number of people ask for alerts, Pro.

### 3.3 The cheapest thing that actually grows income

For a coupon site, income = traffic × click-through × conversion × commission rate. We control two of
the four:

- **Click-through** — every card now has one obvious action instead of a copy button and a hope.
- **Coverage** — 1,112 offers from 246 stores is thin next to CashKaro's catalogue. The feed is the
  constraint, not the interface.

Two levers the owner can pull this week, both free:

1. **Apply to more affiliate programmes** (Amazon Associates, Flipkart Affiliate via Cuelinks/AdmitAd,
   Myntra, Ajio). Each approval adds merchants and raises the commission ceiling.
2. **Publish the best-performing offers somewhere people already are** — a Telegram channel and an
   Instagram page cost nothing and are how Indian deal accounts actually grow.

---

## 4. The admin side

It exists, it has existed for weeks, and until tonight **nothing linked to it** — which is indistinguishable
from it not existing. That was the failure.

### 4.1 How to get in

1. Go to **https://dealmosaic.pages.dev/login**.
2. Sign in with the owner account: **`chawdhureprithwwiraj@gmail.com`**.
3. An **Admin** link now appears in the header, or go straight to **https://dealmosaic.pages.dev/admin**.

If the header link is missing, the account is not an administrator — the role is checked on the server for
every request, so the page cannot be faked. As of tonight that account is `super_admin` in the database,
which was verified after the change:

```
chawdhureprithwwiraj@gmail.com : super_admin
srishtibanerjeechoudhury@gmail.com : super_admin
```

`super_admin` cannot be granted from the web at all — only set in the database — so a stolen admin session
cannot mint an owner account.

### 4.2 What each tab is for

| Tab | The question it answers |
|---|---|
| **Overview** | Is the feed alive, how many offers are live, is the daily sync running, how many people have accounts |
| **Earnings** | How many clicks today / this week / ever, which stores and which offers people actually tap, and where those clicks come from |
| **Coupons** | Every offer with its trust state: approve, reject, mark expired. A rejected code disappears from the site within a minute |
| **Price reports** | Shopper-submitted prices waiting for a moderator; accept the ones with a receipt, reject the rest |
| **People** | Accounts, verification state, and promoting a second administrator |
| **Audit log** | Every action an administrator took, on what row, from which value to which — including their own |

Everything is reversible and everything is recorded. There is no delete-anything button anywhere.

### 4.3 What the admin page deliberately does not do

It shows the network's ledger, not a calculated guess. Since 3 November the Earnings tab reads
`/reports/earnings` and `/reports/performance` from Cuelinks and renders **pending, validated, payable and
claimed** commission, sales, conversion rate and EPC for the last 30 days, next to our own click count.
If the network cannot be reached the tab says **unknown** — never ₹0, because "we could not ask" and "you
earned nothing" are different facts.

What it still will not do is multiply clicks by a commission rate to estimate income. That number is the
most expensive lie a small business can tell itself, and it is the one figure that decides whether you
keep going.

---

## 5. What changed tonight, and what is still open

**Shipped and verified live:** the tracked redirect (a real click returned
`302 → linksredirect.com/…&subid=dmmw12wing41792fe6`), the `outbound_clicks` table, "Shop at store" on
every card, the three-step instruction, the earnings dashboard, the Admin link in the header, the owner
promoted to `super_admin`, the missing-column layout fault on `/deals` (a homepage-rail rule leaking into
the grid, which is what left the right-hand gap in the screenshots), the negative "No price API" row on
the landing page replaced with what each store is good for, the landing page rewritten in short sentences,
a translation note, signing in landing on the live home instead of the account page, the deal ticker on
every page including the public ones, and the phone navigation bar on public pages.

**Open, in priority order:**

1. **Real traffic.** 1,112 offers and no visitors earns nothing. The affiliate approvals and one public
   channel are worth more than any further interface work.
2. **Amazon and Flipkart affiliate approvals** — the two merchants that would lift both coverage and
   commission rate.
3. **A second device tour** — the layout fixes are CSS and cannot be seen from here.
4. **Pro membership** — owned by the owner, not by me; the honest recommendation is to wait.
