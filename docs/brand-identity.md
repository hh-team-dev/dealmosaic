# DEALMOSAIC — brand identity

Written when the master icon replaced the original prism mark (2026-11-02).
Everything here is measured from the files in `apps/web/public/brand/`, not
described from memory. The build that produces those files is
`scripts/brand/brand.py`; run it with `--report` to print the contrast table.

The previous mark, wordmark, favicon and social card are preserved in
`backups/brand-pre-mosaic-m/`.

---

## 1. The mark

**Name:** Mosaic M. **Form:** one angular letterform built from two polygons that
share the chevron running up the centre of the letter.

The left polygon is **Cobalt Deep**, the right is **Coral Spark**. The colour
change is the letter's construction, not a decoration applied over it: the two
halves meet along the same diagonal the letter uses to form its middle vertex.
Read whole, it is an M. Read in parts, it is two tiles joined at an angle — a
mosaic.

Why this and not something more pictorial: at 16 px a favicon has roughly 200
usable pixels. Anything that relies on five or six separate shapes, fine
connectors or interior detail collapses into a smudge at that size — which is
exactly what happened to the two more literal concepts (§3). A two-colour
letterform keeps a hard edge at every scale, prints in one ink when the palette
is unavailable, and can be reproduced from the two polygon point lists below by
anyone, with no fonts and no dependencies.

```
grid 64 x 64, mark occupies x 8..56, y 12..54
left  facet: 8,54  8,12  20,12  32,29  32,48  20,31  20,54
right facet: 32,29 44,12 56,12  56,54  44,54  44,31  32,48
```

Icon viewBox is `3 4 58 58`: a square window centred on the mark's bounding box,
which leaves 5 grid units (8.6 %) of air on every side. Even optical padding is
what stops a mark looking crowded in a tab strip or an avatar.

**No gradients, no shadows, no strokes, no text inside the mark.** The brief
banned them, and they are also the first things to turn to mush below 24 px.

### What it is not

Not a cart, price tag, percentage, magnifier or currency glyph. Not set in a
typeface. Not assembled from fragments of other companies' marks, and not a
recolour of one. The letterform is drawn here; the palette is the site's own.

---

## 2. Palette

Every value is an existing token in `apps/web/src/design/theme.css`. The identity
introduces **no new hues** — it promotes two existing ones to brand roles. That is
the whole "minimum necessary adjustment": four aliases, no redesign.

| Role | Token | HEX | RGB | Where |
|---|---|---|---|---|
| Primary facet | `--brand-cobalt` = `--blue-d` | `#2F49C9` | 47, 73, 201 | left half of the mark |
| Secondary facet | `--brand-coral` = `--coral` | `#FF6B6B` | 255, 107, 107 | right half of the mark |
| Text / mono | `--ink` | `#452B5E` | 69, 43, 94 | wordmark, one-colour mark |
| Background | `--surface` | `#FFF9F0` | 255, 249, 240 | page, plates, OG card |
| Raised | `--raised` | `#FFFFFF` | 255, 255, 255 | cards, tab chrome |
| Support accent | `--turq` | `#2EC4B6` | 46, 196, 182 | site accents only, never in the mark |
| Support accent | `--sun` | `#FFBE0B` | 255, 190, 11 | site accents only, never in the mark |
| On-dark facet | `--brand-cobalt-on-dark` | `#8FA6FF` | 143, 166, 255 | mark on plum surfaces |
| On-dark facet | `--brand-coral-on-dark` | `#FF8A8A` | 255, 138, 138 | mark on plum surfaces |
| Hover / focus | `--coral-d` | `#C0392B` | 192, 57, 43 | wordmark full stop, link hover |
| Deep text | `--ink-muted` | `#6B5280` | 107, 82, 128 | secondary copy |

### Measured contrast (`brand.py --report`)

| Pair | Ratio |
|---|---|
| Cobalt Deep on Warm White | 6.88:1 |
| Cobalt Deep on white | 7.20:1 |
| Coral Spark on Warm White | 2.65:1 |
| Coral Spark on white | 2.78:1 |
| Cobalt Deep vs Coral Spark (facet separation) | 2.59:1 |
| Mono ink on Warm White | 11.40:1 |
| On-dark cobalt on plum | 5.15:1 |
| On-dark coral on plum | 5.26:1 |
| Primary cobalt on plum — **why a dark variant exists** | 1.66:1 |

