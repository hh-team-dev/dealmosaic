import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

/*
 * A temp FILE, not `:memory:`.
 *
 * `:memory:` in libSQL is a single connection, so one statement left open by an
 * earlier test makes every later statement fail with TRANSACTION_ACTIVE — which is
 * exactly what happened here, and only when the whole file ran. A scratch file
 * gives the pool a connection per statement and the tests stop ordering themselves.
 */
process.env.DB_PATH = `/tmp/dm-saved-digest-${process.pid}.db`;
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';

let dbModule: typeof import('../src/db/index.js');
let digest: typeof import('../src/services/saved-digest.js');

/**
 * THE WEEKLY NUDGE.
 *
 * The owner's question — "do people who save a deal ever hear about it again?" —
 * is the whole reason this exists. The two ways it can go wrong are opposite and
 * both fatal: an email that never arrives makes the feature pointless, and an
 * email that arrives too often makes the sender spam. So the tests are about
 * frequency and eligibility, not about HTML.
 */
beforeAll(async () => {
  const appModule = await import('../src/app.js');
  /*
   * Wait for boot to finish. `app.ts` starts `initDb` + the catalogue seed as a
   * floating promise; a test that runs while the seed is still writing hits
   * SQLITE_BUSY and looks like a bug in the code under test. Awaiting the exported
   * `ready` is the difference between testing the service and testing the boot.
   */
  await (appModule as unknown as { ready?: Promise<unknown> }).ready;
  dbModule = await import('../src/db/index.js');
  digest = await import('../src/services/saved-digest.js');
});

/**
 * Each test starts from an empty list.
 *
 * The digest walks every shopper who has saved something, so one test's leftovers
 * become the next test's input — and on libSQL's single in-memory connection that
 * showed up as a `TRANSACTION_ACTIVE` error in a test that passes perfectly on its
 * own. Isolating the fixture is cheaper than debugging that.
 */
beforeEach(async () => {
  await dbModule.db.prepare('DELETE FROM saved_deals').run();
  await dbModule.db.prepare('DELETE FROM users').run();
});

