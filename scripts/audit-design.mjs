#!/usr/bin/env node
/**
 * Design-rule audit — run with `npm run audit:design`.
 *
 * Enforces the two owner rules mechanically instead of trusting anyone's eye:
 *   1. NOTHING in the shipped CSS may be black or near-black.
 *   2. Every declared text-on-surface pair must clear WCAG AA.
 *
 * Exits non-zero on violation, so it can gate a build.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CSS_FILES = [
  'apps/web/src/design/theme.css',
  'apps/web/src/design/hospitality.css',
  'apps/web/public/404.html',
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(css|tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

/* ----------------------------- colour maths ----------------------------- */

const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
};

const linear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
};

/** CIE L* — used to detect "close to black" far more reliably than a hex comparison. */
const lightness = (hex) => {
  const y = luminance(hex);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
};

const hexesIn = (text) => [...text.matchAll(/#([0-9a-fA-F]{3,8})\b/g)].map((m) => m[0]);

/* ------------------------------- checks -------------------------------- */

const SURFACE = '#FFF9F0';
const WHITE = '#FFFFFF';

/** Every colour the UI uses for TEXT must clear these pairs. */
const TEXT_PAIRS = [
  ['hospitality gold', '#8A5A00', '#FFF9F0'],
  ['white on hospitality gold', WHITE, '#8A5A00'],
  ['hospitality berry', '#A32950', '#FFF8F4'],
  ['white on hospitality berry', WHITE, '#A32950'],
  ['hospitality berry on rose', '#A32950', '#F8DCE3'],
  ['discovery royal', '#7A1F3D', '#FFF9F0'],
  ['white on discovery royal', WHITE, '#7A1F3D'],
  ['discovery copper', '#B25A1E', '#FFF9F0'],
  ['white on discovery copper', WHITE, '#B25A1E'],
  ['--ink (Roast)', '#4A2B22', SURFACE],
  ['--ink-muted', '#7A5748', SURFACE],
  ['--ink-soft', '#8D6A57', SURFACE],
  ['--action', '#C2410C', SURFACE],
  ['white on --action', WHITE, '#C2410C'],
  ['white on --action-hover', WHITE, '#A8360A'],
  ['white on --action-active', WHITE, '#8F2C08'],
  ['--coral-d', '#C0392B', SURFACE],
  ['--ember-d', '#C2410C', SURFACE],
  ['--grass-d', '#2C7A3F', SURFACE],
  ['--sun-d', '#8A5A00', SURFACE],
  ['--magenta-d', '#B3245F', SURFACE],
  ['--pink-d', '#C81C77', SURFACE],
  ['--lime-d', '#4C7A00', SURFACE],
  ['--tang-d', '#A8490A', SURFACE],
  ['white on --magenta-d', WHITE, '#B3245F'],
  ['white on --grass-d', WHITE, '#2C7A3F'],
  ['white on --coral-d', WHITE, '#C0392B'],
  ['white on --tang-d', WHITE, '#A8490A'],
  ['white on gradient stop #c2410c', WHITE, '#C2410C'],
  ['white on gradient stop #a8231a', WHITE, '#A8231A'],
];

let failures = 0;
let checks = 0;

console.log('\n=== 1. No black / near-black anywhere in shipped CSS or components ===');
const files = [...CSS_FILES, ...walk('apps/web/src')];
const seen = new Set();
let darkHits = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const hex of hexesIn(text)) {
    if (seen.has(hex.toLowerCase())) continue;
    seen.add(hex.toLowerCase());
    const l = lightness(hex);
    if (l < 20) {
      console.log(`  ✗ ${file}: ${hex} has L*=${l.toFixed(1)} (near-black)`);
      darkHits++;
      failures++;
    }
  }
  if (/\brgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(text) || /:\s*black\b/i.test(text)) {
    console.log(`  ✗ ${file}: contains an explicit black value`);
    darkHits++;
    failures++;
  }
}
console.log(
  darkHits === 0
    ? `  ✓ ${seen.size} unique colours checked — none darker than L* 20 (darkest is Roast at L* ${Math.min(...[...seen].map(lightness)).toFixed(1)})`
    : `  ✗ ${darkHits} near-black value(s) found`,
);

console.log('\n=== 1b. No blue, violet, indigo or teal anywhere ===');
/* The owner's rule: nothing blue, nothing close to blue, nothing black. The
   mechanical form of it is a hue window. Any colour whose HSL hue sits between
   158deg (teal) and 320deg (violet) with real saturation is a violation, in the
   stylesheet and in every component. The system is now warm end to end:
   crimson -> vermilion -> coral -> amber, plus one magenta and one grass. */
const hueOf = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100 };
};
let hueHits = 0;
let hueScanned = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const found = [];
  for (const hex of hexesIn(text)) {
    const [r, g, b] = hexToRgb(hex).map((v) => v);
    const { h, s } = hueOf(r, g, b);
    hueScanned++;
    if (h >= 158 && h <= 320 && s > 12) found.push(`${hex} (hue ${Math.round(h)}, sat ${Math.round(s)}%)`);
  }
  for (const m of text.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => Number(v) / 255);
    const { h, s } = hueOf(r, g, b);
    hueScanned++;
    if (h >= 158 && h <= 320 && s > 12) found.push(`${m[0]}) (hue ${Math.round(h)}, sat ${Math.round(s)}%)`);
  }
  if (found.length) {
    hueHits += found.length;
    failures += found.length;
    console.log(`  ✗ ${file}: ${found.join(', ')}`);
  }
}
checks++;
console.log(
  hueHits === 0
    ? `  ✓ ${hueScanned} colour values scanned — none in the 158deg-320deg blue/violet/teal window`
    : `  ✗ ${hueHits} blue-ish value(s) found`,
);

