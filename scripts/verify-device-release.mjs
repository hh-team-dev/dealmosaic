/** Read-only 2.5 release verification. No sign-in, affiliate navigation, mail,
 * orders, campaign applications or production fixtures. Screenshots stay off. */
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
const origin = 'https://dealmosaic.pages.dev';
const expected = JSON.parse(readFileSync('apps/web/dist/pwa-release.json', 'utf8'));
const report = { checkedAt: new Date().toISOString(), origin, readOnly: true, checks: [], errors: [], externalRequestsBlocked: [] };
async function get(path) { return fetch(origin + path, { redirect: 'manual', headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(45000) }); }
function check(name, condition) { assert.ok(condition, name); report.checks.push(name); }
const health = await (await get('/api/health')).json(); report.api = { version: health.version, revision: health.revision, environment: health.environment };
check('Compatible production API', health.version === expected.version && health.environment === 'production');
const release = await (await get('/pwa-release.json')).json(); report.web = { version: release.version, build: release.build, mode: release.mode };
check('Published web artifact matches tested release', release.version === expected.version && release.build === expected.build && release.mode === 'pwa');
for (const path of ['/api/admin/campaigns', '/api/admin/campaigns/network', '/api/meta/affiliate', '/api/me/notifications']) check('Anonymous denial: ' + path, (await get(path)).status === 401);
const catalogue = await (await get('/api/catalogue/products?limit=200')).json();
report.catalogueProducts = catalogue.products.length;
check('25 reference products retained', catalogue.products.length === 25);
let liveObservations = 0;
for (const product of catalogue.products) {
  const detail = await (await get('/api/catalogue/products/' + encodeURIComponent(product.slug))).json();
  const offers = Object.values(detail.offersByVariant).flat(); liveObservations += offers.length;
  check('Only live product observations: ' + product.slug, offers.every(o => o.dataOrigin === 'live'));
  for (const variant of detail.variants) if (!(detail.offersByVariant[variant.id] ?? []).length) check('No unsupported price/MRP: ' + variant.id, variant.priceFromMinor === null && variant.mrpMinor === null);
}
report.liveProductObservations = liveObservations;
for (const path of ['/login', '/app/settings', '/admin?tab=campaigns', '/store-link-help?offer=release-check-invalid']) {
  const response = await get(path); const body = await response.text();
  check('Neutral client-route HTML: ' + path, response.status === 200 && body.includes('Your DealMosaic page') && !body.includes('Good deals. Clearer choices.'));
  check('Uncached noindex client route: ' + path, /noindex/.test(response.headers.get('x-robots-tag') ?? '') && /no-store/.test(response.headers.get('cache-control') ?? ''));
}
const missing = await fetch(origin + '/api/go/release-check-invalid', { redirect: 'manual', headers: { accept: 'text/html' }, signal: AbortSignal.timeout(45000) });
check('Missing store link returns local recovery without an affiliate visit', missing.status === 303 && missing.headers.get('location') === '/store-link-help?offer=release-check-invalid');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.externalRequestsBlocked.push(new URL(route.request().url()).hostname); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('.deal-go').first().waitFor();
  check('Customer-benefit third step is live', (await page.locator('.how-it-works li').nth(2).innerText()).includes('Check your final saving.'));
  const link = page.locator('.deal-go').first(); await link.hover(); await link.focus();
  const colors = await link.evaluate(el => ({ foreground: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor, height: el.getBoundingClientRect().height }));
  const lum = s => s.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((n,c,i)=>n+c*[.2126,.7152,.0722][i],0);
  const a=lum(colors.foreground),b=lum(colors.background);report.button={...colors,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  check('Live focused store button contrast and touch target', report.button.contrast >= 4.5 && colors.height >= 44);
  check('Home fits phone width', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.goto(origin + '/store-link-help?offer=release-check-invalid');
  await page.getByRole('heading', { name: 'Keep your offer in view.' }).waitFor();
  check('Unavailable recovery does not offer a fake store retry', await page.getByRole('link', { name: /Try the store link again/ }).count() === 0);
  await page.goto(origin + '/login'); await page.getByRole('heading', { name: 'Welcome back' }).waitFor();
  check('Live sign-in route loads', true);
  check('No browser exceptions', report.errors.length === 0);
  check('No external destination requested', report.externalRequestsBlocked.length === 0);
} finally { await browser.close(); }
writeFileSync('docs/source/2026-11-05-production-repair-verification.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ checksPassed: report.checks.length, api: report.api, web: report.web, catalogueProducts: report.catalogueProducts, liveProductObservations: report.liveProductObservations, button: report.button, browserErrors: report.errors }, null, 2));
