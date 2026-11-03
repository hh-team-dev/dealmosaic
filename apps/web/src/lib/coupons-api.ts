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
  /**
   * Two answers, not one score. `confidence` is how much evidence stands behind
   * the row; `quality` is how big the merchant's own number is. Both are decided
   * server-side and repeated verbatim, because a client that paraphrases will
   * paraphrase upwards.
   */
  confidence: {
    level: 'unreported' | 'thin' | 'community' | 'moderated';
    label: string;
    detail: string;
    reports: number;
    workedPct: number | null;
  };
  quality: {
    level: 'unknown' | 'minor' | 'solid' | 'strong';
    label: string;
    detail: string;
  };
  expiresAt: string | null;
  verifiedAt: string | null;
  reducesPayablePrice: boolean;
  /* ---- discovery fields ---- */
  campaignName: string;
  categories: string | null;
  dealGroup: 'grocery' | 'electronics' | 'fashion' | 'beauty' | 'home' | 'travel' | 'kids' | 'other';
  offerType: 'coupon' | 'deal';
  /** Price the retailer's own headline states, in paise. null = not stated. */
  statedPriceMinor: number | null;
  statedPriceKind: 'from' | 'only' | 'under' | 'at' | 'for' | null;
  /** Percentage the retailer printed, or null. */
  statedPercent: number | null;
  /** True when the retailer said "up to" — the UI must keep the word "up to". */
  percentIsCap: boolean;
  mentionsBankOrUpi: boolean;
  outboundUrl: string | null;
  startsAt: string | null;
  createdAt: string | null;
}

/** A deal as it appears on a homepage shelf: the coupon plus its urgency. */
export interface DealView extends CouponView {
  daysLeft: number | null;
}

export interface DiscoverSection {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  minItems: number;
  items: DealView[];
}

export interface DiscoverPayload {
  generatedAt: string;
  totals: {
    live: number;
    /** Distinct stores across the live set — replaces a count taken from the shelves. */
    stores: number;
    withCode: number;
    withStatedPrice: number;
    endingThisWeek: number;
    bankOrUpi: number;
  };
  sections: DiscoverSection[];
  withheld: Array<{ id: string; title: string; found: number; needed: number }>;
  rules: { statedPrices: string; savings: string; expiry: string };
}

export interface MerchantView {
  slug: string;
  name: string;
  total: number;
  codes: number;
}

export interface CouponsPayload {
  /** Whole-table counts. Never derive a headline number from the loaded page. */
  totals?: { live: number; withCode: number; stores: number; filtered?: boolean };
  coupons: CouponView[];
  count: number;
  rules: { cashbackIsNotADiscount: string; onlyCheckedCoupons: string };
  emptyMessage: string | null;
}

