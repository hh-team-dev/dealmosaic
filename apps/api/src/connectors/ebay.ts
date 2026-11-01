import type { Connector, ConnectorHealth, ConnectorOffer, ConnectorSearchParams } from './types.js';
import { timedFetch } from './types.js';

/**
 * eBay India connector — the one real, self-serve, zero-cost API available today.
 *
 * Credentials: eBay developer account → application keyset (Client ID + Secret).
 *   EBAY_CLIENT_ID, EBAY_CLIENT_SECRET
 * Free tier: ~5,000 Browse API calls/day. OAuth2 client-credentials grant.
 *
 * It stays DISABLED until the owner supplies keys, and it says so out loud rather
 * than returning an empty list that would look like "no price found".
 *
 * Honesty notes baked into the mapping:
 *  - eBay Browse does not publish a per-listing shipping price in the summary in
 *    every case, so `shippingMinor` is null when absent — never 0.
 *  - eBay is not an Indian quick-commerce platform, so it appears with a seller
 *    located in India where the API tells us, and it is labelled as eBay.
 */

const API_BASE = 'https://api.ebay.com';

/**
 * eBay has no India marketplace, so EBAY_IN is not a real marketplace ID.
 * Override with EBAY_MARKETPLACE_ID (e.g. EBAY_GB, EBAY_US) when testing live
 * data. India results are still filtered by item location where the API allows.
 */
const MARKETPLACE = process.env.EBAY_MARKETPLACE_ID?.trim() || 'EBAY_IN';

interface EbayToken {
  access_token: string;
  expires_at: number;
}

let tokenCache: EbayToken | null = null;

function env(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export class EbayConnector implements Connector {
  slug = 'ebay';
  displayName = 'eBay India';
  kind = 'marketplace' as const;

  private get clientId(): string | undefined {
    return env('EBAY_CLIENT_ID');
  }

  private get clientSecret(): string | undefined {
    return env('EBAY_CLIENT_SECRET');
  }

  isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret);
  }

  async health(): Promise<ConnectorHealth> {
    if (!this.isConfigured()) {
      return {
        status: 'disabled',
        detail:
          'No eBay API credentials are configured. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to enable this connector. Until then, eBay prices are not collected at all — we would rather show nothing than show a number we cannot observe.',
        checkedAt: new Date().toISOString(),
        latencyMs: null,
        needsCredentials: true,
        docsUrl: 'https://developer.ebay.com/api-docs/buy/browse/overview.html',
      };
    }

    const started = Date.now();
    try {
      await this.getToken();
      return {
        status: 'live',
        detail: 'Credentials accepted; OAuth token issued.',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        needsCredentials: false,
        docsUrl: 'https://developer.ebay.com/api-docs/buy/browse/overview.html',
      };
    } catch (error) {
      return {
        status: 'error',
        detail: `Credential check failed: ${(error as Error).message}`,
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        needsCredentials: true,
      };
    }
  }

  private async getToken(): Promise<string> {
    if (tokenCache && tokenCache.expires_at > Date.now() + 60_000) return tokenCache.access_token;

    const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await timedFetch(`${API_BASE}/identity/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope',
      }).toString(),
    });

    if (!res.ok) throw new Error(`eBay auth responded ${res.status}`);
    const json = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache = { access_token: json.access_token, expires_at: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  async search({ query, gtin, limit = 20 }: ConnectorSearchParams): Promise<ConnectorOffer[]> {
    if (!this.isConfigured()) return [];
    const token = await this.getToken();

    const params = new URLSearchParams({
      limit: String(Math.min(limit, 50)),
      // EBAY_IN restricts results to items located in India.
      filter: 'itemLocationCountry:IN',
      sort: 'price',
    });
    if (gtin) params.set('gtin', gtin);
    else params.set('q', query);

    const res = await timedFetch(`${API_BASE}/buy/browse/v1/item_summary/search?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': MARKETPLACE,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error(`eBay search responded ${res.status}`);
    const json = (await res.json()) as { itemSummaries?: EbayItemSummary[] };
    const items = json.itemSummaries ?? [];

    return items.map((item) => mapItem(item, query)).filter((x): x is ConnectorOffer => x !== null);
  }
}

interface EbayItemSummary {
  itemId: string;
  title: string;
  itemWebUrl: string;
  price?: { value: string; currency: string };
  shippingOptions?: Array<{ shippingCost?: { value: string; currency: string } }>;
  seller?: { username?: string; feedbackPercentage?: string; feedbackScore?: number };
  condition?: string;
  gtin?: string;
  mpn?: string;
  brand?: string;
  itemLocation?: { country?: string };
}

function mapItem(item: EbayItemSummary, query: string): ConnectorOffer | null {
  // Never convert a foreign currency into INR on the fly and present it as the
  // seller's price. If eBay returns anything but INR, we skip it and say so.
  if (!item.price || item.price.currency !== 'INR') return null;
  const priceMinor = Math.round(Number.parseFloat(item.price.value) * 100);
  if (!Number.isFinite(priceMinor)) return null;

  const shipping = item.shippingOptions?.[0]?.shippingCost;
  const shippingMinor =
    shipping && shipping.currency === 'INR' ? Math.round(Number.parseFloat(shipping.value) * 100) : null;

  const feedback = item.seller?.feedbackPercentage ? Number.parseFloat(item.seller.feedbackPercentage) : null;
  const feedbackScore = item.seller?.feedbackScore ?? null;

  return {
    platformSlug: 'ebay',
    title: item.title,
    sellerName: item.seller?.username ?? 'eBay seller',
    sellerType: 'marketplace',
    sellerRating: feedback === null ? null : Math.round((feedback / 20) * 10) / 10, // % → 0–5
    sellerRatingCount: feedbackScore,
    productRating: null,
    productReviewCount: null,
    itemPriceMinor: priceMinor,
    currency: 'INR',
    mrpMinor: null,
    itemCondition:
      item.condition?.toLowerCase().includes('refurb')
        ? 'refurbished'
        : item.condition?.toLowerCase().includes('used')
          ? 'used'
          : 'new',
    inStock: true,
    shippingMinor,
    shippingNote: shippingMinor === null ? 'eBay did not return a shipping price for this listing' : null,
    deliveryDaysMin: null,
    deliveryDaysMax: null,
    returnWindowDays: null,
    warrantyMonths: null,
    productUrl: item.itemWebUrl,
    affiliate: false,
    dataOrigin: 'live',
    sourceLabel: 'eBay Browse API (live observation)',
    lastCheckedAt: new Date().toISOString(),
    gtin: item.gtin ?? null,
    mpn: item.mpn ?? null,
    brand: item.brand ?? null,
    model: null,
    attributes: {},
  };
}
