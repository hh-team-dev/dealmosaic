/**
 * Countries & markets.
 *
 * Phase 1 is INDIA ONLY (owner instruction, 2 Nov 2026). The rest of the world is
 * present in the data model but explicitly `enabled: false`, so switching a market
 * on later is a data change — not a rewrite. Nothing in the UI may present a
 * disabled market as available.
 */

import type { CurrencyCode } from './money.js';

export interface Country {
  code: string;
  name: string;
  flag: string;
  defaultCurrency: CurrencyCode;
  region: string;
  enabled: boolean;
  /** Why the market is not enabled yet — shown in the admin/UI rather than hidden. */
  note?: string;
}

export const COUNTRIES: Country[] = [
  {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    defaultCurrency: 'INR',
    region: 'South Asia',
    enabled: true,
  },
  { code: 'ZZ', name: 'Universal', flag: '🌍', defaultCurrency: 'USD', region: 'Global', enabled: false, note: 'International mode is deferred until India is complete.' },
  { code: 'US', name: 'United States', flag: '🇺🇸', defaultCurrency: 'USD', region: 'North America', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', defaultCurrency: 'GBP', region: 'Europe', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', defaultCurrency: 'AED', region: 'Middle East', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', defaultCurrency: 'SGD', region: 'South East Asia', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', defaultCurrency: 'EUR', region: 'Europe', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'FR', name: 'France', flag: '🇫🇷', defaultCurrency: 'EUR', region: 'Europe', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', defaultCurrency: 'JPY', region: 'East Asia', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', defaultCurrency: 'AUD', region: 'Oceania', enabled: false, note: 'Market expansion — phase 5.' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', defaultCurrency: 'CAD', region: 'North America', enabled: false, note: 'Market expansion — phase 5.' },
];

export const ACTIVE_COUNTRIES = COUNTRIES.filter((c) => c.enabled);

export const DEFAULT_COUNTRY = 'IN';

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function isMarketEnabled(code: string): boolean {
  return getCountry(code)?.enabled === true;
}

/** Converted amounts are reference values only — this label is shown next to any
 *  converted price so it can never be mistaken for an amount payable. */
export const FX_DISCLAIMER =
  'Converted using daily reference rates, not the amount you will be charged.';

export const REQUIREMENT_FX_INR =
  'Currency conversion uses Frankfurter (European Central Bank and central-bank reference data), updated once per working day.';
