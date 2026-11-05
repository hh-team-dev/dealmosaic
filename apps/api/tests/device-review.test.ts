import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';
let app: any, db: any, variant: any;
let seq = 0;
const headers = () => ({ 'x-forwarded-for': `192.0.2.${++seq}`, origin: 'https://dealmosaic.pages.dev' });
async function req(path: string, init: RequestInit = {}) { return app.request(path, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } }); }
beforeAll(async () => {
  const m = await import('../src/app.js'); app = m.app; await m.ready;
  db = (await import('../src/db/index.js')).db;
  variant = await db.prepare('SELECT v.id, p.slug, p.title FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id LIMIT 1').get();
});
afterEach(() => vi.restoreAllMocks());

async function coupon(id: string, state = 'listed') {
  await db.prepare(`INSERT INTO coupons(id,platform_slug,code,title,discount_type,discount_value,source,trust_state,tracking_url,created_at,campaign_id)
    VALUES(?,'croma','SAVE10','Local test offer','percent',10,'affiliate',?,'https://example.test/offer',?,800001)`).run(id, state, new Date().toISOString());
}

describe('device evidence: price provenance', () => {
  it('does not return untouched seeded prices, MRP, ratings or history on public product pages', async () => {
    const all = await (await req('/api/catalogue/products?limit=200')).json();
    expect(all.products).toHaveLength(25);
    for (const p of all.products) { expect(p.priceFromMinor).toBeNull(); expect(p.mrpFromMinor).toBeNull(); }
    const p = await (await req(`/api/catalogue/products/${variant.slug}`)).json();
    expect(p.offersByVariant).toEqual({});
    expect(p.variants.every((v: any) => v.priceFromMinor === null && v.mrpMinor === null && v.offerCount === 0)).toBe(true);
    expect(Object.values(p.history).every((h: any) => h.points.length === 0)).toBe(true);
  });
  it('does not rank demo arithmetic as a verified price when a variant is selected', async () => {
    const r = await req('/api/search', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: variant.title, variantId: variant.id }) });
    const d = await r.json(); expect(r.status).toBe(200); expect(d.kind).toBe('no_results'); expect(d.reason).toContain('No confirmed current store price');
    expect(JSON.stringify(d)).not.toContain('verificationState');
  });
  it('cannot select a demonstration offer for an alert or write another demo snapshot', async () => {
    const { bestOfferForVariant } = await import('../src/services/alerts.js');
    const { recordDailySnapshots } = await import('../src/services/snapshots.js');
    expect(await bestOfferForVariant(variant.id)).toBeNull();
    expect((await recordDailySnapshots()).written).toBe(0);
  });
});

describe('device evidence: safe store recovery', () => {
  it('reads visible offer details without creating an outbound click', async () => {
    await coupon('device-help');
    const before = await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get();
    const r = await req('/api/go/device-help/details'); const d = await r.json();
    expect(d).toMatchObject({ available: true, code: 'SAVE10', linkHost: 'example.test' });
    expect(d.trackingUrl).toBeUndefined();
    expect((await db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get()).n).toBe(before.n);
  });
  it('does not expose held coupon codes or redirect a browser to them', async () => {
    await coupon('device-held', 'rejected');
    const d = await (await req('/api/go/device-held/details')).json(); expect(d.available).toBe(false); expect(d.code).toBeUndefined();
    const r = await req('/api/go/device-held', { headers: { accept: 'text/html' } });
    expect(r.status).toBe(303); expect(r.headers.get('location')).toBe('/store-link-help?offer=device-held');
    expect((await db.prepare("SELECT COUNT(*) AS n FROM outbound_clicks WHERE coupon_id = 'device-held'").get()).n).toBe(0);
  });
  it('keeps JSON errors for API clients and no-store on failures', async () => {
    const r = await req('/api/go/device-missing'); expect(r.status).toBe(404); expect(r.headers.get('cache-control')).toBe('no-store'); expect((await r.json()).error).toBe('not_found');
  });
  it.each(['future', 'http'])('rejects %s destinations without manufacturing a visit', async kind => {
    const id = `device-${kind}`; await coupon(id);
    if (kind === 'future') await db.prepare('UPDATE coupons SET starts_at = ? WHERE id = ?').run(new Date(Date.now() + 86400000).toISOString(), id);
    else await db.prepare("UPDATE coupons SET tracking_url = 'http://example.test/unsafe' WHERE id = ?").run(id);
    expect((await req(`/api/go/${id}`)).status).toBe(410);
    expect((await (await req(`/api/go/${id}/details`)).json()).available).toBe(false);
  });
});

