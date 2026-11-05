import { describe, it, expect, vi, beforeEach } from "vitest";
import { CITIES } from "../src/lib/hospitality";
import {
  COMPARISON_VENUES,
  type PersonalQuote,
  type QuotePlan,
} from "../src/lib/hospitality-comparison";
import {
  ACCESS_JOURNEY_STEPS,
  activeFilterKeys,
  blankDiscoveryFilters,
  confirmationChecklist,
  evaluateVenues,
  providerVisits,
  readOutcomes,
  writeOutcome,
} from "../src/lib/hospitality-discovery";

const plusDays = (n: number) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const plan = (over: Partial<QuotePlan> = {}): QuotePlan => ({
  kind: "hotel",
  city: "mumbai",
  arrival: plusDays(3),
  departure: plusDays(5),
  adults: 2,
  rooms: 1,
  childAges: [],
  rooming: "",
  time: "",
  diningMode: "dine-in",
  ...over,
});

let seq = 0;
const quote = (over: Partial<PersonalQuote> = {}): PersonalQuote => ({
  id: `q-${++seq}-${Math.random().toString(36).slice(2)}`,
  venueId: "ginger-mumbai-airport",
  provider: "Provider A",
  plan: plan(),
  item: "Deluxe King, same configuration",
  meal: "room-only",
  cancellation: "non-refundable",
  cancelUntil: "",
  payment: "pay-now",
  eligibility: "public",
  eligibilityDetails: "",
  baseMinor: 1100000,
  extraFeesMinor: 50000,
  onSiteMinor: 0,
  extrasMinor: 0,
  depositMinor: 200000,
  cashbackMinor: 100000,
  complete: true,
  recordedAt: new Date().toISOString(),
  provenance: "personal",
  ...over,
});

const store = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("discovery catalogue", () => {
  it("covers 18 destinations including Vijayawada, with 41 hotels and 34 dining places", () => {
    expect(CITIES).toHaveLength(18);
    expect(CITIES.map((c) => c.id)).toContain("vijayawada");
    const hotels = COMPARISON_VENUES.filter((v) => v.kind === "hotel");
    const dining = COMPARISON_VENUES.filter((v) => v.kind === "restaurant");
    expect(hotels).toHaveLength(41);
    expect(dining).toHaveLength(34);
  });

  it("exposes fixed analytics vocabulary, never free text", () => {
    const f = blankDiscoveryFilters();
    expect(activeFilterKeys(f)).toEqual([]);
    f.query = "Taj Lake Palace";
    f.budget = "12000";
    f.petFriendly = true;
    expect(activeFilterKeys(f)).toEqual(["query", "budget", "pet"]);
  });
});

