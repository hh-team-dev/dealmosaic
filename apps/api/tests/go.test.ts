import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';

let app: any;
let withSubid: typeof import('../src/routes/go.js').withSubid;
let dbModule: typeof import('../src/db/index.js');
let ipSeq = 0;
const ip = () => `198.51.100.${++ipSeq}`;

/**
 * THE MONEY PATH.
 *
 * These tests exist because everything else on this site is a display, and this
 * is the only part that converts a shopper's tap into something a network can
 * attribute and pay for. If the sub-id stops being unique, or stops surviving the
 * query string, the site keeps working perfectly and quietly earns nothing — the
 * failure mode with no error message.
 */
beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  ({ withSubid } = await import('../src/routes/go.js'));
  dbModule = await import('../src/db/index.js');
});

/** Insert a coupon row the way the feed sync would, then return its id. */
async function seedCoupon(overrides: Partial<Record<string, unknown>> = {}) {
  const id = `c-${Math.random().toString(36).slice(2, 10)}`;
  await dbModule.db
    .prepare(
      `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state, tracking_url, created_at)
       VALUES (?, ?, ?, ?, 'percent', 10, 'affiliate', ?, ?, ?)`,
    )
    .run(
      id,
      (overrides.platform_slug as string) ?? 'croma',
      (overrides.code as string) ?? 'SAVE10',
      (overrides.title as string) ?? '10% off electronics',
      (overrides.trust_state as string) ?? 'listed',
      // `??` would turn an explicit null back into the default, which is exactly
      // the case the no-link test needs to exercise.
      'tracking_url' in overrides
        ? (overrides.tracking_url as string | null)
        : 'https://linksredirect.com/?cid=123&url=https%3A%2F%2Fcroma.com',
      new Date().toISOString(),
    );
  return id;
}

async function click(id: string, src = 'deals') {
  return app.request(`/api/go/${id}?src=${src}`, {
    headers: { 'x-forwarded-for': ip(), 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' },
    redirect: 'manual',
  });
}

describe('withSubid', () => {
  it('adds the sub-id to a link that already has a query string', () => {
    const out = withSubid('https://linksredirect.com/?cid=123&url=https%3A%2F%2Fcroma.com', 'dmabc');
    expect(out).toContain('cid=123');
    expect(out).toContain('subid=dmabc');
    // The merchant's own URL must survive intact — a mangled destination is a lost sale.
    expect(out).toContain('url=https%3A%2F%2Fcroma.com');
  });

  it('handles a bare URL and a URL with a fragment', () => {
    expect(withSubid('https://example.com', 'dm1')).toBe('https://example.com?subid=dm1');
    expect(withSubid('https://example.com/p?x=1#top', 'dm2')).toBe('https://example.com/p?x=1&subid=dm2#top');
  });

  it('never double-encodes an existing subid', () => {
    const out = withSubid('https://example.com/?subid=old', 'new');
    expect(out).toBe('https://example.com/?subid=new');
    expect(out.match(/subid=/g)).toHaveLength(1);
  });
});

describe('GET /api/go/:couponId', () => {
  it('redirects to the merchant and records the click', async () => {
    const id = await seedCoupon();
    const res = await click(id);
    expect(res.status).toBe(302);
    const location = res.headers.get('location') ?? '';
    expect(location.startsWith('https://linksredirect.com/')).toBe(true);
    expect(location).toMatch(/subid=dm[0-9a-z]+/);

    const row = (await dbModule.db
      .prepare('SELECT COUNT(*) AS n FROM outbound_clicks WHERE coupon_id = ?')
      .get(id)) as { n: number };
    expect(row.n).toBe(1);

    const stored = (await dbModule.db
      .prepare('SELECT subid, device, source FROM outbound_clicks WHERE coupon_id = ?')
      .get(id)) as { subid: string; device: string; source: string };
    expect(stored.device).toBe('phone');
    expect(stored.source).toBe('deals');
    // The sub-id in the row is the one the network will report against.
    expect(location).toContain(`subid=${stored.subid}`);
  });

  it('mints a different sub-id for every click', async () => {
    const id = await seedCoupon();
    const a = (await click(id)).headers.get('location') ?? '';
    const b = (await click(id)).headers.get('location') ?? '';
    expect(a).not.toBe(b);
  });

  it('never sends a shopper to an expired or rejected offer', async () => {
    const expired = await seedCoupon({ trust_state: 'expired' });
    const rejected = await seedCoupon({ trust_state: 'rejected' });
    for (const id of [expired, rejected]) {
      const res = await click(id);
      expect(res.status).toBe(410);
      const row = (await dbModule.db
        .prepare('SELECT COUNT(*) AS n FROM outbound_clicks WHERE coupon_id = ?')
        .get(id)) as { n: number };
      expect(row.n).toBe(0);
    }
  });

  it('says so instead of inventing a destination when there is no tracked link', async () => {
    const id = await seedCoupon({ tracking_url: null });
    const res = await click(id);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('no_link');
  });

  it('404s on an unknown id without writing a row', async () => {
    const before = (await dbModule.db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get()) as { n: number };
    const res = await click('does-not-exist');
    expect(res.status).toBe(404);
    const after = (await dbModule.db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks').get()) as { n: number };
    expect(after.n).toBe(before.n);
  });

  it('is not cached by the browser or a proxy', async () => {
    const id = await seedCoupon();
    expect((await click(id)).headers.get('cache-control')).toBe('no-store');
  });
});


describe('redirect safety at click time', () => {
  it.each(['2000-01-01T00:00:00.000Z', 'not-a-date'])('blocks elapsed or invalid expiry %s even while the feed still says listed', async (expiry) => {
    const id = await seedCoupon();
    await dbModule.db.prepare('UPDATE coupons SET expires_at=? WHERE id=?').run(expiry, id);
    expect((await click(id)).status).toBe(410);
    expect(await dbModule.db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks WHERE coupon_id=?').get(id)).toMatchObject({ n: 0 });
  });
  it('allows a valid future expiry', async () => {
    const id = await seedCoupon();
    await dbModule.db.prepare('UPDATE coupons SET expires_at=? WHERE id=?').run(new Date(Date.now()+86400000).toISOString(), id);
    expect((await click(id)).status).toBe(302);
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', 'file:///etc/passwd', '//example.com', 'https://user:pass@example.com', 'broken link'])('blocks unsafe destination %s without recording a click', async (tracking_url) => {
    const id = await seedCoupon({ tracking_url });
    expect((await click(id)).status).toBe(410);
    expect(await dbModule.db.prepare('SELECT COUNT(*) AS n FROM outbound_clicks WHERE coupon_id=?').get(id)).toMatchObject({ n: 0 });
  });
});
