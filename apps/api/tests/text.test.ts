import { describe, expect, it } from 'vitest';
import { cleanCopy, decodeEntities, prettyTitle } from '../src/lib/text.js';

/**
 * THE COPY LAYER.
 *
 * These are written as prohibitions, because that is what they are for: the page
 * must never print a raw entity, a tag, a double space or a headline typed in
 * caps lock. Each case below is a string that actually reached production — the
 * `&amp;` came off a live card during the site tour on 3 November 2026.
 */
describe('decodeEntities', () => {
  it('decodes the named entities the feed actually sends', () => {
    expect(decodeEntities('Nutritional &amp; Fitness')).toBe('Nutritional & Fitness');
    expect(decodeEntities('hairfall &amp; dandruff')).toBe('hairfall & dandruff');
    expect(decodeEntities('a &lt;b&gt; c')).toBe('a <b> c');
    expect(decodeEntities('it&rsquo;s')).toBe('it\u2019s');
  });

  it('decodes numeric and hexadecimal escapes', () => {
    expect(decodeEntities('&#8377;499')).toBe('\u20b9499');
    expect(decodeEntities('&#x20B9;499')).toBe('\u20b9499');
  });

  it('leaves a bare ampersand and unknown entities alone', () => {
    expect(decodeEntities('Tom & Jerry')).toBe('Tom & Jerry');
    expect(decodeEntities('&notarealentity;')).toBe('&notarealentity;');
  });

  it('never throws on a hostile code point', () => {
    expect(decodeEntities('&#999999999;')).toBe('&#999999999;');
    expect(decodeEntities('&#0;')).toBe('&#0;');
  });
});

describe('cleanCopy', () => {
  it('strips markup and collapses whitespace', () => {
    expect(cleanCopy('<p>Save   <b>50%</b>\n today</p>')).toBe('Save 50% today');
  });

  it('decodes twice, because the network double-escapes', () => {
    expect(cleanCopy('a &amp;amp; b')).toBe('a & b');
  });

  it('removes zero-width characters', () => {
    expect(cleanCopy('Sale\u200b here\ufeff!')).toBe('Sale here!');
  });

  it('returns null for blank input rather than an empty string', () => {
    expect(cleanCopy('   ')).toBeNull();
    expect(cleanCopy(null)).toBeNull();
  });

  it('truncates with an ellipsis, never mid-word punctuation soup', () => {
    const out = cleanCopy('a'.repeat(500), 20);
    expect(out).toHaveLength(20);
    expect(out?.endsWith('\u2026')).toBe(true);
  });
});

describe('prettyTitle', () => {
  it('sentence-cases a shouty headline', () => {
    expect(prettyTitle('DIWALI BLAST: GET 45% OFF ON ALL FASHION + EXTRA 10% SAVINGS TODAY')).toBe(
      'Diwali Blast: Get 45% off on All Fashion + Extra 10% Savings Today',
    );
  });

  it('leaves mixed-case product names untouched', () => {
    expect(prettyTitle('iPhone 15 PRO MAX')).toBe('iPhone 15 PRO MAX');
    expect(prettyTitle('JioMart grocery offer')).toBe('JioMart grocery offer');
  });

  it('leaves a short capitalised acronym alone', () => {
    expect(prettyTitle('MRP DROP')).toBe('MRP DROP');
  });

  it('decodes entities and markup in the same pass', () => {
    expect(prettyTitle('Shop Dymatize Nutritional &amp; Fitness Supplements today!')).toBe(
      'Shop Dymatize Nutritional & Fitness Supplements today!',
    );
    expect(prettyTitle('Save on <em>protein</em> today')).toBe('Save on protein today');
  });
});
