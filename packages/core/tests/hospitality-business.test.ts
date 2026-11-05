import { describe, expect, it } from "vitest";
import {
  hospitalityRateGate,
  hospitalityScenario,
  type HospitalityScenario,
  type HospitalityReleaseGate,
} from "../src/hospitality-business";
const scenario: HospitalityScenario = {
  mode: "cpa",
  qualifiedPlans: 1000,
  actionPercent: 30,
  bookingPercent: 5,
  completionPercent: 80,
  acceptancePercent: 90,
  payoutMinor: 30000,
  servicePerEventMinor: 2000,
  servicePerPlanMinor: 0,
  fixedCostMinor: 0,
};
const gate: HospitalityReleaseGate = {
  agreementRecorded: true,
  zeroCostConfirmed: true,
  displayRightsConfirmed: true,
  credentialsConfigured: true,
  adapterImplemented: true,
  certificationRecorded: true,
  returnedBookingLinkValidated: true,
  supportOwnerConfirmed: true,
};
describe("commercial planning, never a ledger", () => {
  it("uses realised publisher payout basis, not the hotel gross booking value", () => {
    const r = hospitalityScenario(scenario);
    expect(r.payableEvents).toBeCloseTo(10.8);
    expect(r.revenueMinor).toBe(324000);
    expect(r.contributionMinor).toBe(302400);
  });
  it("counts cancellation and validation failures before multiplying payouts", () => {
    expect(
      hospitalityScenario({ ...scenario, completionPercent: 0 }).revenueMinor,
    ).toBe(0);
    expect(
      hospitalityScenario({ ...scenario, acceptancePercent: 0 }).revenueMinor,
    ).toBe(0);
  });
  it("treats CPC as valid clicks, without multiplying by booking conversion", () => {
    expect(
      hospitalityScenario({
        ...scenario,
        mode: "cpc",
        payoutMinor: 100,
        bookingPercent: 0,
        completionPercent: 0,
      }).revenueMinor,
    ).toBe(27000);
  });
  it("uses fulfilment and validation for the proposed direct model", () =>
    expect(
      hospitalityScenario({ ...scenario, mode: "direct" }).revenueMinor,
    ).toBe(324000));
  it("subtracts costs of all searches, including ones that did not book", () =>
    expect(
      hospitalityScenario({
        ...scenario,
        servicePerPlanMinor: 100,
        fixedCostMinor: 50000,
      }).contributionMinor,
    ).toBe(152400));
  it("does not claim break-even with negative unit economics", () =>
    expect(
      hospitalityScenario({ ...scenario, servicePerEventMinor: 40000 })
        .breakEvenPlans,
    ).toBeNull());
  it("computes a ceiling for break-even and handles no traffic without division errors", () => {
    expect(
      hospitalityScenario({ ...scenario, fixedCostMinor: 100000 })
        .breakEvenPlans,
    ).toBe(331);
    expect(
      hospitalityScenario({ ...scenario, qualifiedPlans: 0 }).revenueMinor,
    ).toBe(0);
  });
  it.each([
    { qualifiedPlans: -1 },
    { qualifiedPlans: 1.5 },
    { actionPercent: 101 },
    { acceptancePercent: NaN },
    { payoutMinor: -1 },
    { payoutMinor: 1.5 },
    { fixedCostMinor: Infinity },
    { mode: "cpa+cpc" },
  ])("rejects invalid assumptions %j", (value) =>
    expect(() =>
      hospitalityScenario({ ...scenario, ...value } as HospitalityScenario),
    ).toThrow(),
  );
});
describe("independent live-rate release gates", () => {
  it("requires all eight gates, not just credentials", () => {
    expect(hospitalityRateGate(gate).allowed).toBe(true);
    for (const key of Object.keys(gate))
      expect(hospitalityRateGate({ ...gate, [key]: false }).allowed).toBe(
        false,
      );
  });
  it("fails closed for omitted gates", () => {
    expect(hospitalityRateGate({} as HospitalityReleaseGate).allowed).toBe(
      false,
    );
    expect(
      hospitalityRateGate({} as HospitalityReleaseGate).missing,
    ).toHaveLength(8);
  });
});
