# Location, pincodes and maps — the master design

**Why the obvious answer (a map with a location pin) is the wrong first move, and
what to build instead.** Written 2 November 2026.

---

## 1. The design decision, stated first

You asked for location services and a map so that "the local things also show
up". Here is the central judgement, and it is not what most products do:

> **The pincode is the product's location. The map is a feature of the pincode,
> never the other way round.**

### Why, concretely

| Question | GPS answers it | Pincode answers it |
|---|---|---|
| "Do you deliver here?" | ❌ No | ✅ Yes — this is literally how orders are placed |
| "How fast?" | ❌ No | ✅ Yes — the platform computes against the PIN |
| "Which store serves me?" | ❌ No | ✅ Yes — dark stores are mapped to PINs |
| "What did people pay near me?" | ⚠️ Approximate | ✅ Exactly — reports are per PIN |
| "How far is that shop?" | ✅ Yes | ❌ No |

The map's only genuinely useful jobs are **discovery** ("what's around me") and
**distance display**. Everything that decides whether an order is even possible
is a pincode question.

There is a second, sharper reason: **a delivery promise derived from distance
would be a guess.** Being 2 km from a Blinkit dark store does not mean that store
serves your PIN — catchment areas are drawn by the platform, not by a radius.
Showing "10 minutes away!" based on distance would invent a promise, which is
exactly what this project refuses to do.

So the architecture is:

```
        GPS  ──assist──►  PINCODE  ──►  serviceability (unknown | confirmed)
          │                  │
       (optional,      ┌─────┴─────┐
        never         │           │
        required)  reported    platform's
                   prices at    published
                   that PIN     promise only
                       │
                    MAP (display + discovery only)
```

---

## 2. What is built, right now

### `packages/core/src/location.ts`

| Function | Purpose |
|---|---|
| `parsePincode()` | Validates 6 digits, rejects leading 0, maps the first digit to one of India's 9 postal regions, identifies the sorting circle, and returns a **plain-language note**. |
| `isValidPincode()` | Predicate used by every form. |
| `samePincode()` | Compares safely — two invalid PINs are never "the same". |
| `haversineKm()` | Distance, for display only. |
| `isInIndia()` | Bounding-box sanity check. |
| `etaBand()` | Turns a delivery promise into a band (`instant`, `quick`, `same_day`, `next_day`, `slotted`, `unknown`). |

Covered by **20 tests**, several of which exist purely to enforce honesty:

- it never returns a "yes" for serviceability — only `likely` or `unknown`
- a metro pincode still says *"whether they reach this specific PIN still varies
  by street — only the platforms can confirm it"*
- an Army Postal Service pincode is flagged as not applicable rather than treated
  as a normal address
- `etaBand(null)` returns `unknown`, never a default
- an unparseable pincode returns a **specific** error ("you entered 5"), not a
  generic one

### `GET /api/location/pincode/:code`

Returns the validated location. Cached for a day — it never changes.

### `GET /api/location/summary?pincode=560001`

Everything the UI needs in one call:

- where the PIN is (region, states, circle)
- each platform's **published** delivery promise, banded — with the explicit
  field `serviceability: "unknown"` and a note saying who actually decides it
- any **community-reported** prices at that exact PIN
- a `disclaimer` embedded in the payload, so no client can quietly overstate it

Verified live: 14 platforms returned, each with `bandLabel: "In minutes"` for
quick commerce and `serviceability: "unknown"`.

### Already existed

`user_preferences.pincode` and the Settings screen field. Location is now
validated and enriched rather than stored as free text.

---

## 3. The five things location unlocks

### 3.1 Serviceability — the honest version

The tempting build is a map of dark stores with delivery circles. **Do not build
it**, because the underlying data does not exist for us: no platform publishes its
store list or catchments.

What is honest and useful instead:

- Show each platform's **published** promise ("10–20 min") clearly labelled as
  *their promise, not our estimate*.
- Show a **deep link** straight to that platform's search for the product, so the
  user resolves serviceability in the app that knows the answer.
