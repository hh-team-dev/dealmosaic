import {
  COMPARISON_VENUES,
  parseQuoteMoney,
  quoteCost,
  quoteIssue,
  samePlan,
  type ComparisonVenue,
  type PersonalQuote,
  type QuotePlan,
} from "./hospitality-comparison";
import {
  bookingSearch,
  cityById,
  hotelDirectory,
  localDiningSearch,
  type StayPlan,
} from "./hospitality";

/**
 * Traffic-first discovery filters.
 *
 * Every filter is either a MATCHER (decided by sourced evidence or the
 * customer's own comparable quotes) or a CONFIRMATION item (no sourced data
 * exists, so the customer must check it with the provider). Unknown is never
 * treated as yes and never as no: venues without evidence land in the
 * "needs confirmation" group, never silently included or excluded.
 */

export type MealFilter = "any" | "breakfast" | "room-only";
export type CancelFilter = "any" | "free" | "refundable-by";
export type PayFilter = "any" | "pay-at-venue" | "pay-now";
export type SmokeFilter = "any" | "non-smoking" | "smoking";
export type ArrivalFilter = "any" | "early" | "late";
export type DiscoverSort = "az" | "lowest" | "recent";

export interface DiscoveryFilters {
  query: string;
  officialOnly: boolean;
  includeUnpriced: boolean;
  budget: string;
  stars: 0 | 3 | 4 | 5;
  petFriendly: boolean;
  meal: MealFilter;
  cancellation: CancelFilter;
  cancelBy: string;
  payment: PayFilter;
  maxAdvance: string;
  smoking: SmokeFilter;
  dayUse: boolean;
  arrival: ArrivalFilter;
  roomCertainty: boolean;
  accessJourney: string[];
  childSleep: boolean;
  sort: DiscoverSort;
}

export const ACCESS_JOURNEY_STEPS = [
  { id: "entrance", label: "Step-free entrance" },
  { id: "lift", label: "Working lift to every floor used" },
  { id: "room", label: "Accessible bedroom layout" },
  { id: "bathroom", label: "Accessible bathroom" },
] as const;

export function blankDiscoveryFilters(): DiscoveryFilters {
  return {
    query: "",
    officialOnly: false,
    includeUnpriced: true,
    budget: "",
    stars: 0,
    petFriendly: false,
    meal: "any",
    cancellation: "any",
    cancelBy: "",
    payment: "any",
    maxAdvance: "",
    smoking: "any",
    dayUse: false,
    arrival: "any",
    roomCertainty: false,
    accessJourney: [],
    childSleep: false,
    sort: "az",
  };
}

const ACTIVE_FILTER_KEYS: Array<{
  key: string;
  on: (f: DiscoveryFilters) => boolean;
}> = [
  { key: "query", on: (f) => f.query.trim() !== "" },
  { key: "official", on: (f) => f.officialOnly },
  { key: "budget", on: (f) => f.budget.trim() !== "" },
  { key: "stars", on: (f) => f.stars !== 0 },
  { key: "pet", on: (f) => f.petFriendly },
  { key: "meal", on: (f) => f.meal !== "any" },
  { key: "cancel", on: (f) => f.cancellation !== "any" },
  { key: "payment", on: (f) => f.payment !== "any" },
  { key: "advance", on: (f) => f.maxAdvance.trim() !== "" },
  { key: "smoking", on: (f) => f.smoking !== "any" },
  { key: "dayuse", on: (f) => f.dayUse },
  { key: "arrival", on: (f) => f.arrival !== "any" },
  { key: "roomcert", on: (f) => f.roomCertainty },
  { key: "access", on: (f) => f.accessJourney.length > 0 },
  { key: "childsleep", on: (f) => f.childSleep },
];

/** Fixed vocabulary only — never free text — so analytics cannot leak names. */
export function activeFilterKeys(f: DiscoveryFilters): string[] {
  return ACTIVE_FILTER_KEYS.filter((k) => k.on(f)).map((k) => k.key);
}

