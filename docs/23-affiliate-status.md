# Affiliate status — what is live, what is pending, what earns

**Updated:** 2 November 2026 · **Verified against the live APIs, not the dashboards.**

---

## The one distinction that matters

`POST /links/convert` **always returns a working link**. It does not always return a
*paid* one:

| Campaign state | `affiliated` | Meaning |
|---|---|---|
| `open` | **`true`** | Access granted instantly. Earns from the first click. |
| `pending` | `false` | Application submitted. Link resolves, earns nothing yet. |
| `not_applied` | `false` | Never asked. |

Verified directly: Croma → `affiliated: true`. Nykaa → `affiliated: true`.
Flipkart (pending) → `affiliated: false`.

**So "the link works" is not evidence of earnings.** The code only treats a link as
monetised when the API returns `affiliated: true`.

---

## Already earning — no approval needed (82 open Indian CPS campaigns)

These were already accessible when the account was created. Nothing to apply for.

### Genuinely relevant to a price-comparison site

| Campaign | ID | Payout | Category |
|---|---|---|---|
| Bewakoof | 1918 | 11.55% | Fashion |
| Biba | 2172 | 6.0% | Fashion |
| Blackberrys | 2445 | 9.0% | Fashion |
| Boat | 4232 | 6.0% | Electronics |
| Acer | 4360 | 2.63% | Electronics |
| Bella Vita | 4384 | 12.0% | Beauty |
| Brillare | 4863 | 27.0% | Beauty |
| Campus Shoes | 5589 | 11.25% | Fashion |
| Bacca Bucci | 6566 | 8.1% | Fashion |
| Ajio Gram | 9568 | 9.0% | Fashion |
| Big Muscles | 11174 | 3.0% | Health |
| Baidyanath | 12022 | 6.75% | Health |
| **Croma Retail** | 201 | 3.38% | Electronics |
| **Nykaa Beauty** | 891 | 4.2% | Beauty |
| **Firstcry** | 49 | ₹22.50 | Baby |
| **Decathlon** | 2248 | 2.25% | Sports |
| **Moglix** | 2536 | 4.5% | Industrial |
| **Gonoise** | 3278 | 4.2% | Electronics |
| Agaro | 37498 | 5.25% | Home |
| Banggood India | 3860 | 9.75% | Electronics |
| Cashify | 3433 | ₹525 | Refurb |
| AliExpress | 763 | 6.75% | Marketplace |
| Boldfit | 76498 | 7.65% | Sports |
| Bondstreet | 81465 | 8.25% | Fashion |
| Beastlife | 7892 | 6.3% | Health |

That is roughly two dozen real Indian merchants — enough to monetise day one.

## Applications submitted by the agent (2 Nov, via API)

| Campaign | ID | Status |
|---|---|---|
| **Flipkart** | 1 | `pending` — request #122975 |
| **Amazon India** | 817 | `pending` |
| **Myntra** | 101 | `pending` |
| **Ajio** | 2589 | `pending` |

These need no owner action. Re-check status any time with:

```
GET /pub_api/v3/campaigns/:id
```

---

## Admitad

Ad space created and tagged (`mitgo-verification` is live in the served HTML), but
**Admitad has no publisher API key configured here**, so nothing on that side can be
done by the agent. Two separate restrictions, both worth stating plainly:

1. The ruble-payment modal is **not a settings page**. It appears when joining a
   programme that settles in RUB. Dismissing it changes nothing, and not joining
   those programmes is the correct outcome — the site is India-only and cannot
   receive rubles.
2. Ad-space country settings live at **id.mitgo.com → Ad spaces → (ad space) → Edit**.
   That is the only place they can be changed; there is no equivalent on the store
   dashboard.

---

## Known data-quality issue

Some feed offers state a starting price rather than a rupee discount, arriving as
`discount_value: 0`. The UI shows a quiet "Deal" badge for these instead of a
fabricated "₹0 off". If a rupee amount is needed later, it must be derived from
`original_price − discount_price` when both are present, never invented.
