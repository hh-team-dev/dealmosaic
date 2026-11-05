import { Hono } from "hono";
import {
  hospitalityRateGate,
  type HospitalityReleaseGate,
} from "@dealmosaic/core";
import type { AppBindings } from "../middleware/session.js";

/** Mounted only under the existing administrator/authentication boundary. Read-only. */
export const adminHospitalityRoutes = new Hono<AppBindings>();
const gates: HospitalityReleaseGate = {
  agreementRecorded: false,
  zeroCostConfirmed: false,
  displayRightsConfirmed: false,
  credentialsConfigured: false,
  adapterImplemented: false,
  certificationRecorded: false,
  returnedBookingLinkValidated: false,
  supportOwnerConfirmed: false,
};
const brief = `DealMosaic — request for a no-fee hotel metasearch/API partnership\n\nWebsite: https://dealmosaic.pages.dev\nContact: hh.team.dev@gmail.com\nTarget audience: travellers comparing stays across 17 Indian destination choices.\nCurrent product: mobile website/PWA, 40 sourced hotel records, personal full-stay quote comparison and disclosed provider promotions. No live room-rate API is connected. Traffic, bookings and earnings are not represented as established volumes.\nRequested model: authorised native property/rate search with booking, customer payment, vouchers, cancellations and support handled by the provider.\nPlease confirm in writing: application eligibility; API/content/photo and comparison-display rights; India inventory; zero joining/setup/monthly/minimum-commitment/usage or certification fees within agreed limits; rate limits and permitted caching; currency/tax/mandatory-fee fields; room mapping and per-room child occupancy; returned tracked deep links; sub-ID and conversion reconciliation; cancellation/validation/payout triggers and deductions; sandbox and certification requirements; customer support ownership; termination and data deletion.\nWe do not accept a paid trial, advertising commitment, automatic paid upgrade or minimum booking guarantee. Please disclose any condition that prevents a zero-cash-cost launch.\nLegal entity, contracting country, tax and bank/KYC particulars will be supplied privately by the owner after reviewing the proposed terms. This message is an enquiry, not acceptance of a contract.`;
adminHospitalityRoutes.get("/", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    assessedAt: new Date().toISOString(),
    scope:
      "Implementation and approvals recorded in this release, not a live check of external partner accounts.",
    nativeRateConnections: 0,
    directVenueAgreementsRecorded: 0,
    nativeBookingsEnabled: false,
    paidServicesActivated: false,
    providers: [
      {
        id: "agoda-mse",
        name: "Agoda Search / MSE",
        role: "First technical candidate: native rates, provider checkout.",
        source: "https://developer.agoda.com/demand/docs/getting-started",
        ...hospitalityRateGate(gates),
      },
      {
        id: "booking-demand",
        name: "Booking.com Demand",
        role: "Second candidate: managed affiliate contract and credentials required.",
        source:
          "https://developers.booking.com/demand/docs/getting-started/prerequisites",
        ...hospitalityRateGate(gates),
      },
      {
        id: "expedia-rapid",
        name: "Expedia Rapid",
        role: "Evaluate only if the approved commercial and operational model fits the zero-cost constraint.",
        source: "https://partner.expediagroup.com/en-us/join-us/rapid-api",
        ...hospitalityRateGate(gates),
      },
    ],
    promotionNote:
      "Existing affiliate promotion/coupon access is separate from live room prices, content licences and booking authority. Review actual network status in Campaigns; never treat ordinary source links as monetised.",
    directVenueNote:
      "For hotels and restaurants, a fulfilled-referral fee needs a signed venue agreement, explicit customer consent, actual confirmation and reconciliation. No direct venue fulfilment or hospitality payment collection is enabled.",
    applicationBrief: brief,
  });
});