export interface VenueVerdict {
  venue: ComparisonVenue;
  group: "match" | "confirm" | "exclude";
  reasons: string[];
  lowestMinor: number | null;
  quoted: boolean;
}

function validQuotesFor(
  venueId: string,
  plan: QuotePlan | null,
  quotes: PersonalQuote[],
  now: number,
): PersonalQuote[] {
  if (!plan) return [];
  return quotes.filter(
    (q) =>
      q.venueId === venueId &&
      q.plan.kind === plan.kind &&
      samePlan(q.plan, plan) &&
      !quoteIssue(q, now),
  );
}

function lowestTotal(valid: PersonalQuote[]): number | null {
  const values = valid
    .map((q) => quoteCost(q).totalMinor)
    .filter((n): n is number => n !== null);
  return values.length ? Math.min(...values) : null;
}

/** Cash the customer must part with before arrival, from their own entries. */
function advanceFor(q: PersonalQuote): number | null {
  const total = quoteCost(q).totalMinor;
  if (total === null) return null;
  if (q.payment === "pay-at-venue") return q.depositMinor;
  if (q.payment === "pay-now")
    return q.depositMinor === null ? total : total + q.depositMinor;
  return null;
}

function cancelSatisfies(
  q: PersonalQuote,
  mode: CancelFilter,
  cancelBy: string,
  arrival: string,
): boolean {
  if (mode === "free")
    return q.cancellation === "free-until" || q.cancellation === "not-applicable";
  if (q.cancellation !== "free-until") return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cancelBy)) return false;
  if (cancelBy.slice(0, 10) > arrival) return false;
  return q.cancelUntil >= cancelBy;
}

/**
 * Provider-confirmation checklist. These criteria have no sourced venue data,
 * so they annotate the search instead of silently filtering it.
 */
export function confirmationChecklist(
  f: DiscoveryFilters,
  plan: QuotePlan | null,
): string[] {
  const items: string[] = [];
  if (f.smoking !== "any")
    items.push(
      f.smoking === "non-smoking"
        ? "Ask for a non-smoking room in writing — smoking policy is not in our sourced data."
        : "Ask whether a smoking room exists and which floors allow it — smoking policy is not in our sourced data.",
    );
  if (f.dayUse)
    items.push(
      "Ask for day-use availability, hours and the day rate — daytime booking is not in our sourced data.",
    );
  if (f.arrival !== "any")
    items.push(
      f.arrival === "early"
        ? "Ask for the earliest guaranteed check-in and any early-arrival charge."
        : "Ask for the latest guaranteed check-out and any late-departure charge.",
    );
  if (f.roomCertainty)
    items.push(
      "Ask for a guaranteed room arrangement in writing — “on request” is not a guarantee, and multi-room moves must be ruled out.",
    );
  for (const step of f.accessJourney) {
    const label = ACCESS_JOURNEY_STEPS.find((s) => s.id === step)?.label;
    if (label) items.push(`Ask the venue to confirm: ${label}.`);
  }
  if (f.childSleep) {
    if (plan && plan.kind === "hotel" && plan.childAges.length)
      items.push(
        `Ask how each child sleeps: cot, extra bed or shared bed, and whether it is included or charged — for ages ${[...plan.childAges].sort((a, b) => a - b).join(", ")}.`,
      );
    else
      items.push(
        "Add the children travelling to your plan first, then ask how each child sleeps: cot, extra bed or shared bed, included or charged.",
      );
  }
  return items;
}

