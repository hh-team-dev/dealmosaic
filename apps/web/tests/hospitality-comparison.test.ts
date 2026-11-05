import { describe, it, expect } from "vitest";
import { CITIES } from "../src/lib/hospitality";
import {
  COMPARISON_VENUES,
  venuesFor,
  parseQuoteMoney,
  validPlan,
  planError,
  validPersonalQuote,
  quoteCost,
  quoteIssue,
  comparableKey,
  comparisonGroups,
  samePlan,
  readPersonalQuotes,
  serializePersonalQuotes,
  quoteCsv,
  type PersonalQuote,
} from "../src/lib/hospitality-comparison";
const now = Date.parse("2027-01-10T06:00:00Z");
const q = (change: Partial<PersonalQuote> = {}): PersonalQuote => ({
  id: "q1",
  venueId: "ginger-mumbai-airport",
  provider: "Provider A",
  plan: {
    kind: "hotel",
    city: "mumbai",
    arrival: "2027-01-11",
    departure: "2027-01-13",
    adults: 2,
    rooms: 1,
    childAges: [],
    rooming: "",
    time: "",
    diningMode: "dine-in",
  },
  item: "Deluxe King",
  meal: "room-only",
  cancellation: "non-refundable",
  cancelUntil: "",
  payment: "pay-now",
  eligibility: "public",
  eligibilityDetails: "",
  baseMinor: 1000000,
  extraFeesMinor: 100000,
  onSiteMinor: 10000,
  extrasMinor: 0,
  depositMinor: 200000,
  cashbackMinor: 50000,
  complete: true,
  recordedAt: new Date(now - 1000).toISOString(),
  provenance: "personal",
  ...change,
});

