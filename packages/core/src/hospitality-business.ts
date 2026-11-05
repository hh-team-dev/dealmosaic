/** Planning arithmetic only. This never creates a ledger entry, agreement or payment. */
export interface HospitalityScenario {
  mode: "cpa" | "cpc" | "direct";
  qualifiedPlans: number;
  actionPercent: number;
  bookingPercent: number;
  completionPercent: number;
  acceptancePercent: number;
  payoutMinor: number;
  servicePerEventMinor: number;
  servicePerPlanMinor: number;
  fixedCostMinor: number;
}
export function hospitalityScenario(x: HospitalityScenario) {
  const rates = [
    x.actionPercent,
    x.bookingPercent,
    x.completionPercent,
    x.acceptancePercent,
  ];
  const amounts = [
    x.payoutMinor,
    x.servicePerEventMinor,
    x.servicePerPlanMinor,
    x.fixedCostMinor,
  ];
  if (
    !["cpa", "cpc", "direct"].includes(x.mode) ||
    !Number.isInteger(x.qualifiedPlans) ||
    x.qualifiedPlans < 0 ||
    x.qualifiedPlans > 1000000 ||
    rates.some((n) => !Number.isFinite(n) || n < 0 || n > 100) ||
    amounts.some((n) => !Number.isSafeInteger(n) || n < 0 || n > 1000000000)
  )
    throw Error(
      "Use valid non-negative inputs; percentages must be between 0 and 100.",
    );
  const actionFactor = x.actionPercent / 100,
    acceptance = x.acceptancePercent / 100;
  const payableFactor =
    actionFactor *
    acceptance *
    (x.mode === "cpc"
      ? 1
      : ((x.bookingPercent / 100) * x.completionPercent) / 100);
  const actions = x.qualifiedPlans * actionFactor,
    payableEvents = x.qualifiedPlans * payableFactor;
  const revenueMinor = Math.round(payableEvents * x.payoutMinor);
  const variableCostMinor = Math.round(
    payableEvents * x.servicePerEventMinor +
      x.qualifiedPlans * x.servicePerPlanMinor,
  );
  const contributionMinor = revenueMinor - variableCostMinor - x.fixedCostMinor;
  const variableContributionPerPlanMinor =
    payableFactor * (x.payoutMinor - x.servicePerEventMinor) -
    x.servicePerPlanMinor;
  return {
    actions,
    payableEvents,
    revenueMinor,
    variableCostMinor,
    contributionMinor,
    variableContributionPerPlanMinor,
    breakEvenPlans:
      variableContributionPerPlanMinor > 0
        ? Math.ceil(x.fixedCostMinor / variableContributionPerPlanMinor)
        : null,
  };
}
export interface HospitalityReleaseGate {
  agreementRecorded: boolean;
  zeroCostConfirmed: boolean;
  displayRightsConfirmed: boolean;
  credentialsConfigured: boolean;
  adapterImplemented: boolean;
  certificationRecorded: boolean;
  returnedBookingLinkValidated: boolean;
  supportOwnerConfirmed: boolean;
}
/** An ordinary affiliate account or a UI switch cannot satisfy these independent gates. */
export function hospitalityRateGate(g: HospitalityReleaseGate) {
  const missing = (
    Object.keys(g) as Array<keyof HospitalityReleaseGate>
  ).filter((k) => g[k] !== true);
  // Check the fixed required set as well: missing object keys must never pass at runtime.
  const required: Array<keyof HospitalityReleaseGate> = [
    "agreementRecorded",
    "zeroCostConfirmed",
    "displayRightsConfirmed",
    "credentialsConfigured",
    "adapterImplemented",
    "certificationRecorded",
    "returnedBookingLinkValidated",
    "supportOwnerConfirmed",
  ];
  for (const key of required)
    if (g[key] !== true && !missing.includes(key)) missing.push(key);
  return { allowed: missing.length === 0, missing };
}
