/**
 * READING THE RETAILER'S OWN HEADLINE.
 *
 * A large part of the affiliate feed arrives as prose: "Noise Air Buds Pro 6 at
 * Rs.2707", "Up to 70% Off Combo Packs, Prices from Rs. 125". The network does
 * not populate `original_price` / `percent_off` for these, so the only number in
 * existence is the one the merchant wrote in the sentence.
 *
 * This module extracts exactly those numbers and nothing else. Two rules govern
 * it, both of them about not lying:
 *
 *  1. **A price is only a price when the sentence says so.** "at Rs.2707",
 *     "from Rs. 125", "only Rs. 199" are prices. "Rs.100 Off", "above Rs.1299",
 *     "cashback of Rs.200" are NOT prices and are rejected — treating a discount
 *     as a price is how a ₹1,299 kurta gets listed under "Deals under ₹199".
 *  2. **A ceiling stays a ceiling.** "Up to 80% off" is stored as a cap, not as
 *     a guarantee, so the interface can render "up to 80%" and never "80% off".
 *
 * Everything here is a pure function over a string, so it is testable without a
 * network or a database — see `packages/core/tests/offer-text.test.ts`.
 */

export interface StatedFacts {
  /** The price in paise (INR minor units), or null when the headline states none. */
  priceMinor: number | null;
  /** How the headline qualified that price, so the UI never overstates it. */
  priceKind: 'from' | 'only' | 'under' | 'at' | 'for' | null;
  /** A percentage the headline states, 0-100, or null. */
  percent: number | null;
  /** True when the headline said "up to" — the percentage is a ceiling, not a fact. */
  percentIsCap: boolean;
}

/** Rupee amount written as Rs. / INR / ₹ followed by digits with Indian commas. */
const MONEY = String.raw`(?:rs\s*\.?|inr|₹)\s*([\d][\d,]*(?:\.\d+)?)`;

/**
 * The words that turn a money amount into a *price*. Order matters: the longest
 * qualifier wins so "starting at" is read as `from`-style, and a bare "for" is
 * the weakest signal, which is why it is not accepted on its own.
 */
const PRICE_PATTERNS: Array<{ re: RegExp; kind: 'from' | 'only' | 'under' | 'at' }> = [
  { re: new RegExp(String.raw`\bstarting(?:\s+(?:at|from))?(?:\s+price)?\s+(?:at\s+|from\s+)?${MONEY}`, 'i'), kind: 'from' },
  { re: new RegExp(String.raw`\bprices?\s+(?:begin|start)(?:ning)?\s+(?:at|from)?\s*${MONEY}`, 'i'), kind: 'from' },
  { re: new RegExp(String.raw`\bpriced\s+at\s*${MONEY}`, 'i'), kind: 'at' },
  { re: new RegExp(String.raw`\bunder\s*${MONEY}`, 'i'), kind: 'under' },
  { re: new RegExp(String.raw`\bbelow\s*${MONEY}`, 'i'), kind: 'under' },
  { re: new RegExp(String.raw`\bfrom\s*${MONEY}`, 'i'), kind: 'from' },
  { re: new RegExp(String.raw`\bonly\s+(?:at\s+)?${MONEY}`, 'i'), kind: 'only' },
  { re: new RegExp(String.raw`\bat\s+(?:only\s+)?${MONEY}`, 'i'), kind: 'at' },
];

/**
 * A money amount followed by one of these in the same breath is a discount, a
 * threshold or a reward — never the price of the thing being sold.
 */
const REJECT_AFTER =
  /^\s*(?:%|off\b|back\b|cashback|discount|savings?\b|coupon|voucher|worth|extra|instant|reward|cash\b|points?\b)/i;

/** A money amount preceded by one of these is a threshold, not a price. */
const REJECT_BEFORE =
  /(?:minimum|min\.?|above|orders?\s+of|purchase\s+of|spend|buy\s+for|save|saving|worth|value\s+of|cashback|discount|off\s+on|extra|up\s+to)\s*$/i;

function toMinor(raw: string): number | null {
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value) || value <= 0) return null;
  // Sanity band: ₹1 to ₹5,00,000. Anything outside is a misparse or a typo in
  // the feed itself, and a wrong price is worse than no price.
  if (value < 1 || value > 500_000) return null;
  return Math.round(value * 100);
}

/**
 * Extracts the first *credible* price from a headline.
 *
 * The loop walks every match in reading order and accepts the first one that
 * survives both rejection tests, so "Buy for Rs.899 & get Flat 15% Off" yields
 * nothing (the "for" case is not a pattern) while "Prices from Rs. 125" yields
 * 12500 paise.
 */
export function parseStatedPrice(title: string | null | undefined): {
  priceMinor: number | null;
  priceKind: StatedFacts['priceKind'];
} {
  if (!title) return { priceMinor: null, priceKind: null };

  let best: { priceMinor: number; priceKind: StatedFacts['priceKind']; index: number } | null = null;

  for (const { re, kind } of PRICE_PATTERNS) {
    const m = re.exec(title);
    if (!m) continue;
    const minor = toMinor(m[1] ?? '');
    if (minor === null) continue;

    const amountAt = m.index + m[0].length;
    const after = title.slice(amountAt, amountAt + 24);
    const before = title.slice(Math.max(0, m.index - 30), m.index);
    if (REJECT_AFTER.test(after)) continue;
    if (REJECT_BEFORE.test(before)) continue;

    // Prefer the earliest mention: the headline's subject usually leads.
    if (!best || m.index < best.index) best = { priceMinor: minor, priceKind: kind, index: m.index };
  }

  return { priceMinor: best?.priceMinor ?? null, priceKind: best?.priceKind ?? null };
}

