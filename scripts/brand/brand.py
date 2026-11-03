#!/usr/bin/env python3
"""
DEALMOSAIC — brand asset build.

One source of truth for the identity: geometry, palette, every SVG master, and
every raster export (PNG set, maskable, apple-touch, favicon.ico, social avatar).

    python3 scripts/brand/brand.py
    python3 scripts/brand/brand.py --report   # also print contrast measurements

Requires: pillow, fonttools, brotli (brotli only to unpack the shipped .woff2).

Why Python and not a headless browser: the mark itself is pure polygons — no
gradients, filters, strokes or type — so it rasterises exactly with a supersample
in Pillow, deterministically. The lockups do contain type, so those are drawn
from the project's own Outfit variable font at a pinned weight.

Nothing here is derived from another company's mark. See docs/brand-identity.md
for the concepts that were rejected and the reasoning behind this one.
"""
from __future__ import annotations

import functools
import pathlib
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
PUBLIC = ROOT / 'apps/web/public'
BRAND = PUBLIC / 'brand'
FONTS = PUBLIC / 'fonts'

# --------------------------------------------------------------------------
# Palette — every value is an existing site token (apps/web/src/design/theme.css).
# --------------------------------------------------------------------------
# Renamed from EMBER on 3 November 2026: the owner ruled blue out of the product,
# so the left facet became Ember. Geometry is untouched; only the fill changed.
EMBER = '#C2410C'         # --ember-d  "Ember"         left facet
CORAL = '#FF6B6B'         # --coral    "Coral Spark"   right facet
INK = '#4A2B22'           # --ink      "Roast"         mono / text
CREAM = '#FFF9F0'         # --surface  "Warm White"    background
WHITE = '#FFFFFF'         # --raised
EMBER_ON_DARK = '#FFA07A'
CORAL_ON_DARK = '#FF8A8A'

# --------------------------------------------------------------------------
# Geometry — 64 x 64 grid. The M is two polygons that share the chevron edge at
# x = 32, so the split is a real facet boundary rather than a gradient overlay.
# --------------------------------------------------------------------------
LEFT = [(8, 54), (8, 12), (20, 12), (32, 29), (32, 48), (20, 31), (20, 54)]
RIGHT = [(32, 29), (44, 12), (56, 12), (56, 54), (44, 54), (44, 31), (32, 48)]

# Mark bounding box is x 8..56, y 12..54. A square 58-unit window centred on it
# leaves 5 units of air on all four sides: even optical padding, which is what
# keeps the mark from looking crowded in a tab strip or an avatar.
ICON_BOX = (3, 4, 58, 58)
MARK_W, MARK_H = 48, 42
HALF_DIAG = ((MARK_W / 2) ** 2 + (MARK_H / 2) ** 2) ** 0.5

WORD = 'DEALMOSAIC'
TRACKING = -0.04  # em — matches .brand-word letter-spacing on the site
SAFE = 0.40       # maskable safe circle radius, as a fraction of canvas


def pts(points) -> str:
    return ' '.join(f'{x},{y}' for x, y in points)


def svg(body: str, vb: str, w, h, title='DEALMOSAIC') -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>'
    )


def mark_body(left: str, right: str) -> str:
    return (f'<polygon points="{pts(LEFT)}" fill="{left}"/>'
            f'<polygon points="{pts(RIGHT)}" fill="{right}"/>')


# --------------------------------------------------------------------------
# Wordmark: real outlines cut from the shipped Outfit variable font, so the SVG
# renders identically on a machine that has never had Outfit installed.
# --------------------------------------------------------------------------
@functools.lru_cache(maxsize=1)
def wordmark_outlines() -> tuple[list[tuple[float, str]], float, float]:
    """
    Glyph outlines for the wordmark, in a y-up space where cap height = 100.

    Returns ([(x_offset, path_d), ...], total_width, unit_scale).

    The single y-flip happens on the group that places the wordmark, because SVG
    y grows downward and font units grow upward. Flipping here *and* there
    cancelled out and put every glyph outside the viewBox — the wordmark rendered
    blank. One flip, one place.
    """
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    f = TTFont(str(FONTS / 'Outfit.woff2'))
    f.flavor = None
    if 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': 800})
    upm = f['head'].unitsPerEm
    unit = 100.0 / f['OS/2'].sCapHeight      # cap height becomes 100 units
    glyphs = f.getGlyphSet()
    cmap = f.getBestCmap()
    hmtx = f['hmtx']

    out: list[tuple[float, str]] = []
    x = 0.0
    xmax = 0.0
    for ch in WORD:
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            out.append((x * unit, d))
            # Track the real ink extent, not the advance width: the final "C"
            # overhangs its advance, and measuring by advance clipped it.
            bp = BoundsPen(glyphs)
            glyphs[name].draw(bp)
            if bp.bounds:
                xmax = max(xmax, (x + bp.bounds[2]) * unit)
        x += hmtx[name][0] + TRACKING * upm
    return out, xmax, unit


