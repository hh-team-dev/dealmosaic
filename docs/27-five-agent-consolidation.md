# Five-agent consolidation — the decision report

Date: 3 November 2026. Five agent reports were supplied as PDFs. This document is
the decision layer: what they agreed on, what was worth taking, what was rejected
and why, what none of them found, and what was actually shipped as a result.

It is deliberately short on prose and long on verdicts. The implementation record
is `00-MASTER-HANDOVER.md` §2.18.

---

## 0. What the five reports actually are — stated first, because it changes the weighting

All five were produced **without browsing the live site**. Each says so in its own
opening section. They were written from the same six-document handover set that
this repository publishes. That has three consequences:

1. **They inherit the handover's errors and its blind spots.** Where the handover
   was stale, all five are stale — see §1, where their single loudest finding was
   already false before they filed.
2. **Agreement between them is not independent corroboration.** Five readers of one
   document agreeing about that document is one observation, not five. This is why
   the brief's rule — *common recommendations deserve consideration, not automatic
   correctness* — turned out to be the decisive one.
3. **Where they disagree, the disagreement is about taste, not evidence**, because
   none of them had any. Those arguments get settled by measurement here, not by
   whichever report is longest.

One further note, recorded because a future reader will notice it: `Agent 02
design.pdf` and `Agent03 design.pdf` are near-identical. A shingle comparison of
the extracted text gives a Jaccard similarity of **0.94** (3,040 shared 8-word
sequences); every other pair scores at or below 0.004. They are not five
independent analyses. They are four, one of which was submitted twice under
different labels. Nothing was discarded for that reason — the duplicated pair
simply cannot be counted as two votes.

---

## 1. The finding they all got wrong

**All five open with a "critical" flow: anonymous search is gated behind login and
email verification.** Agent 01 calls it F01, Agent 02 F-01, Gemini FL-01, Agent 03
F-01, GPT-6 F-04. It is their top recommendation, in every report, with estimates
of 4 hours to 2 days to fix.

It is not true, and has not been true for some time. Verified against production
before writing a line of code:

```
POST /api/search   (anonymous, no cookie)  →  200
{"kind":"needs_selection","query":"atta","product":{...}}
```

`apps/api/src/routes/search.ts` opens with a comment explaining that search is
public and always was in the current build; `App.tsx` puts `RequireAuth` in front
of `/app` and `/app/settings` only. The 401/403 pair they all cite comes from
`15-project-handover.md` §8, which describes an older API. The master handover
already corrected it at §2.15/§2.16; none of the five reconciled that.

**Decision: rejected, no work done.** The lesson is worth more than the finding:
five reports agreeing loudly is not evidence, and the first action on any audit is
to reproduce it against the running system. Had I implemented it, I would have
"fixed" a public endpoint by removing middleware from two routes where it does not
exist, and shipped a release note for a non-change.

Two of their other "critical" items are also already shipped and invisible in the
docs they read: **cookie-free analytics** (there is a privacy page explaining that
no tracking cookies exist) and **the coupon "did it work?" report flow**
(`ProductInsights.tsx`). Same cause, same verdict.

---

## 2. Where they agree — and what that agreement is worth

| Their common recommendation | Verdict | What shipped |
|---|---|---|
| One solid CTA colour; kill the gradient primary button | **Adopt** | Primary button is now solid `--action #2F49C9`, hover `#2540B0`, active `#24399B`. White text: 7.20 / 8.61 / 9.84:1 |
| The legacy prism/aurora gradients clash with the new cobalt/coral mark | **Adopt** | `--grad-prism` is now the "Mosaic Duet" `#2F49C9 → #6D3BE0`. Every stop clears 5.9:1 with white, so it is safe behind labels — the old five-stop rainbow was 1.66:1 at its amber stop |
| `--ink-soft #8A7C9B` fails AA for text (3.69:1, not the documented 4.10:1) | **Adopt, they were right** | Recalculated independently: **3.69:1** confirmed. Token moved to `#7A6B8C` = **4.66:1** |
| Hero should lead with a benefit, not the brand | **Adopt** | H1 is now "The price you'll actually pay" |
| Show proof near the CTA using live numbers, never a user count | **Adopt** | Live strip under the search, fetched from the API, renders nothing if the API is cold |
| Touch targets to 48 px | **Adopt in part** | Save control 40 → 44 px (48 px hit area via padding); see §5 for why not a blanket 48 |
| Add `FAQPage` / `SearchAction` schema | **Reject `FAQPage`**, already shipped `SearchAction` | `SearchAction` exists in both `seo.tsx` and `index.html`. `FAQPage` is refused on principle: the site has no FAQ page, and inventing markup for content that does not exist is the same offence as a fake rating |
| Route-level code splitting to cut the 134 kB gzip bundle | **Defer with a trigger** | See §5. The premise is weaker than they think: 134 kB gzip over Cloudflare's edge to a 4G phone is not the bottleneck; the cold Render API is |

