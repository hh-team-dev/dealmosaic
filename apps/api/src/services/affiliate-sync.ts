import { db, newId, nowIso } from '../db/index.js';
import * as cuelinks from '../lib/cuelinks.js';

/**
 * THE AFFILIATE FEED SYNC.
 *
 * Lives here rather than inside an HTTP handler because two different callers
 * need it: the manual `POST /api/coupons/sync` endpoint, and the daily
 * maintenance job that keeps the deal wall from going stale. Two copies of this
 * upsert is how one of them quietly drifts from the other.
 *
 * Measured against the live feed: 1,085 offers across 11 pages, 21.5 s batched.
 * The first version did SELECT-then-INSERT-or-UPDATE per row — 2,170 round trips
 * — and took 8 min 34 s, which is longer than the schedule it was meant to run
 * on.
 */

export interface SyncResult {
  ok: boolean;
  seen: number;
  inserted: number;
  updated: number;
  errors: string[];
}

export async function syncAffiliateOffers(pages = 5): Promise<SyncResult> {
  if (!cuelinks.isConfigured()) {
    return { ok: false, seen: 0, inserted: 0, updated: 0, errors: ['CUELINKS_API_KEY is not set'] };
  }

  const maxPages = Math.min(Math.max(1, pages), 40);
  let inserted = 0;
  let updated = 0;
  let seen = 0;
  const errors: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    let offers;
    try {
      offers = await cuelinks.fetchOffers(page, 100, Number(process.env.CUELINKS_CHANNEL_ID) || undefined);
    } catch (err) {
      errors.push((err as Error).message);
      break;
    }
    if (offers.data.length === 0) break;

    const stamp = nowIso();
    const statements = offers.data.map((offer) => {
      const row = cuelinks.toCouponRow(offer);
      return {
        sql: `INSERT INTO coupons (id, platform_slug, code, title, description, discount_type, discount_value,
                                   max_discount_minor, min_order_minor, terms, source, trust_state,
                                   external_id, tracking_url, starts_at, expires_at, created_at, verified_at,
                                   campaign_name, categories, primary_category, deal_group, offer_type,
                                   stated_price_minor, stated_price_kind, stated_percent, stated_percent_cap,
                                   mentions_bank, campaign_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'affiliate', 'moderator_verified', ?, ?, ?, ?, ?, ?,
                      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(external_id) WHERE external_id IS NOT NULL DO UPDATE SET
                platform_slug = excluded.platform_slug,
                code = excluded.code,
                title = excluded.title,
                description = excluded.description,
                discount_type = excluded.discount_type,
                discount_value = excluded.discount_value,
                terms = excluded.terms,
                tracking_url = excluded.tracking_url,
                starts_at = excluded.starts_at,
                expires_at = excluded.expires_at,
                campaign_name = excluded.campaign_name,
                categories = excluded.categories,
                primary_category = excluded.primary_category,
                deal_group = excluded.deal_group,
                offer_type = excluded.offer_type,
                stated_price_minor = excluded.stated_price_minor,
                stated_price_kind = excluded.stated_price_kind,
                stated_percent = excluded.stated_percent,
                stated_percent_cap = excluded.stated_percent_cap,
                mentions_bank = excluded.mentions_bank,
                campaign_id = excluded.campaign_id,
                verified_at = excluded.verified_at,
                trust_state = 'moderator_verified'
              RETURNING (created_at = verified_at) AS is_new`,
        args: [
          newId(), row.platformSlug, row.code, row.title, row.description, row.discountType,
          row.discountValue, row.maxDiscountMinor, row.minOrderMinor, row.terms,
          // One timestamp for both columns, so `created_at = verified_at` is a true
          // "this row was inserted just now" signal for the counter below.
          row.externalId, row.trackingUrl, row.startsAt, row.expiresAt, stamp, stamp,
          row.campaignName, row.categories, row.primaryCategory, row.dealGroup, row.offerType,
          row.statedPriceMinor, row.statedPriceKind, row.statedPercent, row.statedPercentCap,
          row.mentionsBank,
          row.campaignId,
        ],
      };
    });

    try {
      const results = await db.batch(statements);
      seen += statements.length;
      for (const r of results) {
        if (Number((r.rows[0] as { is_new?: number } | undefined)?.is_new ?? 0) === 1) inserted++;
        else updated++;
      }
    } catch (err) {
      errors.push((err as Error).message);
      break;
    }
    if (!offers.meta.next_page) break;
  }

  return { ok: errors.length === 0, seen, inserted, updated, errors };
}
