import { apiRequest } from './api';

/**
 * Coupon / deals client.
 *
 * The shape mirrors the API deliberately, including `reducesPayablePrice`, so the
 * interface cannot accidentally add cashback into a total the shopper is about to
 * pay. Truthy fields are never re-derived on the client.
 */
export interface CouponView {
  id: string;
  platformSlug: string;
  platformName: string;
  code: string | null;
  title: string;
  description: string | null;
  discountType: 'percent' | 'flat' | 'cashback' | 'free_delivery';
  discountValue: number;
  maxDiscountMinor: number | null;
  minOrderMinor: number | null;
  categorySlug: string | null;
  terms: string | null;
  source: string;
  trustState: string;
  successCount: number;
  failCount: number;
  expiresAt: string | null;
  verifiedAt: string | null;
  reducesPayablePrice: boolean;
}

export interface MerchantView {
  slug: string;
  name: string;
  total: number;
  codes: number;
}

export interface CouponsPayload {
  coupons: CouponView[];
  count: number;
  rules: { cashbackIsNotADiscount: string; onlyCheckedCoupons: string };
  emptyMessage: string | null;
}

export async function listCoupons(opts: {
  platform?: string;
  q?: string;
  codesOnly?: boolean;
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<CouponsPayload> {
  const params = new URLSearchParams();
  if (opts.platform) params.set('platform', opts.platform);
  if (opts.q) params.set('q', opts.q);
  if (opts.codesOnly) params.set('codes', '1');
  params.set('limit', String(opts.limit ?? 60));
  return apiRequest<CouponsPayload>(`/api/coupons?${params.toString()}`, { signal: opts.signal });
}

export async function listMerchants(signal?: AbortSignal): Promise<{ merchants: MerchantView[] }> {
  return apiRequest<{ merchants: MerchantView[] }>('/api/coupons/merchants', { signal });
}

/** Human label for the discount, e.g. "20% off" or "₹500 off". */
export function discountLabel(c: CouponView): string {
  switch (c.discountType) {
    case 'percent':
      return `${c.discountValue}% off`;
    case 'cashback':
      return `₹${c.discountValue} cashback`;
    case 'free_delivery':
      return 'Free delivery';
    default:
      return c.discountValue > 0 ? `₹${c.discountValue} off` : 'Deal';
  }
}

/** Days left, or null when it never expires. Negative already filtered out server-side. */
export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}
