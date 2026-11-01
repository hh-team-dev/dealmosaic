/**
 * Money — integer minor units only. No floating-point arithmetic on currency, ever.
 *
 * Every amount in DEALMOSAIC is stored and transported as an integer count of the
 * currency's minor unit (paise for INR, cents for USD). Conversion to a display
 * string happens exactly once, at the edge, via Intl.NumberFormat.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD' | 'AUD' | 'CAD' | 'JPY';

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  name: string;
  /** digits after the decimal separator: 2 for INR/USD, 0 for JPY */
  minorUnits: number;
  /** Indian grouping (1,23,456) vs western (123,456) */
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', minorUnits: 2, locale: 'en-IN' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', minorUnits: 2, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', minorUnits: 2, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', minorUnits: 2, locale: 'en-GB' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', minorUnits: 2, locale: 'en-AE' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', minorUnits: 2, locale: 'en-SG' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', minorUnits: 2, locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', minorUnits: 2, locale: 'en-CA' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', minorUnits: 0, locale: 'ja-JP' },
};

export interface Money {
  amountMinor: number;
  currency: CurrencyCode;
}

/** Round a display amount (e.g. 1234.56) to integer minor units, half-up. */
export function toMinor(display: number, currency: CurrencyCode): number {
  const factor = Math.pow(10, CURRENCIES[currency].minorUnits);
  return Math.round(display * factor);
}

/** Integer minor units back to a display number. Only for formatting/conversion. */
export function fromMinor(amountMinor: number, currency: CurrencyCode): number {
  return amountMinor / Math.pow(10, CURRENCIES[currency].minorUnits);
}

export function money(amountMinor: number, currency: CurrencyCode): Money {
  return { amountMinor, currency };
}

/** Add two amounts of the same currency. Throws on currency mismatch — silently
 *  adding INR to USD is exactly the class of bug this module exists to prevent. */
export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

export function sumMoney(items: Money[], currency: CurrencyCode): Money {
  return {
    amountMinor: items.reduce((acc, m) => {
      if (m.currency !== currency) throw new Error(`currency mismatch: ${m.currency} vs ${currency}`);
      return acc + m.amountMinor;
    }, 0),
    currency,
  };
}

