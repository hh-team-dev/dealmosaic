import { describe, expect, it } from 'vitest';
import {
  dealGroupOf,
  mentionsBankOrUpi,
  parseStatedPercent,
  parseStatedPrice,
  readStatedFacts,
} from '../src/offer-text.js';

/**
 * These tests are the contract that stops a discount being read as a price.
 * Every string in them is a real headline shape from the live affiliate feed —
 * which is why the "rejects" cases matter more than the "accepts" ones.
 */
describe('parseStatedPrice', () => {
  it('reads a plain "at Rs." price', () => {
    expect(parseStatedPrice('Gonoise | Noise Air Buds Pro 6 at Rs.2707!')).toEqual({
      priceMinor: 270_700,
      priceKind: 'at',
    });
  });

  it('reads "from" and marks it as a starting price', () => {
    expect(parseStatedPrice('Elevate Your Workout - Running Clothes from Rs.795!')).toEqual({
      priceMinor: 79_500,
      priceKind: 'from',
    });
  });

  it('reads Indian comma grouping without turning ₹1,64,900 into ₹1', () => {
    expect(parseStatedPrice('Apple iPhone 18 Pro Series – Only Rs.1,64,900!').priceMinor).toBe(16_490_000);
  });

  it('reads "starting at" and "starting price"', () => {
    expect(parseStatedPrice('Barrier Repair Starting at Rs. 249').priceMinor).toBe(24_900);
    expect(parseStatedPrice('Get the Google Pixel 10 Series - Starting Price Rs.79999').priceMinor).toBe(7_999_900);
  });

  it('reads "under" as a ceiling', () => {
    expect(parseStatedPrice('Unbeatable Festive Offer: Get It All Under ₹199 at Hamara Mall!')).toEqual({
      priceMinor: 19_900,
      priceKind: 'under',
    });
  });

  it('handles the ₹ symbol and the INR code', () => {
    expect(parseStatedPrice('Trendy Ethnic Shirts for Women – Prices Begin at ₹699!').priceMinor).toBe(69_900);
    expect(parseStatedPrice('Serum starting at INR 599').priceMinor).toBe(59_900);
  });

  // ---- the important half: what must NOT be mistaken for a price ----------
  it('rejects a flat discount amount', () => {
    expect(parseStatedPrice('Unlock Rs.100 Off on Jeans with a Minimum Purchase of Rs.1299!').priceMinor).toBeNull();
  });

  it('rejects a minimum-order threshold', () => {
    expect(parseStatedPrice('Shop for Rs. 1299 on orders of Rs.999 and save').priceMinor).toBeNull();
  });

  it('rejects a cashback amount', () => {
    expect(parseStatedPrice('Get Rs.200 cashback on your first order').priceMinor).toBeNull();
  });

  it('rejects a "save up to" amount', () => {
    expect(parseStatedPrice('OPPO Find X10 Pro Max from Rs. 199,999 + Save Up to Rs. 23,999!').priceMinor).toBe(19_999_900);
  });

  it('returns null for prose with no money in it', () => {
    expect(parseStatedPrice('Join the Diwali festivities with our unbeatable supplement sale!')).toEqual({
      priceMinor: null,
      priceKind: null,
    });
    expect(parseStatedPrice(null).priceMinor).toBeNull();
  });

  it('ignores absurd amounts rather than publishing them', () => {
    expect(parseStatedPrice('Win a car for Rs. 9,99,99,999').priceMinor).toBeNull();
  });
});

describe('parseStatedPercent', () => {
  it('reads a flat percentage', () => {
    expect(parseStatedPercent('Special Offer: Flat 20% Off on Unflavored Protein!')).toEqual({
      percent: 20,
      percentIsCap: false,
    });
  });

  it('keeps "up to" as a cap instead of a promise', () => {
    expect(parseStatedPercent('Grab Your New Router: Enjoy Up to 65% Off!')).toEqual({
      percent: 65,
      percentIsCap: true,
    });
  });

  it('takes the headline number from a compound offer', () => {
    expect(parseStatedPercent('LuvLap Festive Extravaganza | Save Up to 50% + Take an Extra 5% Off')).toEqual({
      percent: 50,
      percentIsCap: true,
    });
  });

  it('ignores cashback percentages entirely', () => {
    expect(parseStatedPercent('Get 10% cashback with your HDFC card').percent).toBeNull();
  });

  it('rejects impossible percentages', () => {
    expect(parseStatedPercent('99% off everything forever').percent).toBeNull();
  });
});

describe('readStatedFacts', () => {
  it('returns both facts at once', () => {
    expect(readStatedFacts('Massive Protein Savings Alert: Up to 70% Off Combo Packs, Prices from Rs. 125!')).toEqual({
      priceMinor: 12_500,
      priceKind: 'from',
      percent: 70,
      percentIsCap: true,
    });
  });
});

describe('dealGroupOf', () => {
  it('maps the feed vocabulary onto shopper vocabulary', () => {
    expect(dealGroupOf('Food & Grocery')).toBe('grocery');
    expect(dealGroupOf('Mobiles')).toBe('electronics');
    expect(dealGroupOf('Gaming')).toBe('electronics');
    expect(dealGroupOf('Health & Beauty')).toBe('beauty');
    expect(dealGroupOf('Home & Kitchen')).toBe('home');
    expect(dealGroupOf('Fashion')).toBe('fashion');
    expect(dealGroupOf('Travel')).toBe('travel');
    expect(dealGroupOf('Baby & Kids')).toBe('kids');
    expect(dealGroupOf('Services')).toBe('other');
  });

  it('is case- and space-tolerant', () => {
    expect(dealGroupOf('  food &  grocery ')).toBe('grocery');
    expect(dealGroupOf(null)).toBe('other');
  });
});

describe('mentionsBankOrUpi', () => {
  it('finds banks, cards and UPI apps', () => {
    expect(mentionsBankOrUpi('Extra 10% off with HDFC Bank credit card')).toBe(true);
    expect(mentionsBankOrUpi('Pay by UPI and save ₹50')).toBe(true);
    expect(mentionsBankOrUpi('PhonePe users get cashback')).toBe(true);
  });

  it('does not fire on ordinary copy', () => {
    expect(mentionsBankOrUpi('Cotton kurta set, flat 40% off')).toBe(false);
    expect(mentionsBankOrUpi(null)).toBe(false);
  });
});
