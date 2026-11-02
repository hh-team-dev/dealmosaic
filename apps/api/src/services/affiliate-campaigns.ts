import { db, nowIso } from '../db/index.js';
import * as cuelinks from '../lib/cuelinks.js';

/**
 * DOES THIS LINK ACTUALLY EARN?
 *
 * The handover has stated the rule since the first day: *a link is monetised only
 * when the network says `affiliated: true`* — never inferred from the fact that a
 * redirect works. For a long time nothing implemented it. Every outbound link was
 * therefore implicitly treated as earning, which is the exact kind of comfortable
 * assumption this project exists to avoid.
 *
 * This service caches the network's own answer. It pulls the CPS campaign list
 * (the only campaign type that pays on a purchase) and stores `access_status`:
 *
 *   open         → approved. A click through a tracked link earns.
 *   pending      → we applied. The link resolves and pays nothing.
 *   not_applied  → never asked. Pays nothing.
 *
 * Rate limit: 6 requests/minute. The sync therefore sleeps 10.5 s between pages
 * and is capped at `maxPages`. It is deliberately sequential — parallelising it
 * just gets us throttled and returns half a list.
 *
 * Cross-checked against `/links/convert` on 3 November 2026: Croma, Nykaa and
 * Firstcry returned `affiliated: true`; Flipkart, Myntra and Ajio returned
 * `affiliated: false`. The cached status matches, which is what makes this table
 * worth trusting.
 */

const PAGE_DELAY_MS = 10_500;

export interface CampaignSyncResult {
  ok: boolean;
  pages: number;
  seen: number;
  joined: number;
  pending: number;
  notApplied: number;
  tookMs: number;
  errors: string[];
}

