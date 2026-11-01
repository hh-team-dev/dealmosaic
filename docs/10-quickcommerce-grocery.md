# Part 11B — Grocery & 10-Minute Quick Commerce (India)

*Research date: 2 November 2026. Added at owner request: DEALMOSAIC must compare potato chips as seriously as it compares phones.*

---

## 1. Why this is a different product category, not "two more retailers"

Quick commerce is not e-commerce with a faster courier. It breaks four assumptions the comparison engine was built on:

| Assumption | Quick commerce reality | Engineering consequence |
|---|---|---|
| A product has one national price | Price is **per dark store**, and stores are pincode-specific | Every price needs a **location scope** (`service_pincode` / `store_id`). No pincode → no q-commerce comparison, and we say so. |
| Prices change daily | Prices, offers and fees change **multiple times per day**; surge and rain fees appear per session | Freshness TTL drops to **15–30 min**; confidence decays faster; "last checked" becomes minutes, not hours. |
| Shipping is a number | Delivery fee is **conditional**: waived above a cart threshold, plus handling, small-cart, packaging and surge fees | A new line state is required: **Conditional** (true for some carts/times, not others). Cannot be collapsed into "known" or "unknown". |
| Product identity = model + variant | FMCG identity = **brand + net quantity + flavour + pack type**; loose produce has **no GTIN at all** | Matching needs **unit-price normalisation** (₹/100 g, ₹/kg, ₹/L, ₹/pc) and must never rank a 52 g pack against a 90 g pack on absolute price. |

**Design decision (locked):** grocery results carry an explicit *cart context* — "landed cost for a single-item order of ₹X; delivery waived above ₹199 on Blinkit" — because a q-commerce total without a cart assumption is a lie. Unit price is displayed on every grocery offer and is a ranking tie-breaker, never the primary sort key (a ₹5 cheaper 20 g pack is not a better deal).

---

## 2. The Indian quick-commerce landscape (verified Nov 2026)

Market share figures come from tracker estimates (Datum Intelligence via Reuters; Redseer) and **disagree with each other** — treat them as "roughly half / a quarter / a fifth", not as audited fact.

| Platform | Owner | Model | Stores / cities | Est. share | **Authorised product or price API?** | Affiliate programme | Our status |
|---|---|---|---|---|---|---|---|
| **Blinkit** | Eternal (ex-Zomato) | 10–20 min, inventory-led | ~2,243 / 200+ | ~46% | **No.** `partners.blinkit.com` / seller portals are for *brands listing stock*, not for reading prices | CPS programme exists (₹110/install, up to ₹40/order) but app-install oriented, and campaign availability has been reported paused | Deep link + community price + demo |
| **Zepto** | Zepto (independent) | 8–10 min | ~1,139 / ~66 | ~22–29% | **No.** Supplier portal only | No public consumer affiliate programme found | Deep link + community price + demo |
| **Swiggy Instamart** | Swiggy | 12–15 min | ~1,171 / 131 | ~21–24% | **No** | Swiggy affiliate programme (up to ~15%, 30-day window) via programme/network | Deep link + affiliate + community |
| **BigBasket / BB Now** | Tata | 10–20 min + slotted | ~700 / wide | 5–7% | **No** | Affiliate programme exists (rate varies, short cookie window) | Deep link + affiliate + community |
| **JioMart** | Reliance | Slotted + express | National | (in "others") | **No** | Affiliate programme (up to ~4%, 30-day) | Deep link + affiliate + community |
| **Flipkart Minutes** | Flipkart / Walmart | ~12 min | 1,000+ / 130+ | 3–4% | Flipkart Affiliate API exists but **new registrations paused since 2018** | Closed to new affiliates | Deep link + community + demo |
| **Amazon Now / Fresh** | Amazon | 10–15 min | 500–600 / 15+ | 3–5% | Amazon Creators API — **gated at 10 qualifying sales/30 days** | Associates (rewards restricted) | Connector dormant |
| **DMart Ready** | Avenue Supermarts | Slotted + pickup | National | — | **No** | None known | Deep link + community |
| **Licious** | Licious | 90-min meat/fish | Metro | — | **No** | Unverified | Deferred |
| **Country Delight / Milkbasket** | D2C subscriptions | Scheduled dairy | Metro | — | **No** | Unverified | Deferred |
| **SPAR / StarQuik / Nature's Basket** | Various | Supermarket express | Regional | — | **No** | Some affiliate programmes | Deferred |
| **ONDC network** | Open protocol (Beckn) | Buyer/seller network | Growing | — | **Open protocol — no public feed listing to us, and participation needs network onboarding** | N/A | **Research candidate** (see §5) |

