/**
 * DEALMOSAIC — Coupon Image Bank
 * ================================
 * Original, zero-cost SVG artwork for coupon categories.
 *
 * Design rules (from the standing design audit):
 *   • No blue, no near-blue (hue 158–320° excluded).
 *   • No black or near-black. Every dark is chromatic plum/cocoa.
 *   • Bright, peppy colours from the existing palette: ember, coral, grass,
 *     sun, magenta, pink, lime, tang.
 *   • Abstract geometric shapes — never a photo of a product we don't own,
 *     which would be a lie. Each shape suggests its category without claiming
 *     to show the merchant's actual goods.
 *   • Phone-first: 400×300 (4:3), lightweight, inline-able as data URLs.
 *   • Every SVG is self-contained: no external fonts, no external resources.
 */

import { createHash } from 'node:crypto';

/** The nine warm spark colours from theme.css. None are blue or black. */
const SPARK = {
  coral:   '#ff6b6b',
  ember:   '#ff6b35',
  grass:   '#34a853',
  sun:     '#ffbe0b',
  magenta: '#e8336f',
  pink:    '#ff4fa3',
  lime:    '#b8f34a',
  tang:    '#ff8a3d',
  brand:   '#c2410c',
  stone:   '#8a6a5c',
} as const;

/** Deep (text-safe) variants for any text inside an SVG. */
const DEEP = {
  coral:   '#c0392b',
  ember:   '#c2410c',
  grass:   '#2c7a3f',
  sun:     '#8a5a00',
  magenta: '#b3245f',
  pink:    '#c81c77',
  lime:    '#4c7a00',
  tang:    '#a8490a',
  brand:   '#8a2006',
  stone:   '#5c4338',
} as const;

type CategoryKey =
  | 'fashion' | 'electronics' | 'beauty' | 'food' | 'sports'
  | 'health' | 'home' | 'baby' | 'industrial' | 'refurb'
  | 'marketplace' | 'travel' | 'other';

/** Primary colour per category, drawn from the warm palette only. */
const CATEGORY_COLOUR: Record<CategoryKey, { spark: keyof typeof SPARK; deep: keyof typeof DEEP }> = {
  fashion:     { spark: 'magenta', deep: 'magenta' },
  electronics: { spark: 'tang',    deep: 'tang' },
  beauty:      { spark: 'pink',    deep: 'pink' },
  food:        { spark: 'grass',   deep: 'grass' },
  sports:      { spark: 'lime',    deep: 'lime' },
  health:      { spark: 'coral',   deep: 'coral' },
  home:        { spark: 'ember',   deep: 'ember' },
  baby:        { spark: 'sun',     deep: 'sun' },
  industrial:  { spark: 'brand',   deep: 'brand' },
  refurb:      { spark: 'stone',   deep: 'stone' },
  marketplace: { spark: 'coral',   deep: 'coral' },
  travel:      { spark: 'tang',    deep: 'tang' },
  other:       { spark: 'brand',   deep: 'brand' },
};

// SPARK and DEEP already include 'stone' above.

/** Deterministic pseudo-random number from a string, 0 ≤ n < 1. */
function seededRandom(s: string): () => number {
  let h = createHash('sha256').update(s).digest();
  let i = 0;
  return () => {
    const byte = h[i % h.length] ?? 0;
    i += 1;
    return byte / 256;
  };
}

/** -----------------------------------------------------------------------
 *  SVG builders. Each returns a complete <svg> string for a 400×300 viewBox.
 *  ---------------------------------------------------------------------- */

