import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const DB_PATH = process.env.DB_PATH ?? join(__dirname, '../../data/dealmosaic.db');

function open(): Database.Database {
  if (DB_PATH !== ':memory:') {
    mkdirSync(DB_PATH.slice(0, DB_PATH.lastIndexOf('/')), { recursive: true });
  }
  const db = new Database(DB_PATH === ':memory:' ? ':memory:' : DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'));
  db.exec(readFileSync(join(__dirname, 'catalog.sql'), 'utf8'));
  migrate(db);
  return db;
}

/**
 * Forward-only migrations for columns added after a database already exists.
 * `CREATE TABLE IF NOT EXISTS` cannot add a column to a live table, so this
 * checks before altering — safe to run on every boot.
 */
function migrate(db: Database.Database): void {
  const hasColumn = (table: string, column: string): boolean => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return cols.some((c) => c.name === column);
  };

  if (!hasColumn('user_search_history', 'variant_id')) {
    db.exec('ALTER TABLE user_search_history ADD COLUMN variant_id TEXT');
  }
  if (!hasColumn('user_search_history', 'outcome')) {
    db.exec('ALTER TABLE user_search_history ADD COLUMN outcome TEXT');
  }
}

export const db = open();

export const nowIso = (): string => new Date().toISOString();

export function newId(): string {
  return crypto.randomUUID();
}

/* ---------------------------------------------------------------- */
/* Reference data seeding (idempotent)                               */
/* ---------------------------------------------------------------- */

export function seedReferenceData(): void {
  const upsertCountry = db.prepare(`
    INSERT INTO countries (code, name, flag, default_currency, region, enabled, note)
    VALUES (@code, @name, @flag, @currency, @region, @enabled, @note)
    ON CONFLICT(code) DO UPDATE SET
      name=excluded.name, flag=excluded.flag, default_currency=excluded.default_currency,
      region=excluded.region, enabled=excluded.enabled, note=excluded.note
  `);
  const countries = [
    { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', region: 'South Asia', enabled: 1, note: null },
    { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', region: 'North America', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', region: 'Europe', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', region: 'Middle East', enabled: 0, note: 'Market expansion — phase 5' },
    { code: 'ZZ', name: 'Universal', flag: '🌍', currency: 'USD', region: 'Global', enabled: 0, note: 'Deferred until India is complete' },
  ];
  for (const c of countries) upsertCountry.run(c);

  const upsertCurrency = db.prepare(`
    INSERT INTO currencies (code, symbol, name, minor_units) VALUES (@code, @symbol, @name, @mu)
    ON CONFLICT(code) DO UPDATE SET symbol=excluded.symbol, name=excluded.name, minor_units=excluded.minor_units
  `);
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
  for (const c of currencies) upsertCurrency.run(c);

  // Platform registry — statuses verified in docs/10-quickcommerce-grocery.md.
  const upsertPlatform = db.prepare(`
    INSERT INTO platforms (slug, name, owner, kind, status, status_note, delivery_promise, deep_link_template, affiliate, sort_order)
    VALUES (@slug, @name, @owner, @kind, @status, @statusNote, @delivery, @deepLink, @affiliate, @sort)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, owner=excluded.owner, kind=excluded.kind, status=excluded.status,
      status_note=excluded.status_note, delivery_promise=excluded.delivery_promise,
      deep_link_template=excluded.deep_link_template, affiliate=excluded.affiliate, sort_order=excluded.sort_order
  `);
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
  for (const p of platforms) upsertPlatform.run(p);
}
