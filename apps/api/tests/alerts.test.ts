import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SYNC_TOKEN = 'test-sync-token';

/**
 * PRICE ALERTS — tested as a promise, not as an endpoint.
 *
 * The thing that must not break is the sentence on the page: *we email you only
 * if the price actually falls below your target*. So the tests here assert the
 * negatives — no alert for a variant with no offer, no alert when the price is
 * above target, no second email once an alert has fired — because those are the
 * failures a user experiences as spam.
 */

afterEach(() => vi.restoreAllMocks());
let app: any;
let clientSeq = 0;

class Client {
  cookie: string | null = null;
  csrf: string | null = null;
  ip = `192.0.2.${++clientSeq}`;

  async req(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: Record<string, any> | null }> {
    const headers: Record<string, string> = { 'x-forwarded-for': this.ip };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers['cookie'] = this.cookie;
    if (this.csrf && method !== 'GET') headers['x-csrf-token'] = this.csrf;

    const res = await app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const m = /dm_session=([^;]*)/.exec(setCookie);
      if (m) this.cookie = m[1] ? `dm_session=${m[1]}` : null;
    }
    let parsed: Record<string, any> | null = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    return { status: res.status, body: parsed };
  }
}

const password = 'MosaicPrism#2026';
const tokenFromUrl = (url: string | undefined): string =>
  new URL(url!, 'http://localhost').searchParams.get('token')!;

async function signedIn(email: string): Promise<Client> {
  const c = new Client();
  const reg = await c.req('POST', '/api/auth/register', {
    displayName: 'Alert Tester',
    email,
    password,
    passwordConfirm: password,
    ageConfirmed: true, notifyEmail: true,
  });
  expect(reg.status).toBeLessThan(400);
  const verify = await c.req('POST', '/api/auth/verify-email', { token: tokenFromUrl(reg.body?.devActionUrl) });
  expect(verify.status).toBe(200);
  c.csrf = verify.body?.csrfToken ?? null;
  return c;
}

let variantId = '';
let productSlug = '';

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.app;
  // The catalogue seed is asynchronous; wait for boot before querying it.
  await mod.ready;
  const { db } = await import('../src/db/index.js');
  const row = (await db
    .prepare(
      `SELECT v.id, p.slug, (SELECT MIN(item_price_minor) FROM offers WHERE variant_id = v.id AND is_active = 1) AS best
         FROM product_variants v JOIN catalogue_products p ON p.id = v.product_id
        WHERE EXISTS (SELECT 1 FROM offers WHERE variant_id = v.id AND is_active = 1)
        LIMIT 1`,
    )
    .get()) as { id: string; slug: string; best: number };
  variantId = row.id;
  productSlug = row.slug;
  // Explicit local-only live fixture for alert behaviour. Separate regression
  // tests prove untouched demonstration rows never reach public prices/alerts.
  await db.prepare("UPDATE offers SET data_origin = 'live' WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = (SELECT product_id FROM product_variants WHERE id = ?))").run(variantId);
});

describe('price alerts', () => {
  it('refuses to set an alert without a signed-in shopper', async () => {
    const anon = new Client();
    const res = await anon.req('POST', '/api/alerts', { variantId, targetPrice: 1 });
    expect(res.status).toBe(401);
  });

  it('creates an alert and reports the live price back', async () => {
    const c = await signedIn('alerts1@example.in');
    const res = await c.req('POST', '/api/alerts', { variantId, targetPrice: 1 });
    expect(res.status).toBe(201);
    expect(res.body?.targetPriceMinor).toBe(100);

    const list = await c.req('GET', '/api/alerts');
    expect(list.status).toBe(200);
    expect(list.body?.alerts).toHaveLength(1);
    // The list must say where the price stands right now, not just the target.
    expect(list.body?.alerts[0].bestPriceMinor).toBeGreaterThan(100);
    expect(list.body?.alerts[0].isBelowTarget).toBe(false);
  });

  it('replaces rather than duplicates a second target for the same variant', async () => {
    const c = await signedIn('alerts2@example.in');
    await c.req('POST', '/api/alerts', { variantId, targetPrice: 900 });
    const second = await c.req('POST', '/api/alerts', { variantId, targetPrice: 500 });
    expect(second.body?.updated).toBe(true);
    const list = await c.req('GET', '/api/alerts');
    expect(list.body?.alerts).toHaveLength(1);
    expect(list.body?.alerts[0].targetPriceMinor).toBe(50_000);
  });

  it('rejects an unknown variant instead of storing a dangling alert', async () => {
    const c = await signedIn('alerts3@example.in');
    const res = await c.req('POST', '/api/alerts', { variantId: 'not-a-real-variant', targetPrice: 100 });
    expect(res.status).toBe(400);
  });

  it('cancels an alert', async () => {
    const c = await signedIn('alerts4@example.in');
    const created = await c.req('POST', '/api/alerts', { variantId, targetPrice: 700 });
    const del = await c.req('DELETE', `/api/alerts/${created.body?.id}`);
    expect(del.status).toBe(200);
    const list = await c.req('GET', '/api/alerts');
    expect(list.body?.alerts).toHaveLength(0);
  });
});

