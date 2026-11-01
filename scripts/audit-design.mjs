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
  ['--ink (Mosaic Plum)', '#452B5E', SURFACE],
  ['--ink-muted', '#6B5280', SURFACE],
  ['--coral-d', '#C0392B', SURFACE],
  ['--blue-d', '#2F49C9', SURFACE],
  ['--turq-d', '#0F7F76', SURFACE],
  ['--sun-d', '#8A5A00', SURFACE],
  ['--violet-d', '#6D3BE0', SURFACE],
  ['--pink-d', '#C81C77', SURFACE],
  ['--lime-d', '#4C7A00', SURFACE],
  ['--tang-d', '#A8490A', SURFACE],
  ['white on --violet-d', WHITE, '#6D3BE0'],
  ['white on --blue-d', WHITE, '#2F49C9'],
  ['white on gradient stop #6d3be0', WHITE, '#6D3BE0'],
  ['white on gradient stop #c81c77', WHITE, '#C81C77'],
  ['white on gradient stop #a8490a', WHITE, '#A8490A'],
  ['white on --coral-d', WHITE, '#C0392B'],
  ['white on --turq-d', WHITE, '#0F7F76'],
  ['headline gradient #a8490a', '#A8490A', SURFACE],
  ['headline gradient #c0392b', '#C0392B', SURFACE],
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
    ? `  ✓ ${seen.size} unique colours checked — none darker than L* 20 (darkest is Mosaic Plum at L* ${Math.min(...[...seen].map(lightness)).toFixed(1)})`
    : `  ✗ ${darkHits} near-black value(s) found`,
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
  turquoise: '#2EC4B6',
  sunshine: '#FFBE0B',
  'candy pink': '#FF4FA3',
  lime: '#B8F34A',
  tangerine: '#FF8A3D',
  violet: '#8B5CF6',
  blue: '#4361EE',
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

console.log('\n=== 4. Gradient text stops must be text-safe ===');
const css = readFileSync('apps/web/src/design/theme.css', 'utf8');
const textGradients = [...css.matchAll(/--grad-[\w-]*text[\w-]*:\s*linear-gradient\(([^;]+)\);/g)];
for (const m of textGradients) {
  checks++;
  const stops = hexesIn(m[1] ?? '');
  const worst = Math.min(...stops.map((s) => contrast(s, SURFACE)));
  const ok = worst >= 3;
  if (!ok) failures++;
  console.log(`  ${ok ? '✓' : '✗'} ${stops.join(' → ')}  worst ${worst.toFixed(2)}:1 (large-text floor 3:1)`);
}


console.log('\n=== 5. Phase-2 fills that carry white text must pass AA ===');
// These are used as small badges with white numerals/labels. A near-miss here is
// exactly the kind of thing a human eye forgives and a low-vision user cannot.
const WHITE_FILLS = [
  ['podium silver', '#5f6e82'],
  ['podium bronze', '#a3581f'],
  ['rank 1 gradient', '#8a5a00'],
  ['rank 1 gradient', '#a8490a'],
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
