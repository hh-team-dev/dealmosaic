import { apiRequest } from './api';

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
  variantCount: number;
}

export interface ProductDetail {
  product: Omit<ProductSummary, 'priceFromMinor' | 'variantCount'>;
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