- Learn from users: when someone reports a price at a PIN, that is evidence the
  platform **does** serve that PIN. Over time this becomes real serviceability
  data that nobody else has.

That last point is the strategic asset. **Community reports are the only way to
map quick-commerce coverage without a partnership** — and every report makes the
product's single most valuable dataset better.

### 3.2 Reported prices near you

Community prices are already pincode-scoped. With location they become filterable
by distance and ranked by "same PIN → same city → anywhere". The UI rule stays:
reported prices are shown separately and never mixed into verified rankings.

### 3.3 Delivery-time honesty

`etaBand` gives the UI one vocabulary for six delivery styles. The rule enforced
in code: **an unpublished promise is `unknown`, never a default.** No invented
"10 minutes".

### 3.4 Local discovery (the map's real job)

A map earns its place for browsing a city and seeing where reports come from. It
is **lazy-loaded**: no map library is downloaded until the user asks for it, so a
shopper who only wants to compare milk pays zero bytes for it.

### 3.5 SEO — the sleeper benefit

Pincode-scoped pages (`/near/400001`) are how people actually search:
*"milk price in Andheri"*, *"Blinkit vs Zepto in Koramangala"*. Real pages, backed
by real reported data, are the most defensible SEO this site can build — and each
one is also a landing page for a local query that national competitors ignore.

**Guard:** a page is only generated when there is real data behind it. Generating
thousands of empty pincode pages is the doorway-page pattern Google penalises, and
it would be dishonest.

---

## 4. The map: what to use, and what it costs

| Option | Cost | Verdict |
|---|---|---|
| **Leaflet + OpenStreetMap tiles** | ₹0 | ✅ Chosen — open source, no key, no account |
| MapLibre + free vector tiles | ₹0–limited | Good alternative; more setup |
| Google Maps | Paid above a small credit | ❌ Violates the zero-cost rule |
| Mapbox | Free tier, needs card | ⚠️ Card required — avoid |

**Honest constraints of free OSM tiles:** their usage policy is aimed at modest
traffic and forbids heavy bulk use. Fine for launch; at real scale the correct
move is to self-host tiles or cache aggressively. This is documented rather than
hidden, because "free map" usually means "free until it is popular".

**Also note:** the in-app workspace preview has no network access, so map tiles
will not render there. They will work on the deployed site.

### Privacy

- Ask for GPS **only** when the user taps "use my location", never on load.
- Never store coordinates unless the user saves them; derive the pincode and
  discard the point.
- GPS is a convenience for filling in a PIN, not a requirement. Everything works
  with the pincode alone.

---

## 5. Build order (deliberate, not arbitrary)

| # | Step | Status |
|---|---|---|
| 1 | Pincode validation, region mapping, ETA bands, tests | ✅ Done |
| 2 | `GET /api/location/pincode` + `/summary` | ✅ Done |
| 3 | Pincode field validated on the Settings screen | ⬜ Next |
| 4 | Prompt for a PIN after the first search (one field, no modal) | ⬜ Next |
| 5 | Show reported prices filtered by the user's PIN | ⬜ Next |
| 6 | Pincode-scoped SEO pages, only where data exists | ⬜ Later |
| 7 | Lazy-loaded Leaflet map for discovery | ⬜ Later |
| 8 | "Use my location" → GPS → nearest PIN suggestion | ⬜ Later |

The order is chosen so that **every step is useful on its own**. If the project
stops after step 3 the site still works; there is never a half-built map blocking
the product.

---

## 6. What the next developer must not do

1. **Do not infer serviceability from distance.** Catchment is decided by the
   platform. A radius is a guess dressed as a fact.
2. **Do not show a delivery estimate** unless the platform published one.
3. **Do not require GPS.** It is an assist; the pincode is the identity.
4. **Do not generate pincode pages without data.** Doorway pages are penalised and
   dishonest.
5. **Do not ship a map on the critical path.** It must lazy-load.
