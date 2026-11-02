import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';

type Json = Record<string, any> | null;

let clientSeq = 0;

class Client {
  cookie: string | null = null;
  csrf: string | null = null;
  app: any;
  /** Each test client gets its own source IP so the (correct) credential rate
   *  limiter does not fire across unrelated tests. */
  ip = `198.51.100.${++clientSeq}`;

  constructor(app: any) {
    this.app = app;
  }

  async req(
    method: string,
    path: string,
    body?: unknown,
    opts: { ip?: string; headers?: Record<string, string> } = {},
  ): Promise<{ status: number; body: Json }> {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.cookie) headers['cookie'] = this.cookie;
    if (this.csrf && method !== 'GET') headers['x-csrf-token'] = this.csrf;
    headers['x-forwarded-for'] = opts.ip ?? this.ip;

    const res = await this.app.request(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const m = /dm_session=([^;]*)/.exec(setCookie);
      if (m) this.cookie = m[1] ? `dm_session=${m[1]}` : null;
    }
    let parsed: Json = null;
    try {
      parsed = (await res.json()) as Json;
    } catch {
      parsed = null;
    }
    return { status: res.status, body: parsed };
  }
}

let app: any;
const password = 'MosaicPrism#2026';

const user = {
  displayName: 'Ananya Sharma',
  email: 'ananya@example.in',
  password,
  passwordConfirm: password,
  ageConfirmed: true,
};

function tokenFromUrl(url: string | undefined): string {
  if (!url) throw new Error('expected a dev action url');
  return new URL(url, 'http://localhost').searchParams.get('token')!;
}

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
});

async function registerAndVerify(client: Client, overrides: Partial<typeof user> = {}) {
  const reg = await client.req('POST', '/api/auth/register', { ...user, ...overrides });
  expect(reg.status).toBe(201);
  const token = tokenFromUrl(reg.body?.devActionUrl);
  const verify = await client.req('POST', '/api/auth/verify-email', { token });
  expect(verify.status).toBe(200);
  client.csrf = verify.body?.csrfToken ?? null;
  return { reg, verify };
}

describe('health & reference data', () => {
  it('reports a healthy service pinned to India', async () => {
    const c = new Client(app);
    const res = await c.req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body?.markets).toEqual(['IN']);
  });

  it('marks every non-India market disabled with a reason', async () => {
    const c = new Client(app);
    const res = await c.req('GET', '/api/meta/countries');
    expect(res.body.active).toEqual(['IN']);
    const disabled = res.body.countries.filter((x: any) => !x.enabled);
    expect(disabled.length).toBeGreaterThan(0);
    for (const country of disabled) expect(country.note).toBeTruthy();
  });

  it('publishes the quick-commerce platform registry with honest statuses', async () => {
    const c = new Client(app);
    const res = await c.req('GET', '/api/meta/platforms');
    const slugs = res.body.platforms.map((p: any) => p.slug);
    expect(slugs).toContain('blinkit');
    expect(slugs).toContain('zepto');
    expect(slugs).toContain('instamart');
    expect(res.body.platforms.every((p: any) => p.status !== 'live')).toBe(true);
    expect(res.body.disclosure).toContain('never invented');
  });
});

