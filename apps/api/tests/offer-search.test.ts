import { beforeAll, describe, expect, it } from 'vitest';

process.env.DB_PATH = ':memory:';
process.env.NODE_ENV = 'development';

let findOfferMatches: typeof import('../src/services/offer-search.js').findOfferMatches;
let searchTokens: typeof import('../src/services/offer-search.js').searchTokens;
let db: typeof import('../src/db/index.js').db;

/**
 * The fallback that turns a dead-end search into live listings.
 *
 * What is tested here is the boundary, not the feature: an offer listing is not
 * a comparison, so the matcher must be strict. Every meaningful word must match,
 * stopwords must not smuggle a result in, expired rows must never appear, and an
 * empty answer must stay empty rather than being padded.
 */

const NOW = new Date();
const tomorrow = new Date(NOW.getTime() + 86_400_000).toISOString();
const yesterday = new Date(NOW.getTime() - 86_400_000).toISOString();

async function insertCoupon(over: Record<string, unknown> = {}) {
  const id = `test-${Math.random().toString(36).slice(2, 10)}`;
  const row = {
    id,
    platform_slug: 'croma',
    code: 'NOISE10',
    title: 'Noise Air Buds Pro 6 at Rs.2707',
    description: 'True wireless earbuds',
    discount_type: 'percent',
    discount_value: 10,
    source: 'affiliate',
    trust_state: 'reported',
    expires_at: tomorrow,
    offer_type: 'deal',
    campaign_name: 'Croma',
    ...over,
  };
  await db
    .prepare(
      `INSERT INTO coupons (id, platform_slug, code, title, description, discount_type, discount_value,
                            source, trust_state, expires_at, offer_type, created_at, campaign_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.platform_slug,
      row.code,
      row.title,
      row.description,
      row.discount_type,
      row.discount_value,
      row.source,
      row.trust_state,
      row.expires_at,
      row.offer_type,
      NOW.toISOString(),
      row.campaign_name,
    );
  return row;
}

beforeAll(async () => {
  // Importing the app starts migrations and the catalogue seed; awaiting `ready`
  // is what makes the schema exist before the first query. Without it the seed's
  // write transaction can still be open, which on an in-memory libSQL database
  // fails every later statement with TRANSACTION_ACTIVE.
  const appModule = await import('../src/app.js');
  await appModule.ready;
  ({ db } = await import('../src/db/index.js'));
  ({ findOfferMatches, searchTokens } = await import('../src/services/offer-search.js'));
  await db.prepare('DELETE FROM coupons').run();
});

describe('searchTokens', () => {
  it('keeps words that carry signal and drops the ones that match everything', () => {
    expect(searchTokens('best deals on Noise earbuds')).toEqual(['noise', 'earbuds']);
  });

  it('drops tokens shorter than three characters rather than matching noise', () => {
    expect(searchTokens('5 kg aata')).toEqual(['aata']);
  });

  it('caps the number of AND terms so a long sentence is not guaranteed to match nothing', () => {
    expect(searchTokens('one two three four five six').length).toBe(4);
  });

  it('returns nothing for a query made only of punctuation', () => {
    expect(searchTokens('!!! ???')).toEqual([]);
  });
});

describe('findOfferMatches', () => {
  it('finds a live offer by a word in its own title', async () => {
    await insertCoupon();
    const rows = await findOfferMatches('noise earbuds');
    expect(rows.length).toBe(1);
    expect(rows[0]!.title).toMatch(/Noise Air Buds/);
    expect(rows[0]!.daysLeft).toBeGreaterThan(0);
  });

  it('requires every meaningful word, so a one-word overlap is not a match', async () => {
    const rows = await findOfferMatches('noise kurta');
    expect(rows).toEqual([]);
  });

  it('matches on the campaign name as well as the title', async () => {
    await insertCoupon({ title: 'Something unrelated', campaign_name: 'Boat Lifestyle', code: null });
    const rows = await findOfferMatches('boat lifestyle');
    expect(rows.length).toBe(1);
  });

  it('never returns an expired offer', async () => {
    await insertCoupon({ title: 'Expired thing', expires_at: yesterday });
    const rows = await findOfferMatches('expired thing');
    expect(rows).toEqual([]);
  });

  it('never returns a rejected offer', async () => {
    await insertCoupon({ title: 'Rejected thing', trust_state: 'rejected' });
    const rows = await findOfferMatches('rejected thing');
    expect(rows).toEqual([]);
  });

  it('puts something with a code above something without one', async () => {
    await db.prepare('DELETE FROM coupons').run();
    await insertCoupon({ title: 'Wired buds', code: null });
    await insertCoupon({ title: 'Wireless buds', code: 'WIRELESS20' });
    const rows = await findOfferMatches('buds');
    expect(rows[0]!.code).toBe('WIRELESS20');
  });

  it('returns an empty list instead of padding when nothing matches', async () => {
    const rows = await findOfferMatches('nothingatall matches this');
    expect(rows).toEqual([]);
  });

  it('carries the merchant’s stated facts through, without inventing any', async () => {
    await insertCoupon();
    const rows = await findOfferMatches('noise');
    expect(rows[0]!.statedPriceMinor).toBeNull();
    expect(rows[0]!.statedPercent).toBeNull();
  });
});
