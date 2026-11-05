import additions from "../data/hospitality-venues.json";
import { PET_VENUES } from "./pets";
import { CITIES, dateValid, indiaToday, nightsBetween } from "./hospitality";

export type VenueKind = "hotel" | "restaurant";
export interface ComparisonVenue {
  id: string;
  name: string;
  city: string;
  kind: VenueKind;
  area: string;
  sourceUrl: string;
  website: string;
  publisher: string;
  reviewedAt: string;
  note: string;
  evidence: "official" | "third-party";
  petResearch: boolean;
  sourceMethod: "page" | "index" | "directory";
  stars: number | null;
}
/** Factual, selected places only. No inferred rates, amenities, partnerships or ratings. */
export const COMPARISON_VENUES: ComparisonVenue[] = [
  ...PET_VENUES.filter((v) => v.status === "listed").map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    kind: v.kind as VenueKind,
    area: v.area,
    sourceUrl: v.sources[0]!.url,
    website: v.sources[0]!.url,
    publisher: v.sources[0]!.publisher,
    reviewedAt: v.reviewedAt,
    note: v.summary + " " + v.limits + (v.caution ? " " + v.caution : ""),
    evidence:
      v.sources[0]!.type === "official"
        ? ("official" as const)
        : ("third-party" as const),
    sourceMethod:
      v.sources[0]!.method === "page" ? ("page" as const) : ("index" as const),
    petResearch: true,
    stars: null,
  })),
  ...additions.map((v) => ({
    ...v,
    kind: v.kind as VenueKind,
    evidence: "official" as const,
    sourceMethod:
      v.id === "altair-house-siliguri" || v.id === "dining-room-pilibhit-house"
        ? ("page" as const)
        : ("directory" as const),
    petResearch: false,
  })),
];
export function venuesFor(
  kind: VenueKind,
  city: string,
  query = "",
  official = false,
  stars = 0,
): ComparisonVenue[] {
  return COMPARISON_VENUES.filter(
    (v) =>
      v.kind === kind &&
      (city === "all" ||
        v.city === city ||
        (city === "delhi-ncr" && ["gurugram", "noida"].includes(v.city))) &&
      (!official || v.evidence === "official") &&
      (!stars || v.stars === stars) &&
      `${v.name} ${v.area}`
        .toLocaleLowerCase("en-IN")
        .includes(query.trim().toLocaleLowerCase("en-IN")),
  ).sort((a, b) => a.name.localeCompare(b.name, "en"));
}
export const COMPARISON_STORAGE_KEY = "dealmosaic.hospitality-quotes.v1";
export const MAX_PERSONAL_QUOTES = 30;
const MAX_MONEY = 1_000_000_000; // Paise; bounded before every addition.
export interface QuotePlan {
  kind: VenueKind;
  city: string;
  arrival: string;
  departure: string;
  adults: number;
  rooms: number;
  childAges: number[];
  rooming: string;
  time: string;
  diningMode: "dine-in" | "delivery" | "takeaway";
}
export interface PersonalQuote {
  id: string;
  venueId: string;
  provider: string;
  plan: QuotePlan;
  /** Manually assigned exact room+bed configuration, or exact dining basket. Never fuzzy-matched. */
  item: string;
  meal: "room-only" | "breakfast" | "other" | "unknown";
  cancellation: "non-refundable" | "free-until" | "unknown" | "not-applicable";
  cancelUntil: string;
  payment: "pay-now" | "pay-at-venue" | "unknown";
  eligibility: "public" | "conditional-confirmed" | "unknown";
  eligibilityDetails: string;
  /** Amount already quoted for every night/room OR all diners. Never multiplied again. */
  baseMinor: number;
  extraFeesMinor: number | null;
  onSiteMinor: number | null;
  extrasMinor: number | null;
  depositMinor: number | null;
  cashbackMinor: number | null;
  complete: boolean;
  recordedAt: string;
  provenance: "personal";
}
export function parseQuoteMoney(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const n = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(n) && n <= MAX_MONEY ? n : null;
}
const money = (n: unknown): n is number =>
  typeof n === "number" && Number.isSafeInteger(n) && n >= 0 && n <= MAX_MONEY;
