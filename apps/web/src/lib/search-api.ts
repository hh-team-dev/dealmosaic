import { apiRequest } from './api';
import type { DealView } from './coupons-api';

/* ------------------------------------------------------------------ */
/* Types mirroring the API payloads                                    */
/* ------------------------------------------------------------------ */

export type VerificationState = 'complete' | 'partial' | 'unverified';
export type LineState = 'confirmed' | 'estimated' | 'not_available' | 'not_applicable' | 'conditional';

export interface PriceLine {
  kind: 'item' | 'shipping' | 'tax' | 'fee' | 'discount' | 'duty' | 'conversion';
  label: string;
  state: LineState;
  amountMinor: number | null;
  note?: string;
}

export interface PriceTruth {
  currency: 'INR';
  lines: PriceLine[];
  knownTotalMinor: number;
  verifiedTotalMinor: number | null;
  verificationState: VerificationState;
  missing: string[];
  conditional: string[];
  discountsAppliedMinor: number;
}

export interface ConfidenceComponent {
  key: 'source' | 'freshness' | 'match' | 'shipping' | 'seller';
  label: string;
  value: number;
  weight: number;
  detail: string;
}

export interface PlatformInfo {
  slug: string;
  name: string;
  owner: string;
  kind: string;
  status: string;
  statusNote: string;
  deliveryPromise: string | null;
  affiliate: boolean;
}

export interface OfferView {
  rank: number;
  offerId: string;
  platform: PlatformInfo;
  title: string;
  sellerName: string;
  sellerType: string;
  productUrl: string;
  price: PriceTruth;
  itemPriceMinor: number;
  mrpMinor: number | null;
  hiddenCostMinor: number;
  discountVsMrpMinor: number | null;
  discountVsMrpPct: number | null;
  inStock: boolean;
  condition: string;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  returnWindowDays: number | null;
  warrantyMonths: number | null;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceComponent[];
  matchConfidence: number;
  matchMethod: string;
  whyRanked: string;
  affiliate: boolean;
  dataOrigin: string;
  sourceLabel: string;
  lastCheckedAt: string;
  observationCount: number;
  firstObservedAt: string;
  sellerRating: number | null;
  sellerRatingCount: number | null;
  productRating: number | null;
  productReviewCount: number | null;
}

export interface ComparisonStats {
  observedOffers: number;
  returnedOffers: number;
  cheapestVerifiedMinor: number | null;
  medianMinor: number | null;
  highestMinor: number | null;
  spreadMinor: number | null;
  maxSavingMinor: number | null;
  maxSavingPct: number | null;
  unverifiedCount: number;
}

export interface Comparison {
  kind: 'comparison';
  query: string;
  resolvedAt: string;
  dataMode: 'demo' | 'live' | 'mixed';
  product: {
    id: string;
    slug: string;
    title: string;
    brand: string;
    category: string;
    categorySlug: string;
    description: string;
    isGrocery: boolean;
  };
  variant: {
    id: string;
    label: string;
    attributes: Record<string, string>;
    gtin: string | null;
    mpn: string | null;
    isbn: string | null;
    mrpMinor: number | null;
    unit: string | null;
    netQuantity: number | null;
    packCount: number;
  };
  offers: OfferView[];
  rankingBasis: 'verified_total' | 'verified_portion_only';
  podiumNote: string | null;
  stats: ComparisonStats;
  unitPrice: { per100: number | null; perBase: number | null; unit: string | null; basis: string } | null;
  history: Array<{ observedAt: string; priceMinor: number }>;
  otherVariants: Array<{ id: string; label: string; offerCount: number }>;
  disclaimers: string[];
}

export interface NeedsSelection {
  kind: 'needs_selection';
  query: string;
  product: { title: string; brand: string; slug: string; category: string };
  candidates: Array<{ variantId: string; label: string; attributes: Record<string, string>; evidence: string }>;
  reason: string;
}

export interface NoResults {
  kind: 'no_results';
  query: string;
  suggestions: Array<{ slug: string; title: string; brand: string; category: string }>;
  /**
   * Live merchant offers whose own copy matches the query. Shown as listings,
   * never as a comparison: we did not match a product identity, so we are
   * quoting the store rather than ranking anybody.
   */
  offers?: DealView[];
  reason: string;
}

export type SearchOutcome = Comparison | NeedsSelection | NoResults;

export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: string;
  categorySlug: string;
  description: string;
  isGrocery: boolean;
  priceFromMinor: number | null;
  /**
   * The printed pack MRP. Kept separate from the offer price because they answer
   * different questions, and a card that prints MRP as "from" promises a price we
   * do not have.
   */
  mrpFromMinor?: number | null;
  /** Provenance of the price above, decided by the API. */
  priceOrigin?: { origin: 'live' | 'demo' | 'mixed' | null; chip: string; caveat: string };
  variantCount: number;
}

/** One live offer attached to a variant. */
export interface VariantOffer {
  id: string;
  platformSlug: string;
  platformName: string;
  sellerName: string;
  priceMinor: number;
  currency: string;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  inStock: boolean;
  /** `live` / `feed` / `community` / `demo` — drives the honesty label. */
  dataOrigin: 'live' | 'feed' | 'community' | 'demo';
  sourceLabel: string;
  lastCheckedAt: string;
  productUrl: string;
  affiliate: boolean;
}

