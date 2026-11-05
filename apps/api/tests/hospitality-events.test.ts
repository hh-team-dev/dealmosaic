import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';
process.env.SITE_URL = 'https://dealmosaic.pages.dev';

let app: any;
let db: any;
let traffic: typeof import('../src/routes/hospitality-events.js').hospitalityTraffic;
let purge: typeof import('../src/routes/hospitality-events.js').purgeHospitalityEvents;
let ipSeq = 500;
const ip = () => `198.51.100.${++ipSeq}`;
const session = '0123456789abcdef01234567';

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
  ({ db } = await import('../src/db/index.js'));
  ({ hospitalityTraffic: traffic, purgeHospitalityEvents: purge } = await import('../src/routes/hospitality-events.js'));
});

const post = (body: unknown) =>
  app.request('/api/hospitality-events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip(), 'user-agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' },
    body: JSON.stringify(body),
  });

describe('anonymous hospitality intake', () => {
  it('rejects malformed batches without storing anything', async () => {
    for (const body of [
      {},
      { session, events: [] },
      { session: 'short', events: [{ type: 'quote', kind: 'hotel', city: 'mumbai' }] },
      { session, events: [{ type: 'quote', kind: 'hotel', city: 'Mumbai!' }] },
      { session, events: [{ type: 'search', kind: 'hotel', city: 'mumbai', nights: 2, rooms: 1, adults: 2, children: 0, filterKeys: ['budget', 'room 1: Rahul'] }] },
      { session, events: [{ type: 'provider', kind: 'hotel', city: 'mumbai', venue: 'x', provider: 'booking.com' }] },
      { session, events: [{ type: 'outcome', kind: 'hotel', city: 'mumbai', venue: 'ginger-mumbai-airport', provider: 'booking', outcome: 'maybe' }] },
      { session, events: Array.from({ length: 11 }, () => ({ type: 'quote', kind: 'hotel', city: 'mumbai' })) },
    ]) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body).slice(0, 80)).toBe(400);
    }
    const rows = await db.prepare('SELECT COUNT(*) n FROM hospitality_events').get();
    expect(rows.n).toBe(0);
  });

  it('stores validated anonymous events with a device class and no identity columns', async () => {
    const res = await post({
      session,
      events: [
        { type: 'search', kind: 'hotel', city: 'mumbai', nights: 2, rooms: 1, adults: 2, children: 1, filterKeys: ['budget', 'pet'] },
        { type: 'shortlist', kind: 'hotel', city: 'mumbai', action: 'add', shortlistSize: 1 },
        { type: 'provider', kind: 'hotel', city: 'mumbai', venue: 'ginger-mumbai-airport', provider: 'booking' },
        { type: 'outcome', kind: 'hotel', city: 'mumbai', venue: 'ginger-mumbai-airport', provider: 'booking', outcome: 'looking' },
        { type: 'quote', kind: 'hotel', city: 'mumbai' },
      ],
    });
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(5);
    const cols = (await db.prepare('PRAGMA table_info(hospitality_events)').all()).map((c: any) => c.name);
    expect(cols).not.toContain('ip');
    expect(cols).not.toContain('user_agent');
    expect(cols).not.toContain('user_id');
    expect(cols).not.toContain('email');
    const rows = await db.prepare('SELECT type, device, session FROM hospitality_events').all();
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((r: any) => r.device))).toEqual(new Set(['phone']));
  });

  it('reports aggregates without sessions or individual rows, and purges old events', async () => {
    await db.prepare(`INSERT INTO hospitality_events
      (id, session, type, kind, city, venue, provider, filters_json, device, created_at)
      VALUES ('old-1', ?, 'search', 'hotel', 'mumbai', NULL, NULL, '["budget"]', 'phone', ?)`).run(
      'aaaaaaaaaaaaaaaaaaaaaaaa', new Date(Date.now() - 200 * 86400_000).toISOString());
    const purged = await purge();
    expect(purged).toBe(1);
    const agg = await traffic(30);
    expect(agg.totals.search).toBe(1);
    expect(agg.searchesByCity).toEqual([{ city: 'mumbai', searches: 1 }]);
    expect(agg.providerClicks).toEqual([{ provider: 'booking', clicks: 1 }]);
    expect(agg.topVenues).toEqual([{ venue: 'ginger-mumbai-airport', clicks: 1 }]);
    expect(agg.outcomes).toEqual([{ outcome: 'looking', reports: 1 }]);
    expect(agg.topFilters).toContainEqual({ filter: 'budget', searches: 1 });
    expect(JSON.stringify(agg)).not.toContain(session);
    expect(agg.retentionDays).toBe(180);
  });
});
