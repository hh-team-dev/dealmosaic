/**
 * Connector contract.
 *
 * A connector's only job is to turn one platform into `ConnectorOffer[]` with
 * honest provenance. It never computes totals, never ranks, never guesses.
 *
 * Every connector must answer `health()` truthfully — including "disabled",
 * with the reason. A connector that silently returns [] would look like "no
 * price found", which is a different and misleading statement.
 */

export type ConnectorHealthStatus = 'live' | 'demo' | 'disabled' | 'degraded' | 'error';

export interface ConnectorHealth {
  status: ConnectorHealthStatus;
  /** Plain-language reason, shown in the admin connector panel. */
  detail: string;
  checkedAt: string;
  latencyMs: number | null;
  /** True when this connector needs credentials the owner has not supplied. */
  needsCredentials: boolean;
  docsUrl?: string;
}

export interface ConnectorSearchParams {
  query: string;
  gtin?: string | null;
  limit?: number;
}

export interface ConnectorOffer {
  platformSlug: string;
  title: string;
  sellerName: string;
  sellerType: 'platform' | 'official' | 'marketplace' | 'dark_store';
  sellerRating: number | null;
  sellerRatingCount: number | null;
  productRating: number | null;
  productReviewCount: number | null;
  itemPriceMinor: number;
  currency: 'INR';
  mrpMinor: number | null;
  itemCondition: 'new' | 'refurbished' | 'used';
  inStock: boolean;
  /** null = seller did not publish a shipping price. NEVER 0. */
  shippingMinor: number | null;
  shippingNote: string | null;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  returnWindowDays: number | null;
  warrantyMonths: number | null;
  productUrl: string;
  affiliate: boolean;
  dataOrigin: 'live' | 'feed' | 'community' | 'demo';
  sourceLabel: string;
  lastCheckedAt: string;
  // identity hints, used by the matcher — never trusted blindly
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
  model?: string | null;
  attributes?: Record<string, string>;
}

export interface Connector {
  slug: string;
  displayName: string;
  /** Marketplaces sell most things; dark stores sell groceries in minutes. */
  kind: 'marketplace' | 'qcommerce' | 'demo';
  /** Does this connector produce real observations right now? */
  isConfigured(): boolean;
  health(): Promise<ConnectorHealth>;
  search(params: ConnectorSearchParams): Promise<ConnectorOffer[]>;
}

export const FETCH_TIMEOUT_MS = 8000;

/** fetch with a hard timeout. A connector must never hang a search. */
export async function timedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