The coral facet sits at 2.65:1 against Warm White, below the 4.5:1 text floor. It
is a graphic fill inside a logotype, and logotypes are exempt from that minimum;
nothing here is small text. The separation *between* the two facets is 2.59:1,
which is also below the 3:1 usually asked of adjacent non-text graphics — so the
split does not depend on colour at all. The chevron is a hard geometric edge: in
greyscale, in colour-blind simulation or printed in one ink, the two halves still
read as distinct because they meet at an angle rather than relying on a hue
difference. That was checked by rendering the mono and dark cuts, not assumed.

### Colour psychology — stated carefully

Cobalt reads as calm, technical, trustworthy in most markets. Coral reads as warm,
attentive, energetic. Both are widely used in commerce, so neither carries a
unique meaning, and **no claim is made here that any colour increases trust,
clicks or conversion** — that would need a controlled test we have not run.
The palette's job is recognisability and legibility, nothing more.

---

## 3. The three concepts and how the choice was made

Three concepts were drawn to the same 64-unit grid, then rendered side by side at
180 px, at 16/24/32/48 px on Warm White, and as a mono cut on plum. Evidence came
from those renders, not from preference.

**A — Mosaic Discovery Prism.** Six radial facets around a cream diamond, six
colours, one central core. Strong at large size; at 32 px the facets start to
blend and at 16 px it is a colourful blob. Six fills also means six colours to
reproduce in print and on merchandise.

**B — Value Portal.** Four offset rounded tiles framing a gap with a small
diamond in the middle. The most distinctive silhouette of the three, and the
worst at small size: the four tiles read as unrelated fragments of noise under
32 px, and the composition has no single edge to hold.

**C — Mosaic Signature.** A solid M with a diamond sitting in the valley of the
letter. Instant legibility, but generic: a letterform plus a gem is a well-worn
trope, and the two-colour-plus-gem version was indistinguishable from the other
marks in a tab strip.

Scores, 1–10, from the rendered boards:

| Axis | A | B | C | **Chosen** |
|---|---|---|---|---|
| Impact | 7 | 6 | 7 | **9** |
| Memorability | 6 | 5 | 5 | **8** |
| Distinctiveness | 7 | 8 | 4 | **8** |
| Premium feel | 5 | 6 | 5 | **8** |
| Brand relevance | 8 | 6 | 7 | **9** |
| Small-size legibility | 3 | 2 | 8 | **8** |
| International appeal | 6 | 5 | 7 | **9** |
| Long-term scalability | 5 | 5 | 6 | **9** |
| **Total** | **47** | **43** | **49** | **68** |

The chosen mark is concept **C's territory — the letterform as the signature —
with C's weakness fixed**: the decorative gem is gone, replaced by the facet
split, so the mark keeps C's small-size legibility while gaining A's sense of
tiles and B's distinctiveness. That is a decision on evidence: the gem scored 4
on distinctiveness and cost legibility.

### Experiments that were rendered and rejected

Recorded because the reasoning matters more than the winner.

* Gem centred on the letter's junction, with and without a cream keyline ring —
  the ring read as a sticker and broke the letterform.
* Four-quadrant "mosaic" split of the letter (blue/coral/teal/amber) — at 16 px
  the amber quadrant vanished against Warm White (1.59:1).
* Diamond notch cut from the letter's spine, filled and unfilled — read as a
  letter with a hole, not a facet.
* Colour pairs: cobalt+amber, cobalt+turquoise, ink+coral, cobalt-deep+coral-deep
  (`#2F49C9`+`#C0392B`). The last was the most legible on light backgrounds but
  disappeared on plum (2.19:1), which is why the pair finally chosen is
  cobalt-deep + coral-spark and the dark surface gets its own lighter pair.

---

## 4. Asset inventory

All in `apps/web/public/brand/` unless noted. Regenerate everything with
`python3 scripts/brand/brand.py`.

**Vector masters (editable, in the repo):**

| File | Use |
|---|---|
| `dm-icon.svg` | primary symbol, transparent, flat fills |
| `dm-icon-dark.svg` | symbol for plum/on-dark surfaces |
| `dm-icon-mono.svg` | single-ink (Mosaic Plum) — print, fax, embroidery, stamps |
| `dm-icon-mono-cream.svg` | single-ink cream, for dark one-colour surfaces |
| `dm-logo-horizontal.svg` | symbol + wordmark, one line (mark at 1.7× cap height) |
| `dm-logo-horizontal-dark.svg` | same, on plum |
| `dm-logo-horizontal-mono.svg` | single-ink lockup |
| `dm-logo-compact.svg` | stacked lockup for square / centred spaces |
| `dm-logo-compact-dark.svg` | stacked, on plum |
| `dm-wordmark.svg` | type only, outlines cut from Outfit 800 — no font needed to render |
| `dm-wordmark-mono-cream.svg` | type only, cream |

