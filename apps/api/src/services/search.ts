import {
  buildPriceTruth,
  formatMoney,
  parseQuery,
  rankOffers,
  resolveVariants,
  unitPrice,
  type LineState,
  type PriceLine,
  type PriceTruth,
  type RankedOffer,
  type VariantIdentity,
} from '@dealmosaic/core';
import { db, newId, nowIso } from '../db/index.js';
import type { ConnectorOffer } from '../connectors/index.js';
import { findOfferMatches, type OfferMatch } from './offer-search.js';

/**
 * The comparison pipeline.
 *
 *   query → candidate variants → disambiguation → offers → Price Truth per offer
 *         → rank (commission-blind) → top three + podium + passport
 *
 * Two invariants, enforced here rather than trusted to the UI:
 *   1. At most three offers are ever returned for comparison.
 *   2. An offer whose total is not fully verified can never occupy rank 1.
 */

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
  /** Full itemisation — the Price Truth Engine output. */
  price: PriceTruth;
  itemPriceMinor: number;
  mrpMinor: number | null;
  /** itemPrice - knownTotal, i.e. what the headline price hides. */
  hiddenCostMinor: number;
  discountVsMrpMinor: number | null;
  discountVsMrpPct: number | null;
  inStock: boolean;
  condition: string;
  deliveryDaysMin: number | null;
  deliveryDaysMax: number | null;
  returnWindowDays: number | null;
  warrantyMonths: number | null;
  /** 0..100 Deal Confidence plus its published breakdown. */
  confidenceScore: number;
  confidenceBreakdown: RankedOffer['confidenceBreakdown'];
  matchConfidence: number;
  matchMethod: string;
  whyRanked: string;
  affiliate: boolean;
  dataOrigin: string;
  sourceLabel: string;
  lastCheckedAt: string;
  observationCount: number;
  firstObservedAt: string;
  /** null when the platform publishes no ratings — never a fabricated number. */
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

export interface ComparisonPayload {
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
  /**
   * What the podium is actually ranking. When no offer's landed total can be
   * fully verified (quick commerce charges delivery by cart value), the order is
   * a verified-portion order and the headline language must say so.
   */
  rankingBasis: 'verified_total' | 'verified_portion_only';
  podiumNote: string | null;
  stats: ComparisonStats;
  unitPrice: {
    per100: number | null;
    perBase: number | null;
    unit: string | null;
    basis: string;
  } | null;
  /** Real observations only — starts the day we start watching. */
  history: Array<{ observedAt: string; priceMinor: number }>;
  otherVariants: Array<{ id: string; label: string; offerCount: number }>;
  disclaimers: string[];
}

export type SearchOutcome =
  | ComparisonPayload
  | {
      kind: 'needs_selection';
      query: string;
      product: { title: string; brand: string; slug: string; category: string };
      candidates: Array<{ variantId: string; label: string; attributes: Record<string, string>; evidence: string }>;
      reason: string;
    }
  | {
      kind: 'no_results';
      query: string;
      suggestions: Array<{ slug: string; title: string; brand: string; category: string }>;
      /**
       * Live merchant offers whose own copy matches the words typed, shown as
       * listings rather than as a comparison. Empty is a normal answer.
       */
      offers: OfferMatch[];
      reason: string;
    };

/* ------------------------------------------------------------------ */
/* Variant lookup                                                      */
/* ------------------------------------------------------------------ */

interface VariantRow {
  id: string;
  product_id: string;
  variant_label: string;
  attributes: string;
  gtin: string | null;
  mpn: string | null;
  isbn: string | null;
  mrp_minor: number | null;
  net_quantity: number | null;
  unit: string | null;
  pack_count: number;
  slug: string;
  title: string;
  brand: string;
  category: string;
  category_slug: string;
  description: string;
  is_grocery: number;
}

const VARIANT_SELECT = `
  SELECT v.*, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery
    FROM product_variants v
    JOIN catalogue_products p ON p.id = v.product_id
`;

