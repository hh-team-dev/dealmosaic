# Part 3 — Brand & Visual Design System (v1.0, locked)

## 0. The constraints that shape everything

**Owner instruction, 3 November 2026: never use black, and never use blue or anything
close to blue.** Combined with the original "no near-black" rule, the palette has no cool
hue left in it. `npm run audit:design` enforces both mechanically:

- nothing darker than L\* 20 anywhere (darkest shipped value: **Roast** `#4A2B22`, L\* 21.2);
- **no colour whose hue falls in the 158°–320° window** (teal → violet) at more than 12 %
  saturation, checked in `theme.css` *and* in every `.tsx` file, hex and `rgba()` alike.
  That window is one line of the audit, so a stray blue cannot creep back in.

Everything below is measured. The hue axis now runs **crimson → vermilion → coral →
amber**, with exactly one magenta and one grass kept because they carry meaning.

### Foundation
| Token | Hex | Contrast on Warm White | Use |
|---|---|---|---|
| `--ink` **Roast** | `#4A2B22` | **12.09** | Primary text, headings |
| `--ink-muted` | `#7A5748` | **6.11** | Secondary text, labels |
| `--ink-soft` | `#8D6A57` | **4.63** | Placeholders, micro-copy (AA) |
| `--surface` **Warm White** | `#FFF9F0` | — | App background |
| `--raised` | `#FFFFFF` | — | Cards |
| `--tint` | `#FDEFE3` | — | Peach band |
| `--tint-2` | `#FDEBF1` | — | Blush band |
| `--hairline` / `--hairline-strong` | `#F2DFCE` / `#E4C7AD` | — | Borders, warm — never grey, never violet |

Shadows are **tinted cocoa**, never grey: `0 1px 2px rgba(74,43,34,.05), 0 10px 24px -14px rgba(74,43,34,.2)`.
The focus ring is vermilion: `0 0 0 3px rgba(194,65,12,.35)`.

### Action
| Token | Hex | White label |
|---|---|---|
| `--action` | `#C2410C` | 5.18:1 |
| `--action-hover` | `#A8360A` | 6.57:1 |
| `--action-active` | `#8F2C08` | 8.29:1 |

One action colour, solid, and the most saturated thing on the page.

### Hue pairs (Spark → Deep)
| Family | Spark (fills/gradients) | Deep (text/AA) | Deep contrast |
|---|---|---|---|
| Coral | `#FF6B6B` | `#C0392B` | 5.20 |
| Ember | `#FF6B35` | `#C2410C` | 4.95 |
| Magenta | `#E8336F` | `#B3245F` | 6.02 |
| Sunshine | `#FFBE0B` | `#8A5A00` | 5.66 |
| Tangerine | `#FF8A3D` | `#A8490A` | 5.54 |
| Pink | `#FF4FA3` | `#C81C77` | 5.16 |
| Grass | `#34A853` | `#2C7A3F` | 5.06 |
| Lime | `#B8F34A` | `#4C7A00` | 4.90 |

**Retired on 3 November 2026** (blue family, all gone): `--blue #4361EE`, `--blue-d #2F49C9`,
`--violet #8B5CF6`, `--violet-d #6D3BE0`, `--turq #2EC4B6`, `--turq-d #0F7F76`, the blue-grey
podium `--silver #5F6E82`, and the plum ink `#452B5E`. Their jobs were taken by Ember, Magenta,
Grass and Roast. The four "spark" tones that remain are decorative only — every one of them is
below 4.5:1 on Warm White, which check 3 of the audit prints on every run.

### Semantic (never colour-only — always paired with icon + text)
| Meaning | Spark | Deep | Notes |
|---|---|---|---|
| Best verified price | Grass | `#2C7A3F` | Podium #1, "Lowest verified" chip |
| Cheap but unverified | Sunshine | `#8A5A00` | "Total not fully verified" |
| Rising / higher price | Coral | `#C0392B` | Used with ▲ and words |
| Saving discovered | Lime | `#4C7A00` | Success animation |
| Demo data | Tangerine hatch | `#A8490A` | Watermark + DOM `data-origin="demo"` |
| Live data | Ember | `#C2410C` | With "Verified source" label |