describe("evaluateVenues", () => {

  it("matches sourced Mumbai hotels alphabetically with no plan or filters", () => {
    const r = evaluateVenues("hotel", "mumbai", blankDiscoveryFilters(), null, [], Date.now());
    expect(r.verdicts).toHaveLength(2);
    expect(r.verdicts.every((v) => v.group === "match")).toBe(true);
    expect(r.verdicts.map((v) => v.venue.name)).toEqual(
      [...r.verdicts.map((v) => v.venue.name)].sort(),
    );
    expect(r.hidden).toHaveLength(0);
  });

  it("lists the sourced Vijayawada hotel and dining records", () => {
    const h = evaluateVenues("hotel", "vijayawada", blankDiscoveryFilters(), null, [], Date.now());
    expect(h.verdicts.map((v) => v.venue.id)).toEqual(["vivanta-vijayawada-mg-road"]);
    const d = evaluateVenues("restaurant", "vijayawada", blankDiscoveryFilters(), null, [], Date.now());
    expect(d.verdicts.map((v) => v.venue.id)).toEqual(["mynt-vivanta-vijayawada"]);
  });

  it("hides over-budget venues but keeps the hidden count visible", () => {
    const p = plan();
    const f = blankDiscoveryFilters();
    f.budget = "10000";
    const r = evaluateVenues("hotel", "mumbai", f, p, [quote()], Date.now());
    // 11,500 entered total is above the 10,000 budget; the unpriced second
    // venue stays visible as needing confirmation.
    expect(r.verdicts.map((v) => v.venue.id).sort()).toEqual(
      COMPARISON_VENUES.filter(
        (v) => v.kind === "hotel" && v.city === "mumbai" && v.id !== "ginger-mumbai-airport",
      ).map((v) => v.id),
    );
    expect(r.hidden).toHaveLength(1);
    expect(r.hidden[0]!.reason).toContain("above the budget");
    expect(r.invalidBudget).toBe(false);
  });

  it("rejects malformed money without applying the filter", () => {
    const f = blankDiscoveryFilters();
    f.budget = "12,000";
    f.maxAdvance = "free";
    const r = evaluateVenues("hotel", "mumbai", f, plan(), [quote()], Date.now());
    expect(r.invalidBudget).toBe(true);
    expect(r.invalidAdvance).toBe(true);
    expect(r.verdicts).toHaveLength(2);
  });

  it("checks meal, cancellation and payment terms against the customer's quotes", () => {
    const p = plan();
    const breakfast = blankDiscoveryFilters();
    breakfast.meal = "breakfast";
    const r1 = evaluateVenues("hotel", "mumbai", breakfast, p, [quote()], Date.now());
    expect(r1.hidden.map((h) => h.venue.id)).toContain("ginger-mumbai-airport");
    const roomOnly = blankDiscoveryFilters();
    roomOnly.meal = "room-only";
    const r2 = evaluateVenues("hotel", "mumbai", roomOnly, p, [quote()], Date.now());
    expect(r2.verdicts.map((v) => v.venue.id)).toContain("ginger-mumbai-airport");
    const free = blankDiscoveryFilters();
    free.cancellation = "free";
    const r3 = evaluateVenues("hotel", "mumbai", free, p, [quote()], Date.now());
    expect(r3.hidden.map((h) => h.venue.id)).toContain("ginger-mumbai-airport");
    const payAtVenue = blankDiscoveryFilters();
    payAtVenue.payment = "pay-at-venue";
    const r4 = evaluateVenues("hotel", "mumbai", payAtVenue, p, [quote()], Date.now());
    expect(r4.hidden.map((h) => h.venue.id)).toContain("ginger-mumbai-airport");
  });

  it("matches refundable-until deadlines against entered free-cancellation dates", () => {
    const p = plan();
    const q = quote({ cancellation: "free-until", cancelUntil: `${plusDays(2)}T18:00` });
    const f = blankDiscoveryFilters();
    f.cancellation = "refundable-by";
    f.cancelBy = `${plusDays(1)}T18:00`;
    const ok = evaluateVenues("hotel", "mumbai", f, p, [q], Date.now());
    expect(ok.verdicts.map((v) => v.venue.id)).toContain("ginger-mumbai-airport");
    f.cancelBy = `${plusDays(2)}T19:00`;
    const missed = evaluateVenues("hotel", "mumbai", f, p, [q], Date.now());
    expect(missed.hidden.map((h) => h.venue.id)).toContain("ginger-mumbai-airport");
  });

  it("separates advance cash from the stay total and never invents it", () => {
    const p = plan();
    // Pay now: 11,500 total + 2,000 deposit = 13,500 advance.
    const f = blankDiscoveryFilters();
    f.maxAdvance = "13000";
    const over = evaluateVenues("hotel", "mumbai", f, p, [quote()], Date.now());
    expect(over.hidden.map((h) => h.venue.id)).toContain("ginger-mumbai-airport");
    f.maxAdvance = "14000";
    const within = evaluateVenues("hotel", "mumbai", f, p, [quote()], Date.now());
    expect(within.verdicts.map((v) => v.venue.id)).toContain("ginger-mumbai-airport");
    // Pay at venue with an unknown deposit: needs confirmation, never hidden.
    const unknownDeposit = quote({ payment: "pay-at-venue", depositMinor: null });
    const unsure = evaluateVenues("hotel", "mumbai", f, p, [unknownDeposit], Date.now());
    const verdict = unsure.verdicts.find((v) => v.venue.id === "ginger-mumbai-airport")!;
    expect(verdict.group).toBe("confirm");
    expect(verdict.reasons.join(" ")).toContain("Advance cash cannot be checked");
  });

  it("keeps star-filtered places visible as needing confirmation, never invents ratings", () => {
    const f = blankDiscoveryFilters();
    f.stars = 5;
    const r = evaluateVenues("hotel", "mumbai", f, null, [], Date.now());
    expect(r.verdicts).toHaveLength(2);
    expect(r.verdicts.every((v) => v.group === "confirm")).toBe(true);
    expect(r.hidden).toHaveLength(0);
  });

  it("confirms pet-friendly only from researched records", () => {
    const f = blankDiscoveryFilters();
    f.petFriendly = true;
    const r = evaluateVenues("hotel", "mumbai", f, null, [], Date.now());
    for (const v of r.verdicts) {
      if (v.venue.petResearch) expect(v.group).toBe("match");
      else {
        expect(v.group).toBe("confirm");
        expect(v.reasons.join(" ")).toContain("Pet admission is not established");
      }
    }
  });

  it("sorts by lowest entered total and by source recency", () => {
    const p = plan();
    const f = blankDiscoveryFilters();
    f.sort = "lowest";
    const r = evaluateVenues("hotel", "mumbai", f, p, [quote()], Date.now());
    expect(r.verdicts[0]!.venue.id).toBe("ginger-mumbai-airport");
    f.sort = "recent";
    const r2 = evaluateVenues("hotel", "mumbai", f, p, [], Date.now());
    const dates = r2.verdicts.map((v) => v.venue.reviewedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});

describe("confirmationChecklist", () => {
  it("turns unsourced signature criteria into provider questions", () => {
    const f = blankDiscoveryFilters();
    f.smoking = "non-smoking";
    f.dayUse = true;
    f.arrival = "early";
    f.roomCertainty = true;
    f.accessJourney = ACCESS_JOURNEY_STEPS.map((s) => s.id);
    const items = confirmationChecklist(f, plan({ childAges: [] }));
    expect(items.length).toBeGreaterThanOrEqual(7);
    expect(items.join(" ")).toContain("non-smoking");
    expect(items.join(" ")).toContain("Step-free entrance");
  });

  it("asks for child ages before child sleeping questions", () => {
    const f = blankDiscoveryFilters();
    f.childSleep = true;
    expect(confirmationChecklist(f, plan())[0]).toContain("Add the children");
    const withKids = confirmationChecklist(f, plan({ childAges: [7, 3] }));
    expect(withKids[0]).toContain("ages 3, 7");
  });
});

describe("providerVisits", () => {
  it("builds dated hotel links only from a valid applied plan", () => {
    const venue = COMPARISON_VENUES.find((v) => v.id === "ginger-mumbai-airport")!;
    const dated = providerVisits(venue, plan());
    expect(dated.map((v) => v.key)).toEqual(["official", "booking", "mmt", "cleartrip"]);
    const booking = new URL(dated[1]!.href);
    expect(booking.hostname).toBe("www.booking.com");
    expect(booking.searchParams.get("checkin")).toBe(plusDays(3));
    expect(dated.every((v) => v.href.startsWith("https://"))).toBe(true);
    const undated = providerVisits(venue, null);
    expect(undated.map((v) => v.key)).toEqual(["official", "mmt", "cleartrip"]);
  });

  it("gives dining places an official site and a map search", () => {
    const venue = COMPARISON_VENUES.find((v) => v.id === "mynt-vivanta-vijayawada")!;
    const visits = providerVisits(venue, null);
    expect(visits.map((v) => v.key)).toEqual(["official", "map"]);
    expect(new URL(visits[1]!.href).hostname).toBe("www.google.com");
  });
});

describe("voluntary outcomes", () => {
  it("stores device-only outcome notes and ignores malformed data", () => {
    const ls = store();
    vi.stubGlobal("localStorage", ls);
    expect(readOutcomes()).toEqual([]);
    expect(
      writeOutcome({
        venueId: "ginger-mumbai-airport",
        outcome: "looking",
        provider: "booking",
        at: new Date().toISOString(),
      }),
    ).toBe(true);
    expect(readOutcomes()).toHaveLength(1);
    ls.setItem("dealmosaic.hospitality-outcomes.v1", "not json");
    expect(readOutcomes()).toEqual([]);
  });
});