interface CampaignRow {
  id: number;
  name: string;
  domain: string | null;
  access_status: string | null;
  campaign_type: string | null;
  payout: string | null;
  payout_currency: string | null;
  cookie_duration: string | null;
  deeplink_allowed: boolean | null;
  cashback_publishers_allowed: boolean | null;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export async function syncCampaigns(maxPages = 20): Promise<CampaignSyncResult> {
  const started = Date.now();
  const errors: string[] = [];
  let pages = 0;
  let seen = 0;
  let joined = 0;
  let pending = 0;
  let notApplied = 0;

  if (!cuelinks.isConfigured()) {
    return { ok: false, pages: 0, seen: 0, joined: 0, pending: 0, notApplied: 0, tookMs: 0, errors: ['CUELINKS_API_KEY is not set'] };
  }

  const stamp = nowIso();

  for (let page = 1; page <= maxPages; page += 1) {
    let res: Awaited<ReturnType<typeof cuelinks.fetchCampaigns>>;
    try {
      res = await cuelinks.fetchCampaigns(page, 100, 'CPS');
    } catch (err) {
      errors.push(`page ${page}: ${(err as Error).message}`);
      break;
    }

    const rows = (res.data ?? []) as CampaignRow[];
    if (rows.length === 0) break;
    pages += 1;
    seen += rows.length;

    for (const c of rows) {
      if (c.access_status === 'open') joined += 1;
      else if (c.access_status === 'pending') pending += 1;
      else notApplied += 1;
    }

    try {
      await db.batch(
        rows.map((c) => ({
          sql: `INSERT INTO affiliate_campaigns
                  (id, name, domain, access_status, campaign_type, payout, payout_currency,
                   cookie_duration, deeplink_allowed, cashback_allowed, synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  domain = excluded.domain,
                  access_status = excluded.access_status,
                  campaign_type = excluded.campaign_type,
                  payout = excluded.payout,
                  payout_currency = excluded.payout_currency,
                  cookie_duration = excluded.cookie_duration,
                  deeplink_allowed = excluded.deeplink_allowed,
                  cashback_allowed = excluded.cashback_allowed,
                  synced_at = excluded.synced_at`,
          args: [
            c.id,
            c.name,
            c.domain,
            c.access_status,
            c.campaign_type,
            c.payout ? Number(c.payout) : null,
            c.payout_currency,
            c.cookie_duration,
            c.deeplink_allowed ? 1 : 0,
            c.cashback_publishers_allowed ? 1 : 0,
            stamp,
          ],
        })),
      );
    } catch (err) {
      errors.push(`page ${page} write: ${(err as Error).message}`);
      break;
    }

    if (page < maxPages && res.meta?.next_page) await sleep(PAGE_DELAY_MS);
    else if (!res.meta?.next_page) break;
  }

  return { ok: errors.length === 0, pages, seen, joined, pending, notApplied, tookMs: Date.now() - started, errors };
}

export interface AffiliateReadiness {
  /** Campaigns we have cached. */
  tracked: number;
  /** `access_status = 'open'` — a click through a tracked link earns. */
  earning: number;
  /** Applied, not yet approved. Links resolve, pay nothing. */
  pending: number;
  /** Never applied. */
  notApplied: number;
  /** Of the merchants we actually show offers for, how many earn. */
  merchantsTracked: number;
  merchantsEarning: number;
  /** The earning merchants, so the number is auditable rather than a claim. */
  earningMerchants: Array<{ name: string; payout: number | null; currency: string | null; type: string | null }>;
  lastSyncedAt: string | null;
  note: string;
}

/**
 * The honest revenue picture: of the stores whose offers we publish, how many pay
 * us at all. Anything that is not `open` is counted as earning nothing, because
 * that is exactly what it does.
 */
export async function affiliateReadiness(): Promise<AffiliateReadiness> {
  const totals = (await db
    .prepare(
      `SELECT COUNT(*) AS tracked,
              SUM(CASE WHEN access_status = 'open' THEN 1 ELSE 0 END) AS earning,
              SUM(CASE WHEN access_status = 'pending' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN access_status = 'open' THEN 0 ELSE 1 END) AS not_applied,
              MAX(synced_at) AS last
         FROM affiliate_campaigns`,
    )
    .get()) as { tracked: number; earning: number | null; pending: number | null; not_applied: number | null; last: string | null };

  const merchants = (await db
    .prepare(
      `SELECT COUNT(DISTINCT c.campaign_id) AS tracked,
              SUM(CASE WHEN a.access_status = 'open' THEN 1 ELSE 0 END) AS earning
         FROM (SELECT DISTINCT campaign_id FROM coupons WHERE campaign_id IS NOT NULL) c
    LEFT JOIN affiliate_campaigns a ON a.id = c.campaign_id`,
    )
    .get()) as { tracked: number; earning: number | null };

  const top = (await db
    .prepare(
      `SELECT a.name, a.payout, a.payout_currency, a.campaign_type
         FROM affiliate_campaigns a
         JOIN (SELECT DISTINCT campaign_id AS id FROM coupons WHERE campaign_id IS NOT NULL) c
           ON c.id = a.id
        WHERE a.access_status = 'open'
        ORDER BY COALESCE(a.payout, 0) DESC
        LIMIT 40`,
    )
    .all()) as Array<{ name: string; payout: number | null; payout_currency: string | null; campaign_type: string | null }>;

  const earning = totals.earning ?? 0;
  const merchantsEarning = merchants.earning ?? 0;
  const merchantsTracked = merchants.tracked ?? 0;

  return {
    tracked: totals.tracked ?? 0,
    earning,
    pending: totals.pending ?? 0,
    notApplied: totals.not_applied ?? 0,
    merchantsTracked,
    merchantsEarning,
    earningMerchants: top.map((r) => ({ name: r.name, payout: r.payout, currency: r.payout_currency, type: r.campaign_type })),
    lastSyncedAt: totals.last ?? null,
    note:
      'approval only. A store marked open earns a commission on a completed purchase; ' +
      'pending and not_applied earn nothing, and their links are still shown if the ' +
      'offer is genuinely good. Cashback is never counted as a discount.',
  };
}
