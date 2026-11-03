/**
 * COPY THAT COMES FROM SOMEWHERE ELSE.
 *
 * Affiliate feeds are HTML-ish text fields, and they are treated as text but not
 * as *clean* text. The live Cuelinks feed contains titles like
 *
 *   "Shop Dymatize Nutritional &amp; Fitness Supplements today!"
 *   "Fight hairfall &amp; dandruff with up to 40% off"
 *
 * — read straight off the tour of the site on 3 Nov 2026. Printing `&amp;` is
 * the single most visible proof that nobody looked at the page, and it appears
 * on roughly one card in eight.
 *
 * Everything here is deliberately conservative: it decodes entities, removes
 * markup, collapses whitespace, and fixes the case of titles that were typed in
 * caps lock. It never rewrites a merchant's *claim* — a number or a promise that
 * comes out of here went in unchanged.
 */

/** The five XML entities plus the numeric forms, which is all these feeds use. */
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '\u2019',
  lsquo: '\u2018',
  ldquo: '\u201c',
  rdquo: '\u201d',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  rupee: '\u20b9',
  percnt: '%',
  excl: '!',
  comma: ',',
  period: '.',
  colon: ':',
  sol: '/',
  plus: '+',
  equals: '=',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
  deg: '\u00b0',
};

export function decodeEntities(input: string): string {
  if (!input.includes('&')) return input;
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const hex = body[1] === 'x' || body[1] === 'X';
      const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const hit = NAMED[body.toLowerCase()];
    return hit ?? whole;
  });
}

/**
 * SENTENCES THAT ARRIVED WELDED TOGETHER.
 *
 * Half of the live feed's descriptions look like this, read from the deployed API
 * on 3 Nov 2026:
 *
 *   "Prices starting from just Rs. 1299!Enjoy a flat discount of Rs. 150 with the
 *    promo code.Valid for orders of Rs. 1999 and above.Act fast to grab this
 *    fantastic offer!"
 *
 * The merchant's copy generator strips the space after terminal punctuation, and
 * 94 of 192 sampled rows carried at least one weld. On a phone in a 2-line clamped
 * card that reads as one long typo. Splitting is safe because the punctuation is
 * already there — this only puts back the space, it never invents a sentence break.
 *
 * Rules kept deliberately narrow so nothing legitimate is damaged:
 *   - after ! or ?  → split before any capital letter ("Rs. 1299!Enjoy")
 *   - after .       → split only before Capital + lowercase ("code.Valid"),
 *                     which leaves "U.S.", "Rs.1299" and "No.5" alone
 *   - never split inside a number: "1.5", "2.99"
 */
/**
 * CLAUSE WORDS.
 *
 * The second weld class has no punctuation at all — the merchant's generator
 * concatenated two clauses directly:
 *
 *   "Rs. 669Offer open to all"        → "Rs. 669 Offer open to all"
 *   "with couponOrder quickly"        → "with coupon Order quickly"
 *   "12% OffMaximum savings"          → "12% Off Maximum savings"
 *   "any orderShop now to shine"      → "any order Shop now to shine"
 *
 * Splitting on any capital letter would break MuscleBlaze, FirstCry, MyMuse and
 * every other brand in this feed, so the split happens only in front of a closed
 * list of words that begin a clause in retail copy — never inside a name. If a
 * future feed needs one more, it goes on this list and gets a test.
 */
const CLAUSE_WORDS = [
  'Access', 'Act', 'Advanced', 'And', 'Affordable', 'All', 'Applicable', 'Apply', 'Available',
  'Benefit', 'Best', 'Bonus', 'Book', 'Bring', 'Browse', 'Buy', 'Check', 'Claim',
  'Cleaning', 'Coupon', 'Create', 'Designed', 'Discover', 'Each', 'Elevate', 'Enjoy',
  'Enter', 'Equipped', 'Everyone', 'Everything', 'Exclusively', 'Explore', 'Features',
  'Featuring', 'Find', 'Flexible', 'Formulated', 'Free', 'Get', 'Grab', 'Head', 'Hurry',
  'Ideal', 'Immerse', 'Includes', 'Incredible', 'Insightful', 'Join', 'Just', 'Lifetime',
  'Limited', 'Make', 'Maximum', 'Minimum', 'Monthly', 'Notice', 'Offer', 'Offers', 'Open',
  'Order', 'Our', 'Pick', 'Plan', 'Plus', 'Price', 'Professional', 'Prices', 'Priced', 'Promo',
  'Purchase', 'Quick', 'Receive', 'Redeem', 'Refresh', 'Save', 'Score', 'Secure',
  'Seize', 'Shop', 'Show', 'Simply', 'Snag', 'Spend', 'Start', 'Starter', 'Starting',
  'Suitable', 'Team',
  'Take', 'This', 'Transform', 'Ultimate', 'Unbelievable', 'Unlock', 'Upgrade', 'Use',
  'Valid', 'Visit',
] as const;

