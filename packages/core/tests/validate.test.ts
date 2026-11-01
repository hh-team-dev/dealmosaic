import { describe, expect, it } from 'vitest';
import {
  normaliseEmail,
  passwordStrength,
  validateDisplayName,
  validateEmail,
  validatePassword,
  validatePincode,
} from '../src/validate.js';
import { ACTIVE_COUNTRIES, COUNTRIES, isMarketEnabled } from '../src/countries.js';

describe('validation', () => {
  it('accepts normal emails and rejects broken ones', () => {
    expect(validateEmail('founder@dealmosaic.in')).toBeNull();
    expect(validateEmail('  FOUNDER@DealMosaic.IN ')).toBeNull();
    expect(validateEmail('no-at-sign.com')).not.toBeNull();
    expect(validateEmail('two@@at.com')).not.toBeNull();
    expect(validateEmail('')).not.toBeNull();
  });

  it('normalises email case and whitespace', () => {
    expect(normaliseEmail('  Founder@Example.COM ')).toBe('founder@example.com');
  });

  it('enforces the password policy', () => {
    expect(validatePassword('short1A')).not.toBeNull();
    expect(validatePassword('password123')).not.toBeNull(); // common
    expect(validatePassword('lowercaseonly')).not.toBeNull(); // one class
    expect(validatePassword('MosaicPrism#2026')).toBeNull();
  });

  it('scores password strength', () => {
    expect(passwordStrength('abc').score).toBe(0);
    expect(passwordStrength('MosaicPrism#2026').score).toBe(4);
  });

  it('validates display names', () => {
    expect(validateDisplayName('A')).not.toBeNull();
    expect(validateDisplayName('Ananya')).toBeNull();
  });

  it('validates Indian pin codes', () => {
    expect(validatePincode('712201')).toBeNull();
    expect(validatePincode('012201')).not.toBeNull();
    expect(validatePincode('71220')).not.toBeNull();
  });
});

describe('market configuration', () => {
  it('ships India enabled and everything else explicitly disabled', () => {
    expect(ACTIVE_COUNTRIES.map((c) => c.code)).toEqual(['IN']);
    expect(COUNTRIES.length).toBeGreaterThan(5);
    expect(isMarketEnabled('US')).toBe(false);
    expect(isMarketEnabled('ZZ')).toBe(false);
  });

  it('gives every disabled market a reason, so nothing is silently hidden', () => {
    for (const c of COUNTRIES.filter((x) => !x.enabled)) {
      expect(c.note, `${c.code} needs a note`).toBeTruthy();
    }
  });
});
