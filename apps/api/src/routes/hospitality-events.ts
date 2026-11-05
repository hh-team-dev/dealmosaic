import { Hono } from 'hono';
import { db, newId, nowIso } from '../db/index.js';
import { createRateLimiter } from '../lib/rate-limit.js';

/**
 * Anonymous hospitality analytics intake.
 *
 * The consent gate lives in the browser: the client only calls this endpoint
 * after the customer chooses "Allow anonymous counts". Defence in depth here
 * means strict shape validation, tight rate limits, no stored IP/UA/account
 * identity, and a 180-day retention purge on every write and admin read.
 */

export const hospitalityEventsRoutes = new Hono();
export const HOSPITALITY_EVENT_RETENTION_DAYS = 180;

const intakeLimiter = createRateLimiter({ name: 'hospitality-events', windowMs: 60_000, max: 30 });

const CITY = /^[a-z0-9-]{2,32}$/;
const VENUE = /^[a-z0-9-]{2,80}$/;
const PROVIDER = /^[a-z]{2,12}$/;
const FILTER_KEY = /^[a-z]{2,12}$/;
const SESSION = /^[0-9a-f]{24}$/;
const TYPES = new Set(['search', 'shortlist', 'provider', 'outcome', 'quote']);
const OUTCOMES = new Set(['booked', 'not-booked', 'looking']);

function deviceOf(ua: string): 'phone' | 'tablet' | 'desktop' {
  if (/iPad|Tablet/i.test(ua)) return 'tablet';
  if (/Android|iPhone|Mobile/i.test(ua)) return 'phone';
  return 'desktop';
}

type CleanEvent = {
  type: string; kind: string; city: string;
  venue: string | null; provider: string | null;
  nights: number | null; rooms: number | null; adults: number | null; children: number | null;
  filters_json: string | null; outcome: string | null; action: string | null; shortlist_size: number | null;
};

function cleanEvent(raw: unknown): CleanEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (!TYPES.has(e.type as string)) return null;
  if (e.kind !== 'hotel' && e.kind !== 'restaurant') return null;
  if (typeof e.city !== 'string' || !CITY.test(e.city)) return null;
  const out: CleanEvent = {
    type: e.type as string, kind: e.kind, city: e.city,
    venue: null, provider: null, nights: null, rooms: null, adults: null, children: null,
    filters_json: null, outcome: null, action: null, shortlist_size: null,
  };
  if (e.type === 'search') {
    for (const k of ['nights', 'rooms', 'adults', 'children'] as const) {
      const n = e[k];
      if (!Number.isInteger(n) || (n as number) < 0 || (n as number) > 60) return null;
      out[k] = n as number;
    }
    if (!Array.isArray(e.filterKeys) || e.filterKeys.length > 20) return null;
    const keys = [...new Set(e.filterKeys)];
    if (!keys.every((k): k is string => typeof k === 'string' && FILTER_KEY.test(k))) return null;
    out.filters_json = JSON.stringify(keys);
    return out;
  }
  if (e.type === 'shortlist') {
    if (e.action !== 'add' && e.action !== 'remove') return null;
    if (!Number.isInteger(e.shortlistSize) || (e.shortlistSize as number) < 0 || (e.shortlistSize as number) > 4) return null;
    out.action = e.action;
    out.shortlist_size = e.shortlistSize as number;
    return out;
  }
  if (e.type === 'provider' || e.type === 'outcome') {
    if (typeof e.venue !== 'string' || !VENUE.test(e.venue)) return null;
    if (typeof e.provider !== 'string' || !PROVIDER.test(e.provider)) return null;
    out.venue = e.venue;
    out.provider = e.provider;
    if (e.type === 'outcome') {
      if (!OUTCOMES.has(e.outcome as string)) return null;
      out.outcome = e.outcome as string;
    }
    return out;
  }
  return out; // quote
}

export async function purgeHospitalityEvents(now = Date.now()): Promise<number> {
  const cutoff = new Date(now - HOSPITALITY_EVENT_RETENTION_DAYS * 86400_000).toISOString();
  const res = await db.prepare('DELETE FROM hospitality_events WHERE created_at < ?').run(cutoff);
  return Number(res.changes ?? 0);
}