### Gradients — there is one, and it is enforced

> **Revised 3 November 2026.** The five-stop prism and the aurora / sunrise /
> lagoon / mint / plum family are **deleted**, along with the three `deep` and
> `text` variants built on them. What remains is a single token:

- `--grad-ember`: `linear-gradient(120deg, #C2410C 0%, #A8231A 100%)` — "Ember Duet".

Every stop clears **5.18:1** with white, so it may legally sit behind a label. It is
used in exactly three places: the primary CTA card, the demo comparison's product tile,
and `.gradient-text` / the hero `<em>`. The gradient is now inside the warm axis, so it
reads as one material changing temperature rather than two unrelated colours.

Rules that are now mechanical, not stylistic:

1. `npm run audit:design` fails if `theme.css` declares a second `--grad-*` token.
2. It fails if any `.tsx`/`.ts` file contains an **opaque** `linear-gradient()` — only
   `rgba()` washes are allowed inline, because a hue gradient in a component is how
   the rainbow got in the first place.
3. Never apply gradient text to prices; gradient type is reserved for display
   headings ≥32 px on plain backgrounds.

Solid replacements, for the record: step numerals → `--action` / `--violet-d` /
`--coral-d`; avatar, switch-on, weight bars → `--action`; discount badge →
`--coral-d`; confidence fill → `--turq-d`; podium gold → `--sun-d`; offer-initial
tiles → 11 % `rgba` washes with ink text (white on the old amber stop was 1.9:1).

---

## 2. Logo & wordmark

> **Revised 3 November 2026.** The original "Prism Tessera" mark described in this
> section's first draft is gone; it exists only in `backups/brand-pre-mosaic-m/`.
> The full case for the replacement — three concepts, eight-axis scoring, sixteen
> rejected intermediate variants, the palette measurements — is `docs/brand-identity.md`.
> This section is the working summary.

**Concept — "Mosaic M".** One letterform built from two polygons that share the
chevron running up the centre of the letter. The left facet is Ember
`#C2410C`, the right is Coral Spark `#FF6B6B`. The colour change *is* the letter's
construction; read whole it is an M, read in parts it is two tiles joined at an
angle.

```
grid 64 x 64, mark occupies x 8..56, y 12..54, icon viewBox "3 4 58 58"
left  facet: 8,54  8,12  20,12  32,29  32,48  20,31  20,54
right facet: 32,29 44,12 56,12  56,54  44,54  44,31  32,48
```

- **Flat fills only.** No gradient, stroke, shadow or type inside the mark. That is
  what keeps it hard-edged at 16 px and printable in one ink.
- **Minimum size:** 16 px for the symbol (the tab icon is the floor, and it was
  inspected at 8× to confirm it). 20 px is comfortable.
- **Clear space:** the 5-unit inset in the icon viewBox — 8.6 % of the mark's
  bounding box on every side. Do not crop tighter.
- **Orientation:** symbol alone in favicons, avatars, PWA icons and maskable
  plates; horizontal lockup (mark at 1.7× cap height) in the header; wordmark alone
  in text-only contexts. The full lockup is never padded into a square icon.
- **Wordmark:** DEALMOSAIC set in Outfit 800 at −0.04 em tracking, shipped as
  **outlines** (`dm-wordmark.svg`) so it renders without the webfont. The full stop
  carries `--coral-d`.
- **Mono variants:** Roast `#4A2B22` (12.09:1 on Warm White) and cream for
  dark surfaces. The two-facet split survives greyscale because the chevron is a
  hard geometric edge, not a hue difference.
- **On dark:** `#FFA07A` / `#FF8A8A` (6.36:1 and 5.58:1 on cocoa), because the primary
  ember is only 3.1:1 there. Re-tint through `--brand-ember-on-dark` /
  `--brand-coral-on-dark`.
