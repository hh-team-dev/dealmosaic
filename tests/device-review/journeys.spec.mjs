import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const fixture = JSON.parse(readFileSync('/tmp/dm-audit-fixtures.json', 'utf8'));
const base = 'http://127.0.0.1:5173';
let errors;
test.beforeAll(async ({ request, baseURL }) => {
  if (baseURL !== base) throw new Error('Local fixtures ONLY. Never run against production.');
  expect((await (await request.get('/api/health')).json()).environment).toBe('test');
});
test.beforeEach(async ({ page, context }, info) => {
  errors = []; page.on('pageerror', e => errors.push(e.message));
  await context.setExtraHTTPHeaders({ 'x-forwarded-for': `198.51.100.${30 + [...info.testId].reduce((n, c) => n + c.charCodeAt(0), 0) % 200}` });
  // Even an accidental merchant navigation never reaches a network or retailer.
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.fulfill({ contentType: 'text/html', body: '<body style="background:#fff9f0;color:#4a2b22">Isolated store destination</body>' }));
});
test.afterEach(() => expect(errors).toEqual([]));
async function signedIn(context, role = 'user') { await context.addCookies([{ name: 'dm_session', value: fixture.users[role].token, url: base, httpOnly: true }]); }
async function login(page) {
  await page.goto('/login'); await page.getByLabel('Email address').fill(fixture.users.user.email);
  await page.getByLabel('Password', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Your dashboard', exact: true })).toBeVisible();
}
function contrast(a, b) {
  const luminance = s => s.match(/[\d.]+/g).slice(0, 3).map(Number).map(x => { const c = x / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }).reduce((n, c, i) => n + c * [.2126, .7152, .0722][i], 0);
  const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
async function readable(link) {
  const c = await link.evaluate(el => ({ fg: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, text: el.textContent }));
  expect(c.text.trim()).not.toBe(''); expect(contrast(c.fg, c.bg)).toBeGreaterThanOrEqual(4.5);
}

test('shelf CTA stays readable on hover, focus, pressed state and store return; recovery keeps the code', async ({ page, context }) => {
  await context.route('**/api/go/*?src=shelf', route => route.fulfill({ contentType: 'text/html', body: '<body style="background:#fff9f0;color:#4a2b22">Isolated store destination</body>' }));
  await page.goto('/'); const button = page.locator('.deal-go').first(); await expect(button).toBeVisible();
  await readable(button); await button.hover(); await readable(button); await button.focus(); await readable(button);
  const rect = await button.boundingBox(); await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await readable(button); await page.mouse.move(0, 0); await page.mouse.up();
  const popup = page.waitForEvent('popup'); await button.click(); const store = await popup; await expect(store.locator('body')).toContainText('Isolated store destination'); await store.close(); await page.bringToFront();
  await readable(button);
  const help = page.getByRole('link', { name: 'Store not opening? Keep your code & get help' }).first(); await expect(help).toBeVisible(); await help.click();
  await expect(page.getByRole('heading', { name: 'Keep your offer in view.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Try the store link again/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy code', exact: true })).toBeVisible();
  await expect(page.locator('main')).toContainText('does not automatically apply');
});

test('deals-list CTA uses a defined high-contrast style and consumer-benefit third step', async ({ page }) => {
  await page.goto('/deals'); const button = page.locator('.shop-link').first(); await expect(button).toBeVisible(); await button.hover(); await readable(button);
  await expect(page.getByText('Check your final saving.', { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('We earn a small commission');
  await expect(page.locator('footer.site-footer')).toContainText('Affiliate disclosure');
});

test('public catalogue and chosen variant do not expose seeded prices or verified rankings', async ({ page, request }) => {
  await page.goto('/p/apple-iphone-16'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Apple iPhone 16');
  await expect(page.locator('.trust-badge')).toHaveCount(0);
  await expect(page.locator('main')).toContainText('Price alerts need a confirmed store price');
  const products = await (await request.get('/api/catalogue/products?limit=200')).json(); expect(products.products.every(p => p.priceFromMinor === null)).toBe(true);
  const detail = await (await request.get('/api/catalogue/products/apple-iphone-16')).json();
  await page.goto(`/search?q=Apple+iPhone+16&v=${detail.variants[0].id}`);
  await expect(page.getByRole('heading', { name: /No confirmed comparison/ })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Total verified');
});

test('guest saves stay usable and account reminder linkage can be explicitly repaired', async ({ page, context }) => {
  let linked = []; let writes = 0;
  await page.route('**/api/me/saved-deals', async route => {
    if (route.request().method() === 'POST') { linked.push(route.request().postDataJSON().couponId); writes++; return route.fulfill({ json: { saved: true } }); }
    return route.fulfill({ json: { saved: linked.map(couponId => ({ couponId })) } });
  });
  await page.goto('/'); const guestWrite = page.waitForResponse('**/api/me/saved-deals'); await page.locator('.deal-save').first().click(); await (await guestWrite).finished();
  // The guest heart is device-local; do not turn its background write into a claimed linkage.
  linked = []; writes = 0;
  await page.goto('/saved'); await expect(page.getByRole('heading', { name: 'Browse freely. Make an account when it helps.' })).toBeVisible();
  await expect(page.locator('.saved-grid .deal-card')).toHaveCount(1);
  await signedIn(context); await page.reload(); await expect(page.getByRole('heading', { name: 'Your reminder status' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Link these saved offers to my account' })).toBeVisible();
  await page.getByRole('button', { name: 'Link these saved offers to my account' }).click();
  await expect(page.locator('main')).toContainText('1 of 1'); await expect(page.locator('main')).toContainText('No email was sent by this action.'); expect(writes).toBe(1);
});

test('a delayed anonymous session response cannot overwrite a completed sign-in', async ({ page }) => {
  let release; let held = false; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/session', async route => {
    if (!held) { held = true; await gate; return route.fulfill({ json: { user: null, preferences: null, csrfToken: null } }); }
    return route.continue();
  });
  await login(page); const late = page.waitForResponse('**/api/auth/session'); release(); await (await late).finished();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await expect(page.getByRole('link', { name: 'Your dashboard', exact: true })).toBeVisible();
});

test('failed sign-out stays signed in and double taps produce one sign-out request', async ({ page }) => {
  await login(page); await page.goto('/app/settings');
  let calls = 0; let release; let fail = true; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/logout', async route => {
    calls++; if (fail) return route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Local failure' } } });
    await gate; return route.continue();
  });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByText('Sign-out could not be confirmed. Please retry before leaving a shared device.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Account settings' })).toBeVisible();
  fail = false; const b = page.getByRole('button', { name: 'Sign out', exact: true }); await b.click();
  await expect(page.getByRole('button', { name: 'Signing out…' })).toBeDisabled();
  await page.getByRole('button', { name: 'Signing out…' }).evaluate(el => el.click()); expect(calls).toBe(2); release();
  await expect(page.getByText('Signed out. See you soon.', { exact: true })).toHaveCount(1);
});

test('new optional email consent is unchecked', async ({ page }) => {
  await page.goto('/register'); await expect(page.getByRole('checkbox', { name: /Email me eligible updates/ })).not.toBeChecked();
  await expect(page.locator('main')).not.toContainText('keeps your saved deals on any device');
});

test('campaign view separates cache, API inventory and real local clicks; all pages are reachable', async ({ page, context }) => {
  await signedIn(context, 'super_admin');
  const row = { id: 123, name: 'Isolated campaign', domain: 'a'.repeat(63) + '.example.test', access: 'open', type: 'CPS', payout: '3', currency: 'INR', payoutType: null, cookie: '7 days', deepLink: false, checkedAt: new Date().toISOString(), liveOffers: 0, heldOffers: 1, clicks30: 4 };
  await page.route('**/api/admin/campaigns?*', route => route.fulfill({ json: { source: 'cache', page: 1, pageSize: 50, total: 1, totalPages: 1, fetchedAt: row.checkedAt, summary: { total: 1, open: 1, pending: 0, notApplied: 0, oldest: row.checkedAt, newest: row.checkedAt }, rows: [row] } }));
  await page.route('**/api/admin/campaigns/network?*', route => { const pageNumber = Number(new URL(route.request().url()).searchParams.get('page')); return route.fulfill({ json: { source: 'network', page: pageNumber, pageSize: 100, total: 101, totalPages: 2, fetchedAt: row.checkedAt, summary: null, rows: [{ ...row, id: pageNumber, name: `Live page ${pageNumber}`, type: 'CPC' }] } }); });
  await page.goto('/admin?tab=campaigns'); await expect(page.getByRole('heading', { name: 'Campaign inventory', exact: true })).toBeVisible();
  await page.getByText('Isolated campaign', { exact: true }).click(); await expect(page.locator('main')).toContainText('No currently eligible linked offer');
  await expect(page.locator('main')).toContainText('4 clicks');
  const originalViewport = page.viewportSize(); await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize(originalViewport);
  await page.getByRole('button', { name: 'Browse live API inventory' }).click(); await expect(page.locator('main')).toContainText('101 campaigns reported by the API');
  await page.getByRole('button', { name: 'Next page' }).click(); await expect(page.getByText('Live page 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('campaign API failure and dashboard alert failure have explicit retry, not false zero results', async ({ page, context }) => {
  await signedIn(context); let recovered = false;
  await page.route('**/api/alerts', route => recovered ? route.fulfill({ json: { alerts: [] } }) : route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Local outage' } } }));
  await page.goto('/app'); await expect(page.getByRole('button', { name: 'Retry alerts' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('No price alerts.'); recovered = true; await page.getByRole('button', { name: 'Retry alerts' }).click(); await expect(page.locator('main')).toContainText('No price alerts.');
  await signedIn(context, 'super_admin'); await page.route('**/api/admin/campaigns?*', route => route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Inventory unknown — retry' } } }));
  await page.goto('/admin?tab=campaigns'); await expect(page.getByRole('button', { name: 'Retry inventory' })).toBeVisible();
});


test('failed sign-in releases account loading even when an older session response arrives later', async ({ page }) => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/auth/session', async route => { await gate; return route.fulfill({ json: { user: null, preferences: null, csrfToken: null } }); });
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, json: { error: { code: 'invalid_credentials', message: 'Local sign-in failure' } } }));
  await page.goto('/login'); await page.getByLabel('Email address').fill('local@example.test'); await page.getByLabel('Password', { exact: true }).fill('LocalPassword9!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await expect(page.getByText('Local sign-in failure', { exact: true })).toBeVisible();
  release(); await page.evaluate(() => { history.pushState({}, '', '/app'); dispatchEvent(new PopStateEvent('popstate')); });
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
});

test('notification centre distinguishes failed loading, retry, and unconfirmed email delivery', async ({ page, context }) => {
  await signedIn(context); let fail = true;
  await page.route('**/api/me/notifications', route => fail ? route.fulfill({ status: 503, json: { error: { code: 'unavailable', message: 'Local failure' } } }) : route.fulfill({ json: { enabled: true, notifications: [{ id: 'local-notice', title: 'Local target observation', productSlug: null, observedPriceMinor: 10000, targetMinor: 15000, platform: 'Local store', createdAt: new Date().toISOString(), emailSent: false }] } }));
  await page.goto('/app'); await expect(page.getByText('Updates could not load. This does not mean there are none.')).toBeVisible();
  fail = false; await page.getByRole('button', { name: 'Retry updates' }).click();
  await expect(page.getByText('Local target observation', { exact: true })).toBeVisible();
  await expect(page.locator('#notifications')).toContainText('Email delivery not confirmed');
  await expect(page.locator('#notifications')).toContainText('past observations, not current checkout quotes');
});

test('client-only routes retain a neutral noindex page when application JavaScript is unavailable', async ({ page }) => {
  await page.route('**/assets/*.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  for (const path of ['/login', '/app/settings', '/store-link-help?offer=local']) {
    const response = await page.goto(path); expect(response.status()).toBe(200);
    await expect(page.getByRole('heading', { name: 'Your DealMosaic page' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('body')).not.toContainText('Good deals. Clearer choices.');
    await expect(page.locator('body')).not.toContainText('Today’s best deals');
  }
});
