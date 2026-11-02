import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';

let app: any;
let db: typeof import('../src/db/index.js').db;
let newId: typeof import('../src/db/index.js').newId;
let nowIso: typeof import('../src/db/index.js').nowIso;

/**
 * THE COUNTER THAT COULD BE FORGED.
 *
 * `coupons.success_count` used to be incremented by an anonymous POST. Anyone
 * could raise it with a loop, and the interface printed the number as evidence
 * that a code works. These tests are written as the attack: report without an
 * account, report twice from one account, report without a CSRF header — and then
 * check that a genuine report still does the one thing reports are for.
 */

let cookie = '';
let csrf = '';

async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await app.request(path, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

async function signUp(email: string) {
  const password = 'CorrectHorseBattery9';
  const reg = await request('POST', '/api/auth/register', {
    email,
    password,
    passwordConfirm: password,
    displayName: 'Report Tester',
    ageConfirmed: true,
  });
  const token = /token=([A-Za-z0-9_-]+)/.exec(reg.body?.devActionUrl ?? '')?.[1];
  expect(token, 'registration should expose a dev verification link').toBeTruthy();
  const verify = await request('POST', '/api/auth/verify-email', { token });
  expect(verify.status).toBe(200);
  const setCookie = verify.headers.get('set-cookie') ?? '';
  const m = /dm_session=([^;]*)/.exec(setCookie);
  if (m) cookie = `dm_session=${m[1]}`;
  csrf = verify.body?.csrfToken ?? '';
  return password;
}

let couponId = '';

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  ({ db, newId, nowIso } = await import('../src/db/index.js'));

  const stamp = nowIso();
  couponId = newId();
  await db
    .prepare(
      `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state,
                            success_count, fail_count, created_at, verified_at, stated_percent)
       VALUES (?, 'zepto', 'REPORT10', 'Ten percent off', 'percent', 10, 'affiliate', 'listed', 0, 0, ?, ?, 10)`,
    )
    .run(couponId, stamp, stamp);

  await signUp('reporter@example.com');
});

describe('reporting a coupon outcome', () => {
  it('refuses an anonymous report', async () => {
    const saved = cookie;
    cookie = '';
    const res = await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true });
    cookie = saved;
    expect(res.status).toBe(401);
  });

  it('refuses a report with no CSRF header', async () => {
    const res = await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true }, { 'x-csrf-token': '' });
    expect(res.status).toBe(403);
  });

  it('records one report per account, and a second answer replaces the first', async () => {
    const first = await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true }, { 'x-csrf-token': csrf });
    expect(first.status).toBe(200);
    expect(first.body.successCount).toBe(1);
    expect(first.body.failCount).toBe(0);

    // Changing your mind is allowed; counting you twice is not.
    const second = await request('POST', `/api/coupons/${couponId}/outcome`, { worked: false }, { 'x-csrf-token': csrf });
    expect(second.status).toBe(200);
    expect(second.body.successCount).toBe(0);
    expect(second.body.failCount).toBe(1);

    const rows = (await db.prepare('SELECT COUNT(*) AS n FROM coupon_reports WHERE coupon_id = ?').get(couponId)) as {
      n: number;
    };
    expect(rows.n).toBe(1);
  });

  it('counts the same account once even when it reports repeatedly', async () => {
    for (let i = 0; i < 5; i++) {
      await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true }, { 'x-csrf-token': csrf });
    }
    const res = await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true }, { 'x-csrf-token': csrf });
    expect(res.body.successCount).toBe(1);
    expect(res.body.failCount).toBe(0);
  });

  it('promotes a code only after three separate accounts agree', async () => {
    const state = async () =>
      ((await db.prepare('SELECT trust_state FROM coupons WHERE id = ?').get(couponId)) as { trust_state: string })
        .trust_state;

    const other = cookie;
    const otherCsrf = csrf;
    // The first account already reported "worked".
    for (const email of ['second@example.com', 'third@example.com']) {
      cookie = '';
      await signUp(email);
      await request('POST', `/api/coupons/${couponId}/outcome`, { worked: true }, { 'x-csrf-token': csrf });
    }
    cookie = other;
    csrf = otherCsrf;

    expect(await state()).toBe('community_verified');

    const listed = await request('GET', `/api/coupons?q=REPORT10`);
    const found = (listed.body?.coupons ?? []).find((c: { id: string }) => c.id === couponId);
    expect(found, 'a confirmed code must still be listed').toBeTruthy();
    expect(found.confidence.level).toBe('community');
  });

  it('404s for an unknown coupon', async () => {
    const res = await request(
      'POST',
      `/api/coupons/${newId()}/outcome`,
      { worked: true },
      { 'x-csrf-token': csrf },
    );
    expect(res.status).toBe(404);
  });
});

describe('the feed sync does not undo a human decision', () => {
  it('keeps a rejected coupon rejected through a re-sync', async () => {
    const { syncAffiliateOffers } = await import('../src/services/affiliate-sync.js');
    const stamp = nowIso();
    const id = newId();

    await db
      .prepare(
        `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state,
                              success_count, fail_count, created_at, verified_at, external_id)
         VALUES (?, 'zepto', 'REJECTED10', 'Rejected by a moderator', 'percent', 10, 'affiliate', 'rejected',
                 0, 0, ?, ?, 'feed-rejected-1')`,
      )
      .run(id, stamp, stamp);

    // A re-sync that mentions the same external id must not resurrect it.
    await syncAffiliateOffers(1, async () => ({
      data: [
        {
          id: 'feed-rejected-1',
          campaign_id: 1,
          campaign_name: 'Zepto',
          title: 'Rejected by a moderator',
          description: null,
          coupon_code: 'REJECTED10',
          coupon_type: 'percent',
          coupon_value: 10,
          max_discount: null,
          min_order_value: null,
          terms: null,
          tracking_url: 'https://linksredirect.com/?cid=1',
          start_date: null,
          end_date: null,
          categories: null,
          primary_category: null,
          offer_type: 'coupon',
          stated_price: null,
          stated_price_kind: null,
          stated_percent: 10,
          stated_percent_cap: false,
          mentions_bank: false,
          deal_group: 'grocery',
        },
      ],
      meta: { total: 1, total_pages: 1 },
    } as any));

    const row = (await db.prepare('SELECT trust_state FROM coupons WHERE id = ?').get(id)) as { trust_state: string };
    expect(row.trust_state, 'a moderator’s rejection must survive the nightly sync').toBe('rejected');
  });
});
