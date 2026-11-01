import { describe, expect, it } from 'vitest';
import {
  AUTO_MATCH_THRESHOLD,
  groupOffersByVariant,
  parseQuery,
  resolveVariants,
  scoreMatch,
  titleSimilarity,
  type OfferIdentity,
  type VariantIdentity,
} from '../src/matching.js';

const s25Ultra512: VariantIdentity = {
  variantId: 'v-s25u-512',
  productId: 'p-s25u',
  brand: 'Samsung',
  model: 'Galaxy S25 Ultra',
  name: 'Samsung Galaxy S25 Ultra 12GB 512GB Titanium Black',
  gtin: '8806095781234',
  mpn: 'SM-S938BZKAXSA',
  attributes: { storage: '512gb', ram: '12gb', colour: 'titanium black' },
  variantLabel: '12 GB / 512 GB',
};

const s25Ultra256: VariantIdentity = {
  ...s25Ultra512,
  variantId: 'v-s25u-256',
  gtin: '8806095781227',
  attributes: { storage: '256gb', ram: '12gb', colour: 'titanium black' },
  variantLabel: '12 GB / 256 GB',
};

describe('query parsing', () => {
  it('recognises a barcode typed as a GTIN', () => {
    expect(parseQuery('8806095781234').gtin).toBe('8806095781234');
    expect(parseQuery('8806095781234').quantities).toEqual([]);
  });

  it('pulls capacity tokens out of a natural query', () => {
    const q = parseQuery('Samsung Galaxy S25 Ultra 512GB');
    expect(q.quantities).toContain('512gb');
    expect(q.gtin).toBeNull();
  });

  it('handles grocery pack sizes', () => {
    const q = parseQuery("Lay's Classic Salted 52 g");
    expect(q.quantities).toContain('52g');
  });
});

describe('match ladder', () => {
  it('GTIN is an identity: full confidence, auto-matched', () => {
    const offer: OfferIdentity = {
      gtin: '8806095781234',
      title: 'Samsung Galaxy S25 Ultra 12GB 512GB (Titanium Black)',
      attributes: { storage: '512gb' },
    };
    const m = scoreMatch(offer, s25Ultra512);
    expect(m.score).toBe(1);
    expect(m.method).toBe('gtin');
    expect(m.autoMatched).toBe(true);
  });

  it('two different known barcodes are two different products', () => {
    const offer: OfferIdentity = { gtin: '8806095781227', title: 'Samsung Galaxy S25 Ultra 256GB' };
    const m = scoreMatch(offer, s25Ultra512);
    expect(m.score).toBe(0);
    expect(m.conflicts).toContain('gtin');
    expect(m.autoMatched).toBe(false);
  });

  it('matches on manufacturer part number', () => {
    const m = scoreMatch({ mpn: 'SM-S938BZKAXSA', title: 'Samsung Galaxy S25 Ultra' }, s25Ultra512);
    expect(m.method).toBe('mpn');
    expect(m.score).toBeGreaterThanOrEqual(0.95);
  });

  it('matches on brand + model + agreeing attributes', () => {
    const offer: OfferIdentity = {
      brand: 'Samsung',
      model: 'Galaxy S25 Ultra',
      title: 'Samsung Galaxy S25 Ultra 12GB 512GB Titanium Black 5G',
      attributes: { storage: '512GB', colour: 'Titanium Black' },
    };
    const m = scoreMatch(offer, s25Ultra512);
    expect(m.method).toBe('brand_model_attributes');
    expect(m.autoMatched).toBe(true);
  });

  it('REFUSES to match a 256 GB offer to a 512 GB product', () => {
    const offer: OfferIdentity = {
      brand: 'Samsung',
      model: 'Galaxy S25 Ultra',
      title: 'Samsung Galaxy S25 Ultra 12GB 256GB Titanium Black',
      attributes: { storage: '256GB', colour: 'Titanium Black' },
    };
    const m = scoreMatch(offer, s25Ultra512);
    expect(m.autoMatched).toBe(false);
    expect(m.score).toBeLessThan(AUTO_MATCH_THRESHOLD);
    expect(m.conflicts.join(' ')).toContain('256GB');
  });

  it('is cautious when no attributes are published', () => {
    const m = scoreMatch(
      { brand: 'Samsung', model: 'Galaxy S25 Ultra', title: 'Samsung Galaxy S25 Ultra' },
      s25Ultra512,
    );
    expect(m.score).toBeLessThan(AUTO_MATCH_THRESHOLD);
    expect(m.reasons[0]!.detail).toContain('no variant attributes');
  });

  it('never auto-matches on title text alone', () => {
    const m = scoreMatch({ title: 'Samsung Galaxy S25 Ultra 512GB 12GB Titanium Black' }, s25Ultra512);
    expect(m.method).toBe('title_tokens');
    expect(m.autoMatched).toBe(false);
  });

  it('scores zero for unrelated products', () => {
    const m = scoreMatch({ title: 'Boat Rockerz 450 Bluetooth Headphones' }, s25Ultra512);
    expect(m.score).toBe(0);
    expect(m.method).toBe('none');
  });
});

