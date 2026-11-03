import { describe, expect, it } from 'vitest';
import { cleanCopy, decodeEntities, prettyTitle, splitSentences } from '../src/lib/text.js';

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

/**
 * WELDED SENTENCES.
 *
 * Every string in this block was read off the deployed API on 3 November 2026,
 * not invented for the test. 94 of 192 sampled descriptions contained at least one
 * weld, which is why this is a function and not a one-line patch in the card.
 */
describe('splitSentences', () => {
  it('separates the merchant copy that arrived welded', () => {
    expect(
      splitSentences('Prices starting from just Rs. 1299!Enjoy a flat discount of Rs. 150 with the promo code.'),
    ).toBe('Prices starting from just Rs. 1299! Enjoy a flat discount of Rs. 150 with the promo code.');
    expect(splitSentences('Valid for orders of Rs. 1999 and above.Act fast to grab this offer!')).toBe(
      'Valid for orders of Rs. 1999 and above. Act fast to grab this offer!',
    );
    expect(splitSentences('Discount on Refurbished iPhone 15 & 16!Applicable on the entire range.')).toBe(
      'Discount on Refurbished iPhone 15 & 16! Applicable on the entire range.',
    );
  });

  it('puts the missing space after a currency prefix', () => {
    expect(splitSentences('Headphones at Rs.1299 today')).toBe('Headphones at Rs. 1299 today');
    expect(splitSentences('Cashback above Rs.450')).toBe('Cashback above Rs. 450');
  });

  it('never breaks a number, an initial or a short abbreviation', () => {
    expect(splitSentences('Grow from 1.5 kg to 2.99 kg')).toBe('Grow from 1.5 kg to 2.99 kg');
    expect(splitSentences('Made in the U.S. market')).toBe('Made in the U.S. market');
    expect(splitSentences('Offers below Rs. 199, e.g. 99')).toBe('Offers below Rs. 199, e.g. 99');
  });

  it('is applied inside cleanCopy, so every ingest path gets it', () => {
    expect(cleanCopy('Wow!Grab it.Valid today only.')).toBe('Wow! Grab it. Valid today only.');
    expect(cleanCopy('Rs.1299 flat off')).toBe('Rs. 1299 flat off');
  });

  it('is idempotent — a re-sync cannot keep growing the spaces', () => {
    const once = splitSentences('Wow!Grab it.Valid today');
    expect(once).toBe('Wow! Grab it. Valid today');
    expect(splitSentences(once)).toBe(once);
  });
});