export async function listCoupons(opts: {
  platform?: string;
  q?: string;
  codesOnly?: boolean;
  /** Shelf filters — the same names the homepage links use. */
  group?: string;
  maxPrice?: number;
  expiring?: number;
  bankOnly?: boolean;
  sort?: 'savings' | 'price' | 'new' | 'ending';
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<CouponsPayload> {
  const params = new URLSearchParams();
  if (opts.platform) params.set('platform', opts.platform);
  if (opts.q) params.set('q', opts.q);
  if (opts.codesOnly) params.set('codes', '1');
  if (opts.group) params.set('group', opts.group);
  if (opts.maxPrice) params.set('maxPrice', String(opts.maxPrice));
  if (opts.expiring) params.set('expiring', String(opts.expiring));
  if (opts.bankOnly) params.set('bank', '1');
  if (opts.sort) params.set('sort', opts.sort);
  params.set('limit', String(opts.limit ?? 60));
  return apiRequest<CouponsPayload>(`/api/coupons?${params.toString()}`, { signal: opts.signal });
}

/**
 * The homepage shelves. One request, nine cuts — computed server-side so a phone
 * on 4G does not pay for nine round trips.
 */
export async function getDiscovery(signal?: AbortSignal): Promise<DiscoverPayload> {
  return apiRequest<DiscoverPayload>('/api/coupons/discover', { signal });
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
    /**
     * The feed leaves the structured value at 0 for most offers, so this branch is
     * the common case, not the edge. When a code exists the useful label is the
     * code — "Deal" told a shopper nothing they could act on.
     */
    default:
      return c.discountValue > 0 ? `₹${c.discountValue} off` : c.code ? 'Code' : 'Deal';
  }
}

/** Days left, or null when it never expires. Negative already filtered out server-side. */
export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * The price line for a deal, or null when the retailer stated no price.
 *
 * The qualifier travels with the number: "from ₹125" and "under ₹199" mean very
 * different things, and flattening both to "₹125" would be the small lie that
 * makes a comparison site untrustworthy.
 */
export function statedPriceLabel(d: {
  statedPriceMinor: number | null;
  statedPriceKind: 'from' | 'only' | 'under' | 'at' | 'for' | null;
}): string | null {
  if (d.statedPriceMinor === null) return null;
  const rupees = d.statedPriceMinor / 100;
  const formatted = `₹${rupees.toLocaleString('en-IN', {
    maximumFractionDigits: rupees < 100 ? 2 : 0,
  })}`;
  switch (d.statedPriceKind) {
    case 'from':
      return `from ${formatted}`;
    case 'under':
      return `under ${formatted}`;
    case 'only':
      return `only ${formatted}`;
    case 'at':
      return `at ${formatted}`;
    default:
      return formatted;
  }
}

/** "up to 70% off" when the retailer said "up to", "20% off" when it did not. */
export function statedPercentLabel(d: { statedPercent: number | null; percentIsCap: boolean }): string | null {
  if (d.statedPercent === null) return null;
  return `${d.percentIsCap ? 'up to ' : ''}${d.statedPercent}% off`;
}

/** The tightest honest urgency line: a real date, or nothing at all. */
export function expiryLabel(expiresAt: string | null, daysLeft: number | null): string | null {
  if (!expiresAt) return null;
  // Callers that did not receive a server-computed day count (the saved page
  // rebuilds cards from localStorage) still get a real label — deriving it here
  // beats printing "No expiry published" on an offer that has a date.
  const days =
    daysLeft ??
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
  if (days <= 0) return 'Ends today';
  if (days === 1) return 'Ends tomorrow';
  if (days <= 7) return `${days} days left`;
  const date = new Date(expiresAt);
  return `Until ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

/**
 * A merchant's monogram. We have no product photography for affiliate offers —
 * inventing product shots would be worse than not having them — so each store
 * gets a stable coloured tile built from its own name.
 */
export function merchantMonogram(name: string): { initials: string; tint: number } {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? '?';
  const initials = (words.length > 1 ? first.charAt(0) + (words[1] ?? '').charAt(0) : first.slice(0, 2)).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return { initials, tint: hash % 6 };
}

/** The shelf label for a deal group, used when the feed gives no category. */
export function groupLabel(group: CouponView['dealGroup']): string {
  switch (group) {
    case 'grocery':
      return 'Grocery';
    case 'electronics':
      return 'Electronics';
    case 'fashion':
      return 'Fashion';
    case 'beauty':
      return 'Beauty';
    case 'home':
      return 'Home';
    case 'travel':
      return 'Travel';
    case 'kids':
      return 'Kids';
    default:
      return 'Offer';
  }
}

/**
 * Tell the site whether a code worked at checkout.
 *
 * This is the only signal that can promote a code, so it is deliberately not a
 * fire-and-forget: the response carries the new counts and the state the code is
 * now in, and the caller shows it. A shopper who reports a dead code should see
 * that their report was recorded, not guess.
 */
export interface CouponOutcome {
  ok: boolean;
  successCount: number;
  failCount: number;
  trustState: string;
  message: string;
}

export function reportCouponOutcome(couponId: string, worked: boolean): Promise<CouponOutcome> {
  return apiRequest<CouponOutcome>(`/api/coupons/${encodeURIComponent(couponId)}/outcome`, {
    method: 'POST',
    body: { worked },
  });
}
