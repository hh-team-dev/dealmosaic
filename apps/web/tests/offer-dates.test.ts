import { afterEach, expect, it, vi } from 'vitest';
import { expiryLabel, publishedOfferDate } from '../src/lib/coupons-api';
afterEach(() => vi.unstubAllEnvs());
it.each(['Asia/Kolkata', 'Pacific/Auckland', 'America/Los_Angeles'])('preserves a date-only feed calendar label in %s', zone => {
  vi.stubEnv('TZ', zone);
  expect(publishedOfferDate('2026-11-30T23:59:59.000Z')).toBe('30 Nov 2026');
  expect(publishedOfferDate('2027-02-28T23:59:59Z')).toBe('28 Feb 2027');
});
it('does not turn every expired saved offer into Ends today', () => {
  expect(expiryLabel('2000-01-01T23:59:59Z', 0)).toBe('Expired: 1 Jan 2000');
});
it('does not print invalid dates or invent an expiry', () => {
  expect(expiryLabel(null, null)).toBeNull();
  expect(expiryLabel('not-a-date', null)).toBe('Check expiry with the store');
});
it('uses India time for an actual timestamp, rather than the legacy date-only encoding', () => {
  expect(publishedOfferDate('2026-11-30T23:00:00Z')).toBe('1 Dec 2026');
});
