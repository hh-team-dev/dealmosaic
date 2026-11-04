import * as cuelinks from '../lib/cuelinks.js';

/**
 * WHAT THE AFFILIATE NETWORK SAYS WE EARNED.
 *
 * There are two ledgers in this business and they are not the same ledger:
 *
 *   1. **Clicks** — ours. `outbound_clicks`, counted the moment somebody taps
 *      "Shop at store". Precise, instant, and worth nothing on its own.
 *   2. **Commission** — the network's. It only exists once a shopper actually
 *      pays, and it moves through four states before any of it is money:
 *
 *        pending     the sale is recorded but the return window is open
 *        validated   the merchant accepted it
 *        payable     it is due at the next payout
 *        claimed     it is in the bank
 *
 * Both are shown side by side, never merged, because a click count that looks
 * like income is the most dangerous number a small publisher can stare at.
 *
 * FAILURE RULE: if the network cannot be reached, this returns `null` and the
 * admin page says "could not reach the network" — it never falls back to zero,
 * because a confident zero and an unknown are completely different facts.
 */

export interface EarningsSnapshot {
  currency: string;
  /** Commission by state, in the currency's minor unit (paise), parsed from the decimal strings. */
  commission: {
    pendingMinor: number;
    validatedMinor: number;
    payableMinor: number;
    claimedMinor: number;
    rejectedMinor: number;
    totalMinor: number;
  };
  /** The network's own performance totals for the same window. */
  performance: {
    clicks: number;
    transactions: number;
    commissionMinor: number;
    saleAmountMinor: number;
    conversionRate: string;
    epcMinor: number;
  };
  window: { from: string; to: string };
  fetchedAt: string;
  /** Raw state strings, kept verbatim so the page never re-rounds the network's own figures. */
  raw: { earnings: Record<string, string>; performance: Record<string, string> };
}

/**
 * "12.3456" → 1235 paise.
 *
 * The network sends money as a decimal string. `Math.round(parseFloat(x) * 100)`
 * is right for rupee amounts and wrong for anything with more than two decimals,
 * where it silently loses a fraction — which is why the raw string is kept on the
 * snapshot and shown next to the parsed number.
 */
export function toMinor(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** The last 30 days ending today, as the network wants them: plain dates. */
export function defaultWindow(days = 30): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 3600 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export async function fetchEarningsSnapshot(
  days = 30,
  channelId?: number,
): Promise<EarningsSnapshot | null> {
  if (!cuelinks.isConfigured()) return null;
  const window = defaultWindow(days);

  try {
    const [earnings, performance] = await Promise.all([
      cuelinks.fetchEarnings(window.from, window.to, channelId),
      cuelinks.fetchPerformance(window.from, window.to, channelId),
    ]);

    const e = earnings.totals;
    const p = performance.totals;

    return {
      currency: e.currency || p.currency || 'INR',
      commission: {
        pendingMinor: toMinor(e.pending),
        validatedMinor: toMinor(e.validated),
        payableMinor: toMinor(e.payable),
        claimedMinor: toMinor(e.claimed),
        rejectedMinor: toMinor(e.rejected),
        totalMinor: toMinor(e.total),
      },
      performance: {
        clicks: Number(p.clicks) || 0,
        transactions: Number(p.transactions) || 0,
        commissionMinor: toMinor(p.commission),
        saleAmountMinor: toMinor(p.sale_amount),
        conversionRate: String(p.cr ?? '0'),
        epcMinor: toMinor(p.epc),
      },
      window,
      fetchedAt: new Date().toISOString(),
      raw: {
        earnings: e as unknown as Record<string, string>,
        performance: p as unknown as Record<string, string>,
      },
    };
  } catch (err) {
    /*
     * Deliberately swallowed to `null`, not to zeros. The caller renders "could not
     * reach the network", which is true; zeros would read as "you have earned
     * nothing", which is a different and possibly false statement.
     */
    console.error('cuelinks earnings unavailable:', (err as Error).message);
    return null;
  }
}