The wordmarks are **outlines**, not `<text>`. A logo file that depends on a
webfont renders as a fallback face on any machine that has not loaded it, which
is how brand assets quietly get corrupted in the wild.

**Raster exports:**

* `dm-icon-{1024,512,256,192,180,128,96,64,48,32,16}.png` — each rendered at its
  own size from the geometry (supersampled 4× then Lanczos), never resized from
  a larger file.
* `dm-icon-maskable-512.png` — mark scaled so its half-diagonal fits the 40 %
  safe circle (6.42 px per grid unit), on Warm White. No baked corner radius: the
  platform masks it.
* `dm-icon-plate-512.png` — same art on a filled plate, for launchers that show a
  plain square.
* `dm-social-avatar-512.png` / `-dark-512.png` — filled square avatars.
* `dm-logo-horizontal.png`, `dm-logo-horizontal-dark.png`, `dm-logo-compact.png`.
* `apps/web/public/favicon.svg` — the symbol, transparent, no tile.
* `apps/web/public/favicon.ico` — a real multi-resolution ICO (16, 32, 48), each
  frame drawn at its own size.
* `apps/web/public/apple-touch-icon.png` — 180×180 PNG, art inset to Apple's
  margin. iOS does not read SVG for this, which is why the previous
  `apple-touch-icon` pointing at `favicon.svg` produced no home-screen icon.
* `apps/web/public/og.png` — 1200×630 social card, rebuilt by
  `scripts/generate-og.py` from the same polygons.

**Where the symbol goes and where it does not:** the symbol alone in favicons,
avatars, PWA icons and maskable plates; the horizontal lockup in the header; the
wordmark alone in email signatures and text-only contexts. The full lockup is not
padded into square icons — that is what makes an icon unreadable at 16 px.

---

## 5. Implementation map

| Surface | Change |
|---|---|
| `apps/web/src/components/Logo.tsx` | `LogoMark` rebuilt on the two polygons; reads `--brand-cobalt` / `--brand-coral`; the per-instance `useId` + gradient defs are gone entirely (two flat fills need no ids, which removes the duplicate-id failure mode rather than working around it) |
| `apps/web/src/design/theme.css` | four brand aliases; wordmark full stop switched from the aurora gradient to `--coral-d`; logo animation retimed for two polygons |
| `apps/web/index.html` | SVG icon, real ICO fallback, `apple-touch-icon` 180 PNG, `<link rel="manifest">`, JSON-LD `logo` → `/brand/dm-icon-512.png` |
| `apps/web/src/lib/seo.tsx` | `Organization.logo` → `/brand/dm-icon-512.png` |
| `apps/web/public/manifest.webmanifest` | **new** — name, standalone display, theme/background `#FFF9F0`, 192 + 512 any, 512 maskable |
| `apps/web/public/og.png` | new mark, two-tone top rule, bottom swatches |
| `scripts/generate-og.py` | imports the polygons from `scripts/brand/brand.py` — one geometry, two consumers |

### Deliberately not changed

The site's decorative gradients (`--grad-prism` on the homepage call-to-action,
the aurora button fill, the prism swatch strips) still use the older prism
palette. They now sit beside a cobalt/coral mark and the mismatch is visible. It
was left alone on purpose: the brief asked for the identity, not a repaint, and
changing a large decorative surface is exactly the kind of unrelated artwork
change that was ruled out. If the owner wants the whole surface language to move
to the two-facet palette, that is a separate, deliberate pass.

---

## 6. Verification performed

* Every PNG rendered at its true size; the 16 px frames inspected at 8× nearest
  neighbour on white, Warm White and plum — the letterform holds, no stray
  anti-aliasing halo.
* Maskable 512 cropped to a circle and to an iOS-style squircle: the whole mark
  remains inside the safe area in both.
* `favicon.ico` opened and its three frames confirmed at 16, 32 and 48.
* Header, footer, mobile header and the homepage call-to-action rendered and
  inspected at 390 px and 1280 px.
* Type check, test suite, design audit and prerender all clean; production
  verified after deploy (§2.17 of the handover).

**Not claimed:** that the new icon improves conversion, click-through or trust.
No controlled test has been run, and a comparison against the previous mark
would need traffic we do not yet have.
