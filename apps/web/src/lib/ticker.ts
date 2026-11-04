import { discountLabel, statedPercentLabel, type CouponView } from './coupons-api';
export const TICKER_FRESH_MS = 5 * 60_000;
/** A ticker is discovery, not proof that a coupon has been checkout-verified. */
export function eligibleTickerOffers(coupons: CouponView[], now = Date.now()): CouponView[] {
  const seen = new Set<string>();
  return coupons.filter(c => {
    if (!c || typeof c.id !== 'string' || !c.title || !c.platformSlug || seen.has(c.id)) return false;
    if (['expired', 'rejected'].includes(c.trustState)) return false;
    if (c.startsAt && (!Number.isFinite(Date.parse(c.startsAt)) || Date.parse(c.startsAt) > now)) return false;
    if (c.expiresAt && (!Number.isFinite(Date.parse(c.expiresAt)) || Date.parse(c.expiresAt) <= now)) return false;
    if (!c.code && !(c.discountValue > 0) && !(c.statedPercent && c.statedPercent > 0)) return false;
    seen.add(c.id); return true;
  }).slice(0, 14);
}
export function tickerOfferPath(c: Pick<CouponView, 'platformSlug' | 'title'>): string {
  return '/deals?' + new URLSearchParams({ platform: c.platformSlug, q: c.title }).toString();
}

export function tickerDiscountLabel(c: CouponView): string {
  if (c.discountType === 'cashback') return c.discountValue > 0 ? discountLabel(c) : 'Cashback offer';
  if (c.statedPercent && c.statedPercent > 0) return statedPercentLabel(c) || 'Listed offer';
  if (c.discountValue > 0 || c.discountType === 'free_delivery') return discountLabel(c);
  return c.code ? 'Code available' : 'Listed offer';
}