function toIdentity(row: VariantRow): VariantIdentity {
  return {
    variantId: row.id,
    productId: row.product_id,
    brand: row.brand,
    model: row.title,
    name: `${row.title} ${row.variant_label}`,
    gtin: row.gtin,
    mpn: row.mpn,
    isbn: row.isbn,
    attributes: JSON.parse(row.attributes) as Record<string, string>,
    variantLabel: row.variant_label,
  };
}

/** Find every variant the query could plausibly mean. */
export async function findCandidateVariants(rawQuery: string): Promise<VariantRow[]> {
  const parsed = parseQuery(rawQuery);

  if (parsed.gtin) {
    const byGtin = (await db.prepare(`${VARIANT_SELECT} WHERE v.gtin = ?`).all(parsed.gtin)) as unknown as VariantRow[];
    if (byGtin.length > 0) return byGtin;
  }

  const tokens = parsed.tokens.filter((t) => t.length > 1);
  if (tokens.length === 0) return [];

  // Rank products by how many query tokens their title/brand contains, so
  // "samsung s25 ultra" finds the right product without a full-text index.
  const rows = (await db.prepare(`${VARIANT_SELECT}`).all()) as unknown as VariantRow[];

  const scored = rows
    .map((row) => {
      const haystack = `${row.title} ${row.brand} ${row.category} ${row.variant_label}`.toLowerCase();
      const hits = tokens.filter((t) => haystack.includes(t)).length;
      return { row, hits };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.row.title.localeCompare(b.row.title));

  if (scored.length === 0) return [];
  const bestHits = scored[0]!.hits;
  // Keep every product tied at the top score — near-misses are not "the" answer.
  return scored.filter((x) => x.hits === bestHits).map((x) => x.row);
}

/* ------------------------------------------------------------------ */
/* Offers → Price Truth                                                */
/* ------------------------------------------------------------------ */

interface OfferRow {
  id: string;
  variant_id: string;
  platform_slug: string;
  title: string;
  seller_name: string;
  seller_type: string;
  seller_rating: number | null;
  seller_rating_count: number | null;
  product_rating: number | null;
  product_review_count: number | null;
  item_price_minor: number;
  currency: string;
  mrp_minor: number | null;
  item_condition: string;
  in_stock: number;
  shipping_minor: number | null;
  shipping_note: string | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  tax_minor: number | null;
  tax_state: string;
  return_window_days: number | null;
  warranty_months: number | null;
  product_url: string;
  affiliate: number;
  data_origin: string;
  source_label: string;
  last_checked_at: string;
}

/**
 * Build the itemised landed cost. This is where the product's central promise
 * either holds or doesn't — a missing shipping price must produce
 * "TOTAL NOT FULLY VERIFIED", never a total that quietly assumes ₹0.
 */
export function buildOfferPrice(offer: OfferRow): PriceTruth {
  const lines: PriceLine[] = [
    {
      kind: 'item',
      label: 'Item price',
      state: 'confirmed',
      amountMinor: offer.item_price_minor,
      note: offer.data_origin === 'demo' ? 'Demonstration price — not observed from the retailer.' : undefined,
    },
  ];

  if (offer.shipping_minor !== null) {
    lines.push({
      kind: 'shipping',
      label: 'Delivery',
      state: 'confirmed',
      amountMinor: offer.shipping_minor,
      note: offer.shipping_note ?? undefined,
    });
  } else {
    // The whole point: unknown is a state, not a zero.
    lines.push({
      kind: 'shipping',
      label: 'Delivery',
      state: 'conditional',
      amountMinor: null,
      note: offer.shipping_note ?? 'Delivery fee depends on cart value and is not published per item.',
    });
  }

  lines.push({
    kind: 'tax',
    label: 'GST',
    state: offer.tax_state === 'included' ? 'not_applicable' : 'confirmed',
    amountMinor: offer.tax_state === 'included' ? null : offer.tax_minor,
    note: offer.tax_state === 'included' ? 'Already included in the item price' : undefined,
  });

  return buildPriceTruth(lines, 'INR');
}

async function loadPlatforms(): Promise<Map<string, PlatformInfo>> {
  const rows = (await db.prepare('SELECT * FROM platforms').all()) as Array<Record<string, unknown>>;
  const map = new Map<string, PlatformInfo>();
  for (const r of rows) {
    map.set(String(r.slug), {
      slug: String(r.slug),
      name: String(r.name),
      owner: String(r.owner ?? ''),
      kind: String(r.kind),
      status: String(r.status),
      statusNote: String(r.status_note ?? ''),
      deliveryPromise: (r.delivery_promise as string | null) ?? null,
      affiliate: Boolean(r.affiliate),
    });
  }
  return map;
}

const UNKNOWN_PLATFORM: PlatformInfo = {
  slug: 'unknown',
  name: 'Unknown platform',
  owner: '',
  kind: 'unknown',
  status: 'unknown',
  statusNote: '',
  deliveryPromise: null,
  affiliate: false,
};

async function observationStats(offerId: string): Promise<{ count: number; first: string }> {
  const row = await (db
    .prepare('SELECT COUNT(*) AS n, MIN(observed_at) AS first FROM offer_snapshots WHERE offer_id = ?')
    .get(offerId)) as { n: number; first: string | null };
  return { count: row.n, first: row.first ?? nowIso() };
}

/* ------------------------------------------------------------------ */
/* Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function runComparison(rawQuery: string): Promise<SearchOutcome> {
  const query = rawQuery.trim();
  const parsed = parseQuery(query);
  const rows = await findCandidateVariants(query);

  if (rows.length === 0) {
    const suggestions = await (db
      .prepare('SELECT slug, title, brand, category FROM catalogue_products ORDER BY RANDOM() LIMIT 6')
      .all()) as Array<{ slug: string; title: string; brand: string; category: string }>;

    /**
     * The catalogue missing is not the same as the site having nothing. Before
     * we tell a shopper we found nothing, ask the 1,089 live merchant offers
     * whether any of them mention what they typed. Those come back labelled as
     * listings — the merchant's own copy, not a comparison we performed.
     */
    const offers = await findOfferMatches(query);

    return {
      kind: 'no_results',
      query,
      suggestions,
      offers,
      reason:
        offers.length > 0
          ? 'We do not compare this product yet — comparing it needs a confirmed product identity, not a near-miss. These are live listings from stores that do mention it, in their own words.'
          : 'No product in the catalogue matched that search, and no live store offer mentions it right now. We only compare products we can identify precisely — we will not show you a “closest match” and imply it is the same thing.',
    };
  }

  // Group by product: disambiguation happens per product, not across products.
  const byProduct = new Map<string, VariantRow[]>();
  for (const row of rows) {
    const list = byProduct.get(row.product_id) ?? [];
    list.push(row);
    byProduct.set(row.product_id, list);
  }

  const products = [...byProduct.values()];
  const firstProduct = products[0]!;
  const productRow = firstProduct[0]!;

  // If several distinct products tie, ask which one — but only if truly ambiguous.
  if (products.length > 1) {
    return {
      kind: 'needs_selection',
      query,
      product: {
        title: productRow.title,
        brand: productRow.brand,
        slug: productRow.slug,
        category: productRow.category,
      },
      candidates: firstProduct.map((r) => ({
        variantId: r.id,
        label: r.variant_label,
        attributes: JSON.parse(r.attributes) as Record<string, string>,
        evidence: `${r.brand} ${r.title}`,
      })),
      reason: `${products.length} different products matched that search. Pick the exact one — comparing near-misses is how people get the wrong price.`,
    };
  }

  const identities = firstProduct.map(toIdentity);
  const resolution = resolveVariants(parsed, identities);

  if (resolution.mode === 'needsSelection') {
    return {
      kind: 'needs_selection',
      query,
      product: {
        title: productRow.title,
        brand: productRow.brand,
        slug: productRow.slug,
        category: productRow.category,
      },
      candidates: resolution.candidates,
      reason: `${productRow.title} comes in ${resolution.candidates.length} variants. Prices differ between them, so pick one — we will not average different products into a single price.`,
    };
  }

  const variant = firstProduct.find((r) => r.id === resolution.variant.variantId)!;
  return await buildComparison(query, variant, firstProduct);
}