describe('registration and email verification', () => {
  it('registers, then verifies via the emailed link and is signed in', async () => {
    const c = new Client(app);
    const { verify } = await registerAndVerify(c);
    expect(verify.body?.user.emailVerified).toBe(true);
    expect(c.cookie).toBeTruthy();

    const session = await c.req('GET', '/api/auth/session');
    expect(session.body?.user?.email).toBe('ananya@example.in');
    expect(session.body?.preferences?.countryCode).toBe('IN');
    expect(session.body?.preferences?.displayCurrency).toBe('INR');
  });

  it('rejects weak passwords with field-level messages', async () => {
    const c = new Client(app);
    const res = await c.req('POST', '/api/auth/register', {
      ...user,
      email: 'weak@example.in',
      password: 'short',
      passwordConfirm: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body?.error.fields.password).toContain('at least');
  });

  it('refuses a duplicate email', async () => {
    const c = new Client(app);
    const res = await c.req('POST', '/api/auth/register', user);
    expect(res.status).toBe(409);
  });

  it('does not allow login before verification, and re-sends the link', async () => {
    const c = new Client(app);
    const reg = await c.req('POST', '/api/auth/register', {
      ...user,
      email: 'unverified@example.in',
      displayName: 'Unverified User',
    });
    expect(reg.status).toBe(201);

    const login = await c.req('POST', '/api/auth/login', {
      email: 'unverified@example.in',
      password,
    });
    expect(login.status).toBe(403);
    expect(login.body?.error.code).toBe('email_unverified');
    expect(login.body?.devActionUrl).toContain('verify-email');
  });

  it('rejects a replayed verification token', async () => {
    const c = new Client(app);
    const reg = await c.req('POST', '/api/auth/register', {
      ...user,
      email: 'replay@example.in',
      displayName: 'Replay User',
    });
    const token = tokenFromUrl(reg.body?.devActionUrl);
    const first = await c.req('POST', '/api/auth/verify-email', { token });
    expect(first.status).toBe(200);
    const second = await c.req('POST', '/api/auth/verify-email', { token });
    expect(second.status).toBe(400);
  });
});

describe('login, logout, session lifecycle', () => {
  it('logs in with correct credentials and rejects wrong ones', async () => {
    const c = new Client(app);
    const bad = await c.req('POST', '/api/auth/login', {
      email: 'ananya@example.in',
      password: 'WrongPassword#1',
    });
    expect(bad.status).toBe(401);
    expect(bad.body?.error.message).toContain('incorrect');

    const good = await c.req('POST', '/api/auth/login', {
      email: 'ANANYA@example.in',
      password,
    });
    expect(good.status).toBe(200);
    expect(good.body?.csrfToken).toBeTruthy();
  });

  it('revokes the session server-side on logout', async () => {
    const c = new Client(app);
    const login = await c.req('POST', '/api/auth/login', {
      email: 'ananya@example.in',
      password,
    });
    c.csrf = login.body.csrfToken;
    const before = await c.req('GET', '/api/auth/session');
    expect(before.body?.user).toBeTruthy();

    const out = await c.req('POST', '/api/auth/logout');
    expect(out.status).toBe(200);

    // Replaying the old cookie must not work.
    const stale = new Client(app);
    stale.cookie = c.cookie;
    const after = await stale.req('GET', '/api/auth/session');
    expect(after.body?.user).toBeNull();
  });

  it('blocks state-changing requests without a CSRF token', async () => {
    const c = new Client(app);
    const login = await c.req('POST', '/api/auth/login', {
      email: 'ananya@example.in',
      password,
    });
    expect(login.status, `login failed: ${JSON.stringify(login.body)}`).toBe(200);
    c.csrf = null; // simulate a cross-site request
    const res = await c.req('PATCH', '/api/me', { displayName: 'Hacked' });
    // 403, not 401: the session is real, the request is refused. The distinction
    // matters to the client — a 401 sends a signed-in person back to a login form.
    expect(res.status).toBe(403);

    c.csrf = 'not-the-right-token';
    const res2 = await c.req('PATCH', '/api/me', { displayName: 'Hacked' });
    expect(res2.status).toBe(403);

    c.csrf = login.body.csrfToken;
    const ok = await c.req('PATCH', '/api/me', { displayName: 'Ananya S.' });
    expect(ok.status).toBe(200);
    expect(ok.body?.user.displayName).toBe('Ananya S.');
  });
});

describe('password reset', () => {
  it('resets the password, invalidates old sessions and kills the old password', async () => {
    const c = new Client(app);
    const login = await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password });
    expect(login.status).toBe(200);
    c.csrf = login.body.csrfToken;

    const forgot = await c.req('POST', '/api/auth/forgot-password', { email: 'ananya@example.in' });
    expect(forgot.status).toBe(200);
    const token = tokenFromUrl(forgot.body?.devActionUrl);

    const newPassword = 'PrismTessera#2026';
    const reset = await c.req('POST', '/api/auth/reset-password', {
      token,
      password: newPassword,
      passwordConfirm: newPassword,
    });
    expect(reset.status).toBe(200);

    const stale = await c.req('GET', '/api/auth/session');
    expect(stale.body?.user).toBeNull();

    const oldLogin = await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password });
    expect(oldLogin.status).toBe(401);

    const newLogin = await c.req('POST', '/api/auth/login', {
      email: 'ananya@example.in',
      password: newPassword,
    });
    expect(newLogin.status).toBe(200);
  });

  it('gives the same response for an unknown email (no enumeration)', async () => {
    const c = new Client(app);
    const res = await c.req('POST', '/api/auth/forgot-password', { email: 'nobody@example.in' });
    expect(res.status).toBe(200);
    expect(res.body?.message).toContain('If that address has an account');
  });
});