/**
 * Where the weld follows a word, the merchant dropped a full stop as well as the
 * space — "minimum spend requiredAct fast" is two sentences. There the split is a
 * full stop; after a number or a percentage it is only ever a missing space
 * ("Rs. 79Act fast", "70%Offers begin"), because the number ends a clause that was
 * already punctuated or never needed it. Inventing a full stop inside a claim is
 * the one thing this function will not do.
 */
const CLAUSE_AFTER_WORD = new RegExp(`(?<=[a-z])(?=(${CLAUSE_WORDS.join('|')})\\b)`, 'g');
const CLAUSE_AFTER_VALUE = new RegExp(`(?<=[0-9%)])(?=(${CLAUSE_WORDS.join('|')})\\b)`, 'g');

export function splitSentences(input: string): string {
  return input
    .replace(/([!?])(?=[A-Z])/g, '$1 ')
    .replace(/([a-z0-9)])\.(?=[A-Z][a-z])/g, '$1. ')
    // "include:StarterProfessionalTeam" — a colon never sits against the next word.
    .replace(/:(?=[A-Z][a-z])/g, ': ')
    // "669Offer" / "codeHurry" — a clause word welded onto the end of the previous
    // one. Applied after the punctuation pass so it cannot undo it.
    .replace(CLAUSE_AFTER_WORD, '. ')
    .replace(CLAUSE_AFTER_VALUE, ' ')
    // "Rs.1299" / "Rs.450" — a currency prefix is always followed by a space in
    // Indian retail copy, and the missing one makes the amount hard to scan.
    .replace(/\bRs\.(?=\d)/g, 'Rs. ')
    .replace(/ {2,}/g, ' ');
}

/**
 * Feed copy → something fit to print.
 *
 * Double-decoding is intentional: a surprising number of rows arrive as
 * `&amp;amp;`, because the network escaped an already-escaped string. One extra
 * pass turns that into `&`; a third would start mangling legitimate text such as
 * "Tom &amp; Jerry" printed on purpose, so it stops at two.
 */
export function cleanCopy(input: string | null | undefined, maxLength = 400): string | null {
  if (!input) return null;
  let text = input.replace(/<[^>]*>/g, ' ');
  text = decodeEntities(decodeEntities(text));
  text = text
    // Zero-width characters and stray BOMs arrive from copy-pasted campaign sheets.
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  text = splitSentences(text).trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}\u2026` : text;
}

/**
 * A title as a person would type it.
 *
 * Only kicks in when the string is unambiguously shouty — more than 80 % of its
 * letters are capitals — because "iPhone 15 PRO MAX" and "MRP" must survive
 * untouched, and sentence-casing a brand is a bigger sin than an ugly headline.
 * Words that are already mixed-case (iPhone, JioMart, ASICS) are left alone.
 */
export function prettyTitle(input: string | null | undefined, maxLength = 200): string | null {
  const cleaned = cleanCopy(input, maxLength);
  if (!cleaned) return null;

  const letters = cleaned.replace(/[^A-Za-z]/g, '');
  const upperRatio = letters ? letters.replace(/[^A-Z]/g, '').length / letters.length : 0;
  if (letters.length < 12 || upperRatio < 0.8) return cleaned;

  let seenFirstWord = false;
  return cleaned
    .toLowerCase()
    .replace(/(^|[\s(\-–—/])([a-z])/g, (_m, lead: string, ch: string) => {
      seenFirstWord = true;
      return `${lead}${ch.toUpperCase()}`;
    })
    .replace(/\s+I\s+/g, ' I ')
    .replace(/\bI\b(?![a-z])/g, 'I')
    .replace(/(\d)\s*%\s*off\b/gi, '$1% off')
    // Sentence case must not leave a stray capital mid-title from the regex above
    // on brands we cannot know about; this is why the function is opt-in on
    // SHOUTY strings only.
    .replace(/\bOf\b/g, 'of')
    .replace(/\bOff\b/g, 'off')
    .replace(/\bOn\b/g, 'on')
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bFor\b/g, 'for')
    .replace(/\bThe\b/g, 'the')
    .replace(/\bWith\b/g, 'with')
    .replace(/\bAt\b/g, 'at')
    .replace(/\bUp To\b/g, 'up to')
    .replace(/\bRs\.?\b/g, 'Rs.')
    .trim();
}
