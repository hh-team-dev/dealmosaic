import type { CouponView } from '../routes/coupons.js';

/**
 * THE SHELF BUILDER — the honesty rules of the homepage, in one testable place.
 *
 * Every rule that decides what appears on the discovery wall lives here rather
 * than inside an HTTP handler, because these are product rules, not plumbing:
 *
 *  - a shelf never appears with fewer than `minItems` real rows;
 *  - "under ₹X" only accepts offers whose own headline stated a price ≤ X;
 *  - "biggest savings" ranks by the percentage the store published, and keeps
 *    "up to" as a ceiling;
 *  - "ending soon" only accepts offers with a real expiry date;
 *  - commission is not an input to any ordering decision.
 *
 * `buildDiscovery` is a pure function over already-fetched rows, so it can be
 * tested against a fixture of awkward offers (cashback, no price, no expiry,
 * expired yesterday) without a database.
 */

export interface DiscoveryDeal extends CouponView {
  daysLeft: number | null;
}

export interface DiscoverySection {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  minItems: number;
  items: DiscoveryDeal[];
}

export interface DiscoveryResult {
  totals: {
    live: number;
    withCode: number;
    withStatedPrice: number;
    endingThisWeek: number;
    bankOrUpi: number;
  };
  sections: DiscoverySection[];
  withheld: Array<{ id: string; title: string; found: number; needed: number }>;
}

const DAY_MS = 86_400_000;

/** Order used everywhere: actionable first, then the strongest stated saving. */
function byUsefulness(a: DiscoveryDeal, b: DiscoveryDeal): number {
  if (Boolean(a.code) !== Boolean(b.code)) return a.code ? -1 : 1;
  const ap = a.statedPercent ?? -1;
  const bp = b.statedPercent ?? -1;
  if (ap !== bp) return bp - ap;
  const ad = a.daysLeft ?? 9999;
  const bd = b.daysLeft ?? 9999;
  return ad - bd;
}