const optionalMoney = (n: unknown): n is number | null =>
  n === null || money(n);
const text = (s: unknown, max: number): s is string =>
  typeof s === "string" &&
  s.trim().length > 0 &&
  s.length <= max &&
  !/[\u0000-\u001f\u007f]/.test(s);
const normal = (s: string) =>
  s.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-IN");
export function validPlan(p: unknown): p is QuotePlan {
  if (!p || typeof p !== "object") return false;
  const q = p as QuotePlan;
  return (
    ["hotel", "restaurant"].includes(q.kind) &&
    CITIES.some((c) => c.id === q.city) &&
    typeof q.arrival === "string" &&
    typeof q.departure === "string" &&
    dateValid(q.arrival) &&
    dateValid(q.departure) &&
    Number.isInteger(q.adults) &&
    q.adults >= 1 &&
    q.adults <= 20 &&
    Number.isInteger(q.rooms) &&
    q.rooms >= 1 &&
    q.rooms <= 4 &&
    q.rooms <= q.adults &&
    typeof q.rooming === "string" &&
    q.rooming.length <= 180 &&
    (q.rooms === 1 || text(q.rooming, 180)) &&
    typeof q.time === "string" &&
    (q.kind === "hotel"
      ? q.time === ""
      : /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(q.time)) &&
    Array.isArray(q.childAges) &&
    q.childAges.length <= 4 &&
    q.childAges.every((a) => Number.isInteger(a) && a >= 0 && a <= 17) &&
    ["dine-in", "delivery", "takeaway"].includes(q.diningMode) &&
    (q.kind === "hotel"
      ? nightsBetween(q.arrival, q.departure) >= 1 &&
        nightsBetween(q.arrival, q.departure) <= 30 &&
        q.adults <= 8
      : q.arrival === q.departure && q.rooms === 1 && !q.childAges.length)
  );
}
export function planError(p: QuotePlan, today = indiaToday()): string | null {
  if (!validPlan(p as unknown))
    return p.kind === "hotel"
      ? "Choose valid dates (1–30 nights), 1–8 adults, up to 4 rooms with an adult in each, and child ages 0–17."
      : "Choose a valid dining date and 1–20 people.";
  if (p.arrival < today) return "Choose today or a future date.";
  return null;
}
export function samePlan(a: QuotePlan, b: QuotePlan): boolean {
  // A property's canonical ID, not the overlapping NCR browse scope, identifies its location.
  return (
    a.kind === b.kind &&
    a.arrival === b.arrival &&
    a.departure === b.departure &&
    normal(a.rooming) === normal(b.rooming) &&
    a.time === b.time &&
    a.adults === b.adults &&
    a.rooms === b.rooms &&
    a.diningMode === b.diningMode &&
    [...a.childAges].sort((x, y) => x - y).join(",") ===
      [...b.childAges].sort((x, y) => x - y).join(",")
  );
}
function validDeadline(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) &&
    dateValid(value.slice(0, 10)) &&
    Number(value.slice(11, 13)) <= 23 &&
    Number(value.slice(14, 16)) <= 59
  );
}
export function validPersonalQuote(value: unknown): value is PersonalQuote {
  if (!value || typeof value !== "object") return false;
  const q = value as PersonalQuote;
  const venue = COMPARISON_VENUES.find((v) => v.id === q.venueId);
  return (
    !!venue &&
    text(q.id, 80) &&
    text(q.provider, 80) &&
    text(q.item, 180) &&
    validPlan(q.plan) &&
    venue.kind === q.plan.kind &&
    (venue.city === q.plan.city ||
      (q.plan.city === "delhi-ncr" &&
        ["gurugram", "noida"].includes(venue.city))) &&
    ["room-only", "breakfast", "other", "unknown"].includes(q.meal) &&
    ["non-refundable", "free-until", "unknown", "not-applicable"].includes(
      q.cancellation,
    ) &&
    (q.plan.kind === "restaurant" || q.cancellation !== "not-applicable") &&
    typeof q.cancelUntil === "string" &&
    q.cancelUntil.length <= 16 &&
    (q.cancellation !== "free-until" ||
      (validDeadline(q.cancelUntil) &&
        q.cancelUntil.slice(0, 10) <= q.plan.arrival)) &&
    ["pay-now", "pay-at-venue", "unknown"].includes(q.payment) &&
    ["public", "conditional-confirmed", "unknown"].includes(q.eligibility) &&
    typeof q.eligibilityDetails === "string" &&
    q.eligibilityDetails.length <= 180 &&
    (q.eligibility === "conditional-confirmed"
      ? text(q.eligibilityDetails, 180)
      : q.eligibilityDetails === "") &&
    money(q.baseMinor) &&
    q.baseMinor > 0 &&
    [
      q.extraFeesMinor,
      q.onSiteMinor,
      q.extrasMinor,
      q.depositMinor,
      q.cashbackMinor,
    ].every(optionalMoney) &&
    typeof q.complete === "boolean" &&
    q.provenance === "personal" &&
    typeof q.recordedAt === "string" &&
    q.recordedAt.length <= 30 &&
    Number.isFinite(Date.parse(q.recordedAt))
  );
}
export function quoteCost(q: PersonalQuote): {
  knownMinor: number;
  totalMinor: number | null;
  cashNeededMinor: number | null;
} {
  const pieces = [q.baseMinor, q.extraFeesMinor, q.onSiteMinor, q.extrasMinor];
  const knownMinor = pieces.reduce<number>((n, p) => n + (p ?? 0), 0);
  const totalMinor =
    q.complete && pieces.every((p) => p !== null) ? knownMinor : null;
  return {
    knownMinor,
    totalMinor,
    cashNeededMinor:
      totalMinor !== null && q.depositMinor !== null
        ? totalMinor + q.depositMinor
        : null,
  };
}
export function quoteIssue(q: PersonalQuote, now = Date.now()): string | null {
  const age = now - Date.parse(q.recordedAt);
  if (age < 0 || age > 86400000)
    return "Recheck this quote: recorded more than 24 hours ago, or device time changed.";
  if (q.plan.arrival < indiaToday(new Date(now)))
    return "This plan date has passed.";
  if (quoteCost(q).totalMinor === null)
    return "Some costs or inclusions still need confirmation.";
  if (q.plan.kind === "hotel" && ["unknown", "other"].includes(q.meal))
    return "Meal terms do not support an exact comparison.";
  if (q.eligibility === "unknown")
    return "Member, app, residency or payment eligibility is not established.";
  if (q.cancellation === "unknown" || q.payment === "unknown")
    return "Cancellation or payment terms are not established.";
  if (
    q.cancellation === "free-until" &&
    Date.parse(q.cancelUntil + ":00+05:30") <= now
  )
    return "The recorded free-cancellation deadline has passed.";
  return null;
}
export function comparableKey(q: PersonalQuote): string {
  const { city: _city, childAges, ...p } = q.plan;
  return JSON.stringify([
    q.venueId,
    p.kind,
    p.arrival,
    p.departure,
    p.adults,
    p.rooms,
    [...childAges].sort((a, b) => a - b),
    p.diningMode,
    normal(p.rooming),
    p.time,
    normal(q.item),
    q.meal,
    q.cancellation,
    q.cancellation === "free-until" ? q.cancelUntil : "",
    q.payment,
    q.eligibility,
    normal(q.eligibilityDetails),
  ]);
}
export function comparisonGroups(quotes: PersonalQuote[], now = Date.now()) {
  const groups = new Map<string, PersonalQuote[]>();
  for (const q of quotes)
    if (!quoteIssue(q, now)) {
      const key = comparableKey(q);
      groups.set(key, [...(groups.get(key) || []), q]);
    }
  return [...groups.values()]
    .filter((g) => new Set(g.map((q) => normal(q.provider))).size >= 2)
    .map((g) => {
      const sorted = [...g].sort(
        (a, b) =>
          quoteCost(a).totalMinor! - quoteCost(b).totalMinor! ||
          a.id.localeCompare(b.id),
      );
      const low = quoteCost(sorted[0]!).totalMinor!;
      return {
        quotes: sorted,
        lowestIds: sorted
          .filter((q) => quoteCost(q).totalMinor === low)
          .map((q) => q.id),
        lowestMinor: low,
      };
    });
}
export function readPersonalQuotes(raw: string | null): {
  quotes: PersonalQuote[];
  damaged: boolean;
} {
  if (!raw) return { quotes: [], damaged: false };
  try {
    if (raw.length > 150000) throw Error("oversize");
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !Array.isArray(data.quotes) ||
      data.quotes.length > MAX_PERSONAL_QUOTES
    )
      throw Error("invalid");
    const seen = new Set<string>();
    const quotes = data.quotes.filter(
      (q: unknown) =>
        validPersonalQuote(q) && !seen.has(q.id) && !!seen.add(q.id),
    );
    return { quotes, damaged: quotes.length !== data.quotes.length };
  } catch {
    return { quotes: [], damaged: true };
  }
}
export function serializePersonalQuotes(quotes: PersonalQuote[]): string {
  if (
    quotes.length > MAX_PERSONAL_QUOTES ||
    !quotes.every(validPersonalQuote) ||
    new Set(quotes.map((q) => q.id)).size !== quotes.length
  )
    throw Error("Invalid quote collection");
  return JSON.stringify({ version: 1, quotes });
}
export function quoteCsv(quotes: PersonalQuote[]): string {
  const cell = (v: unknown) => {
    let s = String(v ?? "Unknown");
    if (/^[\s]*[=+@\-\t\r\n]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows: unknown[][] = [
    ["Personal quotes — not live rates, reservations or guaranteed totals"],
    [
      "Venue",
      "Provider entered by you",
      "Arrival / visit",
      "Departure",
      "Adults / people",
      "Rooms",
      "Dining format",
      "Child ages",
      "Room allocation",
      "Visit time (India)",
      "Room or basket",
      "Meal terms",
      "Cancellation",
      "Free-until (India local time)",
      "Payment",
      "Eligibility entered",
      "Eligibility conditions",
      "Base quoted amount INR",
      "Extra taxes and provider fees INR",
      "Mandatory venue charges INR",
      "Selected extras INR",
      "Known costs INR",
      "Complete entered total INR",
      "Refundable deposit INR",
      "Cash needed incl. deposit INR",
      "Possible cashback INR (not deducted)",
      "Recorded at",
      "Provenance",
    ],
  ];
  for (const q of quotes) {
    const c = quoteCost(q);
    const amount = (n: number | null) =>
      n === null ? "Unknown" : (n / 100).toFixed(2);
    rows.push([
      COMPARISON_VENUES.find((v) => v.id === q.venueId)?.name,
      q.provider,
      q.plan.arrival,
      q.plan.departure,
      q.plan.adults,
      q.plan.rooms,
      q.plan.diningMode,
      q.plan.childAges.join(";"),
      q.plan.rooming,
      q.plan.time,
      q.item,
      q.meal,
      q.cancellation,
      q.cancelUntil || "Not applicable",
      q.payment,
      q.eligibility,
      q.eligibilityDetails,
      amount(q.baseMinor),
      amount(q.extraFeesMinor),
      amount(q.onSiteMinor),
      amount(q.extrasMinor),
      amount(c.knownMinor),
      amount(c.totalMinor),
      amount(q.depositMinor),
      amount(c.cashNeededMinor),
      amount(q.cashbackMinor),
      q.recordedAt,
      "Personal, not provider-verified",
    ]);
  }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