function rect(x: number, y: number, w: number, h: number, fill: string, rx = 0): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rx ? ` rx="${rx}"` : ''} />`;
}

function circle(cx: number, cy: number, r: number, fill: string): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
}

function path(d: string, fill: string): string {
  return `<path d="${d}" fill="${fill}" />`;
}

/** Background wash: soft tint of the category colour, never solid white. */
function wash(colour: string): string {
  return rect(0, 0, 400, 300, colour);
}

/** Category: Fashion — a hanging garment shape (hanger + dress outline). */
function fashion(rnd: () => number): string {
  const c = SPARK.magenta;
  const d = DEEP.magenta;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="fash-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#fash-grad)')}
      <!-- Hanger -->
      ${path(`M 180 40 L 180 100 L 220 100 L 220 40 Z`, d)}
      ${circle(200, 32, 14, d)}
      <!-- Garment body -->
      ${path(`M 150 120 L 150 260 L 250 260 L 250 120 Z`, c)}
      <!-- Sleeve suggestions -->
      ${path(`M 120 140 L 150 130 L 150 180 L 120 170 Z`, c)}
      ${path(`M 280 140 L 250 130 L 250 180 L 280 170 Z`, c)}
      <!-- Pocket detail -->
      ${rect(170, 190, 60, 40, d, 6)}
      ${rect(180, 200, 40, 20, 'rgba(255,255,255,0.3)', 4)}
    </svg>
  `.trim();
}

/** Category: Electronics — a phone/tablet with circuit trace lines. */
function electronics(rnd: () => number): string {
  const c = SPARK.tang;
  const d = DEEP.tang;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="elec-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#elec-grad)')}
      <!-- Device body -->
      ${rect(110, 70, 180, 190, c, 16)}
      <!-- Screen -->
      ${rect(125, 85, 150, 130, '#ffffff', 10)}
      <!-- Circuit traces -->
      ${path(`M 140 160 L 140 220 L 180 220`, d)}
      ${path(`M 180 220 L 220 220 L 220 260`, d)}
      ${path(`M 260 160 L 260 220 L 300 220`, d)}
      ${path(`M 300 220 L 340 220 L 340 260`, d)}
      <!-- Camera dots -->
      ${circle(145, 135, 5, d)}
      ${circle(155, 135, 5, d)}
      ${circle(165, 135, 5, d)}
    </svg>
  `.trim();
}

/** Category: Beauty — a bottle with droplets. */
function beauty(rnd: () => number): string {
  const c = SPARK.pink;
  const d = DEEP.pink;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="beau-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#beau-grad)')}
      <!-- Bottle -->
      ${path(`M 170 100 L 170 190 Q 170 240 200 240 Q 230 240 230 190 L 230 100 Z`, c)}
      ${rect(185, 70, 30, 40, d, 6)}
      <!-- Droplets -->
      ${circle(175, 260, 10, 'rgba(255,255,255,0.4)')}
      ${circle(200, 265, 8, 'rgba(255,255,255,0.35)')}
      ${circle(225, 260, 10, 'rgba(255,255,255,0.4)')}
      <ellipse cx="200" cy="240" rx="25" ry="12" fill="rgba(255,255,255,0.25)" />
    </svg>
  `.trim();
}

/** Category: Food — a plate with stylised food items. */
function food(rnd: () => number): string {
  const c = SPARK.grass;
  const d = DEEP.grass;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="food-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#food-grad)')}
      <!-- Plate -->
      ${circle(200, 200, 110, 'rgba(255,255,255,0.15)')}
      ${circle(200, 200, 95, c)}
      <!-- Food items -->
      ${circle(170, 170, 18, d)}
      ${circle(230, 175, 22, d)}
      ${circle(200, 230, 20, d)}
      <path d="M 170 230 Q 200 210 230 230" stroke="${d}" stroke-width="6" fill="none" stroke-linecap="round" />
      <path d="M 190 170 Q 200 145 210 170" stroke="${d}" stroke-width="6" fill="none" stroke-linecap="round" />
      <!-- Steam -->
      ${path(`M 195 160 Q 195 110 185 90`, 'rgba(255,255,255,0.3)')}
      ${path(`M 205 165 Q 205 115 215 95`, 'rgba(255,255,255,0.3)')}
    </svg>
  `.trim();
}

/** Category: Sports — a ball with motion lines. */
function sports(rnd: () => number): string {
  const c = SPARK.lime;
  const d = DEEP.lime;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="spor-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#spor-grad)')}
      <!-- Ball -->
      ${circle(200, 150, 55, c)}
      ${path(`M 160 150 Q 200 110 240 150 Q 200 190 160 150`, d)}
      ${path(`M 160 150 Q 200 190 240 150 Q 200 110 160 150`, d)}
      <!-- Motion lines -->
      ${path(`M 120 120 L 100 110`, d)}
      ${path(`M 125 150 L 105 140`, d)}
      ${path(`M 120 180 L 100 170`, d)}
    </svg>
  `.trim();
}