export function buildDiscovery(views: CouponView[], now: Date = new Date()): DiscoveryResult {
  const nowMs = now.getTime();
  const deals: DiscoveryDeal[] = views.map((v) => ({
    ...v,
    daysLeft: v.expiresAt ? Math.max(0, Math.ceil((new Date(v.expiresAt).getTime() - nowMs) / DAY_MS)) : null,
  }));

  /** Editorial shelves borrow from each other, so they must not repeat a deal. */
  const claimed = new Set<string>();
  const take = (pool: DiscoveryDeal[], n: number, dedupe: boolean): DiscoveryDeal[] => {
    const out: DiscoveryDeal[] = [];
    for (const d of pool) {
      if (dedupe && claimed.has(d.id)) continue;
      out.push(d);
      if (dedupe) claimed.add(d.id);
      if (out.length >= n) break;
    }
    return out;
  };

  /**
   * BUILD ORDER IS NOT DISPLAY ORDER.
   *
   * The specific shelves claim their deals first and the generic "Today's best"
   * shelf is filled last, because a 70%-off offer belongs in *Biggest savings*
   * even if it would also have qualified for Today's best. Building Today first
   * — the obvious way round — silently starves every shelf after it.
   */
  const sections: DiscoverySection[] = [];

  /**
   * The expiry shelf claims first. It is the only shelf whose information cannot
   * be recovered anywhere else on the page: a deal that dies on Friday is worth
   * less on Saturday, so it must not be spent on a generic shelf first.
   */
  const endingPool = deals
    .filter((d) => d.expiresAt !== null && (d.daysLeft ?? 999) <= 7)
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999) || byUsefulness(a, b));
  sections.push({
    id: 'ending',
    title: 'Ending in the next seven days',
    subtitle: 'Real expiry dates from the stores — no countdown we made up.',
    href: '/deals?expiring=7&sort=ending',
    minItems: 3,
    items: take(endingPool, 6, true),
  });

  const withPercent = deals
    .filter((d) => (d.statedPercent ?? 0) >= 20)
    .sort((a, b) => (b.statedPercent ?? 0) - (a.statedPercent ?? 0) || byUsefulness(a, b));
  sections.push({
    id: 'biggest',
    title: 'Biggest savings on the board',
    subtitle: 'Ranked by the percentage the store itself published — never by what a store pays us.',
    href: '/deals?sort=savings',
    minItems: 4,
    items: take(withPercent, 6, true),
  });

  /**
   * The buckets are DISJOINT on the page even though each "See all" link is an
   * inclusive filter. Filling each shelf independently put the same six cheapest
   * offers under ₹99, ₹199, ₹499 and ₹999 — four identical rows, which reads as a
   * broken page. An offer now belongs to the tightest bucket it fits, and the
   * link still shows everything up to that ceiling.
   */
  const spentOnPrice = new Set<string>();
  for (const cap of [99, 199, 499, 999]) {
    const pool = deals
      .filter((d) => d.statedPriceMinor !== null && d.statedPriceMinor <= cap * 100 && !spentOnPrice.has(d.id))
      .sort((a, b) => (a.statedPriceMinor ?? 0) - (b.statedPriceMinor ?? 0) || byUsefulness(a, b))
      .slice(0, 6);
    for (const d of pool) spentOnPrice.add(d.id);
    sections.push({
      id: `under-${cap}`,
      title: `Under ₹${cap}`,
      subtitle: 'Priced from the store’s own headline.',
      href: `/deals?maxPrice=${cap}`,
      minItems: 3,
      items: pool,
    });
  }

  for (const [group, title] of [
    ['grocery', 'Grocery & daily essentials'],
    ['electronics', 'Electronics & gadgets'],
    ['fashion', 'Fashion & lifestyle'],
    ['beauty', 'Beauty & personal care'],
    ['home', 'Home & kitchen'],
  ] as const) {
    const pool = deals.filter((d) => d.dealGroup === group).sort(byUsefulness);
    sections.push({
      id: group,
      title,
      subtitle: 'Live offers from stores in this category.',
      href: `/deals?group=${group}`,
      minItems: 4,
      items: take(pool, 6, true),
    });
  }

  const bankPool = deals.filter((d) => d.mentionsBankOrUpi).sort(byUsefulness);
  sections.push({
    id: 'bank',
    title: 'Bank, card & UPI offers',
    subtitle: 'Only offers whose own copy names a bank, card or UPI app.',
    href: '/deals?bank=1',
    minItems: 3,
    items: take(bankPool, 6, true),
  });

  const fortnightAgo = nowMs - 14 * DAY_MS;
  const newPool = deals
    .filter((d) => d.createdAt !== null && new Date(d.createdAt).getTime() >= fortnightAgo)
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  sections.push({
    id: 'new',
    title: 'Newly discovered',
    subtitle: 'Added to DealMosaic in the last two weeks.',
    href: '/deals?sort=new',
    minItems: 4,
    items: take(newPool, 6, true),
  });

  // The catch-all shelf, filled last so the specific shelves keep their best rows.
  sections.push({
    id: 'today',
    title: "Today's best deals",
    subtitle: 'Live right now, codes first — because a code is the part you can use.',
    href: '/deals',
    minItems: 4,
    items: take([...deals].sort(byUsefulness), 8, true),
  });

  /**
   * Display order follows shopper intent: what is good today, then the biggest
   * saving, then affordability, then categories, then the offer on top of the
   * offer, then freshness, then urgency.
   */
  const DISPLAY_ORDER = [
    'today', 'biggest', 'under-99', 'under-199', 'under-499', 'under-999',
    'grocery', 'electronics', 'fashion', 'beauty', 'home',
    'bank', 'new', 'ending',
  ];
  sections.sort((a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id));

  return {
    totals: {
      live: deals.length,
      withCode: deals.filter((d) => d.code).length,
      withStatedPrice: deals.filter((d) => d.statedPriceMinor !== null).length,
      endingThisWeek: endingPool.length,
      bankOrUpi: bankPool.length,
    },
    sections: sections.filter((s) => s.items.length >= s.minItems),
    withheld: sections
      .filter((s) => s.items.length < s.minItems)
      .map((s) => ({ id: s.id, title: s.title, found: s.items.length, needed: s.minItems })),
  };
}