- **Originality:** no cart, tag, percentage, magnifier or currency glyph; not set
  in a typeface; not assembled from any other company's mark.

### Action colour (one, and it is not a gradient)

`--action #C2410C` is the only primary-action colour: solid fill, white label
5.18:1, hover `#A8360A` 6.57:1, active `#8F2C08` 8.29:1. It is a vivid vermilion —
warm, urgent, and the single most saturated thing on any page, so the eye finds the
next step with nothing else competing.

The only brand gradient is `--grad-ember` **"Ember Duet"**
`linear-gradient(120deg, #C2410C 0%, #A8231A 100%)` — every stop clears 5.18:1 with
white, so it can legally sit behind a label. Coral remains a facet accent and is
never a label background.

`--ink` moved from the plum `#452B5E` to **Roast `#4A2B22`** (12.09:1) when blue was
ruled out: the plum carried a blue-violet cast. `--ink-soft` is `#8D6A57` at
**4.63:1** — placeholders and micro-copy are text, so they must clear AA.

### Brand tokens (added to `theme.css`)

| Token | Value | Aliases |
|---|---|---|
| `--brand-ember` | `#C2410C` | `--ember-d` / `--action` |
| `--brand-coral` | `#FF6B6B` | `--coral` |
| `--brand-ember-on-dark` | `#FFA07A` | — |
| `--brand-coral-on-dark` | `#FF8A8A` | — |

No new hues were introduced: the identity promotes two existing tokens to brand
roles. The SVG in `Logo.tsx` reads these variables, so re-tinting a surface is a CSS
change, not a markup change.

### Asset family

Generated together by `python3 scripts/brand/brand.py` into
`apps/web/public/brand/`: `dm-icon` (+dark, +mono, +mono-cream), the 11-size PNG set
`dm-icon-{1024…16}.png`, `dm-icon-maskable-512` (mark constrained to the 40 % safe
circle), `dm-icon-plate-512`, social avatars, `dm-logo-horizontal` (+dark, +mono,
+PNG), `dm-logo-compact` (+dark, +PNG), `dm-wordmark` (+mono-cream). Site files —
`favicon.svg`, `favicon.ico` (real 16/32/48), `apple-touch-icon.png` (180),
`manifest.webmanifest`, `og.png` — are produced from the same geometry.

---

## 3. Typography

| Role | Family | Rationale |
|---|---|---|
| Display / headings | **Outfit** (variable, OFL) | Geometric warmth, high x-height, friendly not corporate |
| Body / UI | **Plus Jakarta Sans** (variable, OFL) | Excellent legibility at 14–16 px, open licence |
| Numerals / prices | **tabular-nums** feature, weight 700–800 | Prices must align across columns |
| Mono (admin, codes) | **JetBrains Mono** (OFL) | Audit logs, coupon codes |

Type scale (clamped, fluid): 12 / 14 / 16 / 18 / 21 / 26 / 33 / 42 / 54 / 68 px. Body line-height 1.6; headings 1.1–1.25. Max measure 68ch. **Fonts are self-hosted and subset** (no external CDN — the inline-only preview environment and CSP both require it); fallbacks are metric-compatible system stacks.

---

## 4. Layout & components

- **8 px spatial grid**; radii: 10 / 14 / 20 / 28 / full. Cards use 20 px, pills use full.
- **Elevation:** three tinted-plum shadow steps + one coloured glow for interactive primaries.
- **Borders** are always tinted (`#EBDDEA`) or hue-tinted at 20% alpha — never grey, never black.
- Core components (~40): Button (5 variants × 3 sizes × 4 states), Input, Select, Combobox, CountryPicker, CurrencyPicker, SearchBar (with scanner), Chip, Badge, DeltaIndicator, Tooltip, Modal, Drawer, Sheet, Toast, Skeleton, Avatar, ProgressRing, ProgressBar, Tabs, Accordion, Table, OfferCard, OfferColumn, PodiumStep, PriceTruthRow, ConfidenceMeter, TrustRadar, DealPassport, PriceChart, Sparkline, AlertRow, WatchlistTile, XpBar, BadgeTile, EmptyState, ErrorState, WatermarkDemo, Pagination.
- **States:** every interactive element defines hover, focus-visible, active, disabled, loading. A component without a focus state does not ship.

