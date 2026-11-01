import { db, newId, nowIso } from './index.js';
import { PLATFORM_META, PRODUCTS, hashString, mulberry32 } from './catalog-data.js';

/**
 * Seeds the demonstration catalogue. Safe to call on every boot: it no-ops when
 * products already exist. Every offer it writes carries `data_origin = 'demo'`.
 */

export function seedCatalogue(): void {
  const existing = db.prepare('SELECT COUNT(*) AS n FROM catalogue_products').get() as { n: number };
  if (existing.n > 0) return;

  const now = nowIso();
  const insertProduct = db.prepare(`
    INSERT INTO catalogue_products (id, slug, title, brand, category, category_slug, description, image_hint, unit_kind, is_grocery, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertVariant = db.prepare(`
    INSERT INTO product_variants (id, product_id, variant_label, attributes, gtin, mpn, isbn, mrp_minor, net_quantity, unit, pack_count, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOffer = db.prepare(`
    INSERT INTO offers (id, variant_id, platform_slug, title, seller_name, seller_type, seller_rating, seller_rating_count,
      product_rating, product_review_count, item_price_minor, currency, mrp_minor, item_condition, in_stock,
      shipping_minor, shipping_note, delivery_days_min, delivery_days_max, tax_minor, tax_state, fee_lines,
      discount_lines, return_window_days, warranty_months, product_url, affiliate, data_origin, source_label, last_checked_at, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, 'new', 1, ?, ?, ?, ?, NULL, 'included', '[]', '[]', ?, ?, ?, ?, 'demo', ?, ?, 1)
  `);
  const insertSnapshot = db.prepare(`
    INSERT INTO offer_snapshots (id, offer_id, price_minor, currency, observed_at, data_origin) VALUES (?, ?, ?, 'INR', ?, 'demo')
  `);

  db.transaction(() => {
    for (const product of PRODUCTS) {
      const productId = newId();
      insertProduct.run(
        productId,
        product.slug,
        product.title,
        product.brand,
        product.category,
        product.categorySlug,
        product.description,
        null,
        product.unitKind,
        product.isGrocery ? 1 : 0,
        now,
      );

      product.variants.forEach((variant, vi) => {
        const variantId = newId();
        insertVariant.run(
          variantId,
          productId,
          variant.label,
          JSON.stringify(variant.attributes),
          variant.gtin ?? null,
          variant.mpn ?? null,
          variant.isbn ?? null,
          Math.round(variant.mrp * 100),
          variant.netQuantity ?? null,
          variant.unit ?? null,
          variant.packCount ?? 1,
          vi,
        );

        for (const platformSlug of product.platforms) {
          const meta = PLATFORM_META[platformSlug];
          if (!meta) continue;

          const rng = mulberry32(hashString(`${product.slug}:${variant.label}:${platformSlug}`));
          // Pick a price inside the product's street band, then apply the platform's bias.
          const [lo, hi] = product.street;
          const base = lo + (hi - lo) * rng();
          const bias = meta.community ? 1.0 : 1 + (rng() - 0.45) * 0.06;
          // Floor is ₹1 in paise — not ₹100, which would flatten every grocery price.
          const itemPrice = Math.max(100, Math.round(base * bias * 100));
          const isCommunity = Boolean(meta.community);

          insertOffer.run(
            newId(),
            variantId,
            platformSlug,
            `${product.title} ${variant.label}`,
            meta.sellers[Math.floor(rng() * meta.sellers.length)] ?? meta.sellers[0]!,
            meta.sellerType,
            meta.sellerRating,
            meta.sellerRatingCount,
            meta.productRating,
            meta.productReviewCount,
            itemPrice,
            Math.round(variant.mrp * 100),
            isCommunity ? null : meta.shipping,
            meta.shippingNote ?? null,
            meta.deliveryMin,
            meta.deliveryMax,
            meta.returnDays,
            meta.warranty,
            meta.url(encodeURIComponent(`${product.title} ${variant.label}`)),
            meta.affiliate ? 1 : 0,
            isCommunity ? 'Shopper-reported price · demonstration' : 'Demonstration connector · no authorised feed',
            new Date(Date.now() - Math.floor(rng() * 200) * 60_000).toISOString(),
          );
        }
      });
    }
  })();

  // Observation history: starts NOW, so the price chart is honest about how long
  // we have actually been watching. No invented 12-month history.
  const offers = db.prepare('SELECT id, item_price_minor, last_checked_at FROM offers').all() as Array<{
    id: string;
    item_price_minor: number;
    last_checked_at: string;
  }>;
  const snapshotStmt = insertSnapshot;
  db.transaction(() => {
    for (const offer of offers) {
      snapshotStmt.run(newId(), offer.id, offer.item_price_minor, offer.last_checked_at);
    }
  })();

  console.info(`[catalogue] seeded ${PRODUCTS.length} products (demo data, watermarked in the UI)`);
}

export const CATALOGUE_PRODUCT_COUNT = PRODUCTS.length;
export const PLATFORMS_WITH_META = Object.keys(PLATFORM_META);
