/**
 * Feed connector — a declarative importer for retailer/affiliate product feeds.
 *
 * WHY THIS SHAPE
 * --------------
 * Most Indian marketplaces have no public price API, and scraping them is both
 * against their terms and explicitly out of bounds for this project. What they
 * *do* offer, through licensed affiliate networks (Cuelinks, AdmitAd, EarnKaro,
 * vCommission and similar), is a **product data feed**: a CSV or XML file of
 * SKUs, prices and deeplinks that a network hands to an approved publisher.
 *
 * Rather than write one bespoke connector per platform — each of which would
 * need new code the day terms change — there is exactly ONE importer whose
 * knowledge of the platform is entirely data: a JSON mapping file. Adding a
 * platform becomes a mapping, not a deployment.
 *
 * HONESTY RULES ENFORCED HERE (not left to callers):
 *   • A missing shipping price becomes `null`, never 0. Reproducing a competitor's
 *     known bug would be inventing a price.
 *   • A feed row without a usable price is skipped and counted, never guessed.
 *   • If no mapping is configured the connector reports `disabled` with the
 *     reason, instead of returning an empty list that looks like "no price found".
 *   • Every offer is stamped `dataOrigin: 'feed'`, so it is never mistaken for
 *     demo data or a live quote.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nowIso, type Connector, type ConnectorHealth, type ConnectorOffer, type ConnectorSearchParams } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// __dirname is apps/api/src/connectors → four levels up is the repository root.
// (Three levels lands in apps/, which is how this shipped wrong the first time.)
const DEFAULT_MAPPING_DIR = resolve(__dirname, '../../../../deploy/feeds');

/* ------------------------------------------------------------------ */
/* CSV parsing — minimal, correct, no dependency                       */
/* ------------------------------------------------------------------ */

/**
 * Parses RFC-4180 CSV. Handles quoted fields, embedded commas, embedded
 * newlines and doubled quotes. Feeds from affiliate networks routinely contain
 * all four (product titles with commas are the usual culprit).
 */
export function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  // strip BOM — Excel-exported feeds almost always have one
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0]!.map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => {
      obj[h] = (r[i] ?? '').trim();
    });
    return obj;
  });
}

/* ------------------------------------------------------------------ */
/* Mapping                                                            */
/* ------------------------------------------------------------------ */

export interface FeedMapping {
  /** Platform slug this feed belongs to (must exist in the platforms table). */
  platformSlug: string;
  /** Human label shown as the offer's source. */
  sourceLabel: string;
  /**
   * Column name → meaning. Only `price` is mandatory. Everything else is
   * optional because no two networks export the same columns.
   */
  columns: {
    title: string;
    price: string;
    url: string;
    gtin?: string;
    mpn?: string;
    brand?: string;
    mrp?: string;
    inStock?: string;
    shipping?: string;
    deliveryDaysMin?: string;
    deliveryDaysMax?: string;
    returnWindowDays?: string;
    warrantyMonths?: string;
    sellerName?: string;
    currency?: string;
    /**
     * How the price column is expressed. `major` means rupees (₹1499 → 149900
     * paise); `minor` means already in paise.
     */
    priceUnit: 'major' | 'minor';
  };
  /** Values that mean "in stock" in the inStock column. Default: 1,true,yes,in stock. */
  inStockTrue?: string[];
  /** Text that marks a row as unusable (e.g. a placeholder title). */
  skipIfTitleContains?: string[];
}

export class MappingError extends Error {}

/** Validates a mapping and returns every problem at once, not just the first. */
export function validateMapping(m: unknown): string[] {
  const problems: string[] = [];
  const obj = m as Partial<FeedMapping>;
  if (!obj || typeof obj !== 'object') return ['Mapping is not an object.'];
  if (!obj.platformSlug) problems.push('platformSlug is required.');
  if (!obj.sourceLabel) problems.push('sourceLabel is required.');
  if (!obj.columns || typeof obj.columns !== 'object') {
    problems.push('columns is required.');
    return problems;
  }
  if (!obj.columns.title) problems.push('columns.title is required.');
  if (!obj.columns.price) problems.push('columns.price is required — a feed without a price cannot be compared.');
  if (!obj.columns.url) problems.push('columns.url is required — an offer the user cannot open is useless.');
  if (obj.columns.priceUnit !== 'major' && obj.columns.priceUnit !== 'minor') {
    problems.push("columns.priceUnit must be 'major' (rupees) or 'minor' (paise).");
  }
  return problems;
}

