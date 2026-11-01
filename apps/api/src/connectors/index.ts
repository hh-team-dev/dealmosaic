import { DemoConnector } from './demo.js';
import { EbayConnector } from './ebay.js';
import type { Connector, ConnectorHealth } from './types.js';

/**
 * Connector registry.
 *
 * Disabled-but-documented is a first-class state. Each of these constants exists
 * so the admin panel and the public "where our data comes from" page can tell the
 * truth about each platform instead of implying coverage we do not have.
 */

export interface KnownPlatform {
  slug: string;
  displayName: string;
  kind: 'marketplace' | 'qcommerce';
  /** Why we have no authorised feed today, in plain language. */
  status: 'connected' | 'awaiting_credentials' | 'no_public_api' | 'partnership_required';
  note: string;
  /** Route available to the owner to obtain data legitimately. */
  routeToAccess: string;
}

export const KNOWN_PLATFORMS: KnownPlatform[] = [
  {
    slug: 'ebay',
    displayName: 'eBay India',
    kind: 'marketplace',
    status: 'awaiting_credentials',
    note: 'Public Browse API with a free tier; needs a developer keyset.',
    routeToAccess: 'Create an eBay developer account → Application Keyset → set EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.',
  },
  {
    slug: 'amazon-now',
    displayName: 'Amazon India',
    kind: 'marketplace',
    status: 'partnership_required',
    note: 'The Product Advertising API requires roughly 10 qualifying affiliate sales in 30 days before it will issue credentials, and it does not expose every seller offer for a variant.',
    routeToAccess: 'Join Amazon Associates India → generate qualifying sales → apply for PA-API / Creators API access.',
  },
  {
    slug: 'flipkart-minutes',
    displayName: 'Flipkart',
    kind: 'qcommerce',
    status: 'no_public_api',
    note: 'Flipkart has an affiliate API in principle, but new affiliate sign-ups have been closed for years. Minutes pricing is pincode-specific.',
    routeToAccess: 'Apply through a licensed affiliate network (Cuelinks / AdmitAd) once a publisher account is approved.',
  },
  {
    slug: 'blinkit',
    displayName: 'Blinkit',
    kind: 'qcommerce',
    status: 'partnership_required',
    note: 'Prices are per dark store and change through the day. There is no public price API; the affiliate programme is app-install oriented.',
    routeToAccess: 'Direct commercial partnership with Eternal (Blinkit) for a price feed.',
  },
  {
    slug: 'zepto',
    displayName: 'Zepto',
    kind: 'qcommerce',
    status: 'no_public_api',
    note: 'No public consumer or affiliate price API has been identified.',
    routeToAccess: 'Direct commercial partnership with Zepto.',
  },
  {
    slug: 'instamart',
    displayName: 'Swiggy Instamart',
    kind: 'qcommerce',
    status: 'partnership_required',
    note: 'Affiliate programme exists for order attribution, but it is a link layer, not a price feed.',
    routeToAccess: 'Swiggy affiliate programme for attribution; separate data agreement for pricing.',
  },
  {
    slug: 'bigbasket',
    displayName: 'BigBasket / BB Now',
    kind: 'qcommerce',
    status: 'partnership_required',
    note: 'Affiliate rates vary and cookie windows are short; no documented price API.',
    routeToAccess: 'BigBasket affiliate programme plus a data agreement.',
  },
  {
    slug: 'jiomart',
    displayName: 'JioMart',
    kind: 'qcommerce',
    status: 'partnership_required',
    note: 'Affiliate programme pays up to ~4% with a 30-day window; no public price feed.',
    routeToAccess: 'JioMart affiliate network onboarding.',
  },
  {
    slug: 'ondc',
    displayName: 'ONDC network',
    kind: 'marketplace',
    status: 'partnership_required',
    note: 'Open Beckn protocol — the only credible zero-cost route to real Indian catalogue data, but it requires network onboarding as a participant.',
    routeToAccess: 'Apply to an ONDC network participant / Technology Service Provider for seller-side catalogue access.',
  },
  {
    slug: 'croma',
    displayName: 'Croma',
    kind: 'marketplace',
    status: 'partnership_required',
    note: 'No public price API.',
    routeToAccess: 'Tata Digital commercial partnership.',
  },
  {
    slug: 'reliance-digital',
    displayName: 'Reliance Digital',
    kind: 'marketplace',
    status: 'partnership_required',
    note: 'No public price API.',
    routeToAccess: 'Reliance Retail commercial partnership.',
  },
  {
    slug: 'myntra',
    displayName: 'Myntra',
    kind: 'marketplace',
    status: 'partnership_required',
    note: 'Affiliate coverage through networks only; no price feed.',
    routeToAccess: 'Myntra affiliate programme via a licensed network.',
  },
];

const demo = new DemoConnector();
const ebay = new EbayConnector();

/** Connectors that can actually be queried right now. */
export function activeConnectors(): Connector[] {
  const list: Connector[] = [demo];
  if (ebay.isConfigured()) list.push(ebay);
  return list;
}

export function allConnectors(): Connector[] {
  return [demo, ebay];
}

export async function connectorHealth(): Promise<Array<ConnectorHealth & { slug: string; displayName: string; kind: string }>> {
  const results = await Promise.all(
    allConnectors().map(async (c) => ({
      ...(await c.health()),
      slug: c.slug,
      displayName: c.displayName,
      kind: c.kind,
    })),
  );
  return results;
}

/** Platforms we know about but which currently have no connector implementation. */
export function unimplementedPlatforms(): KnownPlatform[] {
  return KNOWN_PLATFORMS.filter((p) => !allConnectors().some((c) => c.slug === p.slug));
}

export { demo as demoConnector, ebay as ebayConnector };
export type { Connector, ConnectorHealth, ConnectorOffer, ConnectorSearchParams } from './types.js';
