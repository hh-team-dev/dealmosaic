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
import { cleanCopy, prettyTitle } from './text.js';

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

export interface CuelinksCampaign {
  id: number;
  name: string;
  domain: string | null;
  payout_type: string | null;
  payout: string | null;
  payout_currency: string | null;
  campaign_type: string | null;
  /** `open` reports access, not earnings or permission for every market/placement. */
  access_status: string | null;
  cookie_duration: string | null;
  deeplink_allowed: boolean | null;
  cashback_publishers_allowed: boolean | null;
  countries?: Array<{iso: string; name?: string}>;
  sub_ids_allowed?: boolean | null;
  social_media_publishers_allowed?: boolean | null;
  missing_transactions_accepted?: boolean | null;
  reporting_type?: string | null;
}

export interface CampaignsPage {
  data: CuelinksCampaign[];
  meta: { page: number; per_page: number; total: number; total_pages: number; next_page: number | null };
}

/**
 * Campaign list. The UI requests 100 rows; the read-only audit also received 500 per page. The endpoint is limited to 6
 * requests a minute, exactly like `/offers`. Filtering happens client-side: the
 * API accepts `campaign_type` but ignores most other query parameters.
 */
export function fetchCampaigns(page = 1, perPage = 100, type = 'CPS'): Promise<CampaignsPage> {
  const qs = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (type) qs.set('campaign_type', type);
  return call<CampaignsPage>(`/campaigns?${qs.toString()}`);
}

/* ------------------------------------------------------------------ */
/* The other half of the money: what the network says we earned.        */
/* ------------------------------------------------------------------ */

/**
 * WHY THIS EXISTS.
 *
 * Until now the site could count its own clicks but had no idea whether any of
 * them became money — and the admin page said so, honestly, in a sentence. That
 * sentence was true for exactly as long as we refused to ask the network. The
 * network already knows: it holds the commission, the transaction count and the
 * payout state, keyed by the sub-id we send on every click.
 *
 * Both figures below are the network's, not ours. Nothing here is calculated,
 * estimated or multiplied out: `""` means the network reported nothing, and it is
 * rendered as nothing rather than as zero rupees of income.
 */
export interface EarningsTotals {
  pending: string;
  rejected: string;
  validated: string;
  payable: string;
  claimed: string;
  total: string;
  currency: string;
}

export interface PerformanceTotals {
  clicks: number;
  transactions: number;
  commission: string;
  sale_amount: string;
  cr: string;
  epc: string;
  currency: string;
}

export interface EarningsReport {
  data: Array<Record<string, unknown>>;
  totals: EarningsTotals;
  meta: { page: number; per_page: number; total: number; total_pages: number; currency?: string };
}

export interface PerformanceReport {
  data: Array<Record<string, unknown>>;
  totals: PerformanceTotals;
  meta: { page: number; per_page: number; total: number; total_pages: number; currency?: string };
}

function range(from: string, to: string, extra: Record<string, string> = {}): string {
  const qs = new URLSearchParams({ from, to, ...extra });
  return qs.toString();
}

/** Monthly earnings by commission state — pending, validated, payable, claimed. */
export function fetchEarnings(from: string, to: string, channelId?: number): Promise<EarningsReport> {
  return call<EarningsReport>(
    `/reports/earnings?${range(from, to, channelId ? { channel_id: String(channelId) } : {})}`,
  );
}

/** Daily clicks, transactions, commission, conversion rate and EPC. */
export function fetchPerformance(from: string, to: string, channelId?: number): Promise<PerformanceReport> {
  return call<PerformanceReport>(
    `/reports/performance?${range(from, to, channelId ? { channel_id: String(channelId) } : {})}`,
  );
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
  /** The network's campaign id, when the feed supplied one. */
  campaignId: number | null;
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
  //
  // TITLE FIRST, DESCRIPTION ONLY AS A FALLBACK. Measured on live data: a realme
  // campaign headlined "Save Up to 45% Storewide" has a description ending "with
  // up to 90% off" (about a different product line). Concatenating the two let the
  // description's number override the headline's, which would have printed 90% on
  // a card whose own title says 45%. The headline is the claim; the body is
  // supporting text.
  const titleFacts = readStatedFacts(offer.title);
  const bodyFacts = offer.description ? readStatedFacts(offer.description) : titleFacts;
  const facts = {
    priceMinor: titleFacts.priceMinor ?? bodyFacts.priceMinor,
    priceKind: titleFacts.priceMinor !== null ? titleFacts.priceKind : bodyFacts.priceKind,
    percent: titleFacts.percent ?? bodyFacts.percent,
    percentIsCap: titleFacts.percent !== null ? titleFacts.percentIsCap : bodyFacts.percentIsCap,
  };
  const categoryNames = (offer.categories ?? []).map((c) => c.name);
  const primaryCategory = categoryNames[0] ?? null;

  return {
    externalId: String(offer.id),
    platformSlug: (offer.campaign_name ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
    /**
     * The network does not trim its codes: live data contained "NEW200       "
     * and "   BM5". A shopper who pastes that with the spaces into a checkout
     * field gets "invalid code", blames us, and is right to. 56 of 282 codes
     * were affected when this was found.
     */
    code: offer.coupon_code?.trim() || null,
    /*
     * Decoded, de-marked and de-shouted at the ingest boundary rather than in the
     * UI: the fix then applies to the row in the database, to search, to the
     * ticker and to any future surface that reads it. The live feed shipped
     * `&amp;` and `&lt;` to shoppers before this.
     */
    title: prettyTitle(offer.title, 200) ?? 'Untitled offer',
    description: cleanCopy(offer.description, 400),
    discountType,
    discountValue,
    maxDiscountMinor: null,
    minOrderMinor: null,
    terms: cleanCopy(offer.terms, 8000),
    trackingUrl: offer.tracking_url,
    startsAt: offer.start_date ? `${offer.start_date}T00:00:00.000Z` : null,
    expiresAt: offer.end_date ? `${offer.end_date}T23:59:59.000Z` : null,
    campaignName: (offer.campaign_name ?? 'unknown').slice(0, 80),
    campaignId: offer.campaign_id ?? null,
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
