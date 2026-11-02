/**
 * Database access layer.
 *
 * Two backends, one API:
 *   • Turso (libSQL) over HTTPS — production. Survives restarts and redeploys,
 *     which is why the database is not on the API host: Render's free tier has
 *     no persistent disk, so a local SQLite file there is erased on every deploy.
 *   • A local file (`file:...`) — development and tests. Same driver, same code
 *     path, so "works locally, breaks in production" cannot happen here.
 *
 * The exposed surface deliberately mirrors better-sqlite3 — `prepare(sql).get()`,
 * `.all()`, `.run()` with either positional args or better-sqlite3's `@name`
 * object style — because that is what every call site already uses. The single
 * difference is that these methods are now asynchronous, so callers `await` them.
 * libSQL accepts all of the parameter styles the old driver did (verified against
 * a live Turso database), so the SQL itself is untouched.
 */
import { createClient, type Client, type InValue, type ResultSet } from '@libsql/client';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.DB_PATH ?? join(__dirname, '../../data/dealmosaic.db');

/**
 * Remote when TURSO_DATABASE_URL is set, otherwise a local file.
 *
 * SAFETY: never remote under a test runner. This is not theoretical — during
 * development the test suite was run with TURSO_DATABASE_URL exported in the
 * shell and it connected to the PRODUCTION database, writing real rows into
 * real tables. Tests must be incapable of that, regardless of the environment
 * they inherit.
 */
const IS_TEST = Boolean(process.env.VITEST) || process.env.NODE_ENV === 'test';

const REMOTE_URL = IS_TEST ? undefined : process.env.TURSO_DATABASE_URL?.trim();
const AUTH_TOKEN = IS_TEST ? undefined : process.env.TURSO_AUTH_TOKEN?.trim();

export const isRemote = Boolean(REMOTE_URL);

if (!REMOTE_URL && DB_PATH !== ':memory:') {
  mkdirSync(DB_PATH.slice(0, DB_PATH.lastIndexOf('/')), { recursive: true });
}

const url = REMOTE_URL ?? (DB_PATH === ':memory:' ? ':memory:' : `file:${DB_PATH}`);

export const client: Client = createClient({
  url,
  ...(REMOTE_URL && AUTH_TOKEN ? { authToken: AUTH_TOKEN } : {}),
});

export type Row = Record<string, unknown>;
export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

/**
 * better-sqlite3 takes a single object for named parameters; libSQL accepts that
 * object directly. Positional arguments arrive as separate arguments instead.
 */
function toArgs(args: unknown[]): InValue[] | Record<string, InValue> {
  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !Array.isArray(args[0])) {
    return args[0] as Record<string, InValue>;
  }
  return args as InValue[];
}

const mapRun = (r: ResultSet): RunResult => ({
  changes: Number(r.rowsAffected),
  lastInsertRowid: r.lastInsertRowid ?? 0,
});

/** A prepared statement bound to a client or an open transaction. */
function makeStatement(sql: string, executor: { execute: (q: { sql: string; args: InValue[] | Record<string, InValue> }) => Promise<ResultSet> }) {
  return {
    get: async (...args: unknown[]): Promise<Row | undefined> => {
      const r = await executor.execute({ sql, args: toArgs(args) });
      return r.rows[0] as Row | undefined;
    },
    all: async (...args: unknown[]): Promise<Row[]> => {
      const r = await executor.execute({ sql, args: toArgs(args) });
      return r.rows as Row[];
    },
    run: async (...args: unknown[]): Promise<RunResult> => {
      const r = await executor.execute({ sql, args: toArgs(args) });
      return mapRun(r);
    },
  };
}

export type Statement = ReturnType<typeof makeStatement>;

/** Handle passed to `db.transaction`. Same statement surface, transaction-scoped. */
export interface Tx {
  prepare: (sql: string) => Statement;
}

