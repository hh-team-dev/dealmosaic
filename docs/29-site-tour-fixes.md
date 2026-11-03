# 29 — Site tour, 3 November 2026: every flaw found, and what was done

**Source of truth for this document:** the owner's screen recording (`website tour.mp4`, 9 min 19 s,
720 × 1596, recorded on a phone at `dealmosaic.pages.dev`). It was downloaded and read frame by frame
at one frame per second — 567 frames — with the near-static stretches identified so the pages the owner
paused on were inspected at full resolution. Nothing below is inferred from the source code alone: each
item was seen happening, then traced to the line that caused it.

**Result:** 36 defects found, 36 fixed. Two were data defects that were invisible in the code and only
appeared in the live feed. One was a violation of the owner's palette rule that the design audit could
not catch. Nine were layout faults at 390 px. Three were instances of the interface telling a small
lie, which the project treats as the most serious category.

**Shipped:** commits `6f3d643` (30 interface fixes) and `c8c179a` (this document), then `0f3dc1b` and
`e193ac1` (defect 35 and its last clause word). Pages `d68f6a3b`, later rebuilt and re-deployed from the
corrected tree; Render deploys `dep-dbl0mghsrm7s73bcggdg` then `dep-dbl2jjtbedkc73etj520`, both `live`.
Gates: **290 tests / 20 files**, design **43 assertions**, 0 secrets / 224 files, 53 pages / 52 unique
`<h1>`.

---

## 0. The headline finding

**The coupon feed was printing raw HTML entities.** `Shop Dymatize Nutritional &amp; Fitness
Supplements today!` — one card in eight. It is the single clearest signal that a page has never been
looked at by a human, and it was on the card that carries the coupon code.

There was no decoding anywhere in the pipeline, and adding it in the interface would have fixed one
screen while leaving the ticker, search and every future surface wrong. It is fixed at the ingest
boundary instead, and the existing 1,116 rows were re-written through the same path.

Verified after the fix: **0 of 192 live cards contain `&amp;`.**

---

## 1. Data and honesty (7)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 1 | Cards printed `&amp;`, `&lt;`, `&#8379;` | No entity decoding anywhere in the ingest path | `apps/api/src/lib/text.ts`: `decodeEntities` (named + numeric + hex, applied twice for the network's double-escaping), `cleanCopy` (tags, zero-width chars, whitespace, length), wired into `cuelinks.toCouponRow` |
| 2 | SHOUTY titles, stray double spaces, `<em>` tags in copy | Raw feed strings stored verbatim | `prettyTitle`: sentence-cases only when >80 % of letters are capitals, so `iPhone 15 PRO MAX` and `MRP` survive untouched |
| 3 | Homepage said **“1,112 live offers from 49 stores”**; deals page said **246 stores**, same afternoon | The homepage counted distinct stores *inside the nine shelves* (a sample of ~40 offers); the deals page counted the table | `discover.ts` now returns a real `stores` total over the live set: **246**. One number, one definition |
| 4 | Filtering to a store left “**289** with a copyable code” above a list of 22 | Row query was filtered; the counter query was not | One `WHERE` clause builder, used by the rows **and** the counters. Verified live: `?platform=klook` → `{live: 22, withCode: 14, stores: 1, filtered: true}` |
| 5 | Two identical AJIO cards side by side — same store, same `ALLSTARSDIWAL…` code, same 5 % | Merchants publish one code under two campaign names; both rows were listed | Server-side dedupe on `store + code`, first row wins (the list is already ordered by usefulness). Verified: **0 duplicate pairs in 200 rows** |
| 6 | Counters showed `—` while other numbers showed values | Three counters read from three different sources at three different moments | All three now come from `totals`, so they are blank together or filled together |
| 7 | Landing claim “every one carries its expiry date” — untrue; many cards say “No expiry listed” | Copy written aspirationally | Reworded to what is verifiable: “every expiry shown is the one the store published” |

---

## 2. The deals page (10)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 8 | Coupon code cut off: `ALLSTARSDIWAL…`, `SPRING…`, `WELCOM…` | `text-overflow: ellipsis; white-space: nowrap` at 0.95 rem | The code now **wraps**: 0.88 rem, `overflow-wrap: anywhere`. The one thing a shopper must copy by hand is the one thing that was hidden |
| 9 | Long-press on a code raised **Android's dark-grey selection toolbar** over the card, offering Copy a second time | Code text was selectable | `user-select: none` + `-webkit-touch-callout: none` on the code and card. The button is the copy affordance; the text is not a field |
| 10 | “Codes only” pill clipped by the right edge of the screen | `min-width: auto` on the flex search field refused to shrink | `min-width: 0` on `.deals-search`, `flex: 0 0 auto` on the toggle. Verified in the live CSS |
| 11 | Store chip rail sliced a word in half (“Muscleblaz”) | Hard `overflow: hidden` at the edge | Edge mask fade + trailing padding + scroll-snap. A faded chip reads as “more this way”; a cut one reads as a bug |
| 12 | Filter bar scrolled away; changing store meant scrolling back through 200 offers | Filters were in normal flow | `.deals-controls` is sticky under the header, with a blurred surface |
| 13 | Loading state was a checkerboard of unrelated 232 px boxes | Fixed skeleton height, two-column grid at ≥620 px | Skeleton matches card height (`min-height: 268px`, `height: 100%`), plus a `role="status"` line: “Loading the live list…” |
| 14 | Hero + counters + search + chips filled the whole first screen — no offer visible | Four-sentence lede, generous padding | Lede cut to two sentences (the rest lives in the rules block), phone padding tightened |
| 15 | “Not yet reported” repeated on all 1,116 cards | Per-card evidence line, with nothing yet reported by anyone | When nothing on the page has been confirmed, the page says so **once** in full, and the per-card line stays quiet. `deals-evidence-note` |
| 16 | Same information in three places at different sizes | Incremental layering over earlier passes | Counters now describe the list beneath them (`matching offers` vs `offers live now`) |
| 17 | Cards looked padded-out — long descriptions, no hierarchy | Title 3 lines + description 2 lines + badge + code + expiry + evidence | Description clamped to 2 lines, confidence moved to the card foot beside the expiry, so the eye gets: store → claim → code → when |