---

## 3. Unique recommendations worth taking

Only one agent proposed each of these, and several are the best ideas in the set.

| Idea | From | Verdict |
|---|---|---|
| **The 1,089 live coupon rows should be the homepage, SEO and revenue engine** — they are real data while the 25-product catalogue is demo | Agent 01 | **Adopt — already the case.** The discovery shelves, `/deals`, and the proof strip all run on this feed. Naming it explicitly made the hero honest: the site now shows its real inventory, not its demo inventory |
| **A store page per approved merchant** (`/s/croma`), only where ≥5 offers exist | Agent 01, Gemini | **Adopt — next round.** Highest-value SEO item available with zero new data. 240 approved merchants; a 5-offer floor keeps every page substantive instead of doorway-thin |
| **Price-data state printed next to every price, not in a paragraph lower down** | GPT-6 | **Adopt — mostly present.** `OriginsChip`, `VerificationBadge` and the `Illustrative` badge already do this per row. Now also above the offer list, where the eye lands first |
| **"Be the first to report" as the CTA for an untested coupon**, rather than a warning | Gemini | **Adopt — present.** The report flow exists; the copy was already hedged rather than alarmist |
| **Put the commission line above the store buttons, not in a policy card** | Agent 02 | **Adopt, and this was a real gap.** Now above the offer list on every product page: *"Some store links earn us a commission. It never changes the order — ranking is commission-blind."* A disclosure below the fold is not a disclosure |
| **Turn honesty into the hook, not the disclaimer** | Gemini, Agent 01 | **Adopt in the hero.** "Unknown stays unknown" is now the social card's second line |
| **Expand the OG card's promise to match the new hero** | Gemini | **Adopt** — card regenerated: "Delivery, fees and tax counted in. / Unknown stays unknown." |
| **Cut registration from five fields to two** | Agent 02 | **Reject for now** — `displayName` feeds the greeting and the owner dashboard, and the form is already behind the value (saves, alerts). Two-field signup is a 20-minute change the moment a funnel event exists to measure it |

---

## 4. Rejected, with reasons

