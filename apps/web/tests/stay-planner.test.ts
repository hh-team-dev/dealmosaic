import { describe, it, expect } from "vitest";
import {
  budgetTotal,
  rebooking,
  NEEDS,
  enquiryText,
} from "../src/lib/stay-planner";
describe("private stay planning arithmetic", () => {
  it("totals whole-party costs without multiplying or inventing fees", () =>
    expect(budgetTotal(["9000", "2700", "600", "1200", "0"])).toBe(1350000));
  it.each(["", "-1", "NaN", "Infinity", "1e3", "10,000", "0.001", "10000001"])(
    "rejects missing or invalid amount %s",
    (x) => expect(budgetTotal(["1", "2", "3", "4", x])).toBeNull(),
  );
  it("requires all five categories", () =>
    expect(budgetTotal(["1"])).toBeNull());
  it("handles paise exactly", () =>
    expect(budgetTotal(["0.1", "0.2", "0", "0", "0"])).toBe(30));
  const v = {
    original: "10000",
    paid: "6000",
    refund: "5000",
    replacement: "8000",
    fee: "200",
  };
  it("includes unrecovered original money plus extra fee", () =>
    expect(rebooking(v, true)).toEqual({
      keep: 1000000,
      switch: 920000,
      difference: 80000,
      additionalCash: 820000,
      loss: 120000,
    }));
  it("requires policy confirmation", () =>
    expect(rebooking(v, false)).toHaveProperty("error"));
  it("rejects refund greater than payment", () =>
    expect(rebooking({ ...v, refund: "6001" }, true)).toHaveProperty("error"));
  it("rejects paid greater than original total", () =>
    expect(rebooking({ ...v, paid: "10001" }, true)).toHaveProperty("error"));
  it("rejects incomplete fees", () =>
    expect(rebooking({ ...v, fee: "" }, true)).toHaveProperty("error"));
  it("shows switching loss for a non-refundable booking", () =>
    expect(
      rebooking({ ...v, paid: "10000", refund: "0", fee: "0" }, true),
    ).toHaveProperty("difference", -800000));
  it("supports pay-at-hotel booking with no sunk cost", () =>
    expect(
      rebooking({ ...v, paid: "0", refund: "0", fee: "0" }, true),
    ).toHaveProperty("difference", 200000));
  it.each(Object.keys(NEEDS))(
    "produces a safe unsent checklist for %s",
    (need) => {
      const t = enquiryText(need as keyof typeof NEEDS, "Siliguri");
      expect(t).toContain("Siliguri");
      expect(t).toContain("not a booking");
      expect(t).toContain("time zone");
      expect(t).toContain("verified hotel contact");
      expect(t).not.toContain("Guaranteed");
    },
  );
});
