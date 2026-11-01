import { describe, expect, it } from 'vitest';
import {
  FeedConnector,
  MappingError,
  createFeedConnector,
  parseCsv,
  toMinor,
  toShippingMinor,
  validateMapping,
} from '../src/connectors/feed.js';

/**
 * These tests exist to protect four promises the feed importer makes to users:
 *  1. A missing shipping price is null, never 0 (0 means "free delivery" and
 *     would win the ranking for a false reason).
 *  2. Rows without a usable price are dropped, never guessed.
 *  3. A malformed mapping fails loudly instead of producing wrong prices.
 *  4. An unconfigured feed says why, instead of returning [] and looking like
 *     "no price found".
 */

const MAPPING = {
  platformSlug: 'jiomart',
  sourceLabel: 'JioMart · feed',
  columns: {
    title: 'product_name',
    price: 'sale_price',
    url: 'product_url',
    gtin: 'ean',
    mrp: 'mrp',
    inStock: 'availability',
    shipping: 'delivery_charge',
    currency: 'currency',
    priceUnit: 'major' as const,
  },
};

describe('CSV parsing', () => {
  it('handles quoted fields containing commas', () => {
    const rows = parseCsv('title,price\n"Atta, 5 kg",285\n');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.title).toBe('Atta, 5 kg');
  });

  it('handles embedded newlines inside quotes', () => {
    const rows = parseCsv('title,price\n"line one\nline two",10\n');
    expect(rows[0]!.title).toBe('line one\nline two');
  });

  it('handles doubled quotes', () => {
    const rows = parseCsv('title,price\n"The ""best"" atta",10\n');
    expect(rows[0]!.title).toBe('The "best" atta');
  });

  it('strips a UTF-8 BOM, which Excel exports always include', () => {
    const rows = parseCsv('\uFEFFtitle,price\nAtta,10\n');
    expect(Object.keys(rows[0]!)[0]).toBe('title');
  });

  it('ignores blank trailing lines', () => {
    expect(parseCsv('title,price\nAtta,10\n\n\n')).toHaveLength(1);
  });

  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

describe('price conversion', () => {
  it('converts rupees to paise', () => {
    expect(toMinor('285.00', 'major')).toBe(28500);
    expect(toMinor('1,499.50', 'major')).toBe(149950);
  });

  it('accepts a rupee symbol', () => {
    expect(toMinor('₹1499', 'major')).toBe(149900);
  });

  it('leaves minor units alone', () => {
    expect(toMinor('149900', 'minor')).toBe(149900);
  });

  it('rejects unusable prices rather than guessing', () => {
    expect(toMinor('', 'major')).toBeNull();
    expect(toMinor('call for price', 'major')).toBeNull();
    expect(toMinor('-5', 'major')).toBeNull();
  });

  it('distinguishes an absent shipping price from free shipping', () => {
    // The single most important rule in this file: absent is null, not 0.
    expect(toShippingMinor(undefined, 'major')).toBeNull();
    expect(toShippingMinor('', 'major')).toBeNull();
    expect(toShippingMinor('0', 'major')).toBe(0);
  });
});

describe('mapping validation', () => {
  it('accepts a complete mapping', () => {
    expect(validateMapping(MAPPING)).toEqual([]);
  });

  it('reports every problem at once', () => {
    const problems = validateMapping({ columns: { title: 'a' } });
    expect(problems.length).toBeGreaterThan(2);
    expect(problems.join(' ')).toContain('platformSlug');
    expect(problems.join(' ')).toContain('price');
    expect(problems.join(' ')).toContain('url');
  });

  it('rejects an unknown price unit', () => {
    const bad = { ...MAPPING, columns: { ...MAPPING.columns, priceUnit: 'rupees' } };
    expect(validateMapping(bad).join(' ')).toContain('priceUnit');
  });
});

describe('FeedConnector', () => {
  const build = (rows: Array<Record<string, string>>) => {
    const c = new FeedConnector('/nonexistent/mapping.json', null);
    // inject directly: the loader is tested separately
    (c as unknown as { mapping: typeof MAPPING }).mapping = MAPPING;
    (c as unknown as { rows: typeof rows }).rows = rows;
    (c as unknown as { loadError: string | null }).loadError = null;
    (c as unknown as { loadedAt: string }).loadedAt = new Date().toISOString();
    return c;
  };

  const goodRow = {
    product_name: 'Aashirvaad Shudh Chakki Atta, 5 kg',
    sale_price: '285.00',
    product_url: 'https://www.jiomart.com/p/atta-5kg',
    ean: '8901030123456',
    mrp: '340.00',
    availability: 'In stock',
    delivery_charge: '',
    currency: 'INR',
  };

  it('builds an offer and stamps honest provenance', () => {
    const offer = build([goodRow]).buildOffer(goodRow)!;
    expect(offer.itemPriceMinor).toBe(28500);
    expect(offer.mrpMinor).toBe(34000);
    expect(offer.dataOrigin).toBe('feed');
    expect(offer.affiliate).toBe(true);
    expect(offer.currency).toBe('INR');
    expect(offer.shippingMinor).toBeNull();
  });

  it('drops a row with no price instead of inventing one', () => {
    const c = build([{ ...goodRow, sale_price: '' }]);
    expect(c.buildOffer({ ...goodRow, sale_price: '' })).toBeNull();
    expect(c.report().stats.reasons['missing or invalid price']).toBe(1);
  });

  it('drops a row whose URL is not openable', () => {
    const c = build([goodRow]);
    expect(c.buildOffer({ ...goodRow, product_url: 'not-a-url' })).toBeNull();
  });

  it('drops a non-INR row rather than comparing across currencies', () => {
    const c = build([goodRow]);
    expect(c.buildOffer({ ...goodRow, currency: 'USD' })).toBeNull();
  });

  it('matches on GTIN as well as text', async () => {
    const c = build([goodRow]);
    const byGtin = await c.search({ query: 'attaa', gtin: '8901030123456' });
    expect(byGtin).toHaveLength(1);
  });

  it('requires every query token to appear, so "phone" does not match "case"', async () => {
    const c = build([
      { ...goodRow, product_name: 'Phone case for iPhone' },
      { ...goodRow, product_name: 'Phone charger' },
    ]);
    const results = await c.search({ query: 'phone charger' });
    expect(results).toHaveLength(1);
    expect(results[0]!.title).toBe('Phone charger');
  });

  it('marks out-of-stock rows', async () => {
    const c = build([{ ...goodRow, availability: 'Out of stock' }]);
    const [offer] = await c.search({ query: 'atta' });
    expect(offer!.inStock).toBe(false);
  });

  it('reports disabled with a reason when no mapping exists', async () => {
    const c = createFeedConnector({ FEED_MAPPING: '/nonexistent/mapping.json' } as NodeJS.ProcessEnv);
    const health = await c.health();
    expect(health.status).toBe('disabled');
    expect(health.detail).toContain('No mapping file');
    expect(health.needsCredentials).toBe(true);
  });

  it('returns no offers when unconfigured, and never throws', async () => {
    const c = createFeedConnector({} as NodeJS.ProcessEnv);
    await expect(c.search({ query: 'milk' })).resolves.toEqual([]);
  });
});

describe('MappingError', () => {
  it('is a real Error subclass', () => {
    expect(new MappingError('x')).toBeInstanceOf(Error);
  });
});