| Recommendation | From | Why not |
|---|---|---|
| **Dark mode as a full theme** | Agent 02, Agent 01 | Not a colour swap: the design system has 25 tokens, 33 guarded assertions, and a hard "never black" rule that makes a conventional dark theme a redesign of the palette. It is a project, not a polish item, and it serves no current user — the site is light by design and readable in Indian daylight. The on-dark *mark* pair already exists for surfaces that genuinely need it |
| **Replace the accent system with a 60/30/10 rule and retire 7 of 8 hues** | Agent 01 | The accents are not decoration: `--turq` marks verified prices, `--sun` marks illustrative ones, `--coral` marks expiry. Deleting them deletes the visual language of the honesty the same agent argues is the moat. The 60/30/10 complaint is really about the *hero CTA gradient*, which is now fixed |
| **A 1.25 modular type scale** | Agent 02 | Current scale is not arbitrary — it is fluid-clamped against mobile breakpoints and already audited. Renumbering it buys nothing a reader can see and breaks 200+ rules |
| **Drop JetBrains Mono to the system stack** | Agent 02, Agent 01 | There is no JetBrains webfont to drop: `--font-mono` is already `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Another inherited error |
| **Sticky bottom CTA bar** | 3 of 5 | **Deferred, not refused — see §5.** Wanted, and the strongest remaining conversion idea, but it needs a real device pass first and I cannot run a browser in this environment |
| **Competitor scores against Smartprix / CashKaro / Google Shopping** | All five attempted | Every one of them marked the matrix ASSUMPTION, and two refused to fill it in at all — correctly. I have not opened those sites in this session either, so no scores are published here. The protocol in Agent 02's §3 is the right way to do it and it is unchanged in `25-competitive-gap-analysis.md` |
| **Buy `dealmosaic.in`** | 3 of 5 | Right conclusion, not mine to execute: it is an owner purchase. It stays top of the owner-actions list |
| **Turn `/browse`'s `<h1>` into a keyword-rich sentence** | Gemini | Premise is stale: the live H1 is "Browse every product we compare", not `(browse)`. The proposed replacement, "Compare True Landed Prices & Live Store Offers Across India", is longer, reads as keyword stuffing, and the title tag already carries the keywords |

---

## 5. What none of the five found

Ordered by what would actually move the business.

1. **The 25-product catalogue is the whole business problem, and no amount of
   frontend work touches it.** All five propose design fixes to a site whose
   ranked-comparison surface covers 25 products. The honest framing is in the
   master handover §17 and it survives every redesign: a shopper who searches for
   anything outside those 25 cannot get a ranked comparison. The real roadmap is
   data — eBay keyset (free, 5,000 calls/day, owner-supplied credentials), then
   authorised partnerships, then ONDC — and no agent's colour palette competes
   with that.

2. **A live offer count that drifts is a trust bug, and it is now impossible to
   ship one.** GPT-6 caught the 1,088-vs-1,089 discrepancy; none of them proposed
   the actual fix. The proof strip on the homepage now *fetches*
   `/api/coupons/discover` and renders nothing if it fails, so the number cannot
   go stale in the markup. Verified live: 1,085 offers, 280 with a code — the feed
   had moved again between their reports and this build.

3. **Truthful separation of the two inventories is a positioning asset, not a
   caveat.** 1,085 live coupon offers and 25 demo product comparisons are
   different products. The site now says so in the first screen: the hero promises
   what the live data supports (real codes, real expiry, real totals where known)
   and the demo comparisons stay labelled `Illustrative` per row. GPT-6 got closest
   to this; nobody framed it as the differentiator it is.

4. **A "not verified" state needs to look deliberate.** Three agents note that
   honest caveats can *read* as broken features. None proposed the fix that costs
   nothing: an explicit visual grammar for evidence (unreported · reported ·
   verified) applied identically on the homepage, `/deals` and product pages. Two
   of three already agree; the third is copy, not code.

5. **Cold-start is a design problem, not a performance one.** Every agent scored
   "Speed" from bundle size. The measured 22.5 s Render cold start is what a
   first visitor actually experiences when the shelves are empty, and the answer
   is a skeleton with the real cached numbers, not 40 kB less JavaScript.

6. **The audit habit itself.** Five reports, one of them duplicated, all reasoning
   from a document instead of the running system, and their headline finding was
   false. The durable fix is the one this repo already has and did not apply to
   *them*: verify against production first, then write.

---

## 6. The decisions, consolidated

### Colour — final

| Role | Token | HEX | RGB | Contrast | Use |
|---|---|---|---|---|---|
| Action (primary) | `--action` | `#2F49C9` | 47,73,201 | 7.20:1 white on it | Every primary button; the only CTA colour |
| Action hover / active | — | `#2540B0` / `#24399B` | — | 8.61 / 9.84:1 | Pointer, press |
| Brand facet A | `--brand-cobalt` | `#2F49C9` | 47,73,201 | 6.88:1 on Warm White | Left half of the mark |
| Brand facet B | `--brand-coral` | `#FF6B6B` | 255,107,107 | 2.65:1 | Right half of the mark; graphic only, never a label background |
| Ink | `--ink` | `#452B5E` | 69,43,94 | 11.40:1 | Text, headings |
| Ink secondary | `--ink-muted` | `#6B5280` | 107,82,128 | 6.38:1 | Secondary text |
| Ink tertiary | `--ink-soft` | `#7A6B8C` | 122,107,140 | **4.66:1** (was 3.69) | Placeholders, micro-copy — now AA |
| Surface | `--surface` | `#FFF9F0` | 255,249,240 | — | Page |
| Raised | `--raised` | `#FFFFFF` | 255,255,255 | — | Cards |
| Band | `--tint` | `#FDF1E7` | 253,241,231 | — | Alternating bands |
| Hairline | `--hairline` | `#EBDDEA` | 235,221,234 | — | Dividers |
| Decorative gradient | `--grad-prism` | `#2F49C9 → #6D3BE0` at 120° | — | 6.88 / 5.98:1 | The only brand gradient. Safely behind white text |
| Verified | `--turq-d` | `#0F7F76` | 15,127,118 | 4.65:1 | Verified price |
| Illustrative | `--tang-d` | `#A8490A` | 168,73,10 | 5.54:1 | Demo data |
| Expiring | `--coral-d` | `#C0392B` | 192,57,43 | 5.20:1 | Real expiry, errors |