### Does Uber deliver groceries in India?
**No.** Uber sold Uber Eats India to Zomato in 2020 (~$206 M) and its food-delivery app was shut down here. Uber operates ride-hailing only in India; there is no Uber Grocery / Uber Eats grocery offering in this market. **Excluded.**

### Platforms you were right to suspect but which are *not* comparable surfaces
- **Zepto Cafe / Blinkit pharma / Instamart pharmacy** — adjacent *categories* on the same platforms, not separate comparand platforms. They are included automatically once the platform is modelled.
- **Zomato / Swiggy food delivery** — restaurant menus are not comparable SKUs and per-restaurant pricing is out of scope. Excluded by design, not oversight.

---

## 3. The honest conclusion

**Zero Indian quick-commerce platforms publish an authorised product/price API, and none provide a catalogue feed to third-party comparators.** Where affiliate programmes exist (BigBasket, JioMart, Swiggy, Blinkit) they are **link-attribution schemes**, not data sources — exactly the conflation the brief warned about regarding Cuelinks.

Additionally, q-commerce prices are **pincode-specific**. Even Google does not show Instamart prices without a location. A "national" grocery price is a fiction.

So we do what the brief demands: build the socket, label the absence, and find legitimate ways to deliver real value on day one.

---

## 4. Three-layer solution (what we will actually build)

### Layer 1 — Deep-link comparison (real, legal, useful immediately)
For every grocery product we resolve the **search/PLP destination** on each platform:
`https://blinkit.com/s/?q=lays+classic+salted`, `https://www.zeptonow.com/search?query=…`, `https://www.swiggy.com/instamart/search?custom_back=true&query=…`, `https://www.bigbasket.com/ps/?q=…`, `https://www.jiomart.com/catalogsearch/result?q=…`

The comparison screen shows **"Check on Blinkit →"** beside each platform, with the product name pre-searched. This works today, needs no access, and is monetisable where an affiliate programme exists. It is labelled exactly what it is: *"Opens Blinkit's own search — price confirmed there, not here."* **We do not invent a price we cannot see.**

### Layer 2 — MOSAIC COMMUNITY PRICE (the differentiator)
Shoppers themselves report what they paid, in their pincode, right now:

- Fields: product (or barcode), platform, pincode, price, MRP, pack size, timestamp, optional screenshot URL, optional delivery fee.
- Displayed as a distinct **trust tier**: `Community-reported · 12 min ago · Pincode 712201` — **never** styled as verified retailer data, never merged into the "verified total", always visually separate with its own colour token.
- Freshness rule: community prices **expire for ranking after 90 minutes** and are shown as historical context afterwards.
- Corroboration: two independent reports within 30 min in the same pincode → "corroborated" (badge only, still not retailer-verified).
- Admin verification queue: an ops reviewer can *witness* the price on the platform and mark it moderator-verified, with the reviewer and timestamp logged.
- Rewards: XP for accepted reports; **heavily anti-gamed** — one report per product/platform/pincode per 6 hours, no reward for duplicate or contradictory spam, all reports auditable, threshold before XP.
- Privacy: we ask for the **pincode only** — never live GPS, never a delivery address. Purpose stated plainly; optional; user-scoped and deleted with the account.

This is the only legal path to *real* Indian grocery prices at launch, and no competitor does it with provenance labels this strict. It is also genuinely useful: q-commerce prices differ by pincode *and by hour*, which is exactly the information users have and platforms do not publish.

### Layer 3 — Dormant connectors for the day access arrives
`BlinkitConnector`, `Zeptoconnector`, `InstamartConnector`, `BigBasketConnector`, `JioMartConnector`, `FlipkartMinutesConnector`, `AmazonNowConnector` — each implements the full `RetailerConnector` interface, carries `status: 'pending_approval'` or `'no_public_api'`, appears in the admin **Data-Source Health** page with the exact contact/onboarding route, and activates by config the moment a legal feed exists (merchant-authorised feed, network feed, or ONDC participation).