export async function buildComparison(
  query: string,
  variant: VariantRow,
  allVariants: VariantRow[],
): Promise<SearchOutcome> {
  const platforms = await loadPlatforms();
  const offerRows = await (db
    .prepare("SELECT * FROM offers WHERE variant_id = ? AND is_active = 1 AND data_origin = 'live' ORDER BY item_price_minor ASC")
    .all(variant.id)) as unknown as OfferRow[];

  // Fixture arithmetic is never an observed price, even when all cost lines add
  // up. Keep product identities, but never rank or quote non-live observations.
  if (offerRows.length === 0) {
    return {
      kind: 'no_results', query,
      reason: `No confirmed current store price is available for ${variant.title} (${variant.variant_label}). We will not invent a price or rank a general store search as this exact item.`,
      suggestions: [],
      offers: await findOfferMatches(query),
    };
  }

  const priced = offerRows.map((offer) => {
    const price = buildOfferPrice(offer);
    return {
      offer,
      price,
      rankable: {
        offerId: offer.id,
        // Keep the known portion available for ordering. `rankOffers` decides
        // whether it may be used (only when nothing is fully verified).
        knownTotalMinor: price.knownTotalMinor,
        verificationState: price.verificationState,
        matchConfidence: 1, // exact variant match by construction
        inStock: Boolean(offer.in_stock),
        sellerRating: offer.seller_rating,
        sellerRatingCount: offer.seller_rating_count,
        freshnessMinutes: Math.max(0, Math.round((Date.now() - Date.parse(offer.last_checked_at)) / 60_000)),
        deliveryDaysMin: offer.delivery_days_min,
        condition: offer.item_condition as 'new' | 'refurbished' | 'used',
        affiliateRateBps: offer.affiliate ? 200 : 0,
      },
    };
  });

  // Community-reported prices are NOT comparable totals — they are shown
  // separately, clearly marked, and never ranked against verified offers.
  const ranked = rankOffers(priced.map((p) => p.rankable));
  const top = ranked.slice(0, 3);

  const offers: OfferView[] = await Promise.all(
    top.map(async (r) => {
    const source = priced.find((p) => p.offer.id === r.offerId)!;
    const offer = source.offer;
    const price = source.price;
    const stats = await observationStats(offer.id);
    const platform = platforms.get(offer.platform_slug) ?? UNKNOWN_PLATFORM;

    const hiddenCostMinor = price.knownTotalMinor - offer.item_price_minor;
    const discountVsMrpMinor = offer.mrp_minor !== null ? Math.max(0, offer.mrp_minor - price.knownTotalMinor) : null;

    return {
      rank: r.rank,
      offerId: offer.id,
      platform,
      title: offer.title,
      sellerName: offer.seller_name,
      sellerType: offer.seller_type,
      productUrl: offer.product_url,
      price,
      itemPriceMinor: offer.item_price_minor,
      mrpMinor: offer.mrp_minor,
      hiddenCostMinor,
      discountVsMrpMinor,
      discountVsMrpPct:
        discountVsMrpMinor !== null && offer.mrp_minor
          ? Math.round((discountVsMrpMinor / offer.mrp_minor) * 100)
          : null,
      inStock: Boolean(offer.in_stock),
      condition: offer.item_condition,
      deliveryDaysMin: offer.delivery_days_min,
      deliveryDaysMax: offer.delivery_days_max,
      returnWindowDays: offer.return_window_days,
      warrantyMonths: offer.warranty_months,
      confidenceScore: r.confidenceScore,
      confidenceBreakdown: r.confidenceBreakdown,
      matchConfidence: r.matchConfidence,
      matchMethod: 'exact_variant',
      whyRanked: r.explanation,
      affiliate: Boolean(offer.affiliate),
      dataOrigin: offer.data_origin,
      sourceLabel: offer.source_label,
      lastCheckedAt: offer.last_checked_at,
      observationCount: stats.count,
      firstObservedAt: stats.first,
      sellerRating: offer.seller_rating,
      sellerRatingCount: offer.seller_rating_count,
      productRating: offer.product_rating,
      productReviewCount: offer.product_review_count,
    };
    }),
  );

  const verifiedTotals = priced
    .filter((p) => p.price.verificationState === 'complete')
    .map((p) => p.price.knownTotalMinor)
    .sort((a, b) => a - b);

  const median = (values: number[]): number | null => {
    if (values.length === 0) return null;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 === 0 ? Math.round((values[mid - 1]! + values[mid]!) / 2) : values[mid]!;
  };

  const cheapest = verifiedTotals[0] ?? null;
  const highest = verifiedTotals.length > 0 ? verifiedTotals[verifiedTotals.length - 1]! : null;

  const stats: ComparisonStats = {
    observedOffers: priced.length,
    returnedOffers: offers.length,
    cheapestVerifiedMinor: cheapest,
    medianMinor: median(verifiedTotals),
    highestMinor: highest,
    spreadMinor: cheapest !== null && highest !== null ? highest - cheapest : null,
    maxSavingMinor: cheapest !== null && highest !== null ? highest - cheapest : null,
    maxSavingPct: cheapest !== null && highest !== null && highest > 0 ? Math.round(((highest - cheapest) / highest) * 100) : null,
    unverifiedCount: priced.filter((p) => p.price.verificationState !== 'complete').length,
  };

  const topOffer = offers.find((o) => o.rank === 1) ?? null;
  const rankingBasis: 'verified_total' | 'verified_portion_only' =
    topOffer && topOffer.price.verificationState === 'complete' ? 'verified_total' : 'verified_portion_only';

  const unverifiedPlatforms = offers
    .filter((o) => o.price.verificationState !== 'complete')
    .map((o) => o.platform.name);

  const podiumNote =
    rankingBasis === 'verified_total'
      ? null
      : `Ranked on the part of the price we can verify. ${[...new Set(unverifiedPlatforms)].join(', ')} ${unverifiedPlatforms.length === 1 ? 'charges' : 'charge'} delivery based on cart value, so the final order can still change at checkout.`;

  const unit =
    variant.net_quantity !== null && variant.unit !== null
      ? (() => {
          const best = offers.find((o) => o.rank === 1);
          const up = unitPrice(best?.price.knownTotalMinor ?? 0, variant.net_quantity, variant.unit as 'g' | 'ml' | 'kg' | 'l' | 'pc');
          const unitWord = up.unit === 'g' ? 'per 100 g' : up.unit === 'ml' ? 'per 100 ml' : 'per piece';
          return {
            per100: up.per100,
            perBase: up.perBase,
            unit: up.unit,
            basis: `Normalised from ${variant.net_quantity}${variant.unit === 'kg' || variant.unit === 'l' ? variant.unit : variant.unit}${variant.pack_count > 1 ? ` × ${variant.pack_count} pack` : ''} on the #1 offer — ${unitWord}`,
          };
        })()
      : null;

  const historyRows = await (db
    .prepare('SELECT observed_at, price_minor FROM offer_snapshots WHERE offer_id = ? ORDER BY observed_at ASC LIMIT 120')
    .all(offers[0]?.offerId ?? '')) as Array<{ observed_at: string; price_minor: number }>;

  const otherVariants = await Promise.all(
    allVariants
    .filter((v) => v.id !== variant.id)
    .map(async (v) => ({
      id: v.id,
      label: v.variant_label,
      offerCount: (
        (await db.prepare("SELECT COUNT(*) AS n FROM offers WHERE variant_id = ? AND is_active = 1 AND data_origin = 'live'").get(v.id)) as {
          n: number;
        }
      ).n,
    })),
  );

  const dataMode: ComparisonPayload['dataMode'] =
    offers.every((o) => o.dataOrigin === 'demo')
      ? 'demo'
      : offers.every((o) => o.dataOrigin !== 'demo')
        ? 'live'
        : 'mixed';

  const disclaimers: string[] = [];
  if (dataMode !== 'live') {
    disclaimers.push(
      'DEMONSTRATION DATA: no retailer has granted authorised price access yet. These prices are illustrative and are never presented as live retailer prices.',
    );
  }
  if (stats.unverifiedCount > 0) {
    disclaimers.push(
      `${stats.unverifiedCount} of ${stats.observedOffers} offers could not be fully verified and are excluded from the winning position.`,
    );
  }
  disclaimers.push(
    'Ranking is commission-blind: affiliate commission is never an input to the order. The "why #1" line states the actual reason.',
  );

  // Record the query for trending / sitemap generation (privacy: query text only).
  await db.prepare(
    `INSERT INTO trending_queries (query, search_count, last_seen) VALUES (?, 1, ?)
     ON CONFLICT(query) DO UPDATE SET search_count = search_count + 1, last_seen = excluded.last_seen`,
  ).run(query.toLowerCase(), nowIso());

  return {
    kind: 'comparison',
    query,
    resolvedAt: nowIso(),
    dataMode,
    product: {
      id: variant.product_id,
      slug: variant.slug,
      title: variant.title,
      brand: variant.brand,
      category: variant.category,
      categorySlug: variant.category_slug,
      description: variant.description,
      isGrocery: Boolean(variant.is_grocery),
    },
    variant: {
      id: variant.id,
      label: variant.variant_label,
      attributes: JSON.parse(variant.attributes) as Record<string, string>,
      gtin: variant.gtin,
      mpn: variant.mpn,
      isbn: variant.isbn,
      mrpMinor: offerRows.find(o => o.mrp_minor !== null)?.mrp_minor ?? null,
      unit: variant.unit,
      netQuantity: variant.net_quantity,
      packCount: variant.pack_count,
    },
    offers,
    rankingBasis,
    podiumNote,
    stats,
    unitPrice: unit,
    history: historyRows.map((h) => ({ observedAt: h.observed_at, priceMinor: h.price_minor })),
    otherVariants,
    disclaimers,
  };
}