describe('search access', () => {
  it('answers anonymous callers — search is the product, not a perk of signing up', async () => {
    // This used to assert 401. The gate was removed deliberately: a visitor who
    // cannot see a single comparison cannot judge the site, and a crawler that
    // is refused cannot index one. Accounts now gate history and alerts only.
    const c = new Client(app);
    const res = await c.req('POST', '/api/search', { query: 'iphone 16' });
    expect(res.status).toBe(200);
    expect(['needs_selection', 'comparison', 'no_results']).toContain(res.body?.kind);
  });

  it('still records history only for signed-in users', async () => {
    const c = new Client(app);
    await c.req('POST', '/api/search', { query: 'iphone 16' });
    const me = await c.req('GET', '/api/me/history');
    expect(me.status).toBe(401);
  });

  it('asks which variant before comparing, then returns at most three ranked offers', async () => {
    const c = new Client(app);
    const login = await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    expect(login.status).toBe(200);

    // "iPhone 16" exists in 128 GB and 256 GB. A comparison site that silently
    // picks one is showing the wrong price half the time, so we must be asked.
    const first = await c.req('POST', '/api/search', { query: 'Apple iPhone 16' });
    expect(first.status).toBe(200);
    expect(first.body?.kind).toBe('needs_selection');
    expect(first.body.candidates.length).toBeGreaterThan(1);

    const chosen = first.body.candidates[0];
    const res = await c.req('POST', '/api/search', { query: 'Apple iPhone 16', variantId: chosen.variantId });
    expect(res.status).toBe(200);
    expect(res.body?.kind).toBe('comparison');
    expect(res.body.offers.length).toBeGreaterThan(0);
    expect(res.body.offers.length).toBeLessThanOrEqual(3);
    expect(res.body.offers[0].rank).toBe(1);
    // Every returned offer must be labelled as demonstration data until a real feed exists.
    expect(res.body.dataMode).toBe('demo');
    expect(res.body.disclaimers.join(' ')).toContain('DEMONSTRATION DATA');
  });

  it('never puts an unverifiable total first when a verified one exists', async () => {
    const c = new Client(app);
    await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    const sel = await c.req('POST', '/api/search', { query: 'Samsung Galaxy S25 Ultra 512GB' });
    const res = await c.req('POST', '/api/search', { query: 'Samsung Galaxy S25 Ultra 512GB' });
    expect(sel.status).toBe(200);
    expect(res.status).toBe(200);
    expect(res.body.rankingBasis).toBe('verified_total');
    const anyVerified = res.body.offers.some((o: any) => o.price.verificationState === 'complete');
    if (anyVerified) {
      expect(res.body.offers[0].rank).toBe(1);
      expect(res.body.offers[0].price.verificationState).toBe('complete');
    }
  });

  it('downgrades the claim for quick commerce where delivery is charged by cart value', async () => {
    const c = new Client(app);
    await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    const sel = await c.req('POST', '/api/search', { query: "Lay's Classic Salted" });
    const variantId = sel.body.candidates[0].variantId;
    const res = await c.req('POST', '/api/search', { query: "Lay's 52 g", variantId });
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('comparison');
    // Dark stores publish no per-item delivery fee, so no total may be called complete.
    expect(res.body.rankingBasis).toBe('verified_portion_only');
    expect(res.body.podiumNote).toMatch(/delivery/i);
    for (const offer of res.body.offers) {
      expect(offer.price.verificationState).not.toBe('complete');
      expect(offer.price.missing.concat(offer.price.conditional).join(' ')).toMatch(/Delivery/i);
    }
  });

  it('normalises grocery prices to a unit price instead of comparing pack sizes blindly', async () => {
    const c = new Client(app);
    await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    const sel = await c.req('POST', '/api/search', { query: "Lay's Classic Salted" });
    const big = sel.body.candidates.find((v: any) => /180/.test(v.label));
    const res = await c.req('POST', '/api/search', { query: "Lay's 180 g", variantId: big.variantId });
    expect(res.body.unitPrice).toBeTruthy();
    expect(res.body.unitPrice.unit).toBe('g');
    expect(res.body.unitPrice.per100).toBeGreaterThan(0);
  });
});