---

## 3. Chrome, navigation, and the signed-in state (6)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 18 | Signed-in header showed a **fat orange “Dashboard” bar** taking half the header, competing with the hero | The premium pass raised every button to 48 px; that is right in a form, wrong in a header | `.header-actions` has its own compact scale (38 px, 0.82 rem) and a signed-in visitor gets their **initial in a circle** plus a quiet “Dashboard” link |
| 19 | Header CTA and hero CTA fought for the same attention | Same visual weight | Same fix as above; the hero is now unambiguous first |
| 20 | Bottom nav icons were `◉ ◎ ⚙` | Unicode glyphs at 1.05 rem — a different typeface from the page, a different optical size per device, and ⚙ renders as a colour emoji on some Android builds | Drawn SVG icons from the project set (`chart`, `tag`, `heart`, `shield`) |
| 21 | Bottom nav had no route to the saved list, the one list the app keeps | Nav had Home / Deals / Settings | **Saved** added as a fourth destination |
| 22 | Last card slid **under** the bottom nav; “Delete my account” was half-covered | `.app-main` padding 34 px vs a 62 px nav + safe-area inset | `padding-bottom: calc(var(--bottomnav-h) + 26px + env(safe-area-inset-bottom))` |
| 23 | The toast for a copied code covered the next card's Copy button | Toast pinned above the bottom nav — exactly where the copy buttons are | On phones the toast now drops in **under the header**; the animation direction was flipped to match |

---

## 4. Forms and component states (5)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 24 | Sign-in fields rendered **pale lilac** — a cool tone in the middle of a warm page | Chrome/Samsung autofill paint, not our CSS | `input:-webkit-autofill` overridden with an inset warm surface. Verified present in the live CSS |
| 25 | “Signing in…” faded to a washed-out pink pill that looked switched off | Disabled + loading shared one style | `.is-loading` / `aria-busy` keep the action colour and the spinner and only refuse a second tap |
| 26 | Settings cards opened with **four different saturated lids** (magenta, green, yellow…) | `.card-top-*` painted 5 px identity bars | 3 px hairline in the card's own border colour; the accent survives only inside the card's icon |
| 27 | Theme inconsistency between the app shell and the public pages | Two chrome components evolved separately | Header/bottom-nav tokens unified |
| 28 | Buttons had no visible response to a second tap | No pressed/disabled distinction on the waiting state | Covered by 25, plus the existing 2 px press travel |

---

## 5. Landing page (4)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 29 | A **signed-in** visitor was shown “Create free account” and “I already have one” | CTA block never read the session | `useAuth()`; the block now says “Open your dashboard” and “Deals you saved” |
| 30 | Three 13 px inline links with middot separators — tap targets ~20 px | Typography used as navigation | `.hero-actions` row of quiet buttons at 40 px; “Your saved deals” only shown to someone who can have saved deals |
| 31 | Hero had four trust chips + proof strip + links before any content | Every honest claim wanted a badge | Kept both, but moved the navigation into buttons (30) so the eye has one path |
| 32 | Proof strip number disagreed with the deals page | Same root cause as 3 | Same fix; both read `/api/coupons/discover` totals |

---

## 6. Product page (2)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 33 | “ILLUSTRATIVE — FEED PENDING” repeated on all four offers of every variant | Per-row origin tag | `OfferList` states the provenance **once**, in full: “All offers below are illustrative sample prices — no live feed is connected for this store yet. They are not quotes.” A row is tagged only when it differs from its list |
| 34 | The commission line sat in light italic above the offers, reading as fine print | Styling borrowed from body copy | It stays exactly where it was — immediately above the ranked list, which is the honest place — and is now legible without competing |

---

## 7. The copy itself, and the PDF set (2)

