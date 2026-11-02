import { Hono } from 'hono';
import { db, nowIso } from '../db/index.js';
import { priceHistoryForVariants } from '../services/price-history.js';
import { assessCoupon } from '../services/coupon-confidence.js';
import { labelFor } from '../services/price-origin.js';
import type { AppBindings } from '../middleware/session.js';
import { connectorHealth, KNOWN_PLATFORMS, unimplementedPlatforms } from '../connectors/index.js';

/**
 * Public catalogue reads. These are deliberately anonymous and cacheable: the
 * product pages are the surface search engines index, so they must load without
 * an account and must render real content, not a spinner.
 */
export const catalogueRoutes = new Hono<AppBindings>();

catalogueRoutes.get('/products', async (c) => {
  const category = c.req.query('category');
  const q = c.req.query('q');
  const limit = Math.min(Number(c.req.query('limit') ?? 60), 200);

  const rows = await (db
    .prepare(
      /*
       * The browse card used to say "from ₹271" from MIN(mrp_minor) — which is not
       * what the item costs anywhere, it is the printed pack MRP. Two numbers now,
       * kept apart: the cheapest live offer (a price), and the MRP (a reference).
       * A card that shows the MRP says "MRP", because "from" promises a price we
       * do not have.
       */
      `SELECT p.id, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery,
              (SELECT MIN(o.item_price_minor) FROM offers o JOIN product_variants ov ON ov.id = o.variant_id
                WHERE ov.product_id = p.id AND o.is_active = 1) AS price_from_minor,
              MIN(v.mrp_minor) AS mrp_from_minor,
              (SELECT o.data_origin FROM offers o JOIN product_variants ov ON ov.id = o.variant_id
                WHERE ov.product_id = p.id AND o.is_active = 1 ORDER BY o.item_price_minor ASC LIMIT 1) AS price_origin,
              COUNT(DISTINCT v.id) AS variant_count
         FROM catalogue_products p
         JOIN product_variants v ON v.product_id = p.id
        WHERE (? IS NULL OR p.category_slug = ?)
          AND (? IS NULL OR p.title LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)
        GROUP BY p.id
        ORDER BY p.title
        LIMIT ?`,
    )
    .all(
      category ?? null, category ?? null,
      q ?? null, q ? `%${q}%` : null, q ? `%${q}%` : null, q ? `%${q}%` : null,
      limit,
    )) as Array<Record<string, unknown>>;

  return c.json({
    products: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      brand: r.brand,
      category: r.category,
      categorySlug: r.category_slug,
      description: r.description,
      isGrocery: Boolean(r.is_grocery),
      priceFromMinor: (r.price_from_minor as number | null) ?? null,
      mrpFromMinor: (r.mrp_from_minor as number | null) ?? null,
      priceOrigin: labelFor([(r.price_origin as string | null) ?? null]),
      variantCount: r.variant_count,
    })),
  });
});

catalogueRoutes.get('/categories', async (c) => {
  const rows = await (db
    .prepare(
      `SELECT category, category_slug, COUNT(*) AS n, SUM(is_grocery) AS grocery
         FROM catalogue_products GROUP BY category_slug ORDER BY n DESC, category ASC`,
    )
    .all()) as Array<{ category: string; category_slug: string; n: number; grocery: number }>;

  return c.json({
    categories: rows.map((r) => ({
      name: r.category,
      slug: r.category_slug,
      productCount: r.n,
      isGrocery: r.grocery > 0,
    })),
  });
});