export const db = {
  /** Kept for the health endpoint. */
  open: true,

  prepare: (sql: string): Statement => makeStatement(sql, client),

  /** Runs one or many statements; used for schema and DDL. */
  exec: async (sql: string): Promise<void> => {
    await client.executeMultiple(sql);
  },

  /**
   * Interactive transaction. Unlike the old synchronous helper this must be
   * awaited, and the callback receives a transaction-scoped handle:
   *
   *     await db.transaction(async (tx) => {
   *       await tx.prepare('INSERT …').run(v);
   *     });
   *
   * Rolling back is automatic if the callback throws.
   */
  transaction: async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
    if (!isRemote) {
      // Local file: libSQL's transaction object works the same way.
      const t = await client.transaction('write');
      try {
        const result = await fn({ prepare: (sql: string) => makeStatement(sql, t) });
        await t.commit();
        return result;
      } catch (error) {
        await t.rollback();
        throw error;
      }
    }
    const t = await client.transaction('write');
    try {
      const result = await fn({ prepare: (sql: string) => makeStatement(sql, t) });
      await t.commit();
      return result;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
};

/**
 * Applies the schema, then forward-only migrations.
 *
 * `CREATE TABLE IF NOT EXISTS` cannot add a column to an existing table, and the
 * production database persists across deploys, so migrations have to be checked
 * rather than assumed. Safe to run on every boot.
 */
export async function initDb(): Promise<void> {
  // WAL is a local-file optimisation; the remote service manages its own storage.
  if (!isRemote) {
    try {
      await client.execute('PRAGMA journal_mode = WAL');
      await client.execute('PRAGMA foreign_keys = ON');
    } catch {
      // Non-fatal: the pragmas only tune the local file.
    }
  }

  await db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
  await db.exec(readFileSync(join(__dirname, 'catalog.sql'), 'utf8'));

  const hasColumn = async (table: string, column: string): Promise<boolean> => {
    const rows = await db.prepare(`PRAGMA table_info(${table})`).all();
    return rows.some((c) => c.name === column);
  };

  if (!(await hasColumn('user_search_history', 'variant_id'))) {
    await db.exec('ALTER TABLE user_search_history ADD COLUMN variant_id TEXT');
  }
  if (!(await hasColumn('user_search_history', 'outcome'))) {
    await db.exec('ALTER TABLE user_search_history ADD COLUMN outcome TEXT');
  }
  // Outbox delivery tracking (added when real email delivery was wired up).
  if (!(await hasColumn('dev_outbox', 'sent_at'))) {
    await db.exec('ALTER TABLE dev_outbox ADD COLUMN sent_at TEXT');
  }
  if (!(await hasColumn('dev_outbox', 'send_error'))) {
    await db.exec('ALTER TABLE dev_outbox ADD COLUMN send_error TEXT');
  }
  // Affiliate offer sync (Cuelinks). The table existed before these columns.
  if (!(await hasColumn('coupons', 'external_id'))) {
    await db.exec('ALTER TABLE coupons ADD COLUMN external_id TEXT');
  }
  if (!(await hasColumn('coupons', 'tracking_url'))) {
    await db.exec('ALTER TABLE coupons ADD COLUMN tracking_url TEXT');
  }
  // Deal-discovery columns. Added when the affiliate feed turned out to carry the
  // price and category *in the headline text* rather than in structured fields.
  for (const [column, type] of [
    ['campaign_name', 'TEXT'],
    ['categories', 'TEXT'],
    ['primary_category', 'TEXT'],
    ['deal_group', 'TEXT'],
    ['offer_type', 'TEXT'],
    ['stated_price_minor', 'INTEGER'],
    ['stated_price_kind', 'TEXT'],
    ['stated_percent', 'INTEGER'],
    ['stated_percent_cap', 'INTEGER DEFAULT 0'],
    ['mentions_bank', 'INTEGER DEFAULT 0'],
  ] as const) {
    if (!(await hasColumn('coupons', column))) {
      await db.exec(`ALTER TABLE coupons ADD COLUMN ${column} ${type}`);
    }
  }
  await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_external ON coupons(external_id) WHERE external_id IS NOT NULL');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_coupons_group ON coupons(deal_group, trust_state, expires_at)');
  await db.exec('CREATE INDEX IF NOT EXISTS idx_coupons_price ON coupons(stated_price_minor, trust_state)');
}