export function evaluateVenues(
  kind: "hotel" | "restaurant",
  cityId: string,
  filters: DiscoveryFilters,
  plan: QuotePlan | null,
  quotes: PersonalQuote[],
  now: number,
): {
  verdicts: VenueVerdict[];
  hidden: Array<{ venue: ComparisonVenue; reason: string }>;
  invalidBudget: boolean;
  invalidAdvance: boolean;
} {
  const q = filters.query.trim().toLocaleLowerCase("en-IN");
  const cap = filters.budget.trim() === "" ? null : parseQuoteMoney(filters.budget);
  const advanceCap =
    filters.maxAdvance.trim() === "" ? null : parseQuoteMoney(filters.maxAdvance);
  const invalidBudget = filters.budget.trim() !== "" && cap === null;
  const invalidAdvance = filters.maxAdvance.trim() !== "" && advanceCap === null;
  const verdicts: VenueVerdict[] = [];
  const hidden: Array<{ venue: ComparisonVenue; reason: string }> = [];
  for (const venue of COMPARISON_VENUES) {
    if (venue.kind !== kind) continue;
    if (
      venue.city !== cityId &&
      !(cityId === "delhi-ncr" && ["gurugram", "noida"].includes(venue.city))
    )
      continue;
    if (
      q &&
      !`${venue.name} ${venue.area}`.toLocaleLowerCase("en-IN").includes(q)
    )
      continue;
    if (filters.officialOnly && venue.evidence !== "official") continue;
    const valid = validQuotesFor(venue.id, plan, quotes, now);
    const lowest = lowestTotal(valid);
    // Evidence-backed must-have failures hide the venue, like mainstream
    // metasearch hides over-budget results. The hidden count stays visible so
    // nothing disappears silently.
    const hide = (reason: string) => {
      hidden.push({ venue, reason });
      return true;
    };
    // Unknown evidence never hides: it asks for provider confirmation.
    if (lowest === null && !filters.includeUnpriced) {
      hide("No priced quote for your plan yet.");
      continue;
    }
    if (lowest !== null && cap !== null && lowest > cap) {
      hide("Your lowest entered total for this plan is above the budget.");
      continue;
    }
    const reasons: string[] = [];
    let group: VenueVerdict["group"] = "match";
    const confirm = (r: string) => {
      group = "confirm";
      reasons.push(r);
    };
    if (filters.stars !== 0)
      confirm(
        "Star category is not established for any place in this collection — check it with the provider.",
      );
    if (filters.petFriendly && !venue.petResearch)
      confirm(
        "Pet admission is not established for this place — only researched pet-friendly records are confirmed.",
      );
    if (
      lowest === null &&
      plan &&
      (filters.meal !== "any" ||
        filters.cancellation !== "any" ||
        filters.payment !== "any" ||
        advanceCap !== null ||
        cap !== null)
    ) {
      confirm(
        "No quote entered for your plan yet, so meal, cancellation, payment and budget needs are unconfirmed.",
      );
    }
    if (lowest !== null) {
      if (filters.meal !== "any") {
        const want = filters.meal === "breakfast" ? "breakfast" : "room-only";
        if (!valid.some((x) => x.meal === want)) {
          hide(
            `None of your quotes for this plan records “${filters.meal === "breakfast" ? "breakfast for every guest" : "room only"}”.`,
          );
          continue;
        }
      }
      if (filters.cancellation !== "any" && plan) {
        if (
          !valid.some((x) =>
            cancelSatisfies(x, filters.cancellation, filters.cancelBy, plan.arrival),
          )
        ) {
          hide(
            filters.cancellation === "free"
              ? "None of your quotes for this plan records free cancellation."
              : "None of your quotes for this plan stays refundable until your chosen deadline.",
          );
          continue;
        }
      }
      if (filters.payment !== "any") {
        const want =
          filters.payment === "pay-at-venue" ? "pay-at-venue" : "pay-now";
        if (!valid.some((x) => x.payment === want)) {
          hide(
            `None of your quotes for this plan records “${filters.payment === "pay-at-venue" ? "pay at the venue" : "pay now"}”.`,
          );
          continue;
        }
      }
      if (advanceCap !== null) {
        const known = valid
          .map(advanceFor)
          .filter((n): n is number => n !== null);
        if (!known.length)
          confirm(
            "Advance cash cannot be checked: payment timing or deposit is missing from your quotes.",
          );
        else if (!known.some((n) => n <= advanceCap)) {
          hide("The advance cash in your quotes is above this limit.");
          continue;
        }
      }
    }
    verdicts.push({
      venue,
      group,
      reasons,
      lowestMinor: lowest,
      quoted: valid.length > 0,
    });
  }
  const byName = (a: VenueVerdict, b: VenueVerdict) =>
    a.venue.name.localeCompare(b.venue.name, "en");
  if (filters.sort === "lowest")
    verdicts.sort(
      (a, b) =>
        (a.lowestMinor ?? Number.MAX_SAFE_INTEGER) -
          (b.lowestMinor ?? Number.MAX_SAFE_INTEGER) || byName(a, b),
    );
  else if (filters.sort === "recent")
    verdicts.sort(
      (a, b) => b.venue.reviewedAt.localeCompare(a.venue.reviewedAt) || byName(a, b),
    );
  else verdicts.sort(byName);
  // Stable group order: matches first, then needs-confirmation.
  verdicts.sort(
    (a, b) => (a.group === b.group ? 0 : a.group === "match" ? -1 : 1),
  );
  return { verdicts, hidden, invalidBudget, invalidAdvance };
}

