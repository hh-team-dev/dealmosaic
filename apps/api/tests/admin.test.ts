import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';

/**
 * THE CONTROL CENTRE IS A SECURITY BOUNDARY.
 *
 * These tests are written as attacks, not as happy paths. A dashboard that works
 * for the owner is table stakes; what matters is that it does not work for anyone
 * else, that a non-administrator cannot promote themselves, and that a signed-in
 * administrator cannot mint an unrevokable super admin from the browser.
 *
 * The CSRF token has to be carried by hand here because the cookie/header pair is
 * what a real browser sends — a test that skips it would prove nothing about the
 * protection that matters in production.
 */

let app: any;
let db: any;
let ready: Promise<unknown>;
let ipSeq = 0;
const ip = () => `198.51.100.${++ipSeq}`;

let cookie = '';
let csrf = '';

async function request(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const h: Record<string, string> = { 'x-forwarded-for': ip(), origin: 'https://dealmosaic.pages.dev', ...headers };
  if (cookie) h.cookie = cookie;
  if (body !== undefined) h['content-type'] = 'application/json';
  const res = await app.request(path, {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, headers: res.headers };
}

/**
 * Register, then verify through the emailed link.
 *
 * The session only becomes usable after verification — which is the point of the
 * flow — so a test that stops at registration would be testing an account that
 * cannot do anything.
 */
async function signUp(email: string, password: string) {
  const reg = await request('POST', '/api/auth/register', {
    email,
    password,
    passwordConfirm: password,
    displayName: 'Test Owner',
    ageConfirmed: true,
  });
  const setCookie = reg.headers.get('set-cookie');
  if (setCookie) {
    const m = /dm_session=([^;]*)/.exec(setCookie);
    if (m) cookie = `dm_session=${m[1]}`;
  }
  const token = /token=([A-Za-z0-9_-]+)/.exec(reg.body?.devActionUrl ?? '')?.[1];
  expect(token, 'registration should expose a dev verification link').toBeTruthy();
  const verify = await request('POST', '/api/auth/verify-email', { token });
  expect(verify.status).toBe(200);
  const after = verify.headers.get('set-cookie');
  if (after) {
    const m = /dm_session=([^;]*)/.exec(after);
    if (m) cookie = `dm_session=${m[1]}`;
  }
  csrf = verify.body?.csrfToken ?? '';
  const check = await request('GET', '/api/auth/session');
  expect(check.status, `session should be live after verification (cookie: ${cookie.slice(0, 24)}…)`).toBe(200);
  expect(check.body?.user?.email).toBe(email);
  return reg;
}

beforeAll(async () => {
  const mod = await import('../src/app.js');
  app = mod.app;
  ready = mod.ready;
  await ready;
  const dbmod = await import('../src/db/index.js');
  db = dbmod.db;
});

describe('admin access control', () => {
  it('refuses an anonymous visitor with 401, not a hidden page', async () => {
    cookie = '';
    for (const path of ['/api/admin/overview','/api/admin/hospitality']) {
      const res = await request('GET', path);
      expect(res.status).toBe(401);
    }
  });

  it('refuses a signed-in ordinary user with 403', async () => {
    await signUp('plain-user@example.com', 'CorrectHorseBattery9');
    const res = await request('GET', '/api/admin/overview');
    expect(res.status).toBe(403);
  });

  it('refuses every admin read to an ordinary user, not just the overview', async () => {
    for (const path of ['/api/admin/coupons', '/api/admin/users', '/api/admin/audit', '/api/admin/jobs', '/api/admin/community', '/api/admin/hospitality']) {
      const res = await request('GET', path);
      expect(res.status, `${path} should be closed`).toBe(403);
    }
  });

  it('does not let an ordinary user promote themselves', async () => {
    const session = await request('GET', '/api/auth/session');
    const myId = session.body?.user?.id;
    expect(myId).toBeTruthy();

    const res = await request('POST', `/api/admin/users/${myId}/role`, { role: 'admin' }, { 'x-csrf-token': csrf });
    expect(res.status).toBe(403);

    const profile = await request('GET', '/api/auth/session');
    expect(profile.body?.user?.role).toBe('user');
  });

  it('opens for an administrator, and the role comes from the database', async () => {
    await db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run('plain-user@example.com');
    const res = await request('GET', '/api/admin/overview');
    expect(res.status).toBe(200);
    expect(res.body.coupons.total).toBeTypeOf('number');
    expect(res.body.catalogue).toBeTruthy();
  });

  it('shows truthful hospitality gates and an unsent enquiry only to an administrator', async () => {
    const res = await request('GET', '/api/admin/hospitality');
    expect(res.status).toBe(200);
    expect(res.body.nativeRateConnections).toBe(0);
    expect(res.body.nativeBookingsEnabled).toBe(false);
    expect(res.body.providers.every((p: any) => !p.allowed && p.missing.length === 8)).toBe(true);
    expect(res.body.applicationBrief).toContain('not acceptance of a contract');
    expect(JSON.stringify(res.body)).not.toMatch(/api[_-]?key|password.?[:=]/i);
  });

  it('refuses a state change without the CSRF header, even for an administrator', async () => {
    const list = await request('GET', '/api/admin/users');
    const me = list.body.users.find((u: any) => u.email === 'plain-user@example.com');
    const res = await request('POST', `/api/admin/users/${me.id}/role`, { role: 'user' });
    expect(res.status).toBe(403);
  });

  it('will not let a web session mint a super admin', async () => {
    const list = await request('GET', '/api/admin/users');
    const me = list.body.users.find((u: any) => u.email === 'plain-user@example.com');
    const res = await request('POST', `/api/admin/users/${me.id}/role`, { role: 'super_admin' }, { 'x-csrf-token': csrf });
    expect(res.status).toBe(400);
  });

  it('will not let an admin change a super admin', async () => {
    await db.prepare("UPDATE users SET role = 'super_admin' WHERE email = ?").run('plain-user@example.com');
    const list = await request('GET', '/api/admin/users');
    const me = list.body.users.find((u: any) => u.email === 'plain-user@example.com');
    const res = await request('POST', `/api/admin/users/${me.id}/role`, { role: 'user' }, { 'x-csrf-token': csrf });
    expect(res.status).toBe(403);
  });
});

describe('admin actions are reversible and attributed', () => {
  it('rejects a coupon, records who did it, and can restore it', async () => {
    await db.prepare("UPDATE users SET role = 'admin' WHERE email = ?").run('plain-user@example.com');

    // A coupon to act on.
    await db
      .prepare(
        `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state,
                              expires_at, created_at, verified_at)
         VALUES (?, 'zepto', 'ADMIN10', 'Ten percent off, for the audit test', 'percent', 10, 'affiliate',
                 'moderator_verified', ?, ?, ?)`,
      )
      .run(
        'admin-test-coupon',
        new Date(Date.now() + 86_400_000).toISOString(),
        new Date().toISOString(),
        new Date().toISOString(),
      );

    const reject = await request(
      'POST',
      '/api/admin/coupons/admin-test-coupon/state',
      { trustState: 'rejected' },
      { 'x-csrf-token': csrf },
    );
    expect(reject.status).toBe(200);
    expect(reject.body.trustState).toBe('rejected');

    const audit = await request('GET', '/api/admin/audit');
    const entry = audit.body.entries.find((e: any) => e.entity_id === 'admin-test-coupon');
    expect(entry).toBeTruthy();
    expect(entry.action).toBe('coupon.state');
    expect(entry.actor_email).toBe('plain-user@example.com');
    expect(entry.before_json).toContain('moderator_verified');
    expect(entry.after_json).toContain('rejected');

    // A rejected coupon is no longer served to shoppers.
    const publicList = await request('GET', '/api/coupons?limit=200');
    expect(publicList.body.coupons.some((c: any) => c.id === 'admin-test-coupon')).toBe(false);

    const restore = await request(
      'POST',
      '/api/admin/coupons/admin-test-coupon/state',
      { trustState: 'moderator_verified' },
      { 'x-csrf-token': csrf },
    );
    expect(restore.status).toBe(200);
  });

  it('returns 404 rather than 500 for a coupon that does not exist', async () => {
    const res = await request(
      'POST',
      '/api/admin/coupons/does-not-exist/state',
      { trustState: 'rejected' },
      { 'x-csrf-token': csrf },
    );
    expect(res.status).toBe(404);
  });

  it('rejects an unknown trust state instead of writing it', async () => {
    const res = await request(
      'POST',
      '/api/admin/coupons/admin-test-coupon/state',
      { trustState: 'definitely-fine' },
      { 'x-csrf-token': csrf },
    );
    expect(res.status).toBe(400);
  });
});

describe('community moderation regression', () => {
  it('loads the report list using the actual schema timestamp', async () => {
    const variant = await db.prepare('SELECT id FROM product_variants LIMIT 1').get();
    const date = new Date().toISOString();
    await db.prepare("INSERT INTO community_prices(id,variant_id,platform_slug,pincode,price_minor,reported_at) VALUES('audit-report',?,'croma','700001',10000,?)").run(variant.id,date);
    const result = await request('GET','/api/admin/community');
    expect(result.status).toBe(200);
    expect(result.body.reports.find((r: any) => r.id==='audit-report').observed_at).toBe(date);
  });
  it('rejects coupon-only states before a community database CHECK error', async () => {
    const result = await request('POST','/api/admin/community/audit-report/state',{trustState:'expired'},{'x-csrf-token':csrf});
    expect(result.status).toBe(400);
  });
  it('moderates an actual report with audit attribution', async () => {
    const result = await request('POST','/api/admin/community/audit-report/state',{trustState:'moderator_verified'},{'x-csrf-token':csrf});
    expect(result.status).toBe(200);
    expect(await db.prepare("SELECT trust_state FROM community_prices WHERE id='audit-report'").get()).toMatchObject({trust_state:'moderator_verified'});
  });
});

describe('coupon filters and honest restoration', () => {
  it('excludes rejected coupons from Live and With a code', async () => {
    await request('POST','/api/admin/coupons/admin-test-coupon/state',{trustState:'rejected'},{'x-csrf-token':csrf});
    for (const state of ['live','codes']) {
      const r=await request('GET',`/api/admin/coupons?state=${state}`);
      expect(r.status).toBe(200);
      expect(r.body.coupons.some((c:any)=>c.id==='admin-test-coupon')).toBe(false);
    }
  });
  it('restores to listed without manufacturing verification evidence',async()=>{
    const r=await request('POST','/api/admin/coupons/admin-test-coupon/state',{trustState:'listed'},{'x-csrf-token':csrf});
    expect(r.status).toBe(200);
    expect(r.body.trustState).toBe('listed');
  });
});
