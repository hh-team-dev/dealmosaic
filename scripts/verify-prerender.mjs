#!/usr/bin/env node
/**
 * A PRERENDER THAT SILENTLY STOPS WORKING IS WORSE THAN NO PRERENDER.
 *
 * The build said "✅ prerendered 45 pages" for a day while 44 of those pages
 * carried the homepage body inside `#root`. Every sign of success was present:
 * correct file count, correct titles, correct canonicals, valid JSON-LD. The one
 * thing that was wrong — the actual content — was the one thing nobody checked.
 *
 * So the build now verifies its own output. This runs last and fails the build
 * rather than shipping duplicate pages to a crawler.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = process.argv[2] ?? 'apps/web/dist';
const FORBIDDEN_HOSTS = ['dealmosaic.in'];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'assets') continue;
      walk(full, out);
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
}

const firstH1 = (html) => {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : null;
};

const files = walk(DIST);
const problems = [];
const seen = new Map();

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(DIST, file);
  const h1 = firstH1(html);

  if (!h1) {
    problems.push(`${rel}: no <h1> — a page a crawler cannot identify`);
    continue;
  }

  // The 404 page is allowed to be its own thing; everything else must be unique.
  if (!rel.startsWith('404')) {
    if (seen.has(h1)) problems.push(`${rel}: same <h1> as ${seen.get(h1)} — "${h1}"`);
    else seen.set(h1, rel);
  }

  // The 404 page is deliberately not prerendered; everything else must carry a body.
  if (!rel.startsWith('404') && !/<div id="root">[\s\S]{200,}<\/div>/.test(html)) {
    problems.push(`${rel}: #root has no crawlable body (prerender did not inject)`);
  }

  for (const host of FORBIDDEN_HOSTS) {
    if (html.includes(host)) problems.push(`${rel}: references ${host}, a host we do not own`);
  }
}

if (files.length < 40) problems.push(`only ${files.length} HTML files — expected the full prerender`);

/**
 * Every URL in the sitemap must be a prerendered file.
 *
 * Seven pages were listed in sitemap.xml and never prerendered, so they served the
 * shell — which is the same duplicate-content defect in a different place. If a URL
 * is worth telling Google about, it is worth rendering.
 */
try {
  const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = urls
    .map((u) => new URL(u).pathname)
    .filter((p) => {
      const rel = p === '/' ? 'index.html' : join(p.replace(/^\//, ''), 'index.html');
      return !files.some((f) => f.endsWith(rel));
    });
  for (const p of missing) problems.push(`sitemap lists ${p} but no prerendered page exists`);
} catch {
  /* no sitemap yet — the sitemap step handles that */
}

if (problems.length) {
  console.error(`❌ prerender verification failed (${problems.length}):`);
  for (const p of problems.slice(0, 20)) console.error(`   • ${p}`);
  if (problems.length > 20) console.error(`   … and ${problems.length - 20} more`);
  process.exit(1);
}

console.log(`✅ prerender verified — ${files.length} pages, ${seen.size} unique <h1>, own host only, body present`);