/** ₹1,499.00 / "1,499" / "₹1499" → 149900 paise. Returns null when unparseable. */
export function toMinor(raw: string, unit: 'major' | 'minor'): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(unit === 'minor' ? value : value * 100);
}

/**
 * Deliberately conservative: a blank shipping column means the seller did not
 * publish one, which is `null`. It never becomes 0, because 0 would mean
 * "free delivery" and would win the ranking for a false reason.
 */
export function toShippingMinor(raw: string | undefined, unit: 'major' | 'minor'): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = toMinor(raw, unit);
  return value === null ? null : value;
}

const DEFAULT_TRUE = ['1', 'true', 'yes', 'y', 'in stock', 'instock', 'available'];

/* ------------------------------------------------------------------ */
/* Connector                                                          */
/* ------------------------------------------------------------------ */

export interface FeedStats {
  rowsRead: number;
  offersBuilt: number;
  skipped: number;
  reasons: Record<string, number>;
}

export class FeedConnector implements Connector {
  slug: string;
  displayName: string;
  kind: 'marketplace' | 'qcommerce' = 'marketplace';

  private mapping: FeedMapping | null = null;
  private rows: Array<Record<string, string>> = [];
  private loadError: string | null = null;
  private stats: FeedStats = { rowsRead: 0, offersBuilt: 0, skipped: 0, reasons: {} };
  private loadedAt: string | null = null;

  constructor(
    private readonly mappingPath: string,
    private readonly feedPath: string | null,
  ) {
    this.slug = 'feed';
    this.displayName = 'Affiliate feed';
    this.load();
  }

  private load(): void {
    if (!existsSync(this.mappingPath)) {
      this.loadError = `No mapping file at ${this.mappingPath}. Nothing to import.`;
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(this.mappingPath, 'utf8'));
    } catch (error) {
      this.loadError = `Mapping file is not valid JSON: ${(error as Error).message}`;
      return;
    }
    const problems = validateMapping(raw);
    if (problems.length > 0) {
      this.loadError = `Mapping is incomplete: ${problems.join(' ')}`;
      return;
    }
    this.mapping = raw as FeedMapping;
    this.slug = this.mapping.platformSlug;
    this.displayName = this.mapping.sourceLabel;

