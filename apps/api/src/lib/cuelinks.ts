/**
 * CUELINKS CLIENT.
 *
 * Cuelinks is an Indian affiliate network. One approved account gives two things
 * that matter to this project:
 *
 *  1. `/pub_api/v3/offers` — a live feed of merchant offers and coupon codes with
 *     real prices and expiry dates. This is the legal, zero-cost answer to the
 *     coupon layer that would otherwise be empty.
 *  2. `/pub_api/v3/links/convert` — turns any product URL into a tracked outbound
 *     link, which is the revenue model.
 *
 * HONESTY RULE, verified against the live API and not assumed: `convert` returns
 * `affiliated: false` for a campaign the publisher has not been approved for. The
 * link still works, but it earns nothing. So a converted link must only be treated
 * as monetised when the API says so — never inferred from the fact that a call
 * succeeded.
 *
 * The API key is a token, not a password: it carries only the scopes Cuelinks
 * granted (read:campaigns, read:offers, read:transactions, read:reports,
 * write:links) and it can be revoked from their dashboard at any time.
 */

import { dealGroupOf, mentionsBankOrUpi, readStatedFacts } from '@dealmosaic/core';

const BASE = 'https://developers.cuelinks.com/pub_api/v3';

export function apiKey(): string | null {
  const key = process.env.CUELINKS_API_KEY?.trim();
  return key && key.length > 8 ? key : null;
}

export function isConfigured(): boolean {
  return apiKey() !== null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = apiKey();
  if (!key) throw new Error('CUELINKS_API_KEY is not set');

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${key}`,
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    // A sync must never hang a request thread.
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Cuelinks ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export interface CuelinksOffer {
  id: number;
  title: string;
  description: string | null;
  terms: string | null;
  coupon_code: string | null;
  offer_type: 'coupon' | 'deal';
  campaign_id: number;
  campaign_name: string;
  categories?: Array<{ id: number; name: string }>;
  tracking_url: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  original_price: number | null;
  discount_price: number | null;
  percent_off: number | null;
}

export interface OffersPage {
  data: CuelinksOffer[];
  meta: { page: number; per_page: number; total: number; total_pages: number; next_page: number | null };
}

export function fetchOffers(page = 1, perPage = 100, channelId?: number): Promise<OffersPage> {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (channelId) qs.set('channel_id', String(channelId));
  return call<OffersPage>(`/offers?${qs.toString()}`);
}

export interface ConvertResult {
  tracking_url: string;
  original_url: string;
  /** False means the link works but earns nothing — campaign not approved yet. */
  affiliated: boolean;
  campaign?: { id: number; name: string };
}

export function convertLink(url: string, channelId?: number): Promise<{ data: ConvertResult }> {
  return call<{ data: ConvertResult }>('/links/convert', {
    method: 'POST',
    body: JSON.stringify({ url, ...(channelId ? { channel_id: channelId } : {}) }),
  });
}

/**
 * Map a Cuelinks offer onto our `coupons` row shape.
 *
 * `trust_state` is `moderator_verified` because the offer came from the merchant's
 * own campaign data through the network — the strongest provenance we can have
 * short of testing the code at checkout ourselves. It is still not the same as
 * having redeemed the code, so the UI must date-stamp it.
 */
export interface CouponRow {
  externalId: string;
  platformSlug: string;
  code: string | null;
  title: string;
  description: string | null;
  discountType: 'percent' | 'flat';
  discountValue: number;
  maxDiscountMinor: number | null;
  minOrderMinor: number | null;
  terms: string | null;
  trackingUrl: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  /** Discovery fields — what the headline says, and which shelf it belongs on. */
  campaignName: string;
  categories: string | null;
  primaryCategory: string | null;
  dealGroup: string;
  offerType: 'coupon' | 'deal';
  statedPriceMinor: number | null;
  statedPriceKind: string | null;
  statedPercent: number | null;
  statedPercentCap: number;
  mentionsBank: number;
}

export function toCouponRow(offer: CuelinksOffer): CouponRow {
  // A coupon with a code is a code; a deal without one is a flat price cut. We do
  // not know the rupee amount of a percentage deal, so we keep the percentage and
  // let the interface show it as a claim against the merchant's price.
  const discountType: 'percent' | 'flat' = offer.percent_off !== null ? 'percent' : 'flat';
  const discountValue =
    offer.percent_off !== null
      ? Math.round(offer.percent_off)
      : offer.original_price !== null && offer.discount_price !== null
        ? Math.max(0, Math.round((offer.original_price - offer.discount_price) * 100))
        : 0;

  // The feed leaves `original_price` / `discount_price` / `percent_off` empty for
  // almost every offer (verified: 0 of 1,085 live offers carried a structured
  // price). The number the merchant wrote in the headline is therefore the only
  // real one, and it is read with the conservative parser in @dealmosaic/core.
  const facts = readStatedFacts(`${offer.title ?? ''} ${offer.description ?? ''}`);
  const categoryNames = (offer.categories ?? []).map((c) => c.name);
  const primaryCategory = categoryNames[0] ?? null;

  return {
    externalId: String(offer.id),
    platformSlug: (offer.campaign_name ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    code: offer.coupon_code,
    title: offer.title.slice(0, 200),
    description: offer.description?.slice(0, 400) ?? null,
    discountType,
    discountValue,
    maxDiscountMinor: null,
    minOrderMinor: null,
    terms: offer.terms?.slice(0, 400) ?? null,
    trackingUrl: offer.tracking_url,
    startsAt: offer.start_date ? `${offer.start_date}T00:00:00.000Z` : null,
    expiresAt: offer.end_date ? `${offer.end_date}T23:59:59.000Z` : null,
    campaignName: (offer.campaign_name ?? 'unknown').slice(0, 80),
    categories: categoryNames.length > 0 ? categoryNames.join(', ').slice(0, 160) : null,
    primaryCategory,
    dealGroup: dealGroupOf(primaryCategory),
    offerType: offer.offer_type === 'coupon' ? 'coupon' : 'deal',
    statedPriceMinor: facts.priceMinor,
    statedPriceKind: facts.priceKind,
    statedPercent: facts.percent,
    statedPercentCap: facts.percentIsCap ? 1 : 0,
    mentionsBank: mentionsBankOrUpi(`${offer.title ?? ''} ${offer.description ?? ''}`) ? 1 : 0,
  };
}