/**
 * Extracts the largest stated percentage discount, and whether it was a ceiling.
 *
 * "Up to 70% Off + Extra 10% Savings" is genuinely two numbers; the honest one to
 * lead with is the smaller *definite* one, but a shopper scanning a deal wall
 * expects the headline number — so we keep the largest and remember that it is a
 * cap, and the UI prints "up to". Cashback percentages are ignored entirely
 * because cashback is not a discount.
 */
export function parseStatedPercent(title: string | null | undefined): {
  percent: number | null;
  percentIsCap: boolean;
} {
  if (!title) return { percent: null, percentIsCap: false };

  // Two shapes exist in the feed: "Up to 50% + Extra 5% Off" (the headline
  // number carries no keyword at all) and "Flat 20% off". The keyword group is
  // therefore optional, but a bare percentage is only trusted when it is either
  // followed by a discount word or explicitly introduced by "up to"/"flat".
  const re =
    /(?:(up\s*to)\s*|(flat)\s*|(extra)\s*)?(\d{1,3})\s*%\s*(off|discount|savings?|cash\s*back|cashback)?/gi;
  let best: { percent: number; cap: boolean } | null = null;

  for (const m of title.matchAll(re)) {
    const word = (m[5] ?? '').toLowerCase().replace(/\s+/g, '');
    if (word.includes('cash')) continue; // cashback is not a discount
    const introduced = Boolean(m[1] || m[2]);
    if (!word && !introduced) continue; // a stray "50%" on its own is not a discount claim
    const value = Number(m[4]);
    if (!Number.isFinite(value) || value <= 0 || value > 95) continue;
    const cap = Boolean(m[1]);
    if (!best || value > best.percent) best = { percent: value, cap };
    else if (value === best.percent && !cap) best = { percent: value, cap: false };
  }

  return { percent: best?.percent ?? null, percentIsCap: best?.cap ?? false };
}

/** Both facts in one call — what the sync job actually needs. */
export function readStatedFacts(title: string | null | undefined): StatedFacts {
  const price = parseStatedPrice(title);
  const pct = parseStatedPercent(title);
  return {
    priceMinor: price.priceMinor,
    priceKind: price.priceKind,
    percent: pct.percent,
    percentIsCap: pct.percentIsCap,
  };
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The network publishes ~20 fine-grained categories. A shopper does not think in
 * 20 categories; they think in six. This maps the feed's vocabulary onto the
 * groups the homepage can honestly fill.
 */
export type DealGroup = 'grocery' | 'electronics' | 'fashion' | 'beauty' | 'home' | 'travel' | 'kids' | 'other';

const GROUP_OF: Record<string, DealGroup> = {
  'food & grocery': 'grocery',
  'food and grocery': 'grocery',
  grocery: 'grocery',
  electronics: 'electronics',
  mobiles: 'electronics',
  mobile: 'electronics',
  computers: 'electronics',
  gaming: 'electronics',
  software: 'electronics',
  'artificial intelligence': 'electronics',
  fashion: 'fashion',
  apparel: 'fashion',
  footwear: 'fashion',
  jewellery: 'fashion',
  'health & beauty': 'beauty',
  beauty: 'beauty',
  health: 'beauty',
  'home & kitchen': 'home',
  home: 'home',
  kitchen: 'home',
  furniture: 'home',
  travel: 'travel',
  flights: 'travel',
  hotels: 'travel',
  entertainment: 'travel',
  'baby & kids': 'kids',
  'baby and kids': 'kids',
  toys: 'kids',
  sports: 'other',
  'flowers & gifts': 'other',
  books: 'other',
  education: 'other',
  finance: 'other',
  services: 'other',
  others: 'other',
};

export function dealGroupOf(categoryName: string | null | undefined): DealGroup {
  if (!categoryName) return 'other';
  const key = categoryName.trim().toLowerCase().replace(/\s+/g, ' ');
  return GROUP_OF[key] ?? 'other';
}

export const DEAL_GROUP_LABELS: Record<DealGroup, string> = {
  grocery: 'Grocery & daily essentials',
  electronics: 'Electronics & gadgets',
  fashion: 'Fashion & lifestyle',
  beauty: 'Beauty & personal care',
  home: 'Home & kitchen',
  travel: 'Travel & experiences',
  kids: 'Baby & kids',
  other: 'More offers',
};

/**
 * Banks, cards and UPI apps that appear in Indian offer copy. Used only to
 * *find* offers that mention them — never to claim a rate we have not read.
 */
const BANK_WORDS = [
  'hdfc', 'icici', 'sbi', 'state bank', 'axis', 'kotak', 'idfc', 'federal bank', 'indusind',
  'yes bank', 'au bank', 'rbl', 'bank of baroda', 'canara', 'pnb', 'hsbc', 'standard chartered',
  'american express', 'amex', 'diners', 'rupay', 'visa', 'mastercard',
  'upi', 'paytm', 'google pay', 'gpay', 'phonepe', 'amazon pay', 'bhim', 'cred',
  'credit card', 'debit card', 'net banking', 'emi',
];

const BANK_RE = new RegExp(String.raw`\b(?:${BANK_WORDS.map((w) => w.replace(/ /g, String.raw`\s+`)).join('|')})\b`, 'i');

/** True when the copy mentions a bank, a card network or a UPI app. */
export function mentionsBankOrUpi(text: string | null | undefined): boolean {
  return text ? BANK_RE.test(text) : false;
}
