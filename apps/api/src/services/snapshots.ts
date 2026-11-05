import { db, newId, nowIso } from '../db/index.js';

/**
 * DAILY PRICE SNAPSHOTS.
 *
 * `offer_snapshots` is the memory of the product. Without a row per day there is
 * no price history, no "was this actually cheaper last month", and no way to
 * answer the question every shopper asks before a big purchase: *is this a good
 * price, or is it the normal price with a red badge on it?*
 *
 * Two rules:
 *
 *  1. **One row per offer per day.** A snapshot is a daily observation, not a
 *     log of every time a request touched the row. Re-running this is therefore
 *     harmless — it updates today's value rather than stacking duplicates.
 *  2. **Never backfill.** There is exactly one day on which we can honestly say
 *     "this is what the price was today", and that is today. Inventing a
 *     historical curve for a product we met yesterday would be the most
 *     convincing lie on the entire site.
 */

export interface SnapshotRun {
  offers: number;
  written: number;
  skipped: number;
}

export async function recordDailySnapshots(): Promise<SnapshotRun> {
  const today = nowIso().slice(0, 10);

  const offers = (await db
    .prepare("SELECT id, item_price_minor, currency, data_origin FROM offers WHERE is_active = 1 AND data_origin = 'live'")
    .all()) as Array<{ id: string; item_price_minor: number; currency: string; data_origin: string }>;

  if (offers.length === 0) return { offers: 0, written: 0, skipped: 0 };

  const existing = (await db
    .prepare('SELECT offer_id FROM offer_snapshots WHERE substr(observed_at, 1, 10) = ?')
    .all(today)) as Array<{ offer_id: string }>;
  const seen = new Set(existing.map((r) => r.offer_id));

  const statements = offers.map((o) => ({
    sql: `INSERT INTO offer_snapshots (id, offer_id, price_minor, currency, observed_at, data_origin)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT DO NOTHING`,
    args: [newId(), o.id, o.item_price_minor, o.currency, nowIso(), o.data_origin],
  }));

  // Cheap guard against a double insert when two schedulers overlap: the day's
  // rows already exist, so there is nothing to do.
  const pending = statements.filter((_, i) => {
    const offer = offers[i];
    return offer ? !seen.has(offer.id) : false;
  });
  if (pending.length === 0) return { offers: offers.length, written: 0, skipped: offers.length };

  await db.batch(pending);
  return { offers: offers.length, written: pending.length, skipped: offers.length - pending.length };
}