---

## 5. Motion system (Part 3, 15 named animations)

Shared scale: `--dur-instant 90ms`, `--ease-snap cubic-bezier(.2,.9,.3,1.2)`, `--dur-quick 160ms`, `--ease-out cubic-bezier(.22,.68,.24,1)`, `--dur-base 260ms`, `--ease-soft cubic-bezier(.4,.14,.3,1)`, `--dur-slow 420ms`, `--ease-drift cubic-bezier(.36,.07,.19,.97)`.

| # | Animation | Technique | Budget |
|---|---|---|---|
| 1 | Animated hero | Tessera tiles drifting on `transform` + prism shine sweep; CSS-only loops | 1 canvas-free layer, pauses offscreen |
| 2 | Gradient transitions | Animated `background-position` on oversized gradients (respects reduced motion → static) | GPU-cheap |
| 3 | Shine sweep on premium cards/buttons | Pseudo-element translateX on hover, 700 ms | hover only |
| 4 | Search scanner | Conic-gradient ring rotation + progress copy ("Checking 4 sources…") | only while loading |
| 5 | Country selector | Flag tiles scale-in with 25 ms stagger; globe ring rotation on open | open-state only |
| 6 | Loading skeletons | Shimmer on tinted surfaces, no layout shift | while loading |
| 7 | Animated price counters | `requestAnimationFrame` count-up (400–700 ms), `tabular-nums`, starts from the real value×0.92 for tension, ends exactly on the true price | on results mount |
| 8 | Deal podium | Steps rise with spring, badge pops, confetti (≤24 particles, 900 ms) on #1 | once per result set |
| 9 | Saving success | Lime burst + "You save ₹4,300" card, 1.2 s, dismissible | on genuine saving only |
| 10 | Ripple / tactile buttons | Pointer-positioned ripple, 320 ms | every press |
| 11 | Modal & drawer | Scale/fade + slide with shared easing; focus trap; ESC; scroll lock | on open/close |
| 12 | Favourite control | Heart path-draw + radial pop, optimistic toggle with rollback on error | on toggle |
| 13 | Matching progress | 5-step stepper (Identify → Match → Verify → Price → Rank) driven by real pipeline stages, not a fake timer | during search |
| 14 | Chart transitions | SVG path morph + gradient fill wipe + animated axis; hover crosshair with tooltip | on mount/filter |
| 15 | Toasts | Slide+fade stack, top-right desktop / bottom mobile, 4 s auto (paused on hover), `aria-live="polite"` | on action |

**Accessibility contract:** `prefers-reduced-motion: reduce` collapses all of the above to ≤90 ms opacity changes and disables loops/confetti/parallax. No animation blocks input. Nothing animates above 60 fps cost on a 4× CPU throttle.

---

## 6. Accessibility contract

- WCAG **2.2 AA**: contrast ≥4.5:1 body, ≥3:1 large text and UI boundaries; verified in tokens (table above).
- Full keyboard paths: tab order, skip-link, visible `:focus-visible` rings, ESC to close overlays, arrow keys in comboboxes, focus restoration.
- Semantics: real landmarks, one `h1` per page, labelled form controls, `aria-live` for results/price updates, table roles only for real tables.
- Colour never the sole carrier of meaning (icons + text always accompany).
- Touch targets ≥44×44 px; body text ≥16 px on mobile.
- Form errors described in text next to the field, plus `aria-describedby`.

---

## 7. Design prohibitions (to prevent drift)

No pure black · no near-black · no grey-only "corporate" sections · no gradient text on prices · no stock-photo hero · no dark-pattern urgency timers · no fake "only 2 left" · no ads in the comparison columns · no colour used as the only ranking signal · no animation on scroll-jacking · no more than 3 competing hues in one card.