    if (!this.feedPath || !existsSync(this.feedPath)) {
      this.loadError = `Mapping is valid for ${this.mapping.platformSlug}, but the feed file is missing: ${this.feedPath ?? '(not configured)'}`;
      return;
    }
    try {
      this.rows = parseCsv(readFileSync(this.feedPath, 'utf8'));
      this.loadedAt = nowIso();
    } catch (error) {
      this.loadError = `Could not read the feed: ${(error as Error).message}`;
    }
  }

  isConfigured(): boolean {
    return this.loadError === null && this.rows.length > 0;
  }

  async health(): Promise<ConnectorHealth> {
    const started = Date.now();
    if (!this.isConfigured()) {
      return {
        status: 'disabled',
        detail: this.loadError ?? 'Feed is configured but contains no rows.',
        checkedAt: nowIso(),
        latencyMs: Date.now() - started,
        needsCredentials: true,
        docsUrl: 'docs/19-data-acquisition.md',
      };
    }
    return {
      status: 'live',
      detail: `${this.stats.rowsRead || this.rows.length} rows available from the ${this.displayName} feed. Prices are as published in the last feed export, not a live quote.`,
      checkedAt: this.loadedAt ?? nowIso(),
      latencyMs: Date.now() - started,
      needsCredentials: false,
      docsUrl: 'docs/19-data-acquisition.md',
    };
  }

  private skip(reason: string): void {
    this.stats.skipped += 1;
    this.stats.reasons[reason] = (this.stats.reasons[reason] ?? 0) + 1;
  }

  /** Maps one raw row. Returns null (and records why) if the row is unusable. */
  buildOffer(row: Record<string, string>): ConnectorOffer | null {
    const m = this.mapping;
    if (!m) return null;
    const col = m.columns;

    if (col.currency && row[col.currency] && row[col.currency]!.toUpperCase() !== 'INR') {
      this.skip('non-INR currency');
      return null;
    }

    const title = row[col.title] ?? '';
    if (!title) {
      this.skip('missing title');
      return null;
    }
    for (const marker of m.skipIfTitleContains ?? []) {
      if (title.toLowerCase().includes(marker.toLowerCase())) {
        this.skip(`title contains "${marker}"`);
        return null;
      }
    }

    const itemPriceMinor = toMinor(row[col.price] ?? '', col.priceUnit);
    if (itemPriceMinor === null || itemPriceMinor <= 0) {
      this.skip('missing or invalid price');
      return null;
    }

    const url = row[col.url] ?? '';
    if (!/^https?:\/\//i.test(url)) {
      this.skip('missing or invalid product URL');
      return null;
    }

    const trueValues = (m.inStockTrue ?? DEFAULT_TRUE).map((v) => v.toLowerCase());
    const inStockRaw = col.inStock ? (row[col.inStock] ?? 'true').toLowerCase() : 'true';

    const offer: ConnectorOffer = {
      platformSlug: m.platformSlug,
      title,
      sellerName: col.sellerName ? (row[col.sellerName] ?? m.sourceLabel) || m.sourceLabel : m.sourceLabel,
      sellerType: 'platform',
      sellerRating: null,
      sellerRatingCount: null,
      productRating: null,
      productReviewCount: null,
      itemPriceMinor,
      currency: 'INR',
      mrpMinor: col.mrp ? toMinor(row[col.mrp] ?? '', col.priceUnit) : null,
      itemCondition: 'new',
      inStock: trueValues.includes(inStockRaw),
      shippingMinor: toShippingMinor(col.shipping ? row[col.shipping] : undefined, col.priceUnit),
      shippingNote: null,
      deliveryDaysMin: numeric(col.deliveryDaysMin ? row[col.deliveryDaysMin] : undefined),
      deliveryDaysMax: numeric(col.deliveryDaysMax ? row[col.deliveryDaysMax] : undefined),
      returnWindowDays: numeric(col.returnWindowDays ? row[col.returnWindowDays] : undefined),
      warrantyMonths: numeric(col.warrantyMonths ? row[col.warrantyMonths] : undefined),
      productUrl: url,
      affiliate: true,
      dataOrigin: 'feed',
      sourceLabel: m.sourceLabel,
      lastCheckedAt: this.loadedAt ?? nowIso(),
      gtin: col.gtin ? (row[col.gtin] || null) : null,
      mpn: col.mpn ? (row[col.mpn] || null) : null,
      brand: col.brand ? (row[col.brand] || null) : null,
    };
    this.stats.offersBuilt += 1;
    return offer;
  }

  async search({ query, gtin, limit = 40 }: ConnectorSearchParams): Promise<ConnectorOffer[]> {
    if (!this.isConfigured()) return [];
    this.stats = { rowsRead: this.rows.length, offersBuilt: 0, skipped: 0, reasons: {} };

    const needle = query.trim().toLowerCase();
    const candidates = this.rows.filter((row) => {
      const m = this.mapping!;
      if (gtin && m.columns.gtin && row[m.columns.gtin] === gtin) return true;
      const title = (row[m.columns.title] ?? '').toLowerCase();
      if (!needle) return true;
      // every significant token must appear — avoids "phone case" matching "phone"
      return needle.split(/\s+/).filter(Boolean).every((token) => title.includes(token));
    });

    const offers: ConnectorOffer[] = [];
    for (const row of candidates) {
      const offer = this.buildOffer(row);
      if (offer) offers.push(offer);
      if (offers.length >= limit) break;
    }
    return offers;
  }

  /** Diagnostics for the admin panel: why rows were dropped. */
  report(): { stats: FeedStats; configured: boolean; error: string | null } {
    return { stats: this.stats, configured: this.isConfigured(), error: this.loadError };
  }
}

function numeric(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Builds the connector from the environment.
 *
 *   FEED_MAPPING  path to the mapping JSON  (defaults to deploy/feeds/mapping.json)
 *   FEED_FILE     path to the exported feed (CSV)
 *
 * When neither is present the connector still exists and reports `disabled`
 * with a reason — so the admin page can say *why* a platform has no data,
 * rather than quietly showing nothing.
 */
export function createFeedConnector(env: NodeJS.ProcessEnv = process.env): FeedConnector {
  const mappingPath = env.FEED_MAPPING?.trim() || join(DEFAULT_MAPPING_DIR, 'mapping.json');
  const feedPath = env.FEED_FILE?.trim() || null;
  return new FeedConnector(mappingPath, feedPath);
}