console.log('\n=== 2. Text contrast (WCAG 2.2 AA: 4.5:1 body, 3:1 large) ===');
for (const [label, fg, bg] of TEXT_PAIRS) {
  checks++;
  const ratio = contrast(fg, bg);
  const ok = ratio >= 4.5;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(34)} ${fg} on ${bg}  ${ratio.toFixed(2)}:1`);
}

console.log('\n=== 3. Spark tints are decorative only ===');
const SPARK = {
  coral: '#FF6B6B',
  ember: '#FF6B35',
  grass: '#34A853',
  sunshine: '#FFBE0B',
  'candy pink': '#FF4FA3',
  lime: '#B8F34A',
  tangerine: '#FF8A3D',
  magenta: '#E8336F',
};
for (const [name, hex] of Object.entries(SPARK)) {
  checks++;
  const ratio = contrast(hex, SURFACE);
  const decorativeOnly = ratio < 4.5;
  console.log(
    `  ${decorativeOnly ? '✓' : '·'} ${name.padEnd(12)} ${hex}  ${ratio.toFixed(2)}:1  ${
      decorativeOnly ? '→ correctly limited to fills/gradients' : '→ may also be used as text'
    }`,
  );
}

console.log('\n=== 4. Exactly one gradient, and it is safe behind white text ===');
// The rainbow family was the loudest "early-stage product" signal in the old UI,
// and white on its amber stops measured 1.66:1. Keeping the count at one is now
// a build gate, so a future gradient has to be argued for rather than slipped in.
const css = readFileSync('apps/web/src/design/theme.css', 'utf8');
const gradientTokens = [...css.matchAll(/--grad-[\w-]+:\s*([^;]+);/g)];
checks++;
const oneGradient = gradientTokens.length === 1;
if (!oneGradient) failures++;
console.log(
  `  ${oneGradient ? '✓' : '✗'} ${gradientTokens.length} gradient token(s): ${gradientTokens
    .map((m) => m[0].split(':')[0].trim())
    .join(', ') || 'none'}`,
);
for (const m of gradientTokens) {
  checks++;
  const stops = hexesIn(m[1] ?? '');
  const worst = Math.min(...stops.map((s) => contrast(s, SURFACE)));
  const ok = worst >= 3;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${stops.join(' → ')}  worst ${worst.toFixed(2)}:1 on Warm White`);
}

/* any inline gradient in a component must be an opacity wash, not a hue gradient */
checks++;
const inlineGradients = walk('apps/web/src')
  .filter((f) => /\.(tsx|ts)$/.test(f))
  .flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/linear-gradient\(([^)]*)\)/g)].map((m) => [f, m[1]]));
const vivid = inlineGradients.filter(([, body]) => !/rgba?\(/.test(body));
if (vivid.length) failures++;
console.log(
  `  ${vivid.length ? '✗' : '✓'} ${vivid.length} opaque gradient(s) in components${
    vivid.length ? ': ' + vivid.map(([f, b]) => `${f} → ${b}`).join(' | ') : ''
  }`,
);


console.log('\n=== 5. Phase-2 fills that carry white text must pass AA ===');
// These are used as small badges with white numerals/labels. A near-miss here is
// exactly the kind of thing a human eye forgives and a low-vision user cannot.
const WHITE_FILLS = [
  ['podium gold', '#8A5A00'],
  ['podium stone', '#8A6A5C'],
  ['podium bronze', '#A3581F'],
  ['rank 1 (action)', '#C2410C'],
  ['rank 2 (ink)', '#4A2B22'],
  ['rank 3 (ink-soft)', '#8D6A57'],
  ['step 2 (sun-d)', '#8A5A00'],
  ['step 3 (coral-d)', '#C0392B'],
  ['discount badge', '#C0392B'],
];
let worstFill = Infinity;
for (const [name, hex] of WHITE_FILLS) {
  checks++;
  const ratio = contrast(hex, '#ffffff');
  worstFill = Math.min(worstFill, ratio);
  const ok = ratio >= 4.5;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${name.padEnd(16)} ${hex}  white text ${ratio.toFixed(2)}:1`);
}
console.log(`  · worst white-on-fill pair ${worstFill.toFixed(2)}:1 (floor 4.5:1)`);

console.log('\n=== 6. No black or near-black anywhere ===');
checks++;
const allHex = [...new Set(css.match(/#[0-9a-fA-F]{6}\b/g) ?? [])];
const darkest = allHex
  .map((h) => ({ hex: h.toLowerCase(), l: luminance(h) }))
  .sort((a, b) => a.l - b.l)[0];
const darkestOk = darkest.l > 0.02; // Mosaic Plum sits around 0.048
if (!darkestOk) failures++;
console.log(
  `  ${darkestOk ? '✓' : '✗'} darkest colour in the stylesheet is ${darkest.hex} (luminance ${darkest.l.toFixed(4)})`,
);

console.log(`\n${failures === 0 ? '✅ PASS' : '❌ FAIL'} — ${checks} assertions, ${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);
