import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../lib/api";

type Campaign = {
  countries?: Array<{ iso: string; name: string }> | null;
  subIds?: boolean | null;
  cashback?: boolean | null;
  social?: boolean | null;
  missingTransactions?: boolean | null;
  reportingType?: string | null;
  id: number;
  name: string;
  domain: string | null;
  access: string | null;
  type: string | null;
  payout: string | number | null;
  currency: string | null;
  payoutType: string | null;
  cookie: string | null;
  deepLink: boolean | null;
  checkedAt: string | null;
  liveOffers: number;
  heldOffers: number;
  clicks30: number;
};
type Inventory = {
  source: "cache" | "network";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  fetchedAt: string;
  summary: {
    total: number;
    oldest: string | null;
    newest: string | null;
    open: number;
    pending: number;
    notApplied: number;
  } | null;
  rows: Campaign[];
};
const moment = (s: string | null) =>
  s && Number.isFinite(Date.parse(s))
    ? new Date(s).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not recorded";
const action = (c: Campaign) =>
  c.access === "pending"
    ? "Check the approval request with the network. Do not budget earnings from this status."
    : c.access !== "open"
      ? "Review the campaign terms and approval requirements before promoting it."
      : !c.liveOffers
        ? "No currently eligible linked offer is in our feed. Review the merchant terms and available promotions; do not invent a discount."
        : !c.clicks30
          ? "Offers are present but have no recorded clicks in 30 days. Review relevance, placement and the destination."
          : "Reconcile these clicks with the network’s transaction report. A click does not establish a sale or a payable commission.";