---

## 5. ONDC — the one credible zero-cost route to real Indian prices
ONDC (Open Network for Digital Commerce) is an open protocol where catalogue and price data flow between network participants. If a grocery seller on ONDC publishes a catalogue, a registered buyer app can read it legally. **However**: participation requires network onboarding, protocol compliance and a participant role — it is not a key you paste in. **Status: research candidate, explicitly not promised**, scheduled for Phase 5 evaluation. I will not claim ONDC coverage until a real search returns real results.

---

## 6. Product matching for groceries & FMCG

Identity ladder for grocery (adapted from Part 12):

1. **GTIN / EAN-13** from packaging (barcode scan later; typed entry now)
2. **Brand + product name + net quantity + unit** (e.g. *Lay's Classic Salted 52 g*)
3. **Flavour / variant + pack type** (salted vs cream & onion, pouch vs jar)
4. **Unit price** (`₹/100 g`) as a *comparability check*, never as identity
5. Loose produce: name + grade + unit (`₹/kg`) with **reduced match confidence**, explicitly labelled

Rules:
- 52 g ≠ 90 g ≠ 180 g family pack → **different variants**, same product family. We show "per 100 g" on all three so the user can see true value, and never silently ranks across sizes.
- Multi-pack ("pack of 3 × 52 g") is a distinct variant with computed unit price.
- MRP is displayed alongside selling price where reported; "% off MRP" is shown only when both values are known.
- Fresh produce and bakery (no GTIN) are allowed but capped at a lower confidence band and labelled "matched by name — verify pack size".

---

## 7. Fee & total model for quick commerce (Price Truth extension)

New line-item state, in addition to Confirmed / Estimated / Not available / Not applicable:

**Conditional** — true only under stated conditions. Rendered as e.g.:
> Delivery fee · **Conditional** · ₹0 above ₹199 cart, else ₹25–35 — *not included in total*

Fee lines modelled per platform: item total · delivery fee (with waiver threshold) · handling fee · small-cart fee · packaging · surge/rain fee · GST on fees · bank/coupon discounts · platform membership (e.g. loyalty tiers).

Rule: the comparison total is computed for a **declared cart context** shown on screen. If the cart is below the free-delivery threshold, we add the fee rather than pretending delivery is free.

---

## 8. Roadmap impact

| Phase | Change |
|---|---|
| **1** | Add **pincode** to onboarding/preferences (optional, purpose-stated), and a `serviceability` concept in the country/currency engine |
| **2** | Extend the money engine with `Conditional` lines + cart context; extend matching with unit-price normalisation; add grocery categories (Snacks, Staples, Dairy, Fresh Produce, Beverages, Personal Care, Household) |
| **3B (new)** | Quick-commerce platform registry (7 platforms), deep-link resolution service, and the **Community Price Report** pipeline (submit → corroborate → moderate → display with trust tier → XP) |
| **4** | Community-price anti-abuse rules, XP tuning, admin moderation queue for reports |
| **5** | ONDC feasibility evaluation; additional grocery connectors if any feed materialises |

Estimated extra scope: **+1 build phase (~Phase 3B)** plus extensions in Phases 2 and 4. It does not break the architecture — the connector interface and money engine were designed for exactly this.

---

## 9. What you will see at launch for grocery (honest)

| Feature | Status |
|---|---|
| Compare potato chips across Blinkit / Zepto / Instamart / BigBasket / JioMart with unit pricing | ✅ LIVE (unit maths + matching) |
| Real prices from those platforms | ⚠️ COMMUNITY-REPORTED only, clearly labelled, 90-min decay |
| One-tap deep link to each platform's own search | ✅ LIVE |
| Fee-aware totals with cart context and Conditional lines | ✅ LIVE (rates from community reports; unconditional fees only) |
| "Verified platform price" | ❌ Not until a platform grants authorised access — shown as pending, never faked |
| Electronics comparison (previous plan) | Unchanged: eBay live-capable, Amazon/Flipkart pending, demo watermarked |