export interface PricePoint {
  observedAt: string;
  priceMinor: number;
  platformSlug: string;
  dataOrigin: string;
}

/**
 * A window of history, with the verdict already decided by the API. `covered`
 * false means there is not enough record to draw the window, and `verdict`
 * explains that in one sentence so the page never has to invent its own reason.
 */
export interface HistoryWindow {
  days: number;
  observations: number;
  daysRecorded: number;
  spanDays: number;
  coverage: number;
  covered: boolean;
  from: string | null;
  to: string | null;
  verdict: string;
  unlocksOn: string | null;
  points: PricePoint[];
}

export interface VariantHistory {
  observations: number;
  daysRecorded: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  points: PricePoint[];
  windows: Record<string, HistoryWindow>;
}

export interface CommunityPrice {
  variantId: string;
  platformSlug: string;
  platformName: string;
  pincode: string;
  priceMinor: number;
  reportedAt: string;
  trustState: string;
  corroborationCount: number;
}

export interface ProductCoupon {
  id: string;
  /** Evidence and merchant claim, both decided by the API. */
  confidence: {
    level: 'unreported' | 'thin' | 'community' | 'moderated';
    label: string;
    detail: string;
    reports: number;
    workedPct: number | null;
  };
  quality: { level: 'unknown' | 'minor' | 'solid' | 'strong'; label: string; detail: string };
  successCount: number;
  failCount: number;
  platformSlug: string;
  platformName: string;
  code: string | null;
  title: string;
  discountType: 'percent' | 'flat' | 'cashback' | 'free_delivery';
  discountValue: number;
  statedPercent: number | null;
  percentIsCap: boolean;
  expiresAt: string | null;
}

export interface OriginLabel {
  origin: 'live' | 'demo' | 'mixed' | null;
  chip: string;
  caveat: string;
}

export interface ProductDetail {
  /** Provenance of every price on the page, decided by the API. */
  productOrigin?: OriginLabel;
  product: Omit<ProductSummary, 'priceFromMinor' | 'variantCount'>;
  offersByVariant?: Record<string, VariantOffer[]>;
  history?: Record<string, VariantHistory>;
  community?: CommunityPrice[];
  coupons?: ProductCoupon[];
  notes?: { community: string; history: string };
  variants: Array<{
    id: string;
    label: string;
    attributes: Record<string, string>;
    gtin: string | null;
    mpn: string | null;
    isbn: string | null;
    mrpMinor: number | null;
    netQuantity: number | null;
    unit: string | null;
    packCount: number;
    offerCount: number;
    priceFromMinor: number | null;
    /** Origin of the offers behind this variant's headline price. */
    priceOrigin?: OriginLabel;
  }>;
  disclosure: string;
}

export interface ConnectorHealth {
  status: 'live' | 'demo' | 'disabled' | 'degraded' | 'error';
  detail: string;
  checkedAt: string;
  latencyMs: number | null;
  needsCredentials: boolean;
  docsUrl?: string;
  slug: string;
  displayName: string;
  kind: string;
}

export interface KnownPlatform {
  slug: string;
  displayName: string;
  kind: string;
  status: 'connected' | 'awaiting_credentials' | 'no_public_api' | 'partnership_required';
  note: string;
  routeToAccess: string;
}

/* ------------------------------------------------------------------ */
/* Calls                                                               */
/* ------------------------------------------------------------------ */

export function search(query: string, variantId?: string, signal?: AbortSignal): Promise<SearchOutcome> {
  return apiRequest<SearchOutcome>('/api/search', {
    method: 'POST',
    body: variantId ? { query, variantId } : { query },
    signal,
  });
}

export function listProducts(params: { category?: string; q?: string; limit?: number } = {}): Promise<{
  products: ProductSummary[];
}> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.q) qs.set('q', params.q);
  if (params.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString();
  return apiRequest(`/api/catalogue/products${suffix ? `?${suffix}` : ''}`);
}

export function listCategories(): Promise<{
  categories: Array<{ name: string; slug: string; productCount: number; isGrocery: boolean }>;
}> {
  return apiRequest('/api/catalogue/categories');
}

export function getProduct(slug: string): Promise<ProductDetail> {
  return apiRequest(`/api/catalogue/products/${encodeURIComponent(slug)}`);
}

export function getConnectors(): Promise<{
  connectors: ConnectorHealth[];
  knownPlatforms: KnownPlatform[];
  policy: string;
}> {
  return apiRequest('/api/catalogue/connectors');
}

export function getCommunityPrices(
  variantId: string,
  pincode?: string,
): Promise<{
  reports: Array<{
    id: string;
    platformSlug: string;
    platformName: string;
    pincode: string;
    priceMinor: number;
    mrpMinor: number | null;
    deliveryFeeMinor: number | null;
    reportedAt: string;
    trustState: string;
    corroborationCount: number;
    note: string | null;
  }>;
  disclosure: string;
}> {
  const suffix = pincode ? `?pincode=${encodeURIComponent(pincode)}` : '';
  return apiRequest(`/api/community-prices/${encodeURIComponent(variantId)}${suffix}`);
}
