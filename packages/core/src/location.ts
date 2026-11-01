/**
 * Location for an India-first comparison product.
 *
 * WHY PINCODE, NOT GPS
 * --------------------
 * The instinct is to add a map and a "use my location" button. For quick
 * commerce that is mostly wrong:
 *
 *   • Delivery is promised against a **pincode**, not a coordinate. Blinkit and
 *     Zepto route by serviceable PIN; a latitude/longitude is not a serviceability
 *     answer.
 *   • GPS in a city centre is accurate to 20–100 m but a building is 30 m wide.
 *     The PIN is the unit that an order is actually placed against.
 *   • Asking for precise location is a privacy cost and a permission prompt that
 *     users decline. A 6-digit PIN is one field and no prompt.
 *
 * So the canonical location here is the **pincode**. Coordinates are optional and
 * only ever used for display and distance ranking. GPS is an *assist* to typing
 * a PIN, never the source of truth.
 *
 * WHAT THIS MODULE DOES NOT DO
 * ----------------------------
 * It never guesses serviceability. An Indian PIN's first digit tells you the
 * postal region, which is real and checkable; it does **not** tell you whether
 * Blinkit has a dark store there. Anything of that kind is returned as
 * `'unknown'` with a reason, so the UI can say "we can't confirm this" instead of
 * inventing a delivery promise.
 */

/** The nine national postal regions, by first PIN digit. */
export const PIN_REGIONS = {
  '1': {
    name: 'Northern',
    states: ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh'],
  },
  '2': { name: 'Uttar Pradesh & Uttarakhand', states: ['Uttar Pradesh', 'Uttarakhand'] },
  '3': {
    name: 'Western',
    states: ['Rajasthan', 'Gujarat', 'Daman & Diu', 'Dadra & Nagar Haveli'],
  },
  '4': { name: 'Central', states: ['Maharashtra', 'Goa', 'Madhya Pradesh', 'Chhattisgarh'] },
  '5': { name: 'Southern', states: ['Andhra Pradesh', 'Karnataka', 'Telangana'] },
  '6': { name: 'Southern', states: ['Tamil Nadu', 'Kerala', 'Puducherry', 'Lakshadweep'] },
  '7': {
    name: 'Eastern & North-Eastern',
    states: [
      'West Bengal',
      'Odisha',
      'Assam',
      'Sikkim',
      'Arunachal Pradesh',
      'Nagaland',
      'Meghalaya',
      'Manipur',
      'Mizoram',
      'Tripura',
      'Andaman & Nicobar Islands',
    ],
  },
  '8': { name: 'Eastern', states: ['Bihar', 'Jharkhand'] },
  '9': { name: 'Army Postal Service', states: ['Military postal channels'] },
} as const;

export type PinRegionDigit = keyof typeof PIN_REGIONS;

/**
 * Well-known postal circles, by first two digits. Approximate on purpose: a
 * circle is a sorting region, not a city boundary. Used only to pre-fill a
 * helpful label ("Mumbai region") — never to make a claim about delivery.
 */
const POSTAL_CIRCLES: Record<string, string> = {
  '11': 'Delhi',
  '12': 'Haryana',
  '14': 'Punjab',
  '16': 'Chandigarh region',
  '17': 'Himachal Pradesh',
  '18': 'Jammu region',
  '19': 'Kashmir region',
  '20': 'Uttar Pradesh (west)',
  '22': 'Uttar Pradesh (east)',
  '24': 'Uttar Pradesh (central)',
  '26': 'Uttar Pradesh (south)',
  '30': 'Rajasthan',
  '36': 'Gujarat',
  '38': 'Ahmedabad region',
  '39': 'Gujarat (south)',
  '40': 'Mumbai',
  '41': 'Pune region',
  '42': 'Nashik region',
  '44': 'Nagpur region',
  '45': 'Indore region',
  '46': 'Bhopal region',
  '48': 'Jabalpur region',
  '49': 'Chhattisgarh',
  '50': 'Hyderabad',
  '52': 'Vijayawada region',
  '53': 'Visakhapatnam region',
  '56': 'Bengaluru',
  '57': 'Mysuru region',
  '58': 'Hubballi region',
  '59': 'Belagavi region',
  '60': 'Chennai',
  '62': 'Tiruchirappalli region',
  '64': 'Coimbatore region',
  '67': 'Kerala (north)',
  '68': 'Kerala (south)',
  '69': 'Kollam region',
  '70': 'Kolkata',
  '71': 'Howrah region',
  '73': 'Siliguri region',
  '74': 'Kolkata (south)',
  '75': 'Bhubaneswar region',
  '78': 'Guwahati region',
  '79': 'North-East region',
  '80': 'Patna region',
  '81': 'Bhagalpur region',
  '82': 'Dhanbad region',
  '83': 'Ranchi region',
  '84': 'Muzaffarpur region',
};

/**
 * Metros where quick commerce is *known to operate*. This is a statement about
 * the platform's published coverage, not a serviceability guarantee for a
 * specific PIN — every one of these still varies street by street.
 */
const QUICK_COMMERCE_CIRCLE_HINTS: Record<string, string> = {
  '11': 'Delhi',
  '40': 'Mumbai',
  '56': 'Bengaluru',
  '50': 'Hyderabad',
  '60': 'Chennai',
  '70': 'Kolkata',
  '41': 'Pune',
  '38': 'Ahmedabad',
  '30': 'Jaipur',
  '20': 'Lucknow region',
  '45': 'Indore',
  '71': 'Howrah',
};

