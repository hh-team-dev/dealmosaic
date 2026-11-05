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
const brief = `DealMosaic — request for a no-fee hotel referral / qualified-click partnership\n\nWebsite: https://dealmosaic.pages.dev\nContact: hh.team.dev@gmail.com\nTarget audience: travellers comparing stays across 17 Indian destination choices.\nCurrent product: mobile website/PWA, 40 sourced hotel records, personal full-stay quote comparison and disclosed provider promotions. No live room-rate API is connected. Traffic, bookings and earnings are not represented as established volumes.\nRequested launch order: approved hotel-specific or destination referral links first, permitted widgets second, authorised native APIs only if available. For Cuelinks campaign 2516 (Trivago), please explicitly confirm whether organic text links on DealMosaic’s coupon-free native hotel comparison pages are permitted for our comparison/deals publisher, given the Deals/Coupons media restrictions; confirm the India-specific net click-out payout, allowable landing URLs, PWA/mobile-web treatment and settlement. No link will be added on the assumption that a different page label bypasses these restrictions. CPC or qualified downstream click-out revenue is preferred when genuinely available; CPA remains acceptable where already approved. Booking, customer payment, vouchers, cancellations and support must stay with the provider. Please distinguish a click on our site from a later payable click on yours, and confirm country/traffic rules, active campaign status, invalid/duplicate click rules, net publisher payout, thresholds, settlement timing and mobile/app attribution.\nPlease confirm in writing: application eligibility; API/content/photo and comparison-display rights; India inventory; zero joining/setup/monthly/minimum-commitment/usage or certification fees within agreed limits; rate limits and permitted caching; currency/tax/mandatory-fee fields; room mapping and per-room child occupancy; returned tracked deep links; sub-ID and conversion reconciliation; cancellation/validation/payout triggers and deductions; sandbox and certification requirements; customer support ownership; termination and data deletion.\nWe do not accept a paid trial, advertising commitment, automatic paid upgrade or minimum booking guarantee. Please disclose any condition that prevents a zero-cash-cost launch.\nLegal entity, contracting country, tax and bank/KYC particulars will be supplied privately by the owner after reviewing the proposed terms. This message is an enquiry, not acceptance of a contract.`;
adminHospitalityRoutes.get("/", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({
    assessedAt: new Date().toISOString(),
    scope:
      "Implementation and approvals recorded in this release, not a live check of external partner accounts.",
    revenueReview: {
      checkedOn: "2026-11-05",
      scope:
        "Research and release-recorded decisions, not a live approval check. Read current account terms in Campaigns before activation.",
      preference:
        "Investigate eligible CPC first; execute the lowest-friction approved route first. Never choose a customer price winner by commission.",
      routes: [
        {
          name: "Trivago qualified click-outs — campaign 2516",
          action:
            "Fresh publisher scan reports open access and India in the country list. The network labels it CPS, but its detailed terms describe payment for View prices / View deals click-outs tracked as orders. It also disallows Deals/Coupons, cashback and social media. Obtain written confirmation that DealMosaic’s organic, coupon-free comparison text placement is permitted before adding a link; do not disguise the site or assume every first click pays. Confirm India-specific net payout and settlement.",
          status:
            "Best existing click-out lead; placement permission unresolved, not activated",
        },
        {
          name: "Existing Cuelinks hotel promotions",
          action:
            "Inspect current access, country, deep-link permission and campaign terms. Existing access is a shorter path than waiting for native APIs; CPS still requires a qualifying sale/stay.",
          status: "Existing network; individual offers and terms still control",
        },
        {
          name: "Qualified CPC / click-out revenue",
          action:
            "Use the live CPC filter. Confirm India and website/PWA eligibility, an active campaign, the precise payable event, invalid-click rules and actual payout terms. No approved hotel CPC connection is recorded in this release.",
          status: "Preferred investigation; not activated",
        },
        {
          name: "Travelpayouts approved brand tools",
          action:
            "Some projects get immediate programme access, others require review. Ask for current brand-specific tools. The retired Hotellook hotel API/white-label path cannot be used.",
          status: "Additional network candidate; no account or rights recorded",
        },
        {
          name: "Stay22 explicit links or approved map",
          action:
            "Published no-upfront-fee, commission-based option worth evaluating. Confirm comparison-site/PWA permission, India coverage, payout, data rights and explicit-click-only configuration. Do not enable automatic tabs or sitewide link rewriting.",
          status: "Candidate, not a connected supplier or CPC guarantee",
        },
        {
          name: "Display ads / direct venue agreements",
          action:
            "Ads require approval, valid traffic and appropriate placement/consent. Direct leads or stay fees require written acceptance and reconciliation. Neither makes every visitor click payable.",
          status: "Later only when useful and approved",
        },
      ],
      corrections: [
        {
          text: "Trivago campaign 2516 is labelled CPS, but its detailed terms say CPC (Cost-per-Clickout). Deals/Coupons and other media restrictions still apply; an open account is not permission to ignore them.",
          source:
            "https://www.cuelinks.com/campaigns/trivago-affiliate-program",
        },
        {
          text: "Hotellook closed on 20 October 2025; its hotel API and widgets stopped working. This does not mean Travelpayouts itself closed.",
          source:
            "https://support.travelpayouts.com/hc/en-us/articles/29534131568530-FAQ-on-the-closure-of-Hotellook",
        },
        {
          text: "Travelpayouts programme access depends on the project and brand. Instant network signup is not universal supplier approval.",
          source:
            "https://support.travelpayouts.com/hc/en-us/articles/360021216060-How-to-start-working-with-affiliate-programs",
        },
        {
          text: "AdSense display monetisation is not a fee for every hotel button click; approval and valid ad traffic are separate.",
          source: "https://support.google.com/adsense/answer/6242051?hl=en",
        },
        {
          text: "Stay22 publishes a commission-based, no-upfront-fee model. Its marketing results are not DealMosaic forecasts or approval.",
          source: "https://www.stay22.com/",
        },
      ],
    },
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
