# Getting real price data from every platform

**The honest answer to "pull in everything from everywhere".**
Written 2 November 2026. This document exists because this is the single question
that decides whether DEALMOSAIC becomes a real product or a demo.

---

## 1. The uncomfortable truth, stated first

You asked for the *smartest way around* platforms that have no free API. There is no
legal trick that makes Blinkit, Zepto or BigBasket hand over live prices for free.
What exists is a set of **real, boring, effective** routes that take weeks rather
than hours. The "trick" that looks fast — scraping their apps and websites — is a
dead end, and it is worth being precise about why.

### Why scraping is not "the smart way around"

| Consequence | What actually happens |
|---|---|
| **It breaks the law in India.** | The sites' terms prohibit automated collection. India has no Computer Misuse Act equivalent that is as broad as the US CFAA, but contract breach and database-extraction claims are actionable, and the IT Act covers unauthorised access. |
| **It gets blocked within days.** | Blinkit and Zepto run commercial bot protection. Detection means either getting blocked or *bypassing* it — and bypassing is exactly what makes it indefensible rather than merely impolite. |
| **The data is wrong anyway.** | Quick-commerce prices are **per dark store** and change through the day. A scraped "Blinkit price" is one store's price at one moment. Publishing it as *the* price is a false claim. |
| **It poisons the moat.** | The brand promise is "zero price surprises". One wrong price and the trust is gone permanently. A comparison site whose data is wrong is worse than no site. |
| **It kills the affiliate income.** | The whole business model needs these platforms to pay commission. Their affiliate terms terminate accounts that scrape. You would be destroying the revenue to obtain the data. |
| **It kills SEO.** | Google penalises sites that republish scraped content, and a manual action on a young domain is effectively terminal. |

**This project's standing rules already forbid it**, and they are right to. So the
answer below is not a workaround — it is the set of things that actually work.

---

## 2. What "comparing everything" really requires

Four kinds of data, in increasing difficulty:

| # | Data | Volunteer-able? | Route |
|---|---|---|---|
| 1 | **Catalogue identity** (what a product *is*) | ✅ | eBay Browse API (free), ONDC, feeds, brand data |
| 2 | **Listed price** (what a seller asks) | ⚠️ | Affiliate feeds, eBay, ONDC |
| 3 | **Landed cost** (delivery, fees, tax) | ❌ | Only via feed columns or merchant partnership |
| 4 | **Per-pincode quick-commerce price** | ❌ | Contract only — no technical solution exists |

Row 4 is the hard truth: **nobody without a commercial agreement can show live
Blinkit/Zepto prices per pincode.** Any site claiming to do it either has a
partnership or is scraping. There is no third option.

---

## 3. The routes that do work, ranked

### Route A — eBay Browse API ✅ *free, self-serve, available today*

- Genuinely free: ~5,000 calls/day, OAuth client credentials.
- Self-serve: create a developer account, get a keyset, done. **No sales threshold,
  no approval queue, no partner conversation.**
- Already implemented in `apps/api/src/connectors/ebay.ts`; it needs only
  `EBAY_CLIENT_ID` and `EBAY_CLIENT_SECRET`.
- **Important correction (verified 2 Nov 2026):** `EBAY_IN` *is* a valid enum value in
  eBay's APIs — but eBay's own documentation annotates it: *"eBay India is no longer a
  functioning eBay marketplace."* The India site was wound down. So the connector
  should be pointed at a **live** marketplace (`EBAY_GB` for the best
  price/India-shipping overlap, or `EBAY_US` for range) via `EBAY_MARKETPLACE_ID`,
  and every offer must be treated as *international with seller-specific shipping to
  India*. Which is exactly why the schema keeps `shippingMinor` nullable and never
  defaults it to zero.
- **Caveat, stated plainly:** eBay's coverage of Indian quick-commerce groceries is
  effectively nil. It is good for electronics, books and imports, weak for milk and atta.

**Effort: 30 minutes. Coverage: narrow but real. This is the one to switch on first.**

### Route B — Affiliate network product feeds ✅ *the main workhorse*

This is the actual answer to "compare everything". Licensed networks issue
**product data feeds** — CSV or XML with SKUs, prices, stock and deeplinks — to
approved publishers. One account can cover many platforms at once.

| Network | Platforms reachable | Cost | Notes |
|---|---|---|---|
| **Cuelinks** | Flipkart, Amazon, Myntra, AJIO, Nykaa, BigBasket, JioMart, many more | Free to join | Largest Indian coverage; product feed access after publisher approval |
| **AdmitAd** | Global + Indian brands | Free | Strong for electronics and apparel |
| **EarnKaro / vCommission** | Similar set | Free | Aggregators; feed availability varies |

**The infrastructure for this is already built** — see §4. Joining is:
1. Apply to one network (they review the site — so **the site must be live first**,
   which it now is).
2. Get a publisher ID and feed access.
3. Write a ~20-line mapping file. No code changes.

**Effort: 1–3 weeks of waiting, ~1 hour of work. Coverage: wide.**

### Route C — ONDC ✅ *free, open protocol, highest strategic value*

ONDC is India's open commerce network (Beckn protocol). Catalogue and price data
flow through *network participants*, and participation is open.

- **Zero licensing cost** — the protocol and reference implementations are open source.
- Requires onboarding as a participant or partnering with a Technology Service Provider.
- This is the only credible route to **real Indian grocery catalogue data** at zero cost.
- Multi-week process with paperwork; not a same-day win.

**Effort: weeks. Coverage: deepest for India grocery. Keep as a running candidate.**

### Route D — Community-reported prices ✅ *built, already live*

Already implemented (`community_prices` table, `routes/community.ts`). Users report
what they actually paid, with the store and pincode.

