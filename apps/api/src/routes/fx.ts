import { Hono } from 'hono';
import { CURRENCIES } from '@dealmosaic/core';
import { db, nowIso } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';

export const fxRoutes = new Hono<AppBindings>();

const SOURCE = 'frankfurter';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // central-bank rates update once per working day
const SUPPORTED = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'];
const API = 'https://api.frankfurter.dev/v2/rates';

interface CachedRate {
  base: string;
  quote: string;
  rate: number;
  rate_date: string;
  source: string;
  fetched_at: string;
}

async function readCache(base: string): Promise<CachedRate[]> {
  return (await db
    .prepare('SELECT * FROM exchange_rates WHERE base = ? AND quote IN (' + SUPPORTED.map(() => '?').join(',') + ')')
    .all(base, ...SUPPORTED)) as unknown as CachedRate[];
}

function writeCache(base: string, entries: Array<{ quote: string; rate: number; date: string }>) {
  const stmt = db.prepare(
    `INSERT INTO exchange_rates (base, quote, rate, rate_date, source, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(base, quote) DO UPDATE SET
       rate = excluded.rate, rate_date = excluded.rate_date,
       source = excluded.source, fetched_at = excluded.fetched_at`,
  );
  const now = nowIso();
  for (const e of entries) stmt.run(base, e.quote, e.rate, e.date, SOURCE, now);
}

function shape(rows: CachedRate[]) {
  const rates: Record<string, number> = {};
  for (const r of rows) rates[r.quote] = r.rate;
  const first = rows[0];
  const fetchedAt = first?.fetched_at ?? null;
  const ageMs = fetchedAt ? Date.now() - new Date(fetchedAt).getTime() : Infinity;
  return {
    base: 'USD',
    rates,
    rateDate: first?.rate_date ?? null,
    source: SOURCE,
    sourceLabel: 'Frankfurter (central-bank reference rates)',
    fetchedAt,
    stale: ageMs > CACHE_TTL_MS,
    disclaimer:
      'Reference rates updated once per working day. A converted amount is an estimate, never the amount you will be charged.',
    currencies: Object.values(CURRENCIES).filter((c) => SUPPORTED.includes(c.code)),
  };
}

fxRoutes.get('/rates', async (c) => {
  const cached = await readCache('USD');
  const age = cached[0] ? Date.now() - new Date(cached[0].fetched_at).getTime() : Infinity;

  if (cached.length > 0 && age < CACHE_TTL_MS) {
    return c.json(shape(cached));
  }

  try {
    const url = `${API}?base=USD&quotes=${SUPPORTED.filter((x) => x !== 'USD').join(',')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`frankfurter ${res.status}`);
    const data = (await res.json()) as Array<{ date: string; quote: string; rate: number }>;
    const entries = data.map((d) => ({ quote: d.quote, rate: d.rate, date: d.date }));
    writeCache('USD', [...entries, { quote: 'USD', rate: 1, date: data[0]?.date ?? nowIso().slice(0, 10) }]);
    return c.json(shape(await readCache('USD')));
  } catch (err) {
    // Honest degradation: serve the last known rates and say they are stale.
    if (cached.length > 0) {
      const body = shape(cached);
      return c.json(
        {
          ...body,
          stale: true,
          warning: 'Live rates are unavailable right now. Showing the last rates we fetched, with their date.',
        },
        200,
      );
    }
    return c.json(
      {
        error: {
          code: 'fx_unavailable',
          message:
            'Exchange rates are unavailable right now and we have no stored rates yet. Prices in a non-INR currency cannot be shown.',
        },
        detail: err instanceof Error ? err.message : 'unknown',
      },
      503,
    );
  }
});