| # | Defect, as seen | Root cause | Fix |
|---|---|---|---|
| 35 | Card descriptions ran two or three sentences into one: `Prices starting from just Rs. 1299!Enjoy a flat discount…promo code.Valid for orders of Rs. 1999 and above.Act fast…`; and with no punctuation at all — `Rs. 669Offer open to all`, `superior sound qualityPrice starts at Rs. 2,499` | The merchant's copy generator emits a whole paragraph with the separators stripped. Nothing in the pipeline put them back, and the card clamps to two lines, so it read as one long typo. **94 of 192 sampled live descriptions** carried at least one weld | `splitSentences()` in `apps/api/src/lib/text.ts`, called from `cleanCopy` so title, description and terms all get it. Space after `!`/`?`; space after `.` **only** before Capital+lowercase (so `U.S.`, `1.5`, `No.5` survive); a split in front of one of 98 clause words (so `MuscleBlaze`, `FirstCry`, `MyMuse`, `OpenFit`, `SaneBox` are never touched — each has a test); after a word a missing **full stop**, after a number only a missing space, so no merchant's claim is ever re-punctuated. `Rs.1299` → `Rs. 1299` |

**Why this needed a script as well as a function.** `POST /api/coupons/sync` only re-writes rows the feed
*still returns*. It repaired 1,103 of 1,105 rows and left two cards still printing
`Rs. 67,399!Applicable on the entire…`, because those two had dropped out of the feed while staying live
on the site. **`scripts/reclean-copy.ts`** walks the `coupons` table and re-runs the same functions in
place — it imports `text.ts` rather than copying the rules — and it is idempotent: a second run reports
**0 rows would change**. It rewrote **118 rows**. Verified after: **0 welds in 192 sampled live rows**,
table-wide **0 rows out of step** with the rules.

| 36 | **The handover PDFs' own contents pages were wrong.** A heading in the last section of a document carried no page number at all; `&amp;` in a heading printed literally (`2. Logo &amp; wordmark`) and, because the escaped string never matched the rendered page, every such entry lost its number; and headings that begin on the page where the contents block ends were not found at all | `scripts/handover-pdf.py` skipped *any page that looked like a contents page*, which is exactly what `00-MASTER-HANDOVER` does on page 2, and it matched headings against HTML-escaped names. Non-breaking spaces (`\xa0`) from `&nbsp;` also stopped contents pages being recognised at all | Contents entries are excluded **by line** (`· p. N`) instead of by skipping pages, so a mixed page measures correctly; entities are decoded before matching; and **`scripts/verify-pdfs.py`** now asserts that every heading appears in the contents block and that its number is the page it is really printed on — **227 headings across 10 PDFs, 0 defects**. Exit code 1 on any mismatch, so it can gate a release |

---

## 8. What was checked before shipping

```
npm run check   → tsc clean · 290 tests / 20 files · design 43 assertions · 0 secrets / 224 files
npm run build   → 53 pages · 52 unique <h1> · own host only
Render API      → deploy dep-dbl0mghsrm7s73bcggdg → live
daily job       → 1,107 offers re-written through the new cleaning path in 6.5 s
live API        → /api/coupons totals {live 1112, withCode 289, stores 246, filtered false}
               → /api/coupons?platform=klook totals {live 22, withCode 14, stores 1, filtered true}
               → /api/coupons/discover totals {live 1112, stores 246, withCode 289, …}
               → 0 of 192 rows contain '&amp;' · 0 duplicate store+code pairs
live CSS        → user-select:none, position:sticky, .header-avatar, .deals-loading,
                  .is-loading, .offer-list-origin, input:-webkit-autofill all present
live copy       → 0 welded sentences in 192 sampled rows; scripts/reclean-copy.ts
                  reports 0 of 1,116 rows out of step with the rules
PDF set        → python3 scripts/verify-pdfs.py: 227 headings, 10 PDFs, 0 contents
                  defects (every entry points at the page it is printed on)
```

**Verification limit, stated plainly:** there is still no browser in this environment — Playwright needs
system libraries that cannot be installed here — so the visual result of these fixes is inferred from
the deployed CSS, the built bundle and the live API, not from pixels. The owner's phone is the proof,
and a second tour recorded the same way is the fastest way to close the loop.

---

## 9. Deliberately not changed

- **The 25-product catalogue.** The tour shows a comparison engine built for a catalogue the feed cannot
  yet fill; padding it would be the exact dishonesty this project refuses.
- **The illustrative sample on the homepage.** It is watermarked, `data-origin="demo"`, and now disclosed
  once per list instead of once per row.
- **The commission block on the product page.** It is legally and ethically load-bearing.
- **`Cheaper listed price is not a cheaper purchase` example.** It is hand-built, labelled as such three
  ways, and it is the clearest thing on the site.

---

## 10. Open, and honest about it

1. **No code has ever been reported working.** 289 codes, 0 confirmations. The page now says so once,
   plainly. The fix is a working "did it work?" loop with real traffic — not a redesign.
2. **The catalogue ceiling is the eBay keyset**, not the interface.
3. **Token rotation** from `deploy.env` is still outstanding (see `docs/28-backup-and-recovery.md` §6).
4. **A second device tour** is the only way to confirm the layout items (8–28) landed as intended on the owner's
   screen; everything in that list is CSS, so it should, but "should" is not "does".