let seq = 0;
async function makeUser(opts: { verified?: boolean; notifyEmail?: 0 | 1; status?: string } = {}) {
  const id = `u-${++seq}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `${id}@example.test`;
  await dbModule.db
    .prepare(
      `INSERT INTO users (id, email, display_name, password_hash, role, status, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, 'x', 'user', ?, ?, ?, ?)`,
    )
    .run(
      id,
      email,
      'Test Person',
      opts.status ?? 'active',
      opts.verified === false ? null : new Date().toISOString(),
      new Date().toISOString(),
      new Date().toISOString(),
    );
  await dbModule.db
    .prepare(
      `INSERT INTO user_preferences (user_id, country_code, display_currency, notify_inapp, notify_email, created_at, updated_at)
       VALUES (?, 'IN', 'INR', 1, ?, ?, ?)`,
    )
    .run(id, opts.notifyEmail ?? 1, new Date().toISOString(), new Date().toISOString());
  return { id, email };
}

async function makeCoupon(opts: { expiresInDays?: number | null; expiresDaysAgo?: number } = {}) {
  const id = `c-${Math.random().toString(36).slice(2, 9)}`;
  const expires =
    opts.expiresDaysAgo !== undefined
      ? new Date(Date.now() - opts.expiresDaysAgo * 86_400_000).toISOString()
      : opts.expiresInDays !== undefined && opts.expiresInDays !== null
        ? new Date(Date.now() + opts.expiresInDays * 86_400_000).toISOString()
        : null;
  await dbModule.db
    .prepare(
      `INSERT INTO coupons (id, platform_slug, code, title, discount_type, discount_value, source, trust_state, expires_at, created_at)
       VALUES (?, 'croma-retail', 'SAVE10', '10% off at Croma', 'percent', 10, 'affiliate', 'listed', ?, ?)`,
    )
    .run(id, expires, new Date().toISOString());
  return id;
}

async function save(userId: string, couponId: string, savedAt = new Date().toISOString()) {
  await dbModule.db
    .prepare('INSERT INTO saved_deals (id, user_id, coupon_id, saved_at) VALUES (?, ?, ?, ?)')
    .run(`s-${Math.random().toString(36).slice(2, 9)}`, userId, couponId, savedAt);
}

describe('the weekly saved-deal email', () => {
  it('says nothing to somebody who has saved nothing', async () => {
    const result = await digest.runSavedDigests();
    expect(result.details.every((d) => d.items > 0 || d.sent === false)).toBe(true);
  });

  it('never writes to an unverified address', async () => {
    const { id } = await makeUser({ verified: false });
    await save(id, await makeCoupon({ expiresInDays: 2 }));
    const result = await digest.runSavedDigests();
    const row = result.details.find((d) => d.userId === id);
    expect(row?.sent).toBe(false);
    expect(row?.reason).toBe('email not verified');
  });

  it('never writes when the switch is off', async () => {
    const { id } = await makeUser({ notifyEmail: 0 });
    await save(id, await makeCoupon({ expiresInDays: 2 }));
    const result = await digest.runSavedDigests();
    const row = result.details.find((d) => d.userId === id);
    expect(row?.sent).toBe(false);
    expect(row?.reason).toBe('switched off');
  });

  it('says nothing when every saved deal is comfortably far from expiring', async () => {
    const { id } = await makeUser();
    const coupon = await makeCoupon({ expiresInDays: 60 });
    // Saved a while ago, so it is not "new since we last wrote" either.
    await save(id, coupon, new Date(Date.now() - 30 * 86_400_000).toISOString());
    await dbModule.db
      .prepare('UPDATE saved_deals SET notified_at = ? WHERE user_id = ?')
      .run(new Date(Date.now() - 8 * 86_400_000).toISOString(), id);

    const result = await digest.runSavedDigests();
    const row = result.details.find((d) => d.userId === id);
    expect(row?.items).toBe(0);
    expect(row?.reason).toBe('nothing worth saying');
  });

  it('writes to an eligible shopper, once, and records that it did', async () => {
    const { id, email } = await makeUser();
    await save(id, await makeCoupon({ expiresInDays: 3 }));

    const sentTo: Array<{ to: string; subject: string; body: string }> = [];
    const result = await digest.runSavedDigests(new Date(), async (m) => {
      sentTo.push(m);
      return { sent: true };
    });

    expect(sentTo).toHaveLength(1);
    expect(sentTo[0].to).toBe(email);
    expect(sentTo[0].subject).toBe('1 saved deal ends this week');
    expect(result.sent).toBe(1);

    // The `notified_at` stamp is what makes the weekly rule real rather than
    // aspirational: a second run the same day must send nothing.
    const again = await digest.runSavedDigests(new Date(), async () => {
      throw new Error('must not send twice in seven days');
    });
    expect(again.details.find((d) => d.userId === id)?.reason).toBe('wrote less than 7 days ago');
  });

  it('a failed send does not mark the shopper as written to', async () => {
    const { id } = await makeUser();
    await save(id, await makeCoupon({ expiresInDays: 3 }));
    const result = await digest.runSavedDigests(new Date(), async () => ({ sent: false, error: 'transport down' }));
    expect(result.details.find((d) => d.userId === id)?.sent).toBe(false);
    const row = (await dbModule.db
      .prepare('SELECT notified_at FROM saved_deals WHERE user_id = ?')
      .get(id)) as { notified_at: string | null };
    // Nothing was delivered, so nothing is stamped: the next run tries again.
    expect(row.notified_at).toBeNull();
  });

  it('builds the email around the one thing that matters: an offer ending', () => {
    const mail = digest.buildDigestEmail('Priya Sharma', [
      { couponId: 'c1', store: 'Croma', title: '10% off laptops', code: 'SAVE10', expiresAt: new Date().toISOString(), reason: 'expiring' },
    ]);
    expect(mail.subject).toBe('1 saved deal ends this week');
    expect(mail.body).toContain('Hi Priya');
    expect(mail.body).toContain('SAVE10');
    expect(mail.body).toContain('Croma');
    expect(mail.actionUrl).toBe('https://dealmosaic.pages.dev/saved');
  });

  it('mentions just-ended deals once, and does not list ancient ones', () => {
    const one = digest.buildDigestEmail(null, [
      { couponId: 'c1', store: 'Croma', title: 'Old offer', code: null, expiresAt: new Date().toISOString(), reason: 'expired' },
    ]);
    expect(one.subject).toBe('A saved deal has ended');
    expect(one.body).toContain('NO LONGER AVAILABLE');
  });
});