export interface ProviderVisit {
  key: "official" | "booking" | "mmt" | "cleartrip" | "map";
  label: string;
  href: string;
}

/** Outbound discovery links. Clicking is an attempt, never proof of booking. */
export function providerVisits(
  venue: ComparisonVenue,
  plan: QuotePlan | null,
): ProviderVisit[] {
  const visits: ProviderVisit[] = [
    { key: "official", label: "Official site", href: venue.website },
  ];
  const city = cityById(venue.city);
  if (venue.kind === "hotel") {
    if (plan && plan.kind === "hotel") {
      const stay: StayPlan = {
        city: venue.city,
        area:
          venue.city === "gurugram"
            ? "Gurugram"
            : venue.city === "noida"
              ? "Noida"
              : venue.city === "delhi-ncr"
                ? "New Delhi"
                : city.name,
        checkin: plan.arrival,
        checkout: plan.departure,
        adults: plan.adults,
        rooms: plan.rooms,
        ages: plan.childAges.map(String),
      };
      try {
        visits.push({
          key: "booking",
          label: "Check these dates on Booking.com",
          href: bookingSearch(stay),
        });
      } catch {
        // Invalid plan details: the dated link is omitted, never guessed.
      }
    }
    visits.push({
      key: "mmt",
      label: `Open ${city.name} hotel guide on MakeMyTrip`,
      href: hotelDirectory(city),
    });
    visits.push({
      key: "cleartrip",
      label: "Explore Cleartrip Hotels",
      href: "https://www.cleartrip.com/hotels",
    });
  } else {
    visits.push({
      key: "map",
      label: "Find on the map",
      href: localDiningSearch(city, "restaurants", venue.name),
    });
  }
  return visits;
}

export type BookingOutcome = "booked" | "not-booked" | "looking";
export const OUTCOME_LABELS: Record<BookingOutcome, string> = {
  booked: "Booked with a provider",
  "not-booked": "Did not book",
  looking: "Still looking",
};
const OUTCOME_KEY = "dealmosaic.hospitality-outcomes.v1";
export interface OutcomeRecord {
  venueId: string;
  outcome: BookingOutcome;
  provider: string;
  at: string;
}
/** Voluntary, device-only outcome notes. Returning never implies a booking. */
export function readOutcomes(): OutcomeRecord[] {
  try {
    const raw = localStorage.getItem(OUTCOME_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (r): r is OutcomeRecord =>
          !!r &&
          typeof r === "object" &&
          typeof (r as OutcomeRecord).venueId === "string" &&
          ["booked", "not-booked", "looking"].includes(
            (r as OutcomeRecord).outcome,
          ) &&
          typeof (r as OutcomeRecord).provider === "string" &&
          typeof (r as OutcomeRecord).at === "string",
      )
      .slice(0, 100);
  } catch {
    return [];
  }
}
export function writeOutcome(record: OutcomeRecord): boolean {
  try {
    const next = [
      record,
      ...readOutcomes().filter((r) => r.venueId !== record.venueId),
    ].slice(0, 100);
    localStorage.setItem(OUTCOME_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}