let cookie = '';
async function createUser(email: string, notifyEmail?: boolean) {
  const r = await req('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'DeviceReviewPassphrase9!', passwordConfirm: 'DeviceReviewPassphrase9!', displayName: 'Local review', ageConfirmed: true, ...(notifyEmail === undefined ? {} : { notifyEmail }) }) });
  expect(r.status).toBe(201); const d = await r.json();
  const token = new URL(d.devActionUrl).searchParams.get('token');
  const v = await req('/api/auth/verify-email', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  cookie = v.headers.get('set-cookie')!.split(';')[0]!; return v.json();
}

describe('account consent and campaign inventory', () => {
  it('leaves optional saved-offer email off unless expressly selected', async () => {
    const d = await createUser('device-optout@example.test'); expect(d.preferences.notifyEmail).toBe(false);
    const yes = await createUser('device-optin@example.test', true); expect(yes.preferences.notifyEmail).toBe(true);
  });
  it('rejects an unsupported price alert rather than promising an unmonitorable notification', async () => {
    const s = await (await req('/api/auth/session', { headers: { cookie } })).json();
    const r = await req('/api/alerts', { method: 'POST', headers: { cookie, 'x-csrf-token': s.csrfToken, 'content-type': 'application/json' }, body: JSON.stringify({ variantId: variant.id, targetPrice: 500 }) });
    expect(r.status).toBe(400); expect((await r.json()).error.message).toContain('live store price');
  });
  it('guards cached and live inventory from both anonymous and ordinary accounts', async () => {
    for (const route of ['/api/admin/campaigns', '/api/admin/campaigns/network', '/api/meta/affiliate']) {
      expect((await req(route)).status).toBe(401);
      expect((await req(route, { headers: { cookie } })).status).toBe(403);
    }
  });
  it('lets an administrator search status and missing-offer opportunities without changing records', async () => {
    await db.prepare("UPDATE users SET role='admin' WHERE email='device-optin@example.test'").run();
    const stamp = new Date().toISOString();
    for (const [id, name, access] of [[800001, 'Alpha sample', 'open'], [800002, 'Beta sample', 'pending'], [800003, '100% sample', 'open']]) {
      await db.prepare("INSERT INTO affiliate_campaigns(id,name,access_status,campaign_type,synced_at) VALUES(?,?,?,'CPS',?)").run(id, name, access, stamp);
    }
    const r = await req('/api/admin/campaigns?access=open&coverage=without', { headers: { cookie } });
    expect(r.status).toBe(200); expect(r.headers.get('cache-control')).toBe('no-store');
    const d = await r.json(); expect(d.rows.map((c: any) => c.id)).toEqual([800003]); expect(d.rows[0].clicks30).toBe(0); expect(d.rows[0].payoutType).toBeNull();
    const escaped = await (await req('/api/admin/campaigns?q=100%25', { headers: { cookie } })).json();
    expect(escaped.total).toBe(1); expect(escaped.rows[0].id).toBe(800003);
    const invalid = await (await req('/api/admin/campaigns?page=NaN', { headers: { cookie } })).json(); expect(invalid.page).toBe(1);
  });
  it('reads all campaign types from the documented list and exposes no raw upstream secrets', async () => {
    const network = await import('../src/lib/cuelinks.js');
    vi.spyOn(network, 'isConfigured').mockReturnValue(true);
    const list = vi.spyOn(network, 'fetchCampaigns').mockResolvedValue({ data: [{ id: 800001, name: 'Network campaign', domain: 'example.test', access_status: 'open', campaign_type: 'CPC', payout_type: 'PerClick', payout: '0.1', payout_currency: 'INR', cookie_duration: null, deeplink_allowed: false, cashback_publishers_allowed: false }], meta: { page: 2, per_page: 100, total: 101, total_pages: 2, next_page: null } });
    const r = await req('/api/admin/campaigns/network?page=2', { headers: { cookie } }); const d = await r.json();
    expect(r.status).toBe(200); expect(list).toHaveBeenCalledWith(2, 100, ''); expect(d.total).toBe(101); expect(d.rows[0]).toMatchObject({ type: 'CPC', payoutType: 'PerClick', liveOffers: 1, clicks30: 0 });
    list.mockRejectedValue(new Error('private publisher token MUST_NOT_ESCAPE'));
    const bad = await req('/api/admin/campaigns/network', { headers: { cookie } }); expect(bad.status).toBe(503); expect(await bad.text()).not.toContain('MUST_NOT_ESCAPE');
  });
});


describe('notification centre boundaries', () => {
  it('requires an account and does not turn malformed or demo events into notifications', async () => {
    expect((await req('/api/me/notifications')).status).toBe(401);
    const session = await createUser('device-notices@example.test');
    const insert = async (id: string, payload: string) => db.prepare("INSERT INTO notification_events(id,user_id,kind,payload,created_at) VALUES(?,?,'price_alert',?,?)").run(id, session.user.id, payload, new Date().toISOString());
    await insert('bad-event', '{bad');
    await insert('sample-event', JSON.stringify({ dataOrigin: 'demo', inApp: true, bestMinor: 100, targetMinor: 200 }));
    await insert('disabled-event', JSON.stringify({ dataOrigin: 'live', inApp: false, bestMinor: 100, targetMinor: 200 }));
    await insert('real-event', JSON.stringify({ dataOrigin: 'live', inApp: true, bestMinor: 100, targetMinor: 200, productTitle: 'Local observation', productSlug: 'local-item', emailed: false }));
    const r = await req('/api/me/notifications', { headers: { cookie } });
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect((await r.json()).notifications.map((n: any) => n.id)).toEqual(['real-event']);
    await db.prepare('UPDATE user_preferences SET notify_inapp = 0 WHERE user_id = ?').run(session.user.id);
    expect(await (await req('/api/me/notifications', { headers: { cookie } })).json()).toEqual({ enabled: false, notifications: [] });
  });
});

describe('feed completeness and alert freshness', () => {
  it('preserves meaningful conditions beyond the former 400-character cutoff', async () => {
    const { toCouponRow } = await import('../src/lib/cuelinks.js');
    const terms = 'Eligibility condition. '.repeat(30) + 'Final condition: selected dates and participating properties only.';
    const row = toCouponRow({ id: 999999, title: 'Local offer', description: null, terms, coupon_code: null, offer_type: 'deal', campaign_id: 999999, campaign_name: 'Local', tracking_url: 'https://example.test', status: 'active', start_date: null, end_date: null, original_price: null, discount_price: null, percent_off: null });
    expect(row.terms).toContain('Final condition: selected dates and participating properties only.');
    expect(row.terms!.length).toBeGreaterThan(400);
  });
  it('refuses stale live price observations rather than saying they were checked now', async () => {
    const { bestOfferForVariant } = await import('../src/services/alerts.js');
    const row = await db.prepare('SELECT * FROM offers LIMIT 1').get();
    try {
      await db.prepare("UPDATE offers SET data_origin='live',is_active=1,in_stock=1,last_checked_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(row.id);
      expect(await bestOfferForVariant(row.variant_id)).toBeNull();
      await db.prepare('UPDATE offers SET last_checked_at=? WHERE id=?').run(new Date().toISOString(), row.id);
      expect((await bestOfferForVariant(row.variant_id))?.offerId).toBe(row.id);
    } finally {
      await db.prepare('UPDATE offers SET data_origin=?,is_active=?,in_stock=?,last_checked_at=? WHERE id=?').run(row.data_origin,row.is_active,row.in_stock,row.last_checked_at,row.id);
    }
  });
});
