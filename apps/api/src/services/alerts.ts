import { db, newId, nowIso } from '../db/index.js';
import { sendMail } from '../lib/mailer.js';

/** Where a shopper lands after clicking an alert email. */
const SITE_URL = (process.env.SITE_URL ?? 'https://dealmosaic.pages.dev').replace(/\/$/, '');

/**
 * PRICE ALERTS — the strongest reason to come back, and the easiest thing in
 * this codebase to get wrong.
 *
 * The rule: **an email is only sent when a price we actually hold has fallen
 * below the target the shopper set.** Not "a price changed", not "a deal looks
 * good", not "come back and shop". A notification that fires without a real
 * price drop teaches people to ignore notifications, and then the one that
 * mattered is ignored too.
 *
 * Everything else follows from that:
 *
 *  - The comparison uses `item_price_minor` of the *cheapest active offer* for
 *    that exact variant. A 256 GB phone never triggers an alert set on the
 *    128 GB one.
 *  - Offers whose origin is demonstration data are counted separately and
 *    labelled as such in the email, because "₹14,999" from a demo connector is
 *    not a price anyone can buy at.
 *  - An alert fires **once** (`status = 'triggered'`). Re-arming is a decision
 *    the shopper makes, not one we make for them.
 *  - Every send is recorded in `notification_events`, so a duplicate is
 *    detectable after the fact rather than denied.
 */

export interface AlertRow {
  id: string;
  user_id: string;
  variant_ref: string;
  target_price_minor: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AlertEvaluation {
  alertId: string;
  userId: string;
  email: string;
  displayName: string | null;
  variantRef: string;
  productTitle: string;
  variantLabel: string;
  productSlug: string;
  targetMinor: number;
  bestMinor: number;
  bestPlatform: string;
  bestOrigin: string;
  offerId: string;
  sent: boolean;
  skippedReason?: string;
}

const rupee = (minor: number): string => `₹${Math.round(minor / 100).toLocaleString('en-IN')}`;

/**
 * The cheapest live offer for a variant, with the platform that owns it.
 *
 * `item_price_minor` only — delivery and fees are shown on the product page but
 * are not part of the alert comparison, because they change by pincode and an
 * alert that fires on a ₹40 delivery swing is noise, not signal.
 */
export async function bestOfferForVariant(
  variantId: string,
): Promise<{ offerId: string; platformSlug: string; priceMinor: number; dataOrigin: string } | null> {
  const row = (await db
    .prepare(
      `SELECT id, platform_slug, item_price_minor, data_origin
         FROM offers
        WHERE variant_id = ? AND is_active = 1 AND in_stock = 1
        ORDER BY item_price_minor ASC
        LIMIT 1`,
    )
    .get(variantId)) as
    | { id: string; platform_slug: string; item_price_minor: number; data_origin: string }
    | undefined;

  if (!row) return null;
  return {
    offerId: row.id,
    platformSlug: row.platform_slug,
    priceMinor: row.item_price_minor,
    dataOrigin: row.data_origin,
  };
}

/**
 * Runs every active alert once. Called by the `/api/alerts/run` endpoint, which
 * a scheduled worker hits; safe to call repeatedly.
 *
 * Deliberately sequential: a fan-out of fifty parallel Brevo calls is how a free
 * plan gets rate-limited at exactly the moment it matters.
 */
export async function runAlerts(limit = 200): Promise<{
  checked: number;
  triggered: AlertEvaluation[];
  skipped: number;
}> {
  const rows = (await db
    .prepare(
      `SELECT a.*, u.email, u.display_name,
              v.variant_label, v.product_id,
              p.title AS product_title, p.slug AS product_slug
         FROM price_alerts a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN product_variants v ON v.id = a.variant_ref
         LEFT JOIN catalogue_products p ON p.id = v.product_id
        WHERE a.status = 'active'
        ORDER BY a.created_at ASC
        LIMIT ?`,
    )
    .all(limit)) as unknown as Array<
    AlertRow & {
      email: string;
      display_name: string | null;
      variant_label: string | null;
      product_title: string | null;
      product_slug: string | null;
    }
  >;

  const triggered: AlertEvaluation[] = [];
  let skipped = 0;

  for (const row of rows) {
    const best = await bestOfferForVariant(row.variant_ref);
    if (!best) {
      // No live offer means no evidence. Staying silent is the correct action;
      // inventing a drop to justify the email would be worse than useless.
      skipped++;
      continue;
    }
    if (best.priceMinor >= row.target_price_minor) {
      skipped++;
      continue;
    }

    const productTitle = row.product_title ?? 'your saved product';
    const variantLabel = row.variant_label ? ` (${row.variant_label})` : '';
    const demo = best.dataOrigin === 'demo' || best.dataOrigin === 'feed';
    const productUrl = row.product_slug ? `${SITE_URL}/p/${row.product_slug}` : `${SITE_URL}/browse`;

    const result = await sendMail({
      to: row.email,
      subject: `${productTitle}${variantLabel} is ${rupee(best.priceMinor)} — below your ${rupee(row.target_price_minor)} target`,
      body: [
        `Hi${row.display_name ? ` ${row.display_name}` : ''},`,
        ``,
        `${productTitle}${variantLabel} is now listed at ${rupee(best.priceMinor)} on ${best.platformSlug}.`,
        `You asked to be told when it fell below ${rupee(row.target_price_minor)}.`,
        ``,
        demo
          ? `One thing to be straight about: this price comes from demonstration data for ${best.platformSlug}, not from a live retailer feed. Treat it as a signal that the product is worth checking, not as a quote you can pay.`
          : `This price is from the retailer feed we hold for ${best.platformSlug}, checked just now.`,
        ``,
        `See the full comparison: ${productUrl}`,
        ``,
        `This alert is now closed. You can set a new target price on the product page at any time.`,
        ``,
        `— DEALMOSAIC`,
      ].join('\n'),
      actionUrl: productUrl,
    });

    await db
      .prepare("UPDATE price_alerts SET status = 'triggered', updated_at = ? WHERE id = ?")
      .run(nowIso(), row.id);

    await db
      .prepare(
        `INSERT INTO notification_events (id, user_id, kind, payload, created_at)
         VALUES (?, ?, 'price_alert', ?, ?)`,
      )
      .run(
        newId(),
        row.user_id,
        JSON.stringify({
          alertId: row.id,
          variantRef: row.variant_ref,
          targetMinor: row.target_price_minor,
          bestMinor: best.priceMinor,
          platformSlug: best.platformSlug,
          dataOrigin: best.dataOrigin,
          emailed: result.sent,
        }),
        nowIso(),
      );

    triggered.push({
      alertId: row.id,
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      variantRef: row.variant_ref,
      productTitle,
      variantLabel,
      productSlug: row.product_slug ?? '',
      targetMinor: row.target_price_minor,
      bestMinor: best.priceMinor,
      bestPlatform: best.platformSlug,
      bestOrigin: best.dataOrigin,
      offerId: best.offerId,
      sent: result.sent,
      ...(result.sent ? {} : { skippedReason: result.error ?? 'mail transport not configured' }),
    });
  }

  return { checked: rows.length, triggered, skipped };
}