export default function CampaignInventory() {
  const [mode, setMode] = useState<"cache" | "network">(() =>
    new URLSearchParams(window.location.search).get("inventory") === "network"
      ? "network"
      : "cache",
  );
  const [campaignType, setCampaignType] = useState(() =>
    new URLSearchParams(window.location.search).get("campaignType") === "CPC"
      ? "CPC"
      : "",
  );
  const [page, setPage] = useState(1);
  const [jump, setJump] = useState("1");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [access, setAccess] = useState("");
  const [coverage, setCoverage] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<Inventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);
    setJump(String(page));
    const params = new URLSearchParams({
      page: String(page),
      q: query,
      access,
      coverage,
      campaignType,
    });
    apiRequest<Inventory>(
      `/api/admin/campaigns${mode === "network" ? "/network" : ""}?${params}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Inventory could not load.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [mode, page, query, access, coverage, campaignType, attempt]);
  return (
    <section className="stack stack-lg" aria-labelledby="campaigns-heading">
      <header>
        <h2 id="campaigns-heading" className="h3">
          Campaign inventory
        </h2>
        <p className="small">
          Find gaps between available campaigns, the offers we publish and
          recorded traffic. This view is read-only: nothing here applies for a
          campaign or activates a promotion.
        </p>
        <div className="row wrap">
          <button
            className={`btn ${mode === "cache" ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={mode === "cache"}
            onClick={() => {
              setMode("cache");
              setPage(1);
            }}
          >
            Search cached campaigns
          </button>
          <button
            className={`btn ${mode === "network" ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={mode === "network"}
            onClick={() => {
              setMode("network");
              setPage(1);
            }}
          >
            Browse live API inventory
          </button>
        </div>
      </header>
      <label>
        Campaign payment model
        <select
          className="input"
          value={campaignType}
          onChange={(e) => {
            setCampaignType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All available types</option>
          <option value="CPC">CPC — eligible clicks</option>
          <option value="CPS">CPS — network-labelled conversions</option>
        </select>
      </label>
      <p className="small muted">
        A CPC listing is not an approved earning link. Confirm active status,
        allowed country, website/PWA placement, payable event, attribution and
        validation in the current campaign terms. EPC is a historical
        performance measure, not a promised rate per tap. Some qualified-click
        campaigns are labelled CPS; inspect the actual payable-event terms, not
        only this filter.
      </p>
      {mode === "cache" ? (
        <form
          className="card stack"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft.trim());
            setPage(1);
            setAttempt((n) => n + 1);
          }}
        >
          <label>
            Search cached name, domain or campaign ID
            <input
              className="input"
              value={draft}
              maxLength={100}
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
          <div className="row wrap">
            <label>
              Access status
              <select
                className="input"
                value={access}
                onChange={(e) => {
                  setAccess(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                <option value="open">Open / approved</option>
                <option value="pending">Pending</option>
                <option value="not_applied">Not applied</option>
                <option value="other">Other / unknown</option>
              </select>
            </label>
            <label>
              Offer coverage
              <select
                className="input"
                value={coverage}
                onChange={(e) => {
                  setCoverage(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Any coverage</option>
                <option value="with">With current linked offers</option>
                <option value="without">No current linked offers</option>
              </select>
            </label>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              Search inventory
            </button>
          </div>
          <p className="tiny muted">
            This searches our local campaign cache, primarily CPS campaigns. It
            is not the entire network. Status can change; check each row’s
            timestamp. Use the live API view for all campaign types and fresh
            access status.
          </p>
        </form>
      ) : (
        <div className="callout">
          <strong>Live network inventory, one payment model at a time</strong>
          <p className="small">
            This is the publisher API’s live inventory, including non-purchase
            campaign types. It is not a list of approved promotions. Up to 100
            rows per page; use the page number to browse. The API does not
            provide reliable name search, so global search remains limited to
            our cache. Live reads are rate-limited; wait a minute if asked.
          </p>
        </div>
      )}
      {loading && <p role="status">Loading campaign inventory…</p>}
      {error && (
        <div className="callout callout-danger" role="alert">
          <p>{error}</p>
          <button
            className="btn btn-primary"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry inventory
          </button>
        </div>
      )}
      {data && (
        <>
          {data.summary && (
            <div className="admin-tiles">
              {[
                [data.summary.total, "Cached campaigns"],
                [data.summary.open ?? 0, "Open / approved"],
                [data.summary.pending ?? 0, "Pending"],
                [data.summary.notApplied ?? 0, "Not applied"],
              ].map(([n, label]) => (
                <div className="admin-tile" key={label}>
                  <strong className="admin-tile-value">
                    {Number(n).toLocaleString("en-IN")}
                  </strong>
                  <span className="admin-tile-label">{label}</span>
                </div>
              ))}
            </div>
          )}
          <p className="small">
            <strong>
              {data.total.toLocaleString("en-IN")}{" "}
              {mode === "network"
                ? "campaigns reported by the API"
                : "matching cached campaigns"}
            </strong>{" "}
            · page {data.page} of {data.totalPages}.
            {data.summary
              ? ` Cache timestamps range from ${moment(data.summary.oldest)} to ${moment(data.summary.newest)}.`
              : ` Read ${moment(data.fetchedAt)}.`}
          </p>
          <div className="callout">
            <strong>Access is not revenue</strong>
            <p className="small">
              Open means the network reports access, not that every click earns.
              Payout conditions, campaign type, eligible transactions and
              validation still apply. Clicks below are DealMosaic’s last 30
              days, mapped through offer records; they are not the network’s
              click count or unique shoppers, and include repeat taps and owner
              testing. Per-campaign sales and realised commission are not
              supplied by this inventory endpoint.
            </p>
            <Link to="/admin?tab=revenue">
              Open earnings and transaction totals
            </Link>
          </div>
          {data.rows.length === 0 && (
            <p>
              No campaigns match these filters. Clear the filters or use the
              live API inventory.
            </p>
          )}
          <div className="stack">
            {data.rows.map((c) => (
              <details className="card campaign-row" key={c.id}>
                <summary>
                  <strong>{c.name}</strong>{" "}
                  <span className="badge badge-neutral">
                    {c.access ?? "Unknown access"}
                  </span>
                  <span className="tiny muted">
                    {" "}
                    #{c.id} · {c.type ?? "Type unknown"} · {c.liveOffers}{" "}
                    current offers · {c.clicks30} clicks
                  </span>
                </summary>
                <p className="small">
                  Domain: {c.domain ?? "Not supplied"}
                  <br />
                  Status checked: {moment(c.checkedAt)}
                </p>
                <dl className="small">
                  <dt>Published payout, not realised earnings</dt>
                  <dd>
                    {c.payout === null
                      ? "Not supplied"
                      : `${c.payout} · ${c.currency ?? "currency not supplied"} · ${c.payoutType ?? "unit/basis not cached — check live network terms"}`}
                  </dd>
                  <dt>Cookie window</dt>
                  <dd>{c.cookie ?? "Not supplied"}</dd>
                  <dt>Deeplinks allowed</dt>
                  <dd>
                    {c.deepLink === null
                      ? "Unknown"
                      : c.deepLink
                        ? "Yes, subject to campaign terms"
                        : "No"}
                  </dd>
                  <dt>Countries supplied by the network</dt>
                  <dd>
                    {!c.countries?.length
                      ? "Unknown / not supplied — confirm before promoting"
                      : c.countries
                          .map((x) => `${x.name} (${x.iso})`)
                          .join(", ")}
                  </dd>
                  <dt>India listed as an eligible country</dt>
                  <dd>
                    {!c.countries?.length
                      ? "Unknown"
                      : c.countries.some((x) => x.iso === "IN")
                        ? "Yes — still confirm traffic and booking-country rules"
                        : "No — do not assume India eligibility"}
                  </dd>
                  <dt>Sub-ID tracking / cashback / social promotion</dt>
                  <dd>
                    {[c.subIds, c.cashback, c.social]
                      .map((v) =>
                        v === true
                          ? "Allowed subject to terms"
                          : v === false
                            ? "Not allowed"
                            : "Unknown",
                      )
                      .join(" / ")}
                  </dd>
                  <dt>Missing-transaction claims</dt>
                  <dd>
                    {c.missingTransactions === true
                      ? "Accepted subject to terms"
                      : c.missingTransactions === false
                        ? "Not accepted by this campaign"
                        : "Unknown"}
                  </dd>
                  <dt>Network reporting type</dt>
                  <dd>{c.reportingType || "Unknown"}</dd>
                  <dt>Offers held for review</dt>
                  <dd>{c.heldOffers}</dd>
                </dl>
                <p className="small">
                  <strong>Next action:</strong> {action(c)}
                </p>
                <Link to="/admin?tab=coupons">
                  Review published and held coupons
                </Link>
              </details>
            ))}
          </div>
          <form
            className="row wrap"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(jump);
              if (Number.isInteger(n) && n >= 1 && n <= data.totalPages)
                setPage(n);
            }}
          >
            <button
              className="btn btn-ghost"
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((n) => n - 1)}
            >
              Previous page
            </button>
            <label>
              Page{" "}
              <input
                className="input"
                type="number"
                min={1}
                max={data.totalPages}
                value={jump}
                onChange={(e) => setJump(e.target.value)}
                style={{ maxWidth: 100 }}
              />
            </label>
            <button className="btn btn-ghost" disabled={loading}>
              Go to page
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={page >= data.totalPages || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Next page
            </button>
            <button
              className="btn btn-quiet"
              type="button"
              disabled={loading}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Refresh this page
            </button>
          </form>
        </>
      )}
    </section>
  );
}
