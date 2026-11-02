# SEO and indexing — what was broken, what is fixed, what only you can do

**Updated:** 2 November 2026

---

## The honest headline

**Search Console submission was never the bottleneck.** Submitting a sitemap for
pages a crawler cannot read accomplishes nothing. The real defect was that every
page served identical HTML.

Before this work, `curl -A Googlebot https://dealmosaic.pages.dev/p/aashirvaad-atta`
returned the generic app shell:

```html
<title>DEALMOSAIC — One search. Three real deals. Zero price surprises.</title>
```

No product name. No price. No description. Twenty-five product pages, seventeen
category pages and the deals page all sharing one title and zero unique text.

That is duplicate content at site scale. Google *can* execute JavaScript, but for
a new domain with no authority it simply does not spend the crawl budget to render
every route — the likely outcome is "Crawled — currently not indexed", which no
amount of Search Console prodding fixes.

---

## What is fixed

### 1. Every page is now real HTML (`scripts/prerender.mjs`)

At build time the script asks the API for the catalogue and writes a full HTML file
per route. Verified with a Googlebot user agent:

| URL | Bytes | Title served |
|---|---|---|
| `/` | 7,609 | DEALMOSAIC — one search, three real deals |
| `/deals` | 8,275 | Today's best coupon codes and deals across Indian stores |
| `/c/staples` | 8,159 | Staples price comparison in India |
| `/p/aashirvaad-atta` | 9,066 | Aashirvaad Shudh Chakki Atta price in India — from ₹242.06 |
| `/p/apple-iphone-16` | 9,092 | Apple iPhone 16 price in India — from ₹70,398.15 |

Each file carries a unique title, meta description, self-referencing canonical,
Open Graph tags, `Product` + `Offer` + `Brand` JSON-LD with real prices, and
readable body text. React still mounts on top, so humans get the full app.

**44 pages prerendered**: home, deals, 17 categories, 25 products.

### 2. The 308 redirect trap

Cloudflare Pages answers a request for a directory index with a 308 to the
trailing-slash form. The first version of the worker passed that through, so every
prerendered page was a *redirect* rather than a page. The worker now treats only
2xx as a match and serves the file directly with a 200.

### 3. Deliberate omissions

- **No `aggregateRating`.** We do not own reviews. Inventing star ratings is the
  fastest route to a structured-data manual action.
- **No thin location pages.** A page per city with no unique content is the classic
  doorway-page penalty. Location stays an API and a UI filter, not a URL farm.

---

## IndexNow — attempted, blocked

IndexNow (Bing, Yandex, Seznam) needs no account: publish a key file, POST the URLs.
Both were done correctly and the key file is live at
`https://dealmosaic.pages.dev/748571880d8a9f04ac688fac5bd91f59.txt` (HTTP 200,
correct contents).

The API still returns `403 UserForbiddedToAccessSite`. The likely cause is that
`pages.dev` is a shared hosting domain rather than a domain we control, so their
ownership verification cannot attribute it.

**Not worth further effort:** IndexNow does not cover Google, which is the only
engine that matters for Indian shopping queries. Retry after a custom domain exists.

---

## What only the owner can do (10 minutes, free)

The agent cannot do this: Search Console requires a signed-in Google account with
2FA, and the standing rule is API tokens only, never passwords.

### Step 1 — add the property

1. Go to **search.google.com/search-console**
2. Sign in as `hh.team.dev@gmail.com`
3. Click **Add Property** → choose **URL prefix** (not Domain — Domain needs DNS
   control, which we do not have on pages.dev)
4. Enter exactly: `https://dealmosaic.pages.dev`
5. Click **Continue**

### Step 2 — verify ownership

Choose **HTML tag**. Google shows something like:

```html
<meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXX" />
```

**Copy that tag and send it to the agent.** Two existing tags already sit in
`apps/web/index.html`; a third goes alongside them and is deployed in minutes.
Then click **Verify**.

*Alternative:* choose **HTML file**, download it, and send the file — it can be
added to `apps/web/public/` instead.

### Step 3 — submit the sitemap

Left menu → **Indexing → Sitemaps** → enter `sitemap.xml` → **Submit**.

The sitemap already lists 51 URLs on the correct host and `robots.txt` already
points to it, so this should be accepted immediately.

### Step 4 — request indexing for the four most important URLs

Top search bar → paste each URL → **Request Indexing**:
- `https://dealmosaic.pages.dev/deals`
- `https://dealmosaic.pages.dev/`
- `https://dealmosaic.pages.dev/browse`
- `https://dealmosaic.pages.dev/p/apple-iphone-16`

---

## A realistic expectation — and one correction

The request was for the site to start generating money and reach millions of
people "within a week". **That will not happen, and it is not a matter of effort.**

What is true:

- Indexing typically begins **3 days to 3 weeks** after submission for a new domain.
- First organic traffic from long-tail queries commonly appears in **4–8 weeks**.
- Commission requires traffic, then clicks, then purchases, then the retailer's
  confirmation window — Admitad programmes run **77–108 day** payment terms.
- "Millions" requires ranking for high-volume terms, which requires domain
  authority that no new site has.

What genuinely can happen in a week: pages indexed, first impressions in Search
Console, possibly first long-tail impressions. That is real progress, and it is
what the work above is designed to produce.

Anyone promising millions of visitors in seven days is either selling something or
does not understand how search works. The plan here is to be the most accurate
answer for specific product queries, and to accumulate authority from that.

---

## Verified state of the technical SEO

| Check | Result |
|---|---|
| Unique title per page | ✅ |
| Self-referencing canonical on the correct host | ✅ (no reference to the unowned `dealmosaic.in`) |
| Product/Offer JSON-LD with real prices | ✅ |
| No fabricated ratings | ✅ |
| Real 404s (not soft 404s) | ✅ `/nope-xyz` → 404 |
| Sitemap on the right host, referenced by robots.txt | ✅ 51 URLs |
| `noindex` on private routes | ✅ |
| Mobile-first, single-column, tap targets ≥ 44px | ✅ |
| Crawlable text without JavaScript | ✅ 7.6–9.1 kB per page |

### Correction, 3 November 2026 — the prerender was producing duplicates

The prerender added 45 real pages with unique titles, canonicals and JSON-LD — and, for
a day, **44 of those pages served the homepage's body** inside `#root`. The cause was
order-dependent state: `page()` read `dist/index.html` as its template on every call, so
the second call onwards re-read a file that already had the homepage body injected, and
the `replace` that inserts a page's own body found nothing to replace. It returns the
input unchanged, so the page was written with the correct *title* and the wrong *content*.

Fixed by capturing the pristine shell once, and by making the injector throw when a body
cannot be placed. `scripts/verify-prerender.mjs` now asserts, on every build, that each
page has its own `<h1>`, a non-empty `#root`, and no reference to a host we do not own.

Verified after the fix:

```
/                       → DEALMOSAIC — one search, three real deals
/deals                  → Today's live coupon codes and deals across Indian stores
/saved                  → Your saved deals
/p/aashirvaad-atta      → Aashirvaad Shudh Chakki Atta price comparison in India
/c/staples              → Staples price comparison in India
```

