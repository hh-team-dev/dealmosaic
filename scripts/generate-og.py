#!/usr/bin/env python3
"""
Generate the 1200x630 social card (Open Graph image) for DEALMOSAIC.

Why a Python script in a Node project: Shopify-style text rasterisation needs a
real font engine. Pillow renders the project's own brand fonts exactly, which
keeps the card visually identical to the site. The output is committed as a
binary asset, so this only needs re-running when the brand or tagline changes.

    python3 scripts/generate-og.py

Requires: pillow, fonttools, brotli (only to convert the shipped .woff2 files).
"""
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'apps/web/public'
OUT = PUBLIC / 'og.png'

W, H = 1200, 630
SURFACE = (255, 249, 240)
INK = (69, 43, 94)          # Mosaic Plum
INK_MUTED = (107, 82, 128)  # 6.4:1
TINT = (253, 241, 231)

# The prism gradient, straight from apps/web/src/design/theme.css
PRISM = [(255, 107, 107), (255, 190, 11), (184, 243, 74), (46, 196, 182), (67, 97, 238)]


def brand_font(weight_name: str, cache: pathlib.Path, weight: int = 700) -> pathlib.Path:
    """
    Convert the shipped .woff2 to a static .ttf at a pinned weight.

    Both shipped fonts are VARIABLE fonts, and Pillow renders the default
    instance — which for these is near-hairline. Pinning the axis explicitly is
    what makes the card match the site's heavy display type.
    """
    if cache.exists():
        return cache
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont
    except ImportError:
        sys.exit('pip install fonttools brotli  (needed to read .woff2)')
    f = TTFont(str(PUBLIC / 'fonts' / weight_name))
    f.flavor = None
    if 'fvar' in f:
        f = instantiateVariableFont(f, {'wght': weight})
    f.save(str(cache))
    return cache


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def prism_color(t: float):
    """Sample the prism gradient at t in [0,1]."""
    t = max(0.0, min(1.0, t))
    span = len(PRISM) - 1
    i = min(int(t * span), span - 1)
    return lerp(PRISM[i], PRISM[i + 1], t * span - i)


def main():
    # weight-specific caches so 700 and 500 instances can coexist
    outfit = str(brand_font('Outfit.woff2', pathlib.Path('/tmp/Outfit-700.ttf'), 700))
    jakarta = str(brand_font('Plus-Jakarta-Sans.woff2', pathlib.Path('/tmp/Jakarta-500.ttf'), 500))
    jakarta_bold = str(brand_font('Plus-Jakarta-Sans.woff2', pathlib.Path('/tmp/Jakarta-600.ttf'), 600))

    img = Image.new('RGB', (W, H), SURFACE)
    d = ImageDraw.Draw(img)

    # Soft warm band behind the lower third — matches the site's --tint
    d.rectangle([0, H - 150, W, H], fill=TINT)

    # Prism rule across the very top
    for x in range(W):
        d.line([(x, 0), (x, 10)], fill=prism_color(x / W))

    # Mosaic tile motif, top right: 5 rounded squares in the spark palette
    tx, ty, size, gap = 880, 92, 46, 16
    for idx, col in enumerate(PRISM):
        col_i, row_i = idx % 3, idx // 3
        x0 = tx + col_i * (size + gap)
        y0 = ty + row_i * (size + gap)
        d.rounded_rectangle([x0, y0, x0 + size, y0 + size], radius=12, fill=col)

    title_font = ImageFont.truetype(outfit, 112)
    tag_font = ImageFont.truetype(jakarta_bold, 42)
    kick_font = ImageFont.truetype(jakarta_bold, 28)
    foot_font = ImageFont.truetype(jakarta, 28)

    # Eyebrow
    d.text((76, 150), 'INDIA  ·  PRICES COMPARED IN REAL TIME', font=kick_font, fill=INK_MUTED)

    # Wordmark
    d.text((70, 196), 'DEALMOSAIC', font=title_font, fill=INK)

    # Tagline, two deliberate lines
    d.text((76, 340), 'One search. Three real deals.', font=tag_font, fill=INK)
    d.text((76, 396), 'Zero price surprises.', font=tag_font, fill=INK)

    # Footer promise — a fact about how the product works, not a claim of partners
    d.text((76, H - 104), 'Grocery  ·  Quick commerce  ·  Everyday electronics',
           font=foot_font, fill=INK_MUTED)

    # Small prism swatch bottom-right
    for i in range(5):
        c = PRISM[i]
        d.rounded_rectangle([W - 190 + i * 30, H - 96, W - 166 + i * 30, H - 72], radius=6, fill=c)

    img.save(OUT, 'PNG', optimize=True)
    print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB  {img.size[0]}x{img.size[1]}')


if __name__ == '__main__':
    main()
