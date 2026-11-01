import { db } from '../db/index.js';
import type { Connector, ConnectorHealth, ConnectorOffer, ConnectorSearchParams } from './types.js';

/**
 * DEMO CONNECTOR.
 *
 * Reads the seeded demonstration catalogue. Every offer it returns is stamped
 * `dataOrigin: 'demo'` and the UI prints "DEMO DATA" on it. This is the only
 * connector that is active out of the box, and it exists so the comparison
 * experience can be exercised end to end without pretending to hold live prices.
 */
export class DemoConnector implements Connector {
  slug = 'demo';
  displayName = 'Demonstration catalogue';
  kind = 'demo' as const;

  isConfigured(): boolean {
    return true;
  }

  async health(): Promise<ConnectorHealth> {
    const started = Date.now();
    const row = (await db.prepare('SELECT COUNT(*) AS n FROM offers WHERE data_origin = ?').get('demo')) as { n: number };
    return {
      status: 'demo',
      detail: `${row.n} demonstration offers. No retailer has granted authorised price access yet, so nothing here is a live price.`,
      checkedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
      needsCredentials: false,
    };
  }

  async search({ query, gtin, limit = 40 }: ConnectorSearchParams): Promise<ConnectorOffer[]> {
    const rows = await (db
      .prepare(
        `SELECT o.*, v.gtin AS variant_gtin, v.mpn AS variant_mpn, v.attributes AS variant_attributes
           FROM offers o
           JOIN product_variants v ON v.id = o.variant_id
           JOIN catalogue_products p ON p.id = v.product_id
          WHERE o.data_origin = 'demo'
            AND (
              ? IS NOT NULL AND v.gtin = ?
              OR p.title LIKE ? OR p.brand LIKE ?
            )
          LIMIT ?`,
      )
      .all(gtin ?? null, gtin ?? null, `%${query}%`, `%${query}%`, limit)) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      platformSlug: String(row.platform_slug),
      title: String(row.title),
      sellerName: String(row.seller_name),
      sellerType: row.seller_type as ConnectorOffer['sellerType'],
      sellerRating: row.seller_rating as number | null,
      sellerRatingCount: row.seller_rating_count as number | null,
      productRating: row.product_rating as number | null,
      productReviewCount: row.product_review_count as number | null,
      itemPriceMinor: Number(row.item_price_minor),
      currency: 'INR' as const,
      mrpMinor: row.mrp_minor as number | null,
      itemCondition: row.item_condition as ConnectorOffer['itemCondition'],
      inStock: Boolean(row.in_stock),
      shippingMinor: row.shipping_minor as number | null,
      shippingNote: row.shipping_note as string | null,
      deliveryDaysMin: row.delivery_days_min as number | null,
      deliveryDaysMax: row.delivery_days_max as number | null,
      returnWindowDays: row.return_window_days as number | null,
      warrantyMonths: row.warranty_months as number | null,
      productUrl: String(row.product_url),
      affiliate: Boolean(row.affiliate),
      dataOrigin: 'demo' as const,
      sourceLabel: String(row.source_label),
      lastCheckedAt: String(row.last_checked_at),
      gtin: (row.variant_gtin as string | null) ?? null,
      mpn: (row.variant_mpn as string | null) ?? null,
      attributes: JSON.parse(String(row.variant_attributes ?? '{}')) as Record<string, string>,
    }));
  }
}
