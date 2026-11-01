/**
 * Product matching engine.
 *
 * The rule that matters: NEVER compare two different variants because their titles
 * look similar. Identity is resolved by an explicit ladder, every match carries a
 * confidence value and the reasons behind it, and anything below the ambiguity
 * threshold is surfaced to the user instead of being silently merged.
 *
 * Ladder (highest wins):
 *   1.00  GTIN / EAN / UPC           — a barcode is an identity, not a guess
 *   0.95  Manufacturer part number
 *   0.92  ISBN
 *   0.86  Brand + exact model number + agreeing variant attributes
 *   0.72  Brand + model, attributes partially agreeing
 *   0.55  Brand + model only, no variant attributes to check
 *   0.40  Validated title token overlap (never auto-selected)
 */

export type MatchMethod =
  | 'gtin'
  | 'mpn'
  | 'isbn'
  | 'brand_model_attributes'
  | 'brand_model'
  | 'brand_model_partial'
  | 'title_tokens'
  | 'none';

export interface MatchReason {
  method: MatchMethod;
  detail: string;
}

export interface MatchResult {
  score: number;
  method: MatchMethod;
  /** true when the engine is confident enough to compare without asking. */
  autoMatched: boolean;
  reasons: MatchReason[];
  /** attributes that disagreed — a hard signal that these are different products. */
  conflicts: string[];
}

/* ------------------------------------------------------------------ */
/* Query normalisation                                                 */
/* ------------------------------------------------------------------ */

export interface ParsedQuery {
  raw: string;
  normalised: string;
  /** a 8/12/13/14-digit number that could be a barcode */
  gtin: string | null;
  /** capacity/size tokens such as 512gb, 52g, 1l, 128 gb */
  quantities: string[];
  /** bare numbers that might be model numbers (s25, 15, a54) */
  tokens: string[];
}

export function parseQuery(raw: string): ParsedQuery {
  const normalised = raw
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9\s.+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const digitsOnly = raw.replace(/[^0-9]/g, '');
  const looksLikeBarcode =
    /^[0-9\s-]{8,}$/.test(raw.trim()) && (digitsOnly.length === 8 || digitsOnly.length === 12 || digitsOnly.length === 13 || digitsOnly.length === 14);

  const quantities = (normalised.match(/\d+\s?(gb|tb|g|ml|kg|l|mb|pcs?|pack)\b/g) ?? []).map((s) =>
    s.replace(/\s+/g, ''),
  );

  return {
    raw: raw.trim(),
    normalised,
    gtin: looksLikeBarcode ? digitsOnly : null,
    quantities,
    tokens: normalised.split(' ').filter(Boolean),
  };
}

/* ------------------------------------------------------------------ */
/* Comparable product identity                                         */
/* ------------------------------------------------------------------ */

export interface VariantIdentity {
  variantId: string;
  productId: string;
  brand: string;
  model: string;
  name: string;
  gtin?: string | null;
  mpn?: string | null;
  isbn?: string | null;
  /** e.g. { storage: '512gb', colour: 'titanium black' } */
  attributes: Record<string, string>;
  /** e.g. '512GB' — shown to the user as the variant label */
  variantLabel: string;
}

export interface OfferIdentity {
  gtin?: string | null;
  mpn?: string | null;
  brand?: string | null;
  model?: string | null;
  title: string;
  attributes?: Record<string, string>;
}

const normaliseAttrValue = (v: string): string =>
  v
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9.]/g, '');

const normaliseModel = (v: string): string =>
  v
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Token overlap by Jaccard similarity, ignoring noise words. */
const NOISE = new Set(['the', 'and', 'with', 'for', 'new', 'latest', 'buy', 'online', 'india', 'in', 'of', 'a', 'to']);

export function titleSimilarity(a: string, b: string): number {
  const toks = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !NOISE.has(t)),
    );
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/**
 * Score how likely an offer is the same exact product as a variant.
 * Returns conflicts whenever an attribute explicitly disagrees — that is what
 * stops a 256 GB offer from being compared against a 512 GB query.
 */