export interface LocationInfo {
  /** Normalised 6-digit PIN. */
  pincode: string;
  regionName: string;
  /** States in this postal region — a list, because a region spans several. */
  states: readonly string[];
  /** Approximate sorting circle, e.g. "Mumbai region". Null if not catalogued. */
  circle: string | null;
  /**
   * 'likely' when this circle is a metro where quick commerce is known to
   * operate; 'unknown' otherwise. NEVER 'yes'.
   */
  quickCommerceHint: 'likely' | 'unknown';
  /** Plain-language explanation for the UI. */
  note: string;
}

export interface PincodeParseResult {
  valid: boolean;
  /** Present only when valid. */
  info?: LocationInfo;
  /** Present only when invalid. */
  error?: string;
}

/**
 * Validates and describes a pincode.
 *
 * Indian PINs are six digits and never begin with 0 — 0 is a placeholder in
 * addresses, not a real postcode. Accepts spaces and a numeric value for
 * tolerance, because users paste all three.
 */
export function parsePincode(input: string | number | null | undefined): PincodeParseResult {
  if (input === null || input === undefined) {
    return { valid: false, error: 'Enter your 6-digit pincode.' };
  }
  const raw = String(input).replace(/[\s-]/g, '');

  if (raw === '') return { valid: false, error: 'Enter your 6-digit pincode.' };
  if (/^0/.test(raw)) return { valid: false, error: 'Indian pincodes do not start with 0.' };
  if (!/^\d+$/.test(raw)) return { valid: false, error: 'A pincode contains digits only.' };
  if (raw.length !== 6) {
    return { valid: false, error: `A pincode is 6 digits — you entered ${raw.length}.` };
  }

  const first = raw[0] as PinRegionDigit;
  const region = PIN_REGIONS[first];
  if (!region) return { valid: false, error: 'That pincode is outside the Indian numbering scheme.' };

  const circle = POSTAL_CIRCLES[raw.slice(0, 2)] ?? null;
  const isArmy = first === '9';

  const hint: LocationInfo['quickCommerceHint'] = isArmy
    ? 'unknown'
    : QUICK_COMMERCE_CIRCLE_HINTS[raw.slice(0, 2)]
      ? 'likely'
      : 'unknown';

  const note = isArmy
    ? 'This is an Army Postal Service pincode. Home delivery is not applicable.'
    : hint === 'likely'
      ? `${circle ?? 'This region'} is a city where quick-commerce platforms publish coverage. Whether they reach this specific PIN still varies by street — only the platforms can confirm it.`
      : 'We cannot confirm quick-commerce coverage for this PIN. Which stores deliver here is decided by each platform, not by us, so we never claim it on their behalf.';

  return {
    valid: true,
    info: {
      pincode: raw,
      regionName: region.name,
      states: region.states,
      circle,
      quickCommerceHint: hint,
      note,
    },
  };
}

/** Convenience predicate. */
export function isValidPincode(input: unknown): boolean {
  return parsePincode(input as string).valid;
}

/** Two pincodes are only equal if both are valid and identical. */
export function samePincode(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!isValidPincode(a) || !isValidPincode(b)) return false;
  return String(a).replace(/\s/g, '') === String(b).replace(/\s/g, '');
}

/* ------------------------------------------------------------------ */
/* Coordinates — optional, for display and distance only               */
/* ------------------------------------------------------------------ */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance in kilometres.
 *
 * Used to rank nearby *reported* prices and to show "1.2 km away" for a store
 * or a community price. It is never used to infer serviceability: being 2 km
 * from a dark store does not mean that store delivers to your PIN.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough sanity check that a coordinate is inside India's bounding box. */
export function isInIndia(point: Coordinates): boolean {
  return point.lat >= 6 && point.lat <= 38 && point.lng >= 68 && point.lng <= 98;
}

/* ------------------------------------------------------------------ */
/* Delivery ETA bands                                                  */
/* ------------------------------------------------------------------ */

export type EtaBand = 'instant' | 'quick' | 'same_day' | 'next_day' | 'slotted' | 'unknown';

/**
 * Classifies a delivery promise into a band the UI can colour.
 *
 * Returns 'unknown' when the platform published no promise — never a default.
 * Quick commerce lives or dies on this number; inventing one would be the single
 * most damaging thing this module could do.
 */
export function etaBand(deliveryDaysMax: number | null | undefined): EtaBand {
  if (deliveryDaysMax === null || deliveryDaysMax === undefined) return 'unknown';
  if (!Number.isFinite(deliveryDaysMax) || deliveryDaysMax < 0) return 'unknown';
  if (deliveryDaysMax <= 0.05) return 'instant'; // under ~70 minutes
  if (deliveryDaysMax <= 0.15) return 'quick'; // up to ~3.5 hours
  if (deliveryDaysMax <= 1) return 'same_day';
  if (deliveryDaysMax <= 2) return 'next_day';
  return 'slotted';
}

export const ETA_BAND_LABELS: Record<EtaBand, string> = {
  instant: 'In minutes',
  quick: 'Within hours',
  same_day: 'Today',
  next_day: 'Tomorrow',
  slotted: 'Slotted delivery',
  unknown: 'Delivery time not published',
};