function assertSameCurrency(a: Money, b: Money) {
  if (a.currency !== b.currency) {
    throw new Error(`currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: CurrencyCode, opts: 'full' | 'compact'): Intl.NumberFormat {
  const key = `${currency}:${opts}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  const meta = CURRENCIES[currency];
  const fmt = new Intl.NumberFormat(meta.locale, {
    style: 'currency',
    currency: meta.code,
    minimumFractionDigits: opts === 'compact' && meta.minorUnits === 2 ? 0 : meta.minorUnits,
    maximumFractionDigits: opts === 'compact' ? (meta.minorUnits === 2 ? 0 : 0) : meta.minorUnits,
  });
  formatterCache.set(key, fmt);
  return fmt;
}

/** "₹1,23,456.78" — Indian grouping for INR. */
export function formatMoney(m: Money): string {
  return getFormatter(m.currency, 'full').format(fromMinor(m.amountMinor, m.currency));
}

/** "₹1,23,457" — no decimals, for tight UI (prices, chart labels). */
export function formatMoneyCompact(m: Money): string {
  return getFormatter(m.currency, 'compact').format(fromMinor(m.amountMinor, m.currency));
}

/** For inputs and exports: "1234.56" */
export function toEditString(m: Money): string {
  return fromMinor(m.amountMinor, m.currency).toFixed(CURRENCIES[m.currency].minorUnits);
}

/** Convert using a rate expressed as units of `to` per one unit of `from`.
 *  Rounding happens once, here. Rate provenance/date is the caller's job. */
export function convertMoney(m: Money, rate: number, to: CurrencyCode): Money {
  const fromFactor = Math.pow(10, CURRENCIES[m.currency].minorUnits);
  const toFactor = Math.pow(10, CURRENCIES[to].minorUnits);
  const major = m.amountMinor / fromFactor;
  return { amountMinor: Math.round(major * rate * toFactor), currency: to };
}

/* ------------------------------------------------------------------ */
/* Price Truth Engine — line items and honest totals                   */
/* ------------------------------------------------------------------ */

/**
 * The five states a cost line can be in. This vocabulary is the heart of the
 * trust promise: missing data is never rendered as zero, and fees that only
 * apply under some conditions are never quietly summed as if they always apply.
 */
export type LineState =
  | 'confirmed' // verified, applies to this purchase
  | 'estimated' // a real number, but derived or approximate
  | 'not_available' // the source gave us nothing — NOT zero
  | 'not_applicable' // genuinely doesn't apply (e.g. no shipping on a digital item)
  | 'conditional'; // applies only under stated conditions (cart value, time, weather)

export type LineKind =
  | 'item'
  | 'shipping'
  | 'tax'
  | 'fee'
  | 'discount' // negative
  | 'duty'
  | 'conversion';

export interface PriceLine {
  kind: LineKind;
  label: string;
  state: LineState;
  amountMinor: number | null;
  /** Why this line is conditional/estimated/unavailable — shown to the user. */
  note?: string;
}

export type VerificationState = 'complete' | 'partial' | 'unverified';

export interface PriceTruth {
  currency: CurrencyCode;
  lines: PriceLine[];
  /** Sum of lines that are confirmed or estimated. Conditional lines excluded. */
  knownTotalMinor: number;
  /** Only set when every mandatory line is known. */
  verifiedTotalMinor: number | null;
  verificationState: VerificationState;
  /** Human-readable list of what is missing — drives "TOTAL NOT FULLY VERIFIED". */
  missing: string[];
  /** Lines deliberately excluded from the total, with their conditions. */
  conditional: string[];
  /** Discounts that were applied to knownTotalMinor, as a positive number. */
  discountsAppliedMinor: number;
}

const MANDATORY: LineKind[] = ['item', 'shipping', 'tax'];

/**
 * Build a Price Truth from itemised lines.
 *
 * Rules (each is covered by a test):
 *  - `not_available` on a mandatory line => total is NOT verified. Never coerced to 0.
 *  - `not_applicable` is treated as a known zero for that line (it genuinely is zero).
 *  - `conditional` lines are listed but excluded from the total.
 *  - A `conditional` line of a MANDATORY kind (a delivery fee that only applies
 *    below a cart threshold, say) means the total cannot be called verified: the
 *    money is real, we just cannot state it. Excluding it silently would be the
 *    same lie as rendering a missing fee as zero.
 *  - Discounts are subtracted; only `confirmed` discounts are applied, estimated
 *    ones are flagged so the UI can label them.
 */
export function buildPriceTruth(lines: PriceLine[], currency: CurrencyCode): PriceTruth {
  let known = 0;
  let discountsApplied = 0;
  const missing: string[] = [];
  const conditional: string[] = [];
  let mandatoryUnresolved = false;

  for (const line of lines) {
    const isDiscount = line.kind === 'discount';
    switch (line.state) {
      case 'confirmed':
      case 'estimated': {
        const amt = line.amountMinor ?? 0;
        if (isDiscount) {
          const positive = Math.abs(amt);
          known -= positive;
          discountsApplied += positive;
        } else {
          known += amt;
        }
        if (line.state === 'estimated' && MANDATORY.includes(line.kind)) mandatoryUnresolved = true;
        break;
      }
      case 'not_applicable':
        break;
      case 'not_available':
        if (MANDATORY.includes(line.kind)) mandatoryUnresolved = true;
        missing.push(line.label);
        break;
      case 'conditional':
        conditional.push(line.note ? `${line.label} — ${line.note}` : line.label);
        // A conditionally-applicable mandatory cost keeps the total unverified.
        if (MANDATORY.includes(line.kind)) mandatoryUnresolved = true;
        break;
    }
  }

  const hasMissing = missing.length > 0 || mandatoryUnresolved;
  const verificationState: VerificationState = hasMissing
    ? lines.some((l) => l.state === 'confirmed')
      ? 'partial'
      : 'unverified'
    : 'complete';

  return {
    currency,
    lines,
    knownTotalMinor: known,
    verifiedTotalMinor: hasMissing ? null : known,
    verificationState,
    missing,
    conditional,
    discountsAppliedMinor: discountsApplied,
  };
}

/** Grocery helper: price per 100 g / per kg / per litre / per piece.
 *  Returns null when the quantity is unknown — never guesses. */
export function unitPrice(
  priceMinor: number,
  netQuantity: number | null,
  unit: 'g' | 'ml' | 'kg' | 'l' | 'pc' | null,
): { per100: number | null; perBase: number | null; unit: 'g' | 'ml' | 'pc' | null } {
  if (netQuantity === null || unit === null || netQuantity <= 0) {
    return { per100: null, perBase: null, unit: null };
  }
  const inGrams = unit === 'g' ? netQuantity : unit === 'kg' ? netQuantity * 1000 : null;
  const inMl = unit === 'ml' ? netQuantity : unit === 'l' ? netQuantity * 1000 : null;
  if (inGrams !== null) {
    return {
      per100: Math.round((priceMinor / inGrams) * 100),
      perBase: Math.round((priceMinor / inGrams) * 1000),
      unit: 'g',
    };
  }
  if (inMl !== null) {
    return {
      per100: Math.round((priceMinor / inMl) * 100),
      perBase: Math.round((priceMinor / inMl) * 1000),
      unit: 'ml',
    };
  }
  return { per100: null, perBase: priceMinor, unit: 'pc' };
}