/** Full product page payload, including every variant and its offer count. */
catalogueRoutes.get('/products/:slug', async (c) => {
  const slug = c.req.param('slug');
  const product = await (db
    .prepare('SELECT * FROM catalogue_products WHERE slug = ?')
    .get(slug)) as Record<string, unknown> | undefined;
  if (!product) return c.json({ error: { code: 'not_found', message: 'No such product.' } }, 404);

  const variants = await (db
    .prepare(
      `SELECT v.*, (SELECT COUNT(*) FROM offers o WHERE o.variant_id = v.id AND o.is_active = 1) AS offer_count,
              (SELECT MIN(o.item_price_minor) FROM offers o WHERE o.variant_id = v.id AND o.is_active = 1) AS from_minor
         FROM product_variants v WHERE v.product_id = ? ORDER BY v.sort_order`,
    )
    .all(String(product.id))) as Array<Record<string, unknown>>;

  /**
   * WHAT ELSE THE PAGE NEEDS TO BE USEFUL.
   *
   * The product page used to list variants and nothing else, which meant the one
   * page a search engine will rank had no prices on it, no history, no way to
   * watch the price, and no sign that anyone had ever been there. Four extra
   * queries, all bounded, all cheap:
   *
   *  - `offersByVariant` — the live offers behind each "from ₹X", so the number
   *    can be inspected instead of taken on trust;
   *  - price history per variant, one point per day, for the chart;
   *  - community reports, kept visually and structurally separate because they
   *    are not retailer-verified;
   *  - coupon codes for the stores that appear in the offers.
   */
  const variantIds = variants.map((v) => String(v.id));

  const offersByVariant: Record<string, Array<Record<string, unknown>>> = {};
  if (variantIds.length > 0) {
    const placeholders = variantIds.map(() => '?').join(',');
    const offerRows = (await db
      .prepare(
        `SELECT o.variant_id, o.id, o.platform_slug, o.seller_name, o.item_price_minor, o.currency,
                o.delivery_days_min, o.delivery_days_max, o.in_stock, o.data_origin, o.source_label,
                o.last_checked_at, o.product_url, o.affiliate, p.name AS platform_name
           FROM offers o
           LEFT JOIN platforms p ON p.slug = o.platform_slug
          WHERE o.variant_id IN (${placeholders}) AND o.is_active = 1
          ORDER BY o.item_price_minor ASC`,
      )
      .all(...variantIds)) as Array<Record<string, unknown>>;

    for (const r of offerRows) {
      const key = String(r.variant_id);
      (offersByVariant[key] ??= []).push({
        id: r.id,
        platformSlug: r.platform_slug,
        platformName: r.platform_name ?? r.platform_slug,
        sellerName: r.seller_name,
        priceMinor: r.item_price_minor,
        currency: r.currency,
        deliveryDaysMin: r.delivery_days_min,
        deliveryDaysMax: r.delivery_days_max,
        inStock: Boolean(r.in_stock),
        /** The label the interface must show next to the price. */
        dataOrigin: r.data_origin,
        sourceLabel: r.source_label,
        lastCheckedAt: r.last_checked_at,
        productUrl: r.product_url,
        affiliate: Boolean(r.affiliate),
      });
    }
  }

  /**
   * History arrives window-shaped, with the verdict already decided server-side.
   * The page cannot draw a 30-day chart out of two days of records because the
   * API never hands it a 30-day window it cannot stand behind.
   */
  const history = await priceHistoryForVariants(variantIds.slice(0, 12));

  const communityRows = variantIds.length
    ? ((await db
        .prepare(
          `SELECT c.variant_id, c.platform_slug, c.pincode, c.price_minor, c.reported_at,
                  c.trust_state, c.corroboration_count, p.name AS platform_name
             FROM community_prices c
             LEFT JOIN platforms p ON p.slug = c.platform_slug
            WHERE c.variant_id IN (${variantIds.map(() => '?').join(',')})
              AND c.trust_state != 'rejected'
            ORDER BY c.reported_at DESC
            LIMIT 40`,
        )
        .all(...variantIds)) as Array<Record<string, unknown>>)
    : [];

  const shopSlugs = [...new Set(Object.values(offersByVariant).flat().map((o) => String(o.platformSlug)))];
  const couponRows = shopSlugs.length
    ? ((await db
        .prepare(
          `SELECT c.id, c.platform_slug, c.code, c.title, c.discount_type, c.discount_value,
                  c.stated_percent, c.stated_percent_cap, c.stated_price_minor, c.expires_at,
                  c.source, c.trust_state, c.success_count, c.fail_count, c.verified_at,
                  p.name AS platform_name
             FROM coupons c
             LEFT JOIN platforms p ON p.slug = c.platform_slug
            WHERE c.platform_slug IN (${shopSlugs.map(() => '?').join(',')})
              AND c.trust_state IN ('listed','community_verified','moderator_verified')
              AND (c.expires_at IS NULL OR c.expires_at > ?)
            ORDER BY CASE WHEN c.code IS NOT NULL THEN 0 ELSE 1 END, c.stated_percent DESC
            LIMIT 8`,
        )
        .all(...shopSlugs, nowIso())) as Array<Record<string, unknown>>)
    : [];

  /**
   * The headline price and its provenance, together. `priceFromMinor` is a MIN()
   * over the offers, and a minimum cannot carry a caveat by itself — so the caveat
   * is computed here and travels in the same object as the number.
   */
  const allOrigins = Object.values(offersByVariant).flat().map((o) => String(o.dataOrigin));
  const headlineOrigin = labelFor(allOrigins);

  return c.json({
    productOrigin: headlineOrigin,
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      brand: product.brand,
      category: product.category,
      categorySlug: product.category_slug,
      description: product.description,
      isGrocery: Boolean(product.is_grocery),
    },
    offersByVariant,
    history,
    community: communityRows.map((r) => ({
      variantId: r.variant_id,
      platformSlug: r.platform_slug,
      platformName: r.platform_name ?? r.platform_slug,
      pincode: r.pincode,
      priceMinor: r.price_minor,
      reportedAt: r.reported_at,
      trustState: r.trust_state,
      corroborationCount: r.corroboration_count,
    })),
    coupons: couponRows.map((r) => ({
      id: r.id,
      platformSlug: r.platform_slug,
      platformName: r.platform_name ?? r.platform_slug,
      code: r.code,
      title: r.title,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      statedPercent: r.stated_percent ?? null,
      percentIsCap: (r.stated_percent_cap ?? 0) === 1,
      expiresAt: r.expires_at,
      // Same two answers as /api/coupons, computed by the same function, so the
      // product page cannot describe a code differently from the deal wall.
      ...assessCoupon({
        source: String(r.source ?? 'affiliate'),
        trustState: String(r.trust_state ?? 'listed'),
        successCount: Number(r.success_count ?? 0),
        failCount: Number(r.fail_count ?? 0),
        verifiedAt: (r.verified_at as string | null) ?? null,
        statedPercent: (r.stated_percent as number | null) ?? null,
        percentIsCap: (r.stated_percent_cap ?? 0) === 1,
        statedPriceMinor: (r.stated_price_minor as number | null) ?? null,
        discountType: String(r.discount_type),
        discountValue: Number(r.discount_value ?? 0),
      }),
    })),
    notes: {
      community:
        'Shopper-reported prices. They are not retailer-verified, are specific to one pincode and moment, and never affect the ranking of the three verified offers.',
      history:
        'Each point is the cheapest observation we recorded that day. It is our own record, not a market index. A chart is only drawn once our records span the whole window it claims.',
    },
    variants: variants.map((v) => ({
      id: v.id,
      label: v.variant_label,
      attributes: JSON.parse(String(v.attributes ?? '{}')),
      gtin: v.gtin,
      mpn: v.mpn,
      isbn: v.isbn,
      mrpMinor: v.mrp_minor,
      netQuantity: v.net_quantity,
      unit: v.unit,
      packCount: v.pack_count,
      offerCount: v.offer_count,
      priceFromMinor: v.from_minor,
      /** Origin of the offers behind `priceFromMinor`, so the number is never naked. */
      priceOrigin: labelFor((offersByVariant[String(v.id)] ?? []).map((o) => String(o.dataOrigin))),
    })),
    disclosure:
      'Variant identities are real. Offer prices come from the connector layer and are labelled with their origin — demonstration data until an authorised feed is connected.',
  });
});

/** Connector health, for the admin panel and the public "our data" page. */
catalogueRoutes.get('/connectors', async (c) => {
  const health = await connectorHealth();
  return c.json({
    connectors: health,
    knownPlatforms: KNOWN_PLATFORMS,
    unimplemented: unimplementedPlatforms().map((p) => p.slug),
    policy:
      'A connector that has no authorised data source is disabled and says why. DEALMOSAIC never scrapes, never bypasses bot protection, and never fills a gap with an invented number.',
  });
});

/** Trending searches — real aggregate, used for SEO hub pages. */
catalogueRoutes.get('/trending', async (c) => {
  const rows = await (db
    .prepare('SELECT query, search_count FROM trending_queries ORDER BY search_count DESC, last_seen DESC LIMIT 12')
    .all()) as Array<{ query: string; search_count: number }>;
  return c.json({ trending: rows });
});