describe('preferences', () => {
  it('accepts an Indian PIN and rejects a disabled market', async () => {
    const c = new Client(app);
    const login = await c.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    c.csrf = login.body.csrfToken;

    const ok = await c.req('PATCH', '/api/me/preferences', { pincode: '712201', displayCurrency: 'INR' });
    expect(ok.status).toBe(200);
    expect(ok.body?.preferences.pincode).toBe('712201');

    const badPin = await c.req('PATCH', '/api/me/preferences', { pincode: '12345' });
    expect(badPin.status).toBe(400);

    const us = await c.req('PATCH', '/api/me/preferences', { countryCode: 'US' });
    expect(us.status).toBe(400);
    expect(us.body?.error.fields.countryCode).toContain('not enabled yet');
  });
});

describe('rate limiting', () => {
  it('blocks credential stuffing after 10 attempts from one IP', async () => {
    const c = new Client(app);
    const ip = '203.0.113.77';
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await c.req('POST', '/api/auth/login', { email: 'x@example.in', password: 'nope-nope-1A' }, { ip });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });
});

describe('privacy: export and account deletion', () => {
  it('exports the account, then hard-deletes it and everything it owned', async () => {
    const c = new Client(app);
    const reg = await c.req('POST', '/api/auth/register', {
      ...user,
      email: 'delete-me@example.in',
      displayName: 'Delete Me',
    });
    const token = tokenFromUrl(reg.body?.devActionUrl);
    const verify = await c.req('POST', '/api/auth/verify-email', { token });
    c.csrf = verify.body?.csrfToken;

    const exported = await c.req('GET', '/api/me/export');
    expect(exported.status).toBe(200);
    expect(exported.body?.account.email).toBe('delete-me@example.in');

    const wrong = await c.req('DELETE', '/api/me', { password: 'wrong-pass-1A', confirmation: 'DELETE' });
    expect(wrong.status).toBe(400);

    const noConfirm = await c.req('DELETE', '/api/me', { password, confirmation: 'delete' });
    expect(noConfirm.status).toBe(400);

    const deleted = await c.req('DELETE', '/api/me', { password, confirmation: 'DELETE' });
    expect(deleted.status).toBe(200);

    const after = await c.req('GET', '/api/auth/session');
    expect(after.body?.user).toBeNull();

    const login = await c.req('POST', '/api/auth/login', { email: 'delete-me@example.in', password });
    expect(login.status).toBe(401);
  });

  it('keeps one user’s session out of another user’s data', async () => {
    const a = new Client(app);
    const b = new Client(app);
    const loginA = await a.req('POST', '/api/auth/login', { email: 'ananya@example.in', password: 'PrismTessera#2026' });
    a.csrf = loginA.body.csrfToken;
    await a.req('PATCH', '/api/me/preferences', { pincode: '700001' });

    const regB = await b.req('POST', '/api/auth/register', {
      ...user,
      email: 'second@example.in',
      displayName: 'Second Person',
    });
    const verifyB = await b.req('POST', '/api/auth/verify-email', {
      token: tokenFromUrl(regB.body?.devActionUrl),
    });
    b.csrf = verifyB.body?.csrfToken;

    const meB = await b.req('GET', '/api/me');
    expect(meB.body?.user.email).toBe('second@example.in');
    expect(meB.body?.preferences.pincode).toBeNull(); // not A's pincode
  });
});

describe('development outbox', () => {
  it('exposes queued verification mail in development only', async () => {
    const c = new Client(app);
    const res = await c.req('GET', '/api/dev/outbox?email=ananya@example.in');
    expect(res.status).toBe(200);
    expect(res.body?.dev).toBe(true);
    expect(Array.isArray(res.body?.messages)).toBe(true);
  });
});