/** Category: Health — a cross / first-aid symbol. */
function health(rnd: () => number): string {
  const c = SPARK.coral;
  const d = DEEP.coral;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="heal-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#heal-grad)')}
      <!-- Cross -->
      ${rect(175, 110, 50, 80, c)}
      ${rect(160, 125, 80, 50, c)}
      <!-- Pulse line -->
      ${path(`M 80 180 L 120 180 L 140 140 L 160 220 L 180 180 L 220 180`, d)}
      ${circle(80, 180, 6, d)}
      ${circle(220, 180, 6, d)}
    </svg>
  `.trim();
}

/** Category: Home — a house outline. */
function home(rnd: () => number): string {
  const c = SPARK.ember;
  const d = DEEP.ember;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="hom-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#hom-grad)')}
      <!-- House -->
      ${path(`M 200 80 L 140 160 L 260 160 Z`, c)}
      ${rect(160, 160, 80, 100, c, 8)}
      <!-- Door -->
      ${rect(185, 200, 30, 60, d, 4)}
      <!-- Window -->
      ${rect(200, 175, 20, 20, '#ffffff', 4)}
    </svg>
  `.trim();
}

/** Category: Baby — a rattle / pacifier shape. */
function baby(rnd: () => number): string {
  const c = SPARK.sun;
  const d = DEEP.sun;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="baby-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#baby-grad)')}
      <!-- Rattle head -->
      ${circle(200, 120, 35, c)}
      <circle cx="200" cy="120" r="20" fill="rgba(255,255,255,0.3)" />
      <!-- Handle -->
      ${rect(185, 155, 30, 80, d, 8)}
      <!-- Dots around -->
      ${circle(165, 95, 6, 'rgba(255,255,255,0.4)')}
      ${circle(235, 95, 6, 'rgba(255,255,255,0.4)')}
      ${circle(165, 145, 6, 'rgba(255,255,255,0.4)')}
      ${circle(235, 145, 6, 'rgba(255,255,255,0.4)')}
    </svg>
  `.trim();
}

/** Category: Industrial — gears / factory. */
function industrial(rnd: () => number): string {
  const c = SPARK.brand;
  const d = DEEP.brand;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="ind-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#ind-grad)')}
      <!-- Big gear -->
      ${circle(140, 160, 45, c)}
      <circle cx="140" cy="160" r="30" fill="rgba(255,255,255,0.15)" />
      <!-- Small gear -->
      ${circle(240, 180, 30, c)}
      <circle cx="240" cy="180" r="18" fill="rgba(255,255,255,0.15)" />
      <!-- Belt -->
      ${path(`M 175 140 Q 200 135 225 140`, d)}
      ${path(`M 175 180 Q 200 185 225 180`, d)}
    </svg>
  `.trim();
}