- **This is the only way to get per-pincode quick-commerce prices without a contract.**
- Must be clearly labelled as shopper-reported, never mixed into verified rankings —
  which the code already enforces.
- Needs volume to be useful, so it compounds over time rather than arriving at once.

**Effort: already done. Coverage: whatever users contribute.**

### Route E — Direct merchant partnerships 🤝 *the real prize, slow*

For Blinkit, Zepto, Swiggy Instamart, Croma, Reliance Digital there is exactly one
route: a commercial conversation. The thing that makes it possible is **traffic** —
a site with 100,000 monthly users is worth a meeting; an empty one is not.

This is why the sequence matters: launch → traffic → partnerships → better data →
more traffic. Not the other way round.

---

## 4. What has been built today

### `apps/api/src/connectors/feed.ts` — one importer, every feed

Rather than a bespoke connector per platform (each needing new code when terms
change), there is **one importer whose platform knowledge is entirely data**.

```jsonc
// deploy/feeds/mapping.json  (copy from mapping.example.json)
{
  "platformSlug": "jiomart",
  "sourceLabel": "JioMart · affiliate feed",
  "columns": {
    "title": "product_name",
    "price": "sale_price",
    "url": "product_url",
    "gtin": "ean",
    "mrp": "mrp",
    "inStock": "availability",
    "shipping": "delivery_charge",
    "currency": "currency",
    "priceUnit": "major"          // "major" = rupees, "minor" = paise
  }
}
```

Activate with two environment variables on the API:
`FEED_MAPPING=/path/to/mapping.json` and `FEED_FILE=/path/to/feed.csv`.

**Onboarding a new network becomes a config file, not a deployment.**

### Honesty rules the importer enforces (tested, 24 assertions)

| Rule | Why it matters |
|---|---|
| Missing shipping is `null`, **never 0** | 0 means "free delivery" and would win the ranking for a false reason. A competitor's bug is not a price. |
| Rows without a usable price are **dropped and counted** | Never guessed, never averaged, never carried over. |
| Non-INR rows are rejected | Comparing across currencies is meaningless without a live rate. |
| Rows without an openable URL are dropped | An offer the user cannot act on is not an offer. |
| Malformed mapping **fails loudly with every problem listed** | A silently wrong mapping produces wrong prices — the worst possible outcome. |
| Unconfigured feed reports `disabled` **with the reason** | An empty list looks like "no price found", which is a different, misleading statement. |
| Every row stamped `dataOrigin: 'feed'` | Never confused with demo data or a live quote. |

Demonstrated on `deploy/feeds/example-feed.csv`: **4 of 7 rows usable**, with
`{"missing or invalid price":1, "missing or invalid product URL":1, "non-INR currency":1}`
recorded as reasons rather than hidden.

---

## 5. What the site will honestly say

The `/data-sources` page and the connector health endpoint must keep telling the
truth per platform. Today that means:

| Platform | Status | Meaning |
|---|---|---|
| eBay India | `awaiting_credentials` | Implemented, needs a free keyset |
| Amazon, Flipkart, Myntra, AJIO, Nykaa, BigBasket, JioMart, Swiggy | `partnership_required` | Reachable via affiliate feed once approved |
| Blinkit, Zepto, DMart Ready | `no_public_api` | No route except a commercial agreement |
| ONDC | `partnership_required` | Open protocol, needs onboarding |

**No platform is ever shown as compared when it is not.** That rule is enforced in
code (`KNOWN_PLATFORMS`, `unavailablePlatforms()`), not just in documentation.

---

## 6. The recommended sequence

| When | Action | Who | Cost |
|---|---|---|---|
| Now | Turn on eBay Browse API | Owner: 30 min | ₹0 |
| Now | Keep community prices open and prompted after each search | Built | ₹0 |
| Launch + 2 weeks | Apply to Cuelinks with the live site as evidence | Owner | ₹0 |
| On approval | Write one mapping file per network | Me | ₹0 |
| Month 1–2 | Apply for ONDC participant / TSP onboarding | Owner | ₹0 |
| Month 3+ | Partnership conversations, once traffic is real | Owner | ₹0 |

**The trigger for everything else is the same: traffic.** Nothing else unlocks
Blinkit or Zepto data. That is not a limitation of the code — it is how the market
is structured.

---

## 7. Summary for a new developer

- Do **not** scrape. It is against the rules, the law, and the business model.
- The catalogue is real; the *prices* are demo until a route above is switched on.
- One feed importer covers most platforms. Add a mapping JSON, not code.
- `dataOrigin` on every offer is the source of truth for what is real:
  `demo` → demonstration, `feed` → network feed, `live` → API, `community` → reported.
- The UI must never blur those four.


---

## 8. Addendum — the database backup and the test-suite incident

Both happened on the same day and are worth connecting, because they are the same
lesson from two directions.

**The backup** (`scripts/db-backup.mjs`) splits the schema into PUBLIC and PRIVATE
tables. The public half — catalogue, offers, 170 price observations, reference data —
is committed to `db-snapshots/` and pushed to GitHub on every milestone. The private
half (users, sessions, tokens, search history) is written to
`~/.config/dealmosaic/db/` at mode 0600 and never leaves the machine. It uses an
**allow-list**, so a personal table added later is excluded by default rather than
silently published.

**The incident** was the inverse mistake: not publishing private data, but *writing*
to production by accident. The test suite inherited `TURSO_DATABASE_URL` from the
shell and wrote real rows into the live database. See `docs/15` §14.0.

Together they define the two rules that matter:

1. **Personal data must be impossible to publish** — enforced by an allow-list.
2. **Test data must be impossible to write to production** — enforced by an
   environment guard and a regression test.

Both are now structural rather than remembered.