describe('the alert engine', () => {
  it('will not run without the sync token', async () => {
    const anon = new Client();
    const res = await anon.req('POST', '/api/alerts/run');
    expect(res.status).toBe(403);
  });

  it('fires only on an alert whose target the current price has beaten', async () => {
    // Clear anything the earlier tests left active, so the counts below are
    // about this test's two alerts and nothing else.
    const { db } = await import('../src/db/index.js');
    await db.prepare('DELETE FROM price_alerts').run();

    // A target far above the live price must fire; one far below must not.
    const high = await signedIn('alerts5@example.in');
    const created = await high.req('POST', '/api/alerts', { variantId, targetPrice: 999_999 });
    expect(created.status).toBe(201);

    const low = await signedIn('alerts6@example.in');
    const below = await low.req('POST', '/api/alerts', { variantId, targetPrice: 1 });
    expect(below.status).toBe(201);

    const run = await new Client().req('POST', '/api/alerts/run');
    // The route itself is token-guarded; call it the way the scheduler does.
    expect(run.status).toBe(403);

    const scheduled = await app.request('/api/alerts/run', {
      method: 'POST',
      headers: { 'x-sync-token': 'test-sync-token' },
    });
    expect(scheduled.status).toBe(200);
    const body = await scheduled.json();
    const emails = body.triggered.map((t: { product: string }) => t.product);
    expect(body.checked).toBe(2);
    expect(body.triggered).toHaveLength(1);
    expect(emails[0]).toBeTruthy();
    // No mail transport is configured in tests, and the response says so rather
    // than pretending the email went out.
    expect(body.triggered[0].emailSent).toBe(false);
    expect(body.triggered[0].note).toBeTruthy();

    // Failed delivery is not silently marked as sent or closed.
    const beforeRetry = await high.req('GET', '/api/alerts');
    expect(beforeRetry.body?.alerts[0].status).toBe('active');
    const notices = await high.req('GET', '/api/me/notifications');
    expect(notices.body?.notifications).toHaveLength(1);
    expect(notices.body?.notifications[0].emailSent).toBe(false);
    expect((await low.req('GET', '/api/me/notifications')).body?.notifications).toHaveLength(0);
    const mailer = await import('../src/lib/mailer.js');
    const mail = vi.spyOn(mailer, 'sendMail').mockResolvedValue({ sent: true, transport: 'brevo' });
    const again = await app.request('/api/alerts/run', { method: 'POST', headers: { 'x-sync-token': 'test-sync-token' } });
    expect((await again.json()).triggered[0].emailSent).toBe(true);
    expect(mail).toHaveBeenCalledTimes(1);
    expect(mail.mock.calls[0]?.[0].body).not.toContain('checked just now');
    const final = await high.req('GET', '/api/me/notifications');
    expect(final.body?.notifications).toHaveLength(1);
    expect(final.body?.notifications[0].emailSent).toBe(true);
    const closed = await app.request('/api/alerts/run', { method: 'POST', headers: { 'x-sync-token': 'test-sync-token' } });
    expect((await closed.json()).triggered).toHaveLength(0);
    expect(mail).toHaveBeenCalledTimes(1);

  });
});