/** Category: Refurb — a refresh / cycle arrow. */
function refurb(rnd: () => number): string {
  const c = SPARK.sun;
  const d = DEEP.sun;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="ref-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#ref-grad)')}
      <!-- Cycle arrows -->
      ${path(`M 160 120 A 50 50 0 0 1 210 120`, d)}
      ${path(`M 210 120 L 220 110 L 200 120 L 220 130 Z`, d)}
      ${path(`M 240 160 A 50 50 0 0 1 190 160`, d)}
      ${path(`M 190 160 L 180 170 L 200 160 L 180 150 Z`, d)}
    </svg>
  `.trim();
}

/** Category: Marketplace — a bag with multiple items. */
function marketplace(rnd: () => number): string {
  const c = SPARK.coral;
  const d = DEEP.coral;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="mark-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#mark-grad)')}
      <!-- Bag -->
      ${path(`M 150 100 L 150 220 Q 150 260 200 260 Q 250 260 250 220 L 250 100 Z`, c)}
      ${rect(165, 70, 70, 40, d, 6)}
      <!-- Item hints -->
      ${circle(170, 150, 12, 'rgba(255,255,255,0.3)')}
      ${circle(230, 160, 14, 'rgba(255,255,255,0.35)')}
      ${circle(200, 190, 10, 'rgba(255,255,255,0.3)')}
    </svg>
  `.trim();
}

/** Category: Travel — a suitcase with handle. */
function travel(rnd: () => number): string {
  const c = SPARK.tang;
  const d = DEEP.tang;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="trav-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#trav-grad)')}
      <!-- Suitcase -->
      ${rect(130, 120, 140, 110, c, 10)}
      <!-- Handle -->
      ${rect(185, 80, 30, 50, d, 4)}
      ${path(`M 185 80 Q 200 60 215 80`, d)}
      <!-- Latch -->
      ${rect(190, 160, 20, 10, d, 3)}
      <!-- Tag -->
      ${rect(260, 150, 25, 35, d, 4)}
    </svg>
  `.trim();
}

/** Category: Other / fallback — abstract warm shape. */
function other(rnd: () => number): string {
  const c = SPARK.brand;
  const d = DEEP.brand;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <radialGradient id="oth-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="${c}" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="${c}" stop-opacity="0.02"/>
        </radialGradient>
      </defs>
      ${wash('url(#oth-grad)')}
      <!-- Abstract overlapping circles -->
      ${circle(120, 100, 40, c)}
      ${circle(180, 140, 50, c)}
      ${circle(260, 100, 35, c)}
      ${circle(200, 220, 45, c)}
      <circle cx="160" cy="180" r="25" fill="rgba(255,255,255,0.2)" />
    </svg>
  `.trim();
}

/** Registry: category key → SVG builder function. */
const BUILDERS: Record<CategoryKey, (rnd: () => number) => string> = {
  fashion, electronics, beauty, food, sports, health, home, baby,
  industrial, refurb, marketplace, travel, other,
};

/**
 * Generate an original SVG data URL for a coupon category.
 *
 * The output is deterministic: the same category always returns the same SVG,
 * so the browser can cache it. Different categories get different colours and
 * shapes, all drawn from the warm DealMosaic palette.
 *
 * @param categorySlug - the coupon's category slug (e.g. 'fashion', 'electronics')
 * @returns a `data:image/svg+xml;utf8,…` string ready to use as an `src`
 */
export function couponImageDataUrl(categorySlug?: string | null): string {
  const key: CategoryKey = categorySlug && BUILDERS[categorySlug as CategoryKey]
    ? (categorySlug as CategoryKey)
    : 'other';
  const builder = BUILDERS[key];
  const rnd = seededRandom(key);
  const svg = builder(rnd);
  const encoded = encodeURIComponent(svg);
  return `data:image/svg+xml;utf8,${encoded}`;
}

/**
 * Return the category's primary spark colour for use as a text/tint accent.
 */
export function categoryColour(categorySlug?: string | null): string {
  const key: CategoryKey = categorySlug && CATEGORY_COLOUR[categorySlug as CategoryKey]
    ? (categorySlug as CategoryKey)
    : 'other';
  return SPARK[CATEGORY_COLOUR[key].spark];
}