export function scoreMatch(offer: OfferIdentity, variant: VariantIdentity): MatchResult {
  const reasons: MatchReason[] = [];
  const conflicts: string[] = [];

  // ---- 1. barcode -------------------------------------------------------
  if (offer.gtin && variant.gtin) {
    if (offer.gtin.replace(/\D/g, '') === variant.gtin.replace(/\D/g, '')) {
      reasons.push({ method: 'gtin', detail: `Barcode ${variant.gtin} matched exactly` });
      return finish(1.0, 'gtin', reasons, conflicts, true);
    }
    // Two known, different barcodes = two different products. Full stop.
    return finish(0, 'none', [{ method: 'none', detail: 'Different barcodes' }], ['gtin'], false);
  }

  // ---- 2. manufacturer part number -------------------------------------
  if (offer.mpn && variant.mpn && normaliseModel(offer.mpn) === normaliseModel(variant.mpn)) {
    reasons.push({ method: 'mpn', detail: `Model number ${variant.mpn} matched` });
    return finish(0.95, 'mpn', reasons, conflicts, true);
  }

  // ---- 3. ISBN ----------------------------------------------------------
  const offerIsbn = offer.attributes?.isbn ?? (offer.mpn && /^97[89]\d{10}$/.test(offer.mpn) ? offer.mpn : null);
  if (offerIsbn && variant.isbn && offerIsbn.replace(/\D/g, '') === variant.isbn.replace(/\D/g, '')) {
    reasons.push({ method: 'isbn', detail: `ISBN ${variant.isbn} matched` });
    return finish(0.92, 'isbn', reasons, conflicts, true);
  }

  // ---- 4. brand + model + attributes -----------------------------------
  const brandOk =
    Boolean(offer.brand) && normaliseModel(offer.brand!) === normaliseModel(variant.brand);
  const modelOk =
    Boolean(offer.model) && normaliseModel(offer.model!) === normaliseModel(variant.model);

  let attrComparisons = 0;
  let attrAgree = 0;
  for (const [key, variantValue] of Object.entries(variant.attributes)) {
    const offerValue = offer.attributes?.[key];
    if (offerValue === undefined) continue;
    attrComparisons++;
    if (normaliseAttrValue(offerValue) === normaliseAttrValue(variantValue)) attrAgree++;
    else conflicts.push(`${key}: offer has “${offerValue}”, product is “${variantValue}”`);
  }

  const titleSim = titleSimilarity(offer.title, variant.name);
  const titleBoost = titleSim >= 0.5 ? 1 : 0;

  if (brandOk && modelOk && attrComparisons > 0 && attrAgree === attrComparisons && titleBoost) {
    reasons.push({
      method: 'brand_model_attributes',
      detail: `Brand, model and ${attrComparisons} variant attribute${attrComparisons === 1 ? '' : 's'} agree`,
    });
    return finish(0.86, 'brand_model_attributes', reasons, conflicts, true);
  }

  if (brandOk && modelOk && attrComparisons > 0 && attrAgree < attrComparisons) {
    // An explicit disagreement means this is a DIFFERENT variant. Never compare it.
    return finish(0.1, 'brand_model_partial', reasons, conflicts, false);
  }

  if (brandOk && modelOk) {
    reasons.push({
      method: 'brand_model',
      detail: attrComparisons === 0
        ? 'Brand and model agree; the offer lists no variant attributes to verify'
        : `Brand and model agree, ${attrAgree}/${attrComparisons} attributes match`,
    });
    const confidence = attrComparisons === 0 ? 0.55 : 0.72;
    return finish(confidence, 'brand_model', reasons, conflicts, confidence >= 0.7 && conflicts.length === 0);
  }

  // ---- 5. last resort: titles ------------------------------------------
  // Deliberately never auto-selected: a text match alone is not an identity.
  if (titleSim >= 0.55) {
    reasons.push({
      method: 'title_tokens',
      detail: `Titles are ${(titleSim * 100).toFixed(0)}% similar, but no identifier or model number confirms it`,
    });
    return finish(0.4 * (titleSim / 0.55), 'title_tokens', reasons, conflicts, false);
  }

  return finish(0, 'none', [{ method: 'none', detail: 'No identifier, model number or close title match' }], conflicts, false);
}

