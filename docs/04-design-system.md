# Part 3 — Brand & Visual Design System (v1.0, locked)

## 0. The constraint that shapes everything

**Owner instruction: never use black or anything close to black.** This supersedes the brief's Deep Ink `#24243B` and bans `#000`, `#111`, near-black, neutral dark grey, and untinted grey shadows.

I verified the brief's palette numerically before designing with it. Two findings:

1. `#24243B` is a near-black (14.4:1 on warm white) → **removed**.
2. Six of the eight accents fail WCAG AA **as text** on Warm White:

| Token | Value | Contrast on `#FFF9F0` | Verdict |
|---|---|---|---|
| Coral | `#FF6B6B` | 2.65 | Decorative only |
| Electric Blue | `#4361EE` | 4.80 | ✅ Text-safe |
| Turquoise | `#2EC4B6` | 2.07 | Decorative only |
| Sunshine | `#FFBE0B` | 1.59 | Decorative only |
| Violet | `#8B5CF6` | 4.04 | Decorative (near-miss) |
| Candy Pink | `#FF4FA3` | 2.91 | Decorative only |
| Electric Lime | `#B8F34A` | 1.26 | Decorative only |
| Tangerine | `#FF8A3D` | 2.24 | Decorative only |

So the palette is re-engineered into a **dual-tone system**: each hue has a **Spark** tint (vivid, for fills, gradients, glows, badges, motion) and a **Deep** tint (AA-compliant, for text and icons). This is how the site stays wildly colourful while every price, product name and comparison figure stays legible.

---

## 1. Colour tokens

### Foundation (never black)
| Token | Hex | Contrast on Warm White | Use |
|---|---|---|---|
| `--ink` **Mosaic Plum** | `#452B5E` | **11.40** | Primary text, headings — replaces Deep Ink |
| `--ink-muted` | `#6B5280` | **6.38** | Secondary text, labels |
| `--ink-soft` | `#8A7C9B` | 4.10 | Decorative micro-copy only (never body text) |
| `--surface` **Warm White** | `#FFF9F0` | — | App background |
| `--surface-raised` | `#FFFFFF` | — | Cards |
| `--surface-tint` | `#FDF1E7` | — | Alternating bands, table stripes |
| `--hairline` | `#EBDDEA` | — | Borders (violet-tinted, never grey) |

Shadows are **tinted plum**, never grey: `0 10px 30px -12px rgba(69,43,94,.18)`. Focus rings are `--violet-deep` at 3 px with 2 px offset.

### Hue pairs (Spark → Deep)
| Family | Spark (fills/gradients) | Deep (text/AA) | Deep contrast |
|---|---|---|---|
| Coral | `#FF6B6B` | `#C0392B` | 5.20 |
| Blue | `#4361EE` | `#2F49C9` | 6.88 |
| Turquoise | `#2EC4B6` | `#0F7F76` | 4.65 |
| Sunshine | `#FFBE0B` | `#8A5A00` | 5.66 |
| Violet | `#8B5CF6` | `#6D3BE0` | 5.98 |
| Pink | `#FF4FA3` | `#C81C77` | 5.16 |
| Lime | `#B8F34A` | `#4C7A00` | 4.90 |
| Tangerine | `#FF8A3D` | `#A8490A` | 5.54 |

**Ratio rule:** Spark : Deep ≈ 70 : 30 on any given screen. Big colour fields (hero, podium, section bands) use Spark; type always uses Ink or Deep.

### Semantic (never colour-only — always paired with icon + text)
| Meaning | Spark | Deep | Notes |
|---|---|---|---|
| Best verified price | Turquoise | `#0F7F76` | Podium #1, "Lowest verified" chip |
| Cheap but unverified | Sunshine | `#8A5A00` | "Total not fully verified" |
| Rising / higher price | Coral | `#C0392B` | Used with ▲ and words |
| Saving discovered | Lime | `#4C7A00` | Success animation |
| Demo data | Tangerine hatch | `#A8490A` | Watermark + DOM `data-origin="demo"` |
| Live data | Blue | `#2F49C9` | With "Verified source" label |

### Signature gradients
- `--grad-prism`: `135deg #FF6B6B 0%, #FFBE0B 26%, #B8F34A 50%, #2EC4B6 72%, #4361EE 100%`
- `--grad-aurora`: `120deg #8B5CF6, #FF4FA3, #FF8A3D`
- `--grad-sunrise`: `140deg #FFBE0B, #FF8A3D, #FF6B6B`
- `--grad-lagoon`: `160deg #2EC4B6, #4361EE`
- `--grad-plum`: `150deg #452B5E, #6D3BE0` (dark surface, still chromatic)

Never apply gradient text to prices; gradient type is reserved for display headings ≥32 px on plain backgrounds.

---

## 2. Logo & wordmark

**Concept — "The Prism Tessera".** Three angular tiles (coral, turquoise, violet) converge into a single diamond/prism at the centre, which contains a subtle aperture/magnifier notch on its upper-right edge. Three retailers → one clear answer; the notch signals discovery. The mark is built as inline SVG geometry (no raster), so it animates: tiles drift in and lock with a 40 ms stagger, then the prism catches a shine sweep.

- Wordmark: geometric sans, tight tracking, with the **"O" replaced by a micro-prism** — reads correctly as text, distinctive at favicon size.
- Clear space: 0.5× mark height. Min size: 20 px (mark-only below 96 px width).
- Mono variants: single-colour Mosaic Plum and single-colour White for print/dark.
- Originality: no cart, no tag, no globe, no swoosh, no competitor resemblance.

Deliverables in Phase 1: `logo.svg`, `logo-mark.svg`, `favicon.svg`, `og-cover.svg`, plus an animated component.

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