/* ------------------------------------------------------------------ */
/* Helpers used by other routes                                        */
/* ------------------------------------------------------------------ */

export interface ConnectorSnapshot {
  connectorOffers: ConnectorOffer[];
  ingested: number;
}

/** Converts a live connector offer into an `offers` row. Used by the sync job. */
export async function ingestConnectorOffers(
  variantId: string,
  offers: ConnectorOffer[],
): Promise<ConnectorSnapshot> {
  let ingested = 0;

  // One transaction: an offer row and its first price snapshot must land together,
  // or history would show a snapshot for an offer that does not exist.
  await db.transaction(async (tx) => {
  const stmt = tx.prepare(`
    INSERT INTO offers (id, variant_id, platform_slug, title, seller_name, seller_type, seller_rating,
      seller_rating_count, product_rating, product_review_count, item_price_minor, currency, mrp_minor,
      item_condition, in_stock, shipping_minor, shipping_note, delivery_days_min, delivery_days_max,
      tax_minor, tax_state, fee_lines, discount_lines, return_window_days, warranty_months, product_url,
      affiliate, data_origin, source_label, last_checked_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 'included', '[]', '[]', ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const snap = tx.prepare(
    'INSERT INTO offer_snapshots (id, offer_id, price_minor, currency, observed_at, data_origin) VALUES (?, ?, ?, ?, ?, ?)',
  );

  for (const offer of offers) {
      if (!['live', 'feed', 'community'].includes(offer.dataOrigin)) continue; // demo data never enters via ingest
      const id = newId();
      await stmt.run(
        id,
        variantId,
        offer.platformSlug,
        offer.title,
        offer.sellerName,
        offer.sellerType,
        offer.sellerRating,
        offer.sellerRatingCount,
        offer.productRating,
        offer.productReviewCount,
        offer.itemPriceMinor,
        offer.currency,
        offer.mrpMinor,
        offer.itemCondition,
        offer.inStock ? 1 : 0,
        offer.shippingMinor,
        offer.shippingNote,
        offer.deliveryDaysMin,
        offer.deliveryDaysMax,
        offer.returnWindowDays,
        offer.warrantyMonths,
        offer.productUrl,
        offer.affiliate ? 1 : 0,
        offer.dataOrigin,
        offer.sourceLabel,
        offer.lastCheckedAt,
      );
      await snap.run(newId(), id, offer.itemPriceMinor, offer.currency, offer.lastCheckedAt, offer.dataOrigin);
      ingested++;
  }
  });

  return { connectorOffers: offers, ingested };
}

export function formatMinor(minor: number | null): string | null {
  if (minor === null) return null;
  return formatMoney({ amountMinor: minor, currency: 'INR' });
}