export const nowIso = (): string => new Date().toISOString();

export function newId(): string {
  return crypto.randomUUID();
}

/* ---------------------------------------------------------------- */
/* Reference data seeding (idempotent)                               */
/* ---------------------------------------------------------------- */

export async function seedReferenceData(): Promise<void> {
  const countries = [
    { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'South Asia', enabled: 1, note: null },
    { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'North America', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'Europe', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', region: 'Middle East', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'ZZ', name: 'Universal', flag: '🌍', currency: 'USD', region: 'Global', enabled: 0, note: 'Deferred until India is complete' },
  ];
  const upsertCountry = db.prepare(`
    INSERT INTO countries (code, name, flag, default_currency, region, enabled, note)
    VALUES (@code, @name, @flag, @currency, @region, @enabled, @note)
    ON CONFLICT(code) DO UPDATE SET
      name=excluded.name, flag=excluded.flag, default_currency=excluded.default_currency,
      region=excluded.region, enabled=excluded.enabled, note=excluded.note
  `);
  for (const c of countries) await upsertCountry.run(c);

  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee', mu: 2 },
    { code: 'USD', symbol: '$', name: 'US Dollar', mu: 2 },
    { code: 'EUR', symbol: '€', name: 'Euro', mu: 2 },
    { code: 'GBP', symbol: '£', name: 'British Pound', mu: 2 },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', mu: 2 },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', mu: 2 },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', mu: 2 },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', mu: 2 },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', mu: 0 },
  ];
  const upsertCurrency = db.prepare(`
    INSERT INTO currencies (code, symbol, name, minor_units) VALUES (@code, @symbol, @name, @mu)
    ON CONFLICT(code) DO UPDATE SET symbol=excluded.symbol, name=excluded.name, minor_units=excluded.minor_units
  `);
  for (const c of currencies) await upsertCurrency.run(c);

  // Platform registry — statuses verified in docs/10-quickcommerce-grocery.md.
  const platforms = [
    {
      slug: 'blinkit', name: 'Blinkit', owner: 'Eternal', kind: 'quick_commerce', status: 'no_public_api',
      statusNote: 'No authorised price API. Seller portal is for brands listing stock, not price data.',
      delivery: '10–20 min', deepLink: 'https://blinkit.com/s/?q={q}', affiliate: 0, sort: 10,
    },
    {
      slug: 'zepto', name: 'Zepto', owner: 'Zepto', kind: 'quick_commerce', status: 'no_public_api',
      statusNote: 'Supplier portal only. No consumer affiliate programme found.',
      delivery: '8–10 min', deepLink: 'https://www.zeptonow.com/search?query={q}', affiliate: 0, sort: 20,
    },
    {
      slug: 'instamart', name: 'Swiggy Instamart', owner: 'Swiggy', kind: 'quick_commerce', status: 'pending_approval',
      statusNote: 'Swiggy affiliate programme exists (up to ~15%). Data feed not available.',
      delivery: '12–15 min', deepLink: 'https://www.swiggy.com/instamart/search?query={q}', affiliate: 1, sort: 30,
    },
    {
      slug: 'bigbasket', name: 'BigBasket / BB Now', owner: 'Tata', kind: 'grocery', status: 'pending_approval',
      statusNote: 'Affiliate programme exists (rate varies, short cookie window). No product API.',
      delivery: '10–20 min + slotted', deepLink: 'https://www.bigbasket.com/ps/?q={q}', affiliate: 1, sort: 40,
    },
    {
      slug: 'jiomart', name: 'JioMart', owner: 'Reliance', kind: 'grocery', status: 'pending_approval',
      statusNote: 'Affiliate programme exists (up to ~4%, 30-day window). No product API.',
      delivery: 'Slotted + express', deepLink: 'https://www.jiomart.com/catalogsearch/result?q={q}', affiliate: 1, sort: 50,
    },
    {
      slug: 'flipkart-minutes', name: 'Flipkart Minutes', owner: 'Flipkart', kind: 'quick_commerce', status: 'pending_approval',
      statusNote: 'Flipkart affiliate API exists but new registrations have been paused since 2018.',
      delivery: '~12 min', deepLink: 'https://www.flipkart.com/search?q={q}', affiliate: 0, sort: 60,
    },
    {
      slug: 'amazon-now', name: 'Amazon Now / Fresh', owner: 'Amazon', kind: 'quick_commerce', status: 'pending_approval',
      statusNote: 'Creators API is gated at 10 qualifying sales in a rolling 30-day window.',
      delivery: '10–15 min', deepLink: 'https://www.amazon.in/s?k={q}', affiliate: 1, sort: 70,
    },
    {
      slug: 'dmart-ready', name: 'DMart Ready', owner: 'Avenue Supermarts', kind: 'grocery', status: 'no_public_api',
      statusNote: 'Slotted delivery and pickup. No affiliate programme known.',
      delivery: 'Slotted', deepLink: 'https://www.dmart.in/search?q={q}', affiliate: 0, sort: 80,
    },
    {
      slug: 'croma', name: 'Croma', owner: 'Tata Digital', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'No public price API. Partnership required.',
      delivery: '1–2 days', deepLink: 'https://www.croma.com/searchB?q={q}', affiliate: 0, sort: 90,
    },
    {
      slug: 'reliance-digital', name: 'Reliance Digital', owner: 'Reliance Retail', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'No public price API. Partnership required.',
      delivery: '2–5 days', deepLink: 'https://www.reliancedigital.in/search?q={q}', affiliate: 0, sort: 100,
    },
    {
      slug: 'myntra', name: 'Myntra', owner: 'Flipkart Group', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'Affiliate coverage through licensed networks only. No price feed.',
      delivery: '2–5 days', deepLink: 'https://www.myntra.com/{q}', affiliate: 0, sort: 110,
    },
    {
      slug: 'ajio', name: 'AJIO', owner: 'Reliance Retail', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'Affiliate coverage through licensed networks only. No price feed.',
      delivery: '3–6 days', deepLink: 'https://www.ajio.com/search/?text={q}', affiliate: 0, sort: 120,
    },
    {
      slug: 'nykaa', name: 'Nykaa', owner: 'FSN E-Commerce', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'No public price API. Partnership required.',
      delivery: '2–4 days', deepLink: 'https://www.nykaa.com/search/result/?q={q}', affiliate: 0, sort: 130,
    },
    {
      slug: 'ebay', name: 'eBay India', owner: 'eBay', kind: 'marketplace', status: 'pending_approval',
      statusNote: 'Public Browse API with a free tier — the only self-serve price API available today.',
      delivery: 'Varies by seller', deepLink: 'https://www.ebay.com/sch/i.html?_nkw={q}', affiliate: 0, sort: 140,
    },
  ];
  const upsertPlatform = db.prepare(`
    INSERT INTO platforms (slug, name, owner, kind, status, status_note, delivery_promise, deep_link_template, affiliate, sort_order)
    VALUES (@slug, @name, @owner, @kind, @status, @statusNote, @delivery, @deepLink, @affiliate, @sort)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, owner=excluded.owner, kind=excluded.kind, status=excluded.status,
      status_note=excluded.status_note, delivery_promise=excluded.delivery_promise,
      deep_link_template=excluded.deep_link_template, affiliate=excluded.affiliate, sort_order=excluded.sort_order
  `);
  for (const p of platforms) await upsertPlatform.run(p);
}