def wordmark_group(x: float, baseline: float, cap: float, fill: str) -> tuple[str, float]:
    """Outlined wordmark placed so its cap-height top sits at baseline - cap."""
    parts, width, unit = wordmark_outlines()
    s = cap / 100.0
    inner = ''.join(
        f'<path transform="translate({tx:.2f} 0) scale({unit:.5f})" d="{d}"/>'
        for tx, d in parts
    )
    g = (f'<g transform="translate({x:.2f} {baseline:.2f}) scale({s:.5f} {-s:.5f})" '
         f'fill="{fill}">{inner}</g>')
    return g, width * s


# --------------------------------------------------------------------------
# SVG masters
# --------------------------------------------------------------------------
def icon_svg(left=EMBER, right=CORAL) -> str:
    x, y, w, h = ICON_BOX
    return svg(mark_body(left, right), f'{x} {y} {w} {h}', w, h)


def horizontal_svg(left=EMBER, right=CORAL, fill=INK) -> str:
    """
    Mark + wordmark on one optical line.

    The mark is sized to 1.7x the wordmark's cap height — the ratio that keeps the
    two reading as one lockup rather than a big shape next to small text — and
    centred on the artboard, not on the baseline.
    """
    cap = 30.0
    mark_h = cap * 1.7
    k = mark_h / MARK_H
    mark_w = MARK_W * k
    gap = 18.0
    wm_x = mark_w + gap
    mark = (f'<g transform="translate({mark_w / 2:.2f} 32) scale({k:.5f}) translate(-32 -33)">'
            f'{mark_body(left, right)}</g>')
    wm, wm_w = wordmark_group(wm_x, 32 + cap / 2, cap, fill)
    total = wm_x + wm_w
    return svg(mark + wm, f'0 0 {total:.1f} 64', round(total, 1), 64)


def compact_svg(left=EMBER, right=CORAL, fill=INK) -> str:
    """Stacked lockup for square or centred spaces: mark above the wordmark."""
    cap = 22.0
    mark_h = cap * 2.0
    k = mark_h / MARK_H
    mark_w = MARK_W * k
    _, wm_w = wordmark_group(0, 0, cap, fill)      # measure only
    gap = 14.0
    total_w = max(mark_w, wm_w)
    total_h = mark_h + gap + cap
    mark = (f'<g transform="translate({total_w / 2:.2f} {mark_h / 2:.2f}) scale({k:.5f}) '
            f'translate(-32 -33)">{mark_body(left, right)}</g>')
    wm, _ = wordmark_group((total_w - wm_w) / 2, total_h, cap, fill)
    return svg(mark + wm, f'0 0 {total_w:.1f} {total_h:.1f}',
               round(total_w, 1), round(total_h, 1))


def wordmark_svg(fill=INK) -> str:
    cap = 100.0
    _, width = wordmark_group(0, 0, cap, fill)
    g, w = wordmark_group(0, cap, cap, fill)
    return svg(g, f'0 0 {w:.1f} {cap}', round(w, 1), round(cap, 1))


def write_svg(name: str, content: str) -> None:
    (BRAND / name).write_text(content + '\n', encoding='utf-8')


def build_svgs() -> None:
    write_svg('dm-icon.svg', icon_svg())
    write_svg('dm-icon-dark.svg', icon_svg(EMBER_ON_DARK, CORAL_ON_DARK))
    write_svg('dm-icon-mono.svg', icon_svg(INK, INK))
    write_svg('dm-icon-mono-cream.svg', icon_svg(CREAM, CREAM))
    write_svg('dm-logo-horizontal.svg', horizontal_svg())
    write_svg('dm-logo-horizontal-dark.svg',
              horizontal_svg(EMBER_ON_DARK, CORAL_ON_DARK, CREAM))
    write_svg('dm-logo-horizontal-mono.svg', horizontal_svg(INK, INK, INK))
    write_svg('dm-logo-compact.svg', compact_svg())
    write_svg('dm-logo-compact-dark.svg', compact_svg(EMBER_ON_DARK, CORAL_ON_DARK, CREAM))
    write_svg('dm-wordmark.svg', wordmark_svg())
    write_svg('dm-wordmark-mono-cream.svg', wordmark_svg(CREAM))
    # The tab icon: mark only, transparent, so it sits correctly on light and
    # dark browser chrome. No rounded tile — the browser supplies the shape.
    (PUBLIC / 'favicon.svg').write_text(icon_svg() + '\n', encoding='utf-8')


