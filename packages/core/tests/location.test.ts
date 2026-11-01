import { describe, expect, it } from 'vitest';
import {
  ETA_BAND_LABELS,
  etaBand,
  haversineKm,
  isInIndia,
  isValidPincode,
  parsePincode,
  samePincode,
} from '../src/location.js';

/**
 * The rule these tests defend: this module may say "I don't know".
 * It may never invent serviceability, a delivery time, or a location.
 */

describe('pincode parsing', () => {
  it('accepts a valid pincode and identifies the postal region', () => {
    const r = parsePincode('400001');
    expect(r.valid).toBe(true);
    expect(r.info!.regionName).toBe('Central');
    expect(r.info!.states).toContain('Maharashtra');
    expect(r.info!.circle).toBe('Mumbai');
  });

  it('tolerates spaces and hyphens, which users paste', () => {
    expect(parsePincode('400 001').info!.pincode).toBe('400001');
    expect(parsePincode('400-001').info!.pincode).toBe('400001');
  });

  it('accepts a number as well as a string', () => {
    expect(parsePincode(560001 as unknown as string).info!.pincode).toBe('560001');
  });

  it('rejects a pincode starting with 0', () => {
    const r = parsePincode('012345');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('do not start with 0');
  });

  it('rejects the wrong length and says how many digits arrived', () => {
    expect(parsePincode('40001').error).toContain('5');
    expect(parsePincode('4000011').valid).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(parsePincode('40000A').valid).toBe(false);
  });

  it('rejects empty input with a helpful message', () => {
    expect(parsePincode('').error).toContain('6-digit');
    expect(parsePincode(null).valid).toBe(false);
  });

  it('maps every first digit to a real region', () => {
    for (const d of ['1', '2', '3', '4', '5', '6', '7', '8', '9']) {
      const r = parsePincode(`${d}10001`);
      expect(r.valid).toBe(true);
      expect(r.info!.states.length).toBeGreaterThan(0);
    }
  });

  it('flags Army Postal Service pincodes instead of pretending they get delivery', () => {
    const r = parsePincode('900001');
    expect(r.valid).toBe(true);
    expect(r.info!.quickCommerceHint).toBe('unknown');
    expect(r.info!.note).toContain('Army Postal Service');
  });
});

describe('serviceability honesty', () => {
  it('never claims certain coverage — only "likely" or "unknown"', () => {
    const info = parsePincode('560001').info!;
    expect(['likely', 'unknown']).toContain(info.quickCommerceHint);
    expect(info.quickCommerceHint).not.toBe('yes' as never);
  });

  it('says plainly that a specific PIN is still unconfirmed even in a metro', () => {
    const info = parsePincode('400001').info!;
    expect(info.quickCommerceHint).toBe('likely');
    expect(info.note).toContain('only the platforms can confirm');
  });

  it('says it does not know, rather than guessing, outside known metros', () => {
    const info = parsePincode('799001').info!; // Agartala region
    expect(info.quickCommerceHint).toBe('unknown');
    expect(info.note).toContain('cannot confirm');
  });
});

describe('comparison helpers', () => {
  it('validates without throwing on junk', () => {
    expect(isValidPincode('400001')).toBe(true);
    expect(isValidPincode(undefined)).toBe(false);
    expect(isValidPincode({})).toBe(false);
  });

  it('treats two invalid pincodes as not the same', () => {
    expect(samePincode('000', '000')).toBe(false);
    expect(samePincode('400001', '400 001')).toBe(true);
    expect(samePincode('400001', '560001')).toBe(false);
  });
});

describe('distance', () => {
  it('is zero for identical points', () => {
    expect(haversineKm({ lat: 19.07, lng: 72.87 }, { lat: 19.07, lng: 72.87 })).toBeCloseTo(0);
  });

  it('is roughly right for Mumbai to Delhi (~1150 km)', () => {
    const km = haversineKm({ lat: 19.076, lng: 72.877 }, { lat: 28.614, lng: 77.209 });
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1200);
  });

  it('knows when a coordinate is outside India', () => {
    expect(isInIndia({ lat: 19.07, lng: 72.87 })).toBe(true);
    expect(isInIndia({ lat: 51.5, lng: -0.12 })).toBe(false);
  });
});

describe('delivery bands', () => {
  it('classifies quick-commerce minutes as instant', () => {
    expect(etaBand(10 / 1440)).toBe('instant');
  });

  it('classifies multi-day delivery as next day or slotted', () => {
    expect(etaBand(2)).toBe('next_day');
    expect(etaBand(5)).toBe('slotted');
  });

  it('returns unknown rather than a default when nothing was published', () => {
    expect(etaBand(null)).toBe('unknown');
    expect(etaBand(undefined)).toBe('unknown');
    expect(etaBand(-1)).toBe('unknown');
    expect(ETA_BAND_LABELS.unknown).toContain('not published');
  });
});
