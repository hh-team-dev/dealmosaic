import { describe, expect, it } from 'vitest';
import { combineOrigins, describeOrigin, labelFor } from '../src/services/price-origin.js';

/**
 * A PRICE WITHOUT AN ORIGIN IS A CLAIM.
 *
 * The site prints "from ₹271.79" above a list whose every row says "illustrative".
 * The label was one level below the number people actually read, which is the
 * shape of an accidental lie. These tests hold the number and the label together.
 */

describe('combineOrigins', () => {
  it('is live only when every offer behind the number is live', () => {
    expect(combineOrigins(['live', 'live'])).toBe('live');
  });

  it('is demo when nothing behind the number came from a feed', () => {
    expect(combineOrigins(['demo', 'demo', 'demo'])).toBe('demo');
  });

  it('is mixed when the set is split — one live offer does not launder the rest', () => {
    expect(combineOrigins(['live', 'demo'])).toBe('mixed');
    expect(combineOrigins(['demo', 'live', 'demo'])).toBe('mixed');
  });

  it('is null when there is no price at all', () => {
    expect(combineOrigins([])).toBeNull();
    expect(combineOrigins([null, undefined])).toBeNull();
  });

  it('ignores unknown origin strings rather than treating them as live', () => {
    expect(combineOrigins(['demo', 'something-else'])).toBe('demo');
  });
});

describe('describeOrigin', () => {
  it('stays silent for a genuinely live price', () => {
    const label = describeOrigin('live');
    expect(label.chip).toBe('');
    expect(label.caveat).toBe('');
  });

  it('never lets an illustrative price pass as a quote', () => {
    const label = describeOrigin('demo');
    expect(label.chip).toBe('Illustrative');
    expect(label.caveat).toContain('not a live quote');
  });

  it('tells a mixed set to look at the individual offers', () => {
    const label = describeOrigin('mixed');
    expect(label.chip).toBe('Mixed sources');
    expect(label.caveat).toContain('each offer below says which');
  });

  it('says nothing at all when there is no price', () => {
    expect(describeOrigin(null)).toEqual({ origin: null, chip: '', caveat: '' });
  });
});

describe('labelFor', () => {
  it('goes straight from raw offers to a label', () => {
    expect(labelFor(['demo', 'demo']).origin).toBe('demo');
    expect(labelFor(['live']).origin).toBe('live');
    expect(labelFor([]).origin).toBeNull();
  });
});
