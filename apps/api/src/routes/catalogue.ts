import { Hono } from 'hono';
import { db } from '../db/index.js';
import type { AppBindings } from '../middleware/session.js';
import { connectorHealth, KNOWN_PLATFORMS, unimplementedPlatforms } from '../connectors/index.js';

/**
 * Public catalogue reads. These are deliberately anonymous and cacheable: the
 * product pages are the surface search engines index, so they must load without
 * an account and must render real content, not a spinner.
 */
export const catalogueRoutes = new Hono<AppBindings>();

catalogueRoutes.get('/products', (c) => {
  const category = c.req.query('category');
  const q = c.req.query('q');
  const limit = Math.min(Number(c.req.query('limit') ?? 60), 200);

  const rows = db
    .prepare(
      `SELECT p.id, p.slug, p.title, p.brand, p.category, p.category_slug, p.description, p.is_grocery,
              MIN(v.mrp_minor) AS price_from_minor, COUNT(DISTINCT v.id) AS variant_count
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
    ) as Array<Record<string, unknown>>;

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
      priceFromMinor: r.price_from_minor,
      variantCount: r.variant_count,
    })),
  });
});

catalogueRoutes.get('/categories', (c) => {
  const rows = db
    .prepare(
      `SELECT category, category_slug, COUNT(*) AS n, SUM(is_grocery) AS grocery
         FROM catalogue_products GROUP BY category_slug ORDER BY n DESC, category ASC`,
    )
    .all() as Array<{ category: string; category_slug: string; n: number; grocery: number }>;

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
catalogueRoutes.get('/products/:slug', (c) => {
  const slug = c.req.param('slug');
  const product = db
    .prepare('SELECT * FROM catalogue_products WHERE slug = ?')
    .get(slug) as Record<string, unknown> | undefined;
  if (!product) return c.json({ error: { code: 'not_found', message: 'No such product.' } }, 404);

  const variants = db
    .prepare(
      `SELECT v.*, (SELECT COUNT(*) FROM offers o WHERE o.variant_id = v.id AND o.is_active = 1) AS offer_count,
              (SELECT MIN(o.item_price_minor) FROM offers o WHERE o.variant_id = v.id AND o.is_active = 1) AS from_minor
         FROM product_variants v WHERE v.product_id = ? ORDER BY v.sort_order`,
    )
    .all(String(product.id)) as Array<Record<string, unknown>>;

  return c.json({
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
catalogueRoutes.get('/trending', (c) => {
  const rows = db
    .prepare('SELECT query, search_count FROM trending_queries ORDER BY search_count DESC, last_seen DESC LIMIT 12')
    .all() as Array<{ query: string; search_count: number }>;
  return c.json({ trending: rows });
});
