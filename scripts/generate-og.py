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
sys.path.insert(0, str(ROOT / 'scripts/brand'))
from brand import EMBER, CORAL, LEFT, RIGHT  # noqa: E402  (single source of truth)
PUBLIC = ROOT / 'apps/web/public'
OUT = PUBLIC / 'og.png'

W, H = 1200, 630
SURFACE = (255, 249, 240)
INK = (74, 43, 34)          # Roast — warm cocoa
INK_MUTED = (122, 87, 72)   # 6.1:1
TINT = (253, 241, 231)

# The prism gradient, straight from apps/web/src/design/theme.css
PRISM = [(255, 107, 107), (255, 190, 11), (184, 243, 74), (46, 196, 182), (67, 97, 238)]


def hex_rgb(h: str):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def draw_mark(d, x, y, height):
    """Draw the brand mark (the same two polygons as the site) at x, y."""
    k = height / 42.0
    def place(poly):
        return [(x + (px - 8) * k, y + (py - 12) * k) for px, py in poly]
    d.polygon(place(LEFT), fill=hex_rgb(EMBER))
    d.polygon(place(RIGHT), fill=hex_rgb(CORAL))


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

    # Two-tone rule across the very top: the mark's two facets, no gradient
    d.rectangle([0, 0, W // 2, 10], fill=hex_rgb(EMBER))
    d.rectangle([W // 2, 0, W, 10], fill=hex_rgb(CORAL))

    # The mark itself, top right, flat fills at the size it can hold
    draw_mark(d, 872, 96, 168)

    title_font = ImageFont.truetype(outfit, 112)
    tag_font = ImageFont.truetype(jakarta_bold, 42)
    kick_font = ImageFont.truetype(jakarta_bold, 28)
    foot_font = ImageFont.truetype(jakarta, 28)

    # Eyebrow
    d.text((76, 150), 'INDIA  ·  PRICES COMPARED IN REAL TIME', font=kick_font, fill=INK_MUTED)

    # Wordmark
    d.text((70, 196), 'DEALMOSAIC', font=title_font, fill=INK)

    # Tagline, two deliberate lines
    d.text((76, 340), 'Delivery, fees and tax counted in.', font=tag_font, fill=INK)
    d.text((76, 396), 'Unknown stays unknown.', font=tag_font, fill=INK)

    # Footer promise — a fact about how the product works, not a claim of partners
    d.text((76, H - 104), 'Grocery  ·  Quick commerce  ·  Everyday electronics',
           font=foot_font, fill=INK_MUTED)

    # The two brand facets, bottom-right
    d.rounded_rectangle([W - 172, H - 96, W - 148, H - 72], radius=6, fill=hex_rgb(EMBER))
    d.rounded_rectangle([W - 142, H - 96, W - 118, H - 72], radius=6, fill=hex_rgb(CORAL))

    img.save(OUT, 'PNG', optimize=True)
    print(f'{OUT.relative_to(ROOT)}  {OUT.stat().st_size / 1024:.1f} KB  {img.size[0]}x{img.size[1]}')


if __name__ == '__main__':
    main()