function finish(
  score: number,
  method: MatchMethod,
  reasons: MatchReason[],
  conflicts: string[],
  autoMatched: boolean,
): MatchResult {
  return { score: Number(score.toFixed(3)), method, reasons, conflicts, autoMatched: autoMatched && conflicts.length === 0 };
}

/** Does the query text actually mention this attribute value?
 *  Numeric sizes (512gb, 52g, 1l) must match a parsed capacity token exactly.
 *  Word attributes (colour, flavour) must match as a whole phrase. */
export function attributeMentioned(query: ParsedQuery, queryQty: Set<string>, attrValue: string): boolean {
  const norm = normaliseAttrValue(attrValue);
  if (queryQty.has(norm)) return true;
  const phrase = attrValue.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/^\d/.test(phrase)) return false; // numeric attributes never match loosely
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, 'i').test(query.normalised);
}

/** Below this, we ask the user which product they meant instead of guessing. */
export const AUTO_MATCH_THRESHOLD = 0.7;

/* ------------------------------------------------------------------ */
/* Grouping offers into variants                                       */
/* ------------------------------------------------------------------ */

export interface GroupedOffers<T> {
  variantId: string;
  offers: Array<{ offer: T; match: MatchResult }>;
}

export function groupOffersByVariant<T extends OfferIdentity>(
  offers: T[],
  variants: VariantIdentity[],
): {
  groups: GroupedOffers<T>[];
  unmatched: Array<{ offer: T; bestGuess: MatchResult | null }>;
} {
  const groups: GroupedOffers<T>[] = variants.map((v) => ({ variantId: v.variantId, offers: [] }));
  const unmatched: Array<{ offer: T; bestGuess: MatchResult | null }> = [];

  for (const offer of offers) {
    let best: { index: number; match: MatchResult } | null = null;
    for (let i = 0; i < variants.length; i++) {
      const match = scoreMatch(offer, variants[i]!);
      if (!best || match.score > best.match.score) best = { index: i, match };
    }
    if (best && best.match.score >= AUTO_MATCH_THRESHOLD && best.match.autoMatched) {
      groups[best.index]!.offers.push({ offer, match: best.match });
    } else {
      unmatched.push({ offer, bestGuess: best?.match ?? null });
    }
  }

  return { groups: groups.filter((g) => g.offers.length > 0), unmatched };
}

/* ------------------------------------------------------------------ */
/* Variant disambiguation                                              */
/* ------------------------------------------------------------------ */

export interface VariantCandidate {
  variantId: string;
  label: string;
  attributes: Record<string, string>;
  evidence: string;
}

/**
 * Decide what to do with a query: answer it, or ask.
 * Returns `needsSelection` when the query could mean more than one variant and
 * the user has not narrowed it down.
 */
export function resolveVariants(
  query: ParsedQuery,
  variants: VariantIdentity[],
): { mode: 'matched'; variant: VariantIdentity } | { mode: 'needsSelection'; candidates: VariantCandidate[] } {
  if (variants.length === 0) return { mode: 'needsSelection', candidates: [] };
  if (variants.length === 1) return { mode: 'matched', variant: variants[0]! };

  // Does the query itself name a variant? "512GB" must select it, not the base model.
  //
  // NOTE: this must be boundary-aware. A naive `includes()` check makes
  // "512gb".includes("12gb") true, which would silently select the wrong
  // capacity — the exact class of bug this product exists to avoid.
  const queryQty = new Set(query.quantities.map((q) => q.replace(/\s/g, '')));
  const matches = variants.filter((v) =>
    Object.values(v.attributes).some((value) => attributeMentioned(query, queryQty, value)),
  );

  if (matches.length === 1) return { mode: 'matched', variant: matches[0]! };

  return {
    mode: 'needsSelection',
    candidates: variants.map((v) => ({
      variantId: v.variantId,
      label: v.variantLabel,
      attributes: v.attributes,
      evidence: `${v.brand} ${v.model} — ${v.variantLabel}`,
    })),
  };
}