# --------------------------------------------------------------------------
# Raster exports
# --------------------------------------------------------------------------
SS = 4  # supersample factor


def _hex(c: str) -> tuple[int, int, int]:
    c = c.lstrip('#')
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def render_mark(size: int, k: float, left: str, right: str) -> Image.Image:
    """
    Rasterise the mark into a `size` canvas with the 58-unit icon box drawn at
    scale k (pixels per grid unit), then supersample down for clean edges.
    """
    big = size * SS
    img = Image.new('RGBA', (big, big), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    kk = k * SS
    cx = cy = big / 2

    def place(poly):
        return [(cx + (x - 32) * kk, cy + (y - 33) * kk) for x, y in poly]

    d.polygon(place(LEFT), fill=_hex(left) + (255,))
    d.polygon(place(RIGHT), fill=_hex(right) + (255,))
    return img.resize((size, size), Image.LANCZOS)


def on_background(mark: Image.Image, bg: str) -> Image.Image:
    canvas = Image.new('RGBA', mark.size, _hex(bg) + (255,))
    canvas.alpha_composite(mark)
    return canvas.convert('RGB')


def export_icon_pngs() -> None:
    sizes = [1024, 512, 256, 192, 180, 128, 96, 64, 48, 32, 16]
    for s in sizes:
        render_mark(s, s / 58, EMBER, CORAL).save(BRAND / f'dm-icon-{s}.png', optimize=True)

    # Maskable: the mark must survive the OS cropping to a circle. Constrain the
    # mark's half-diagonal to the 40 % safe radius, then centre it on a filled
    # square. No baked rounding — the platform does the masking.
    for size, name in [(512, 'dm-icon-maskable-512.png')]:
        k = (safe_k(size))
        on_background(render_mark(size, k, EMBER, CORAL), CREAM).save(BRAND / name, optimize=True)

    # Any-purpose PWA icon with the cream plate (Android shows it on a launcher).
    on_background(render_mark(512, 512 / 58 * 0.92, EMBER, CORAL), CREAM).save(
        BRAND / 'dm-icon-plate-512.png', optimize=True)

    # iOS home screen. Apple applies its own mask, so this one is a plain square
    # with the art inset to Apple's recommended margin.
    on_background(render_mark(180, 180 / 58 * 0.86, EMBER, CORAL), CREAM).save(
        PUBLIC / 'apple-touch-icon.png', optimize=True)

    # Social avatar: square, filled (a transparent avatar turns into a hole).
    on_background(render_mark(512, 512 / 58 * 0.82, EMBER, CORAL), CREAM).save(
        BRAND / 'dm-social-avatar-512.png', optimize=True)

    # Dark-surface avatar, for profiles rendered on plum.
    on_background(render_mark(512, 512 / 58 * 0.82, EMBER_ON_DARK, CORAL_ON_DARK), INK).save(
        BRAND / 'dm-social-avatar-dark-512.png', optimize=True)

    # favicon.ico — 16, 32 and 48 in one file, each rendered at its own size.
    frames = [render_mark(s, s / 58, EMBER, CORAL) for s in (16, 32, 48)]
    frames[-1].save(PUBLIC / 'favicon.ico', format='ICO',
                    sizes=[(16, 16), (32, 32), (48, 48)])


def safe_k(size: int) -> float:
    """Pixels-per-grid-unit that keeps the whole mark inside the mask circle."""
    return (SAFE * size) / HALF_DIAG


@functools.lru_cache(maxsize=2)
def _ttf(path: str, weight: int) -> str:
    from fontTools.ttLib import TTFont
    from fontTools.varLib.instancer import instantiateVariableFont

    out = pathlib.Path(f'/tmp/brand-{pathlib.Path(path).stem}-{weight}.ttf')
    if out.exists():
        return str(out)
    f = TTFont(str(FONTS / path), )
    f.flavor = None
    if 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': weight})
    f.save(str(out))
    return str(out)


def draw_tracked(d, xy, text, font, fill, tracking_px=0.0):
    """Pillow has no letter-spacing, so advance glyph by glyph."""
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += d.textlength(ch, font=font) + tracking_px
    return x


def export_lockup_pngs() -> None:
    """PNG versions of the horizontal and compact lockups, wordmark included."""
    cap_px = 96
    font = ImageFont.truetype(_ttf('Outfit.woff2', 800), cap_px * 1.42)
    track = TRACKING * cap_px * 1.42

    # Measure the wordmark with the tracking applied
    probe = ImageDraw.Draw(Image.new('RGB', (10, 10)))
    wm_w = sum(probe.textlength(c, font=font) + track for c in WORD)

    pad, gap = 40, 34
    mark_h = 168
    mark_w = int(mark_h * MARK_W / MARK_H)
    W = int(pad * 2 + mark_w + gap + wm_w)
    H = int(pad * 2 + mark_h)

    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    mark = render_mark(mark_h, 1, EMBER, CORAL)  # placeholder, replaced below
    mark = _mark_at(mark_w, mark_h, EMBER, CORAL)
    img.alpha_composite(mark, (pad, pad))
    d = ImageDraw.Draw(img)
    # cap-height top aligned with the mark's optical centre
    asc = font.getbbox('D')[1]
    d.text((pad + mark_w + gap, pad + (mark_h - cap_px) / 2 - asc), '', font=font)
    draw_tracked(d, (pad + mark_w + gap, pad + (mark_h - cap_px) / 2 - asc),
                 WORD, font, _hex(INK) + (255,), track)
    img.save(BRAND / 'dm-logo-horizontal.png', optimize=True)

    # Light and dark horizontal PNGs
    dark = Image.new('RGBA', (W, H), _hex(INK) + (255,))
    dark.alpha_composite(_mark_at(mark_w, mark_h, EMBER_ON_DARK, CORAL_ON_DARK), (pad, pad))
    dd = ImageDraw.Draw(dark)
    draw_tracked(dd, (pad + mark_w + gap, pad + (mark_h - cap_px) / 2 - asc),
                 WORD, font, _hex(CREAM) + (255,), track)
    dark.convert('RGB').save(BRAND / 'dm-logo-horizontal-dark.png', optimize=True)

    # Compact / stacked
    cap2 = 62
    font2 = ImageFont.truetype(_ttf('Outfit.woff2', 800), int(cap2 * 1.42))
    track2 = TRACKING * cap2 * 1.42
    wm2 = sum(probe.textlength(c, font=font2) + track2 for c in WORD)
    m2 = 150
    mw2 = int(m2 * MARK_W / MARK_H)
    CW = int(max(wm2, mw2) + pad * 2)
    CH = int(pad * 2 + m2 + 26 + cap2)
    ci = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    ci.alpha_composite(_mark_at(mw2, m2, EMBER, CORAL), (int((CW - mw2) / 2), pad))
    dc = ImageDraw.Draw(ci)
    asc2 = font2.getbbox('D')[1]
    draw_tracked(dc, (int((CW - wm2) / 2), pad + m2 + 26 - asc2),
                 WORD, font2, _hex(INK) + (255,), track2)
    ci.save(BRAND / 'dm-logo-compact.png', optimize=True)


def _mark_at(w: int, h: int, left: str, right: str) -> Image.Image:
    """Mark rasterised to an exact w x h box (not square)."""
    ss = 4
    img = Image.new('RGBA', (w * ss, h * ss), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    kx, ky = (w * ss) / MARK_W, (h * ss) / MARK_H
    def place(poly):
        return [((x - 8) * kx, (y - 12) * ky) for x, y in poly]
    d.polygon(place(LEFT), fill=_hex(left) + (255,))
    d.polygon(place(RIGHT), fill=_hex(right) + (255,))
    return img.resize((w, h), Image.LANCZOS)


# --------------------------------------------------------------------------
# Measurement — the numbers quoted in docs/brand-identity.md
# --------------------------------------------------------------------------
def _lum(hexv: str) -> float:
    r, g, b = (c / 255 for c in _hex(hexv))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = f(r), f(g), f(b)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = _lum(a), _lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def report() -> None:
    rows = [
        ('Ember on Warm White', EMBER, CREAM),
        ('Coral Spark on Warm White', CORAL, CREAM),
        ('Ember vs Coral Spark', EMBER, CORAL),
        ('Ember on white', EMBER, WHITE),
        ('Coral Spark on white', CORAL, WHITE),
        ('Mono ink on Warm White', INK, CREAM),
        ('Dark facet — ember on cocoa', EMBER_ON_DARK, INK),
        ('Dark facet — coral on plum', CORAL_ON_DARK, INK),
        ('Primary ember on cocoa (why a dark variant exists)', EMBER, INK),
    ]
    for label, a, b in rows:
        print(f'  {label:<52} {contrast(a, b):>5.2f}:1')
    print(f'  maskable scale: {(SAFE * 512) / HALF_DIAG:.4f} px per grid unit '
          f'(mark half-diagonal {HALF_DIAG:.2f} units fits the 40 % safe circle)')


def main() -> None:
    BRAND.mkdir(parents=True, exist_ok=True)
    build_svgs()
    export_icon_pngs()
    export_lockup_pngs()
    files = sorted(p.name for p in BRAND.iterdir())
    print(f'brand assets: {len(files)} files in {BRAND.relative_to(ROOT)}')
    for f in files:
        print('  ', f)
    if '--report' in sys.argv:
        print('contrast:')
        report()


if __name__ == '__main__':
    main()