describe("sourced venue collection", () => {
  it("has no duplicate canonical IDs or same-city exact names", () => {
    expect(new Set(COMPARISON_VENUES.map((v) => v.id)).size).toBe(
      COMPARISON_VENUES.length,
    );
    expect(
      new Set(COMPARISON_VENUES.map((v) => v.city + "|" + v.name.toLowerCase()))
        .size,
    ).toBe(COMPARISON_VENUES.length);
  });
  it("contains 40 hotels and 33 dining places without fabricated prices or star categories", () => {
    expect(COMPARISON_VENUES.filter((v) => v.kind === "hotel")).toHaveLength(
      40,
    );
    expect(
      COMPARISON_VENUES.filter((v) => v.kind === "restaurant"),
    ).toHaveLength(33);
    expect(
      COMPARISON_VENUES.every((v) => v.stars === null && !("price" in v)),
    ).toBe(true);
  });
  it.each(CITIES.map((c) => c.id))(
    "has a sourced hotel and dining place for %s",
    (city) => {
      expect(venuesFor("hotel", city).length).toBeGreaterThan(0);
      expect(venuesFor("restaurant", city).length).toBeGreaterThan(0);
    },
  );
  it("retains geographical overlap without duplicating properties", () => {
    const ncr = venuesFor("hotel", "delhi-ncr");
    for (const v of venuesFor("hotel", "gurugram"))
      expect(ncr.some((x) => x.id === v.id)).toBe(true);
    expect(venuesFor("hotel", "noida").every((v) => v.city === "noida")).toBe(
      true,
    );
  });
  it("uses HTTPS source references, known destinations and bounded source dates", () => {
    for (const v of COMPARISON_VENUES) {
      expect(new URL(v.website).protocol).toBe("https:");
      expect(new URL(v.sourceUrl).username).toBe("");
      expect(CITIES.some((c) => c.id === v.city)).toBe(true);
      expect(v.reviewedAt <= "2026-11-05").toBe(true);
    }
  });
  it("filters by name and official evidence without guessed stars", () => {
    expect(venuesFor("hotel", "mumbai", "ginger")).toHaveLength(1);
    expect(
      venuesFor("hotel", "all", "", true).every(
        (v) => v.evidence === "official",
      ),
    ).toBe(true);
    expect(venuesFor("hotel", "all", "", false, 5)).toHaveLength(0);
  });
});
describe("personal quote arithmetic and matching", () => {
  it.each([
    ["0", 0],
    ["10.05", 1005],
    ["10000000", 1000000000],
    ["", null],
    ["-1", null],
    ["1,000", null],
    ["NaN", null],
    ["1e3", null],
    ["10000001", null],
    ["1.999", null],
  ])("parses %s without floats or assumed zeros", (raw, value) =>
    expect(parseQuoteMoney(String(raw))).toBe(value),
  );
  it("never multiplies the whole stay again or subtracts cashback", () => {
    expect(quoteCost(q())).toEqual({
      knownMinor: 1110000,
      totalMinor: 1110000,
      cashNeededMinor: 1310000,
    });
  });
  it("distinguishes unknown costs, zero costs, deposits and complete totals", () => {
    expect(quoteCost(q({ onSiteMinor: null })).totalMinor).toBeNull();
    expect(quoteCost(q({ onSiteMinor: 0 })).totalMinor).toBe(1100000);
    expect(quoteCost(q({ complete: false })).totalMinor).toBeNull();
    expect(quoteCost(q({ depositMinor: null })).cashNeededMinor).toBeNull();
  });
  it("accepts complete personal quotes but never another provenance", () => {
    expect(validPersonalQuote(q())).toBe(true);
    expect(validPersonalQuote({ ...q(), provenance: "live" })).toBe(false);
  });
  it("keeps old notes readable while excluding old and future records from ranking", () => {
    for (const time of [now - 86400001, now + 1]) {
      const quote = q({ recordedAt: new Date(time).toISOString() });
      expect(validPersonalQuote(quote)).toBe(true);
      expect(quoteIssue(quote, now)).toBeTruthy();
      expect(
        comparisonGroups([quote, q({ id: "q2", provider: "B" })], now),
      ).toHaveLength(0);
    }
  });
  it("excludes expired plans, refund deadlines and unknown terms", () => {
    expect(
      quoteIssue(
        q({
          ...q(),
          plan: { ...q().plan, arrival: "2027-01-08", departure: "2027-01-09" },
        }),
        now,
      ),
    ).toContain("passed");
    expect(
      quoteIssue(
        q({ cancellation: "free-until", cancelUntil: "2027-01-09T23:00" }),
        now,
      ),
    ).toContain("deadline");
    for (const changes of [
      { cancellation: "unknown" },
      { payment: "unknown" },
      { eligibility: "unknown" },
      { meal: "unknown" },
      { meal: "other" },
      { complete: false },
    ] as Partial<PersonalQuote>[]) {
      expect(quoteIssue(q(changes), now)).toBeTruthy();
    }
  });
  it("does not merge public and conditional eligibility or different member/card conditions", () => {
    const conditional = q({
      eligibility: "conditional-confirmed",
      eligibilityDetails: "Member tier A",
    });
    expect(validPersonalQuote(conditional)).toBe(true);
    expect(comparableKey(conditional)).not.toBe(comparableKey(q()));
    expect(comparableKey(conditional)).not.toBe(
      comparableKey({ ...conditional, eligibilityDetails: "Member tier B" }),
    );
    expect(validPersonalQuote({ ...conditional, eligibilityDetails: "" })).toBe(
      false,
    );
  });
  it("cannot announce a winner with one provider, including aliases by case and whitespace", () => {
    expect(
      comparisonGroups([q(), q({ id: "q2", provider: " PROVIDER   A " })], now),
    ).toHaveLength(0);
  });
  it("keeps equal-low ties and ignores any injected commission field", () => {
    const a = { ...q(), commission: 999999 };
    const b = { ...q({ id: "q2", provider: "B" }), commission: 0 };
    expect(comparisonGroups([b, a], now)[0]!.lowestIds).toEqual(["q1", "q2"]);
  });
  it("ranks identical entered conditions by cost, not cashback or deposit", () => {
    const cheap = q({
      id: "q2",
      provider: "B",
      baseMinor: 900000,
      depositMinor: 900000,
      cashbackMinor: 0,
    });
    expect(
      comparisonGroups([q({ cashbackMinor: 900000 }), cheap], now)[0]!
        .lowestIds,
    ).toEqual(["q2"]);
  });
  it.each(["item", "meal", "payment", "cancellation", "venueId"] as const)(
    "does not merge different %s",
    (field) => {
      const value = {
        item: "Different room",
        meal: "breakfast",
        payment: "pay-at-venue",
        cancellation: "free-until",
        venueId: "ginger-mysore",
      }[field];
      const other = q({
        id: "q2",
        provider: "B",
        [field]: value,
        cancelUntil: "2027-01-11T12:00",
      } as Partial<PersonalQuote>);
      expect(comparableKey(other)).not.toBe(comparableKey(q()));
    },
  );
  it("matches sorted child ages but not different room allocation, dates or occupancies", () => {
    const a = { ...q().plan, childAges: [7, 4] };
    expect(samePlan(a, { ...a, childAges: [4, 7] })).toBe(true);
    for (const change of [
      { rooms: 2 },
      { adults: 3 },
      { arrival: "2027-01-12" },
      { rooming: "Room 2: 1 child" },
    ])
      expect(samePlan(a, { ...a, ...change })).toBe(false);
  });
  it("does not confuse overlapping NCR browse scope with different properties", () => {
    const g = q({
      venueId: "ginger-gurugram-sector-1",
      plan: { ...q().plan, city: "gurugram" },
    });
    const n = { ...g, plan: { ...g.plan, city: "delhi-ncr" } };
    expect(validPersonalQuote(n)).toBe(true);
    expect(comparableKey(g)).toBe(comparableKey(n));
    expect(
      validPersonalQuote({ ...g, plan: { ...g.plan, city: "noida" } }),
    ).toBe(false);
  });
  it("requires rooming for multi-room plans and rejects impossible counts", () => {
    expect(validPlan({ ...q().plan, rooms: 2 })).toBe(false);
    expect(
      validPlan({
        ...q().plan,
        rooms: 2,
        rooming: "Room 1: 1 adult; room 2: 1 adult",
      }),
    ).toBe(true);
    expect(validPlan({ ...q().plan, rooms: 3, rooming: "bad" })).toBe(false);
    expect(validPlan({ ...q().plan, childAges: [-1] })).toBe(false);
    expect(validPlan({ ...q().plan, arrival: { toString: null } })).toBe(false);
    expect(planError(q().plan, "2027-01-12")).toContain("future");
  });
  it("rejects impossible cancellation dates and dates after arrival", () => {
    for (const date of [
      "2027-02-30T10:00",
      "2027-01-12T10:00",
      "2027-01-11T24:10",
    ])
      expect(
        validPersonalQuote(
          q({ cancellation: "free-until", cancelUntil: date }),
        ),
      ).toBe(false);
  });
  it("requires meal visit time and compares the same format and basket only", () => {
    const d = q({
      venueId: "qmin-ginger-jamshedpur",
      plan: {
        ...q().plan,
        kind: "restaurant",
        city: "jamshedpur",
        arrival: "2027-01-11",
        departure: "2027-01-11",
        time: "19:00",
      },
      meal: "other",
      cancellation: "not-applicable",
      item: "2 identical mains, dine-in offer confirmed",
    });
    expect(validPersonalQuote(d)).toBe(true);
    expect(quoteIssue(d, now)).toBeNull();
    expect(validPlan({ ...d.plan, time: "" })).toBe(false);
    expect(samePlan(d.plan, { ...d.plan, time: "12:00" })).toBe(false);
    expect(samePlan(d.plan, { ...d.plan, diningMode: "delivery" })).toBe(false);
  });
});
describe("defensive device storage and CSV export", () => {
  it("roundtrips without refreshing timestamps or upgrading provenance", () => {
    expect(readPersonalQuotes(serializePersonalQuotes([q()]))).toEqual({
      quotes: [q()],
      damaged: false,
    });
  });
  it.each([
    "{",
    "null",
    "{}",
    '{"version":2,"quotes":[]}',
    JSON.stringify({ version: 1, quotes: Array(31).fill(q()) }),
  ])("handles damaged storage without crashing: %s", (raw) => {
    expect(readPersonalQuotes(raw)).toEqual({ quotes: [], damaged: true });
  });
  it("retains valid entries and flags discarded corrupt or duplicate rows", () => {
    const r = readPersonalQuotes(
      JSON.stringify({ version: 1, quotes: [q(), q(), { bad: true }] }),
    );
    expect(r.quotes).toHaveLength(1);
    expect(r.damaged).toBe(true);
  });
  it("rejects unsafe amounts, controls and unsupported records at the save boundary", () => {
    for (const value of [
      { baseMinor: Infinity },
      { baseMinor: -1 },
      { extraFeesMinor: NaN },
      { id: "a\nb" },
      { venueId: "invented" },
      { provider: "" },
    ])
      expect(() => serializePersonalQuotes([q(value)])).toThrow();
  });
  it("exports personal provenance, components, rooming and formula-safe provider labels", () => {
    const csv = quoteCsv([q({ provider: '=HYPERLINK("https://evil.test")' })]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("Extra taxes and provider fees INR");
    expect(csv).toContain("Room allocation");
    expect(csv).toContain("Personal, not provider-verified");
    expect(csv).toContain("11100.00");
    expect(csv).not.toContain("10600.00");
  });
});