describe('grocery pack-size safety', () => {
  const chips52: VariantIdentity = {
    variantId: 'v-chips-52',
    productId: 'p-chips',
    brand: "Lay's",
    model: 'Classic Salted',
    name: "Lay's Classic Salted 52 g",
    gtin: '8901491101899',
    attributes: { size: '52g', flavour: 'salted' },
    variantLabel: '52 g',
  };
  const chips180: VariantIdentity = {
    ...chips52,
    variantId: 'v-chips-180',
    gtin: '8901491101905',
    attributes: { size: '180g', flavour: 'salted' },
    variantLabel: '180 g family pack',
  };

  it('keeps 52 g and 180 g apart even with identical titles otherwise', () => {
    const offer: OfferIdentity = {
      brand: "Lay's",
      model: 'Classic Salted',
      title: "Lay's Classic Salted 180 g Family Pack",
      attributes: { size: '180g' },
    };
    expect(scoreMatch(offer, chips52).autoMatched).toBe(false);
    expect(scoreMatch(offer, chips180).autoMatched).toBe(true);
  });

  it('groups offers into the right pack sizes rather than blending them', () => {
    const { groups, unmatched } = groupOffersByVariant(
      [
        {
          gtin: '8901491101899',
          brand: "Lay's",
          model: 'Classic Salted',
          title: "Lay's Classic Salted 52 g",
          attributes: { size: '52g' },
        },
        {
          gtin: '8901491101905',
          brand: "Lay's",
          model: 'Classic Salted',
          title: "Lay's Classic Salted 180 g",
          attributes: { size: '180g' },
        },
      ],
      [chips52, chips180],
    );
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.variantId === 'v-chips-52')!.offers).toHaveLength(1);
    expect(groups.find((g) => g.variantId === 'v-chips-180')!.offers).toHaveLength(1);
    expect(unmatched).toHaveLength(0);
  });
});

describe('variant disambiguation', () => {
  const variants = [s25Ultra256, s25Ultra512];

  it('asks the user when the query names no variant', () => {
    const res = resolveVariants(parseQuery('Samsung Galaxy S25 Ultra'), variants);
    expect(res.mode).toBe('needsSelection');
    if (res.mode === 'needsSelection') {
      expect(res.candidates.map((c) => c.label)).toEqual(['12 GB / 256 GB', '12 GB / 512 GB']);
    }
  });

  it('selects the variant the query actually names', () => {
    const res = resolveVariants(parseQuery('Samsung Galaxy S25 Ultra 512GB'), variants);
    expect(res.mode).toBe('matched');
    if (res.mode === 'matched') expect(res.variant.variantId).toBe('v-s25u-512');
  });

  it('matches a single available variant without asking', () => {
    const res = resolveVariants(parseQuery('anything'), [s25Ultra512]);
    expect(res.mode).toBe('matched');
  });
});

describe('title similarity', () => {
  it('is high for near-identical titles and low for unrelated ones', () => {
    expect(titleSimilarity('Samsung Galaxy S25 Ultra 512GB', 'Samsung Galaxy S25 Ultra 512GB Black')).toBeGreaterThan(0.6);
    expect(titleSimilarity('Wireless Mouse', 'Samsung Galaxy S25 Ultra')).toBe(0);
  });
});