hospitalityEventsRoutes.post('/', intakeLimiter, async (c) => {
  c.header('Cache-Control', 'no-store');
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_body', message: 'Send a JSON object.' }, 400);
  }
  const session = (body as Record<string, unknown>)?.session;
  const events = (body as Record<string, unknown>)?.events;
  if (typeof session !== 'string' || !SESSION.test(session))
    return c.json({ error: 'invalid_session', message: 'A valid anonymous session id is required.' }, 400);
  if (!Array.isArray(events) || events.length === 0 || events.length > 10)
    return c.json({ error: 'invalid_events', message: 'Send between 1 and 10 events.' }, 400);
  const cleaned = events.map(cleanEvent);
  if (cleaned.some((e) => e === null))
    return c.json({ error: 'invalid_event', message: 'One event failed validation; nothing was stored.' }, 400);
  const device = deviceOf(c.req.header('user-agent') ?? '');
  const at = nowIso();
  const insert = db.prepare(`INSERT INTO hospitality_events
    (id, session, type, kind, city, venue, provider, nights, rooms, adults, children, filters_json, outcome, action, shortlist_size, device, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const e of cleaned as CleanEvent[]) {
    await insert.run(newId(), session, e.type, e.kind, e.city, e.venue, e.provider, e.nights, e.rooms,
      e.adults, e.children, e.filters_json, e.outcome, e.action, e.shortlist_size, device, at);
  }
  try {
    await purgeHospitalityEvents();
  } catch {
    // Retention cleanup is best-effort; the intake already succeeded.
  }
  return c.json({ received: cleaned.length });
});

export type TrafficAggregate = {
  windowDays: number;
  retentionDays: number;
  totals: Record<string, number>;
  searchesByCity: Array<{ city: string; searches: number }>;
  searchesByKind: Array<{ kind: string; searches: number }>;
  providerClicks: Array<{ provider: string; clicks: number }>;
  topVenues: Array<{ venue: string; clicks: number }>;
  outcomes: Array<{ outcome: string; reports: number }>;
  topFilters: Array<{ filter: string; searches: number }>;
  perDay: Array<{ day: string; events: number }>;
  oldestEventAt: string | null;
  scope: string;
};

/** Aggregates only. No session ids, no individual rows, no identities. */
export async function hospitalityTraffic(windowDays = 30): Promise<TrafficAggregate> {
  const since = new Date(Date.now() - windowDays * 86400_000).toISOString();
  const count = async (sql: string, ...params: unknown[]) =>
    (await db.prepare(sql).all(...params)) as Array<Record<string, string | number | null>>;
  const totals: Record<string, number> = {};
  for (const row of await count('SELECT type, COUNT(*) n FROM hospitality_events WHERE created_at >= ? GROUP BY type', since))
    totals[String(row.type)] = Number(row.n);
  const searchesByCity = (await count('SELECT city, COUNT(*) n FROM hospitality_events WHERE type = ? AND created_at >= ? GROUP BY city ORDER BY n DESC LIMIT 18', 'search', since))
    .map((r) => ({ city: String(r.city), searches: Number(r.n) }));
  const searchesByKind = (await count('SELECT kind, COUNT(*) n FROM hospitality_events WHERE type = ? AND created_at >= ? GROUP BY kind', 'search', since))
    .map((r) => ({ kind: String(r.kind), searches: Number(r.n) }));
  const providerClicks = (await count('SELECT provider, COUNT(*) n FROM hospitality_events WHERE type = ? AND created_at >= ? GROUP BY provider ORDER BY n DESC', 'provider', since))
    .map((r) => ({ provider: String(r.provider), clicks: Number(r.n) }));
  const topVenues = (await count('SELECT venue, COUNT(*) n FROM hospitality_events WHERE type = ? AND created_at >= ? GROUP BY venue ORDER BY n DESC LIMIT 10', 'provider', since))
    .map((r) => ({ venue: String(r.venue), clicks: Number(r.n) }));
  const outcomes = (await count('SELECT outcome, COUNT(*) n FROM hospitality_events WHERE type = ? AND created_at >= ? GROUP BY outcome', 'outcome', since))
    .map((r) => ({ outcome: String(r.outcome), reports: Number(r.n) }));
  const filterRows = await count('SELECT filters_json FROM hospitality_events WHERE type = ? AND created_at >= ? AND filters_json IS NOT NULL', 'search', since);
  const filterCounts = new Map<string, number>();
  for (const row of filterRows) {
    try {
      const keys = JSON.parse(String(row.filters_json)) as unknown;
      if (Array.isArray(keys))
        for (const k of keys) {
          if (typeof k === 'string' && FILTER_KEY.test(k))
            filterCounts.set(k, (filterCounts.get(k) ?? 0) + 1);
        }
    } catch {
      // A malformed stored array invalidates one row's detail, not the report.
    }
  }
  const topFilters = [...filterCounts.entries()]
    .map(([filter, searches]) => ({ filter, searches }))
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 15);
  const perDay = (await count("SELECT substr(created_at, 1, 10) day, COUNT(*) n FROM hospitality_events WHERE created_at >= ? GROUP BY day ORDER BY day DESC LIMIT 14", since))
    .map((r) => ({ day: String(r.day), events: Number(r.n) }));
  const oldest = await count('SELECT MIN(created_at) at FROM hospitality_events');
  return {
    windowDays,
    retentionDays: HOSPITALITY_EVENT_RETENTION_DAYS,
    totals,
    searchesByCity,
    searchesByKind,
    providerClicks,
    topVenues,
    outcomes,
    topFilters,
    perDay,
    oldestEventAt: (oldest[0]?.at as string | null) ?? null,
    scope: 'Anonymous consented counts from the hotel and dining comparison workspaces. A provider click is an outbound attempt, not proof of arrival or booking. Outcomes are voluntary customer reports, and silence is not evidence either way. Individual events and session ids are never exposed here.',
  };
}