describe('daily maintenance', () => {
  it('requires the token', async () => {
    const res = await app.request('/api/maintenance/daily', { method: 'POST' });
    expect(res.status).toBe(403);
  });

  it('records one snapshot per offer per day and is safe to re-run', async () => {
    const headers = { 'x-sync-token': 'test-sync-token' };
    const first = await app.request('/api/maintenance/daily', { method: 'POST', headers });
    expect(first.status).toBe(200);
    const firstBody = await first.json();
    const snapshots = firstBody.steps.find((s: { step: string }) => s.step === 'snapshots');
    expect(snapshots.ok).toBe(true);

    const second = await app.request('/api/maintenance/daily', { method: 'POST', headers });
    const secondBody = await second.json();
    const again = secondBody.steps.find((s: { step: string }) => s.step === 'snapshots');
    // Second run the same day writes nothing new.
    expect(again.written).toBe(0);
    expect(again.skipped).toBeGreaterThan(0);
  });
});

describe('product detail for the page', () => {
  it('returns offers, history and explicit notes', async () => {
    const c = new Client();
    const res = await c.req('GET', `/api/catalogue/products/${productSlug}`);
    expect(res.status).toBe(200);
    const body = res.body as Record<string, any>;
    const firstVariant = body.variants[0];
    expect(Array.isArray(body.offersByVariant[firstVariant.id])).toBe(true);
    expect(body.offersByVariant[firstVariant.id][0].priceMinor).toBeGreaterThan(0);
    // The origin label is what stops demo data being read as a live quote.
    expect(body.offersByVariant[firstVariant.id][0].dataOrigin).toBeTruthy();
    expect(body.notes.history).toContain('our own record');

    /*
     * HISTORY ARRIVES WITH ITS VERDICT ATTACHED.
     *
     * The page must not be the place that decides whether a 30-day chart is
     * justified: a client that receives raw points will draw them, and two points
     * drawn across a 30-day axis is the exact lie this endpoint exists to prevent.
     */
    const history = body.history[firstVariant.id];
    expect(history.windows['7']).toBeTruthy();
    expect(history.windows['30']).toBeTruthy();
    expect(history.windows['90']).toBeTruthy();
    for (const days of ['7', '30', '90']) {
      const w = history.windows[days];
      expect(typeof w.covered).toBe('boolean');
      expect(typeof w.verdict).toBe('string');
      expect(w.verdict.length).toBeGreaterThan(10);
      expect(w.coverage).toBeLessThanOrEqual(1);
      // A window we cannot cover must never carry a drawable series.
      if (!w.covered) expect(w.verdict).toMatch(/not|Nothing|One observation|Only|needs/i);
    }
    // A brand-new install has hours of records, not months: nothing is covered.
    expect(history.windows['90'].covered).toBe(false);
  });
});

describe('the headline price carries its origin', () => {
  it('labels the product headline and every variant price', async () => {
    const c = new Client();
    const res = await c.req('GET', `/api/catalogue/products/${productSlug}`);
    const body = res.body as Record<string, any>;

    /*
     * The headline is MIN(offer price). A minimum cannot carry a caveat, so the
     * caveat is computed server-side and shipped beside it — otherwise the page is
     * free to print "from ₹271.79" above a list where every row says "illustrative".
     */
    expect(body.productOrigin).toBeTruthy();
    expect(body.productOrigin.origin).toBe('live');
    expect(body.productOrigin.caveat).toBe('');

    for (const v of body.variants) {
      if (v.priceFromMinor === null) continue;
      expect(v.priceOrigin, 'a variant price without an origin is an unlabelled claim').toBeTruthy();
      expect(['live', 'demo', 'mixed', null]).toContain(v.priceOrigin.origin);
    }
  });

  it('keeps the browse list from printing MRP as a "from" price', async () => {
    const c = new Client();
    const res = await c.req('GET', '/api/catalogue/products?limit=5');
    const body = res.body as Record<string, any>;
    expect(Array.isArray(body.products)).toBe(true);
    for (const p of body.products) {
      // Both numbers are present and separately named, so the card can choose.
      expect('priceFromMinor' in p).toBe(true);
      expect('mrpFromMinor' in p).toBe(true);
      expect(p.priceOrigin).toBeTruthy();
    }
  });
});
