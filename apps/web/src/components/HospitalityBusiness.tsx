import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  hospitalityScenario,
  type HospitalityScenario,
} from "@dealmosaic/core";
import "../design/hospitality-comparison.css";
import { apiRequest } from "../lib/api";
import { parseQuoteMoney } from "../lib/hospitality-comparison";

type Readiness = {
  revenueReview: {
    checkedOn: string;
    scope: string;
    preference: string;
    routes: Array<{ name: string; action: string; status: string }>;
    corrections: Array<{ text: string; source: string }>;
  };
  assessedAt: string;
  scope: string;
  nativeRateConnections: number;
  directVenueAgreementsRecorded: number;
  nativeBookingsEnabled: boolean;
  paidServicesActivated: boolean;
  providers: Array<{
    id: string;
    name: string;
    role: string;
    source: string;
    allowed: boolean;
    missing: string[];
  }>;
  promotionNote: string;
  directVenueNote: string;
  applicationBrief: string;
};
const labels: Record<string, string> = {
  agreementRecorded: "Signed provider agreement",
  zeroCostConfirmed: "Written zero-fee scope and limits",
  displayRightsConfirmed: "Rate/content comparison display rights",
  credentialsConfigured: "Approved credentials configured privately",
  adapterImplemented: "Provider-specific adapter implemented",
  certificationRecorded: "Sandbox checks and certification",
  returnedBookingLinkValidated:
    "Approved returned booking/tracking link tested",
  supportOwnerConfirmed: "Customer support and fulfilment owner confirmed",
};
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n / 100);
export default function HospitalityBusiness() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<HospitalityScenario["mode"]>("cpc");
  const [result, setResult] = useState<ReturnType<
    typeof hospitalityScenario
  > | null>(null);
  const [calculationError, setCalculationError] = useState("");
  useEffect(() => {
    const control = new AbortController();
    setError("");
    setData(null);
    apiRequest<Readiness>("/api/admin/hospitality", { signal: control.signal })
      .then(setData)
      .catch((e) => {
        if (!control.signal.aborted)
          setError(e.message || "Readiness could not be loaded.");
      });
    return () => control.abort();
  }, [attempt]);
  function calculate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCalculationError("");
    setResult(null);
    const f = new FormData(e.currentTarget);
    const number = (key: string) => {
      const value = String(f.get(key) || "").trim();
      return value !== "" ? Number(value) : NaN;
    };
    const amount = (key: string) => parseQuoteMoney(String(f.get(key) || ""));
    const monetary = [
      "payoutMinor",
      "servicePerEventMinor",
      "servicePerPlanMinor",
      "fixedCostMinor",
    ] as const;
    if (monetary.some((k) => amount(k) === null)) {
      setCalculationError(
        "Enter every monetary assumption, using 0 for no cost. No commas, negative amounts or currency symbols.",
      );
      return;
    }
    try {
      setResult(
        hospitalityScenario({
          mode,
          qualifiedPlans: number("qualifiedPlans"),
          actionPercent: number("actionPercent"),
          bookingPercent: mode.startsWith("cpc") ? 0 : number("bookingPercent"),
          downstreamPercent:
            mode === "cpc-referral" ? number("downstreamPercent") : undefined,
          completionPercent: mode.startsWith("cpc")
            ? 0
            : number("completionPercent"),
          acceptancePercent: number("acceptancePercent"),
          payoutMinor: amount("payoutMinor")!,
          servicePerEventMinor: amount("servicePerEventMinor")!,
          servicePerPlanMinor: amount("servicePerPlanMinor")!,
          fixedCostMinor: amount("fixedCostMinor")!,
        }),
      );
    } catch (e) {
      setCalculationError(e instanceof Error ? e.message : "Check the inputs.");
    }
  }
  return (
    <div className="stack-lg">
      <header>
        <span className="eyebrow">Owner only / Hotels first, dining next</span>
        <h2>Hospitality business desk</h2>
        <p className="muted">
          Real capability checks, an application brief, and your own
          unit-economics assumptions. This is not an activation screen and does
          not submit applications, accept contracts or move money.
        </p>
      </header>
      {error ? (
        <div className="callout callout-danger" role="alert">
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry readiness
          </button>
        </div>
      ) : !data ? (
        <p role="status">Reading the server’s hospitality configuration…</p>
      ) : (
        <>
          <section
            className="card stack"
            aria-labelledby="revenue-priority-heading"
          >
            <h3 id="revenue-priority-heading">
              Easiest eligible revenue first
            </h3>
            <p>
              <strong>{data.revenueReview.preference}</strong>
            </p>
            <p className="small muted">
              Reviewed {data.revenueReview.checkedOn}.{" "}
              {data.revenueReview.scope}
            </p>
            <Link to="/admin?tab=campaigns&inventory=network&campaignType=CPC">
              Inspect live CPC campaigns and country restrictions
            </Link>
            {data.revenueReview.routes.map((route) => (
              <details key={route.name}>
                <summary>
                  <strong>{route.name}</strong>
                </summary>
                <p>{route.status}</p>
                <p>{route.action}</p>
              </details>
            ))}
            <details>
              <summary>Research corrections that protect the business</summary>
              {data.revenueReview.corrections.map((item, i) => (
                <p key={item.source}>
                  {item.text}{" "}
                  <a
                    href={item.source}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official source {i + 1}
                  </a>
                </p>
              ))}
            </details>
            <p className="small">
              No guessed provider prices, fixed “typical” fees, unconfirmed
              bank-offer stacking, incognito tracking guarantee, AI safety
              scores or unfunded cashback. No commission is earned merely by
              displaying this desk.
            </p>
          </section>
          <div className="admin-tiles">
            <div className="admin-tile">
              <strong className="admin-tile-value">
                {data.nativeRateConnections}
              </strong>
              <span className="admin-tile-label">Connected room-rate APIs</span>
            </div>
            <div className="admin-tile">
              <strong className="admin-tile-value">
                {data.directVenueAgreementsRecorded}
              </strong>
              <span className="admin-tile-label">
                Direct venue agreements recorded
              </span>
            </div>
          </div>
          <p className="small muted">
            {data.scope} Read{" "}
            {new Date(data.assessedAt).toLocaleString("en-IN")}. Hospitality
            booking/payment collection:{" "}
            {data.nativeBookingsEnabled ? "enabled" : "not enabled"}. Paid
            services activated by this release:{" "}
            {data.paidServicesActivated ? "yes" : "none"}.
          </p>
          <div className="callout">
            <h3>What earns—and what does not</h3>
            <p>{data.promotionNote}</p>
            <p>{data.directVenueNote}</p>
            <div className="row wrap">
              <Link to="/admin?tab=campaigns">Check campaign access</Link>
              <Link to="/admin?tab=revenue">View reported earnings</Link>
              <Link to="/stays/compare">Open customer hotel comparison</Link>
              <Link to="/dining/compare">Open customer dining comparison</Link>
            </div>
          </div>
          <section className="stack">
            <h3>Provider connection gates</h3>
            {data.providers.map((p) => (
              <details className="card" key={p.id}>
                <summary>
                  <strong>{p.name}</strong> —{" "}
                  {p.allowed
                    ? "Gates satisfied"
                    : "Approval and implementation required"}
                </summary>
                <p>{p.role}</p>
                <ul>
                  {p.missing.map((m) => (
                    <li key={m}>{labels[m] || m}</li>
                  ))}
                </ul>
                <a href={p.source} target="_blank" rel="noopener noreferrer">
                  Read the provider requirements ↗
                </a>
              </details>
            ))}
          </section>
          <section className="card stack">
            <h3>Partner enquiry, ready to copy</h3>
            <p>
              No enquiry has been sent. Owner identity, legal entity, tax and
              payout information must be supplied privately after reviewing
              terms. Never send passwords or OTPs.
            </p>
            <textarea
              className="input"
              aria-label="Partner application brief"
              readOnly
              value={data.applicationBrief}
              rows={12}
            />
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(data.applicationBrief);
                  setNotice("Brief copied. Nothing was sent or accepted.");
                } catch {
                  setNotice(
                    "Copy was blocked by the browser. Select and copy the brief in the text box.",
                  );
                }
              }}
            >
              Copy partner enquiry
            </button>
            <p role="status">{notice}</p>
          </section>
        </>
      )}
      {data && (
        <section className="card stack">
          <h3>Unit economics: a scenario, not earnings</h3>
          <p>
            Enter your own assumptions. No industry commission rate is assumed.
            Forecasts are not cash receipts, realised revenue or profit; this
            calculator never writes to the earnings ledger.
          </p>
          <p className="small">
            CPC is the first model to investigate, not an activated income
            source. A direct eligible click and a visitor clicking onward on a
            partner site are different payable events. Enter your net share, not
            the advertiser’s whole payment. No own-click testing, incentivised
            clicking or automatic redirects.
          </p>
          <form
            onSubmit={calculate}
            onChange={() => setResult(null)}
            className="stack"
            noValidate
          >
            <label>
              Revenue model
              <select
                aria-label="Revenue model"
                className="input"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as HospitalityScenario["mode"]);
                  setResult(null);
                }}
              >
                <option value="cpa">CPA: validated completed stays</option>
                <option value="cpc">
                  CPC: contract-eligible direct clicks
                </option>
                <option value="cpc-referral">
                  Click-out revenue share: a second action on the partner site
                </option>
                <option value="direct">
                  Direct venue: validated fulfilled referrals
                </option>
              </select>
            </label>
            <div className="hc-form">
              <label>
                Qualified plans per month
                <input
                  className="input"
                  name="qualifiedPlans"
                  inputMode="numeric"
                  required
                />
              </label>
              <label>
                {mode === "direct"
                  ? "Request submission rate"
                  : "Outbound click-through rate"}{" "}
                (%)
                <input
                  className="input"
                  name="actionPercent"
                  inputMode="decimal"
                  required
                />
              </label>
              {mode === "cpc-referral" && (
                <label>
                  Partner-site onward click rate (%)
                  <input
                    className="input"
                    name="downstreamPercent"
                    inputMode="decimal"
                    required
                  />
                </label>
              )}
              {!mode.startsWith("cpc") && (
                <>
                  <label>
                    {mode === "direct"
                      ? "Venue confirmation rate"
                      : "Booking conversion rate"}{" "}
                    (%)
                    <input
                      className="input"
                      name="bookingPercent"
                      inputMode="decimal"
                      required
                    />
                  </label>
                  <label>
                    {mode === "direct"
                      ? "Fulfilment / attendance rate"
                      : "Completed-stay rate"}{" "}
                    (%)
                    <input
                      className="input"
                      name="completionPercent"
                      inputMode="decimal"
                      required
                    />
                  </label>
                </>
              )}
              <label>
                {mode === "cpc"
                  ? "Billable valid-click rate"
                  : "Attribution and validation acceptance rate"}{" "}
                (%)
                <input
                  className="input"
                  name="acceptancePercent"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                {mode.startsWith("cpc")
                  ? "Your net payout per accepted payable click"
                  : mode === "direct"
                    ? "Fee per validated fulfilment"
                    : "Net payout per validated stay"}{" "}
                (₹)
                <input
                  key={mode}
                  className="input"
                  name="payoutMinor"
                  inputMode="decimal"
                  required
                />
                <span className="small">
                  Contracted or hypothetical—never the hotel’s entire OTA
                  commission.
                </span>
              </label>
              <label>
                Service cost per payable event (₹)
                <input
                  className="input"
                  name="servicePerEventMinor"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Service cost per qualified plan (₹)
                <input
                  className="input"
                  name="servicePerPlanMinor"
                  inputMode="decimal"
                  required
                />
              </label>
              <label>
                Fixed monthly costs (₹)
                <input
                  className="input"
                  name="fixedCostMinor"
                  inputMode="decimal"
                  required
                />
              </label>
            </div>
            <p className="small muted">
              Include unsuccessful-visit servicing and owner time in the costs
              if you want to assess economic sustainability. Do not double-count
              the same event under CPC, CPA and a direct fee unless a contract
              explicitly permits it. Any paid activity still requires separate
              authorisation; the current operating budget remains zero.
            </p>
            {calculationError && (
              <p role="alert" className="error-text">
                {calculationError}
              </p>
            )}
            <button className="btn btn-primary" type="submit">
              Calculate this scenario
            </button>
          </form>
          {result && (
            <div className="callout" aria-live="polite">
              <h4>Modelled monthly outcome—not actual transactions</h4>
              <dl>
                <dt>
                  Expected payable events (fractional planning arithmetic)
                </dt>
                <dd>
                  {result.payableEvents.toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </dd>
                <dt>Modelled revenue before costs and taxes</dt>
                <dd>{money(result.revenueMinor)}</dd>
                <dt>Modelled variable costs</dt>
                <dd>{money(result.variableCostMinor)}</dd>
                <dt>
                  Contribution after entered costs, before taxes and unentered
                  costs
                </dt>
                <dd>{money(result.contributionMinor)}</dd>
                <dt>Variable contribution per qualified plan</dt>
                <dd>{money(result.variableContributionPerPlanMinor)}</dd>
                <dt>Break-even qualified plans at unchanged assumptions</dt>
                <dd>
                  {result.breakEvenPlans === null
                    ? "Not achievable with these unit economics"
                    : result.breakEvenPlans.toLocaleString("en-IN")}
                </dd>
              </dl>
              <p className="small">
                No guaranteed sales, traffic or attribution. Cancellation,
                validation, payout delays, taxes, refunds and changing
                acquisition/service costs can materially change the result.
                Revenue recognition and payment receipt are different.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