No black, no near-black. Coral is never a background for text. The rainbow is
gone from surfaces that carry words.

### Typography — unchanged, deliberately

Outfit 700–800 display, Plus Jakarta Sans 400–700 body, system mono for codes.
Both webfonts are self-hosted, variable, `font-display: swap`, and already
preloaded. **No change**: the type is the strongest part of the existing system,
runs at 16 px minimum on inputs (no iOS zoom), and the agents' objections were to
scale ratios, not to legibility.

### Architecture and copy — as shipped

* Homepage: one promise, one search, live proof, then the discovery shelves
  before any explanation. H1 **"The price you'll actually pay."** Lede explains
  delivery, fees and tax in one sentence and commits to unknown-stays-unknown.
* Header sub-line: **"Real totals · Honest ranks."**
* Social card: mark, wordmark, "Delivery, fees and tax counted in. / Unknown stays
  unknown.", "Grocery · Quick commerce · Everyday electronics".
* Product pages: commission line sits above the offers, every price keeps its
  origin chip, demo rows keep the `Illustrative` badge.
* JSON-LD slogan updated to match the hero. `SearchAction` kept; `FAQPage` refused.

---

## 7. Implementation priorities

**Shipped this round** (verified in production, §2.18 of the handover): the action
colour and gradient consolidation, `--ink-soft` corrected to AA, hero rewrite,
live proof strip, header sub-line, OG card, social/JSON-LD copy, commission line
above offers, save control to 44 px.

**Next, in order:**

1. **Store pages `/s/:merchant`** for merchants with ≥5 live offers, with
   `BreadcrumbList`. Zero new data, real long-tail SEO, and the only item on this
   list that compounds.
2. **Sticky mobile offer bar** on `/search` and product pages — 48 px, safe-area
   inset, appears past the first offer, shows rank-1 store, total and one button.
   Needs one pass on a real 390 px Android before it ships, which is an owner
   device test, not a coding task.
3. **A funnel event baseline** (search, variant select, copy code, outbound click,
   alert created) before any conversion claim is made — including in this
   document. Nothing above claims a lift; nothing above can, yet.
4. **eBay keyset** to break the 25-product ceiling. Owner-supplied credentials;
   the connector is already written.

---

## 8. Honest limitations of this report

* No competitor was opened. No competitor scores are published.
* No browser was available in this environment, so the visual result was verified
  by reading the deployed HTML, CSS and JS and by inspecting the regenerated
  social card — not by looking at the homepage on a phone. That is weaker
  evidence, and it is stated rather than glossed.
* The three near-duplicate reports contradict each other on scores (Design 72 /
  74 / 78 / 80), which is a fair indication of how much weight those scores
  deserve: none. They are reproduced nowhere above as fact.
* Nothing here claims the new palette or copy improves conversion. That claim
  needs the funnel baseline in §7.3 and a real A/B, which needs traffic the site
  does not yet have.
