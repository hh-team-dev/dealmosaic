import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';

let app: any;
let ipSeq = 0;
const ip = () => `203.0.113.${++ipSeq}`;

async function req(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { 'x-forwarded-for': ip(), ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
});

const aCoupon = {
  platformSlug: 'zepto',
  code: 'TESTONLY10',
  title: '10% off on first grocery order',
  discountType: 'percent',
  discountValue: 10,
  minOrder: 199,
};

describe('coupons', () => {
  it('serves an empty, honest list rather than inventing codes', async () => {
    const res = await req('GET', '/api/coupons');
    expect(res.status).toBe(200);
    expect(res.body.coupons).toEqual([]);
    expect(res.body.emptyMessage).toMatch(/No verified discount codes/i);
  });

  it('states that cashback is never subtracted from a payable total', async () => {
    const res = await req('GET', '/api/coupons');
    expect(res.body.rules.cashbackIsNotADiscount).toMatch(/never subtracted/i);
  });

  it('accepts a community submission but keeps it hidden until corroborated', async () => {
    const created = await req('POST', '/api/coupons', aCoupon);
    expect(created.status).toBe(201);
    expect(created.body.message).toMatch(/second person confirms/i);

    const list = await req('GET', '/api/coupons');
    expect(list.body.coupons).toEqual([]);
  });

  it('rejects a percentage above 100', async () => {
    const res = await req('POST', '/api/coupons', { ...aCoupon, discountValue: 150 });
    expect(res.status).toBe(400);
  });

  it('rejects a submission with no title', async () => {
    const res = await req('POST', '/api/coupons', { ...aCoupon, title: '' });
    expect(res.status).toBe(400);
  });

  it('marks cashback as not reducing the payable price', async () => {
    const { db, newId, nowIso } = await import('../src/db/index.js');
    await db
      .prepare(
        `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state, created_at)
         VALUES (?, 'zepto', 'CASH5', 'Rs 50 cashback', 'cashback', 50, 'moderator', 'moderator_verified', ?)`,
      )
      .run(newId(), nowIso());

    const res = await req('GET', '/api/coupons?platform=zepto');
    expect(res.status).toBe(200);
    const cash = res.body.coupons.find((c: any) => c.code === 'CASH5');
    expect(cash).toBeTruthy();
    expect(cash.reducesPayablePrice).toBe(false);
  });

  it('retires a coupon automatically once it mostly fails', async () => {
    const { db, newId, nowIso } = await import('../src/db/index.js');
    const id = newId();
    await db
      .prepare(
        `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state, created_at)
         VALUES (?, 'zepto', 'DYING', 'Doomed code', 'flat', 100, 'moderator', 'moderator_verified', ?)`,
      )
      .run(id, nowIso());

    for (let i = 0; i < 5; i++) {
      await req('POST', `/api/coupons/${id}/outcome`, { worked: false });
    }
    const state = (await db.prepare('SELECT trust_state FROM coupons WHERE id = ?').get(id)) as any;
    expect(state.trust_state).toBe('expired');

    const list = await req('GET', '/api/coupons?platform=zepto');
    expect(list.body.coupons.some((c: any) => c.id === id)).toBe(false);
  });

  it('never returns an expired coupon', async () => {
    const { db, newId, nowIso } = await import('../src/db/index.js');
    const id = newId();
    await db
      .prepare(
        `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state, expires_at, created_at)
         VALUES (?, 'bigbasket', 'GONE', 'Expired offer', 'flat', 100, 'moderator', 'moderator_verified', '2020-01-01T00:00:00.000Z', ?)`,
      )
      .run(id, nowIso());

    const list = await req('GET', '/api/coupons?platform=bigbasket');
    expect(list.body.coupons.some((c: any) => c.id === id)).toBe(false);
  });
});

describe('public search', () => {
  it('answers a signed-out visitor instead of demanding an account', async () => {
    const res = await req('POST', '/api/search', { query: 'milk' });
    expect(res.status).toBe(200);
    expect(['needs_selection', 'comparison', 'no_results']).toContain(res.body.kind);
  });

  it('rejects an empty query with a readable message', async () => {
    const res = await req('POST', '/api/search', { query: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBeTruthy();
  });
});
