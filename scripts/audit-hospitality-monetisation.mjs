/** Read-only publisher audit. Never applies, creates/follows links, or mutates the DB. */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const key = process.env.CUELINKS_API_KEY;
if (!key) throw Error("Supply the existing publisher API token privately.");
const output =
  process.env.HOSPITALITY_AUDIT_OUTPUT ||
  "/home/user/research/our-business/monetisation-audit.json";
const report = {
  checkedAt: new Date().toISOString(),
  serverReadOnly: true,
  applicationsSubmitted: 0,
  linksFollowed: 0,
  scans: [],
};
let requested = false;
for (const type of ["CPC", "CPS"]) {
  const scan = {
    type,
    complete: false,
    pages: [],
    observed: 0,
    access: {},
    indiaListed: 0,
    indiaOpen: 0,
    relevant: [],
  };
  report.scans.push(scan);
  for (let page = 1; page <= 60; page++) {
    if (requested) await new Promise((r) => setTimeout(r, 11500));
    requested = true;
    const r = await fetch(
      `https://developers.cuelinks.com/pub_api/v3/campaigns?page=${page}&per_page=500&campaign_type=${type}`,
      {
        headers: { Authorization: `Token ${key}`, Accept: "application/json" },
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!r.ok) {
      scan.pages.push({ page, status: r.status });
      break;
    }
    const b = await r.json();
    scan.pages.push({ page, meta: b.meta });
    if (
      !Array.isArray(b.data) ||
      b.data.some((x) => x.campaign_type !== type)
    ) {
      scan.error =
        "Unexpected campaign type or response; no eligibility inferred";
      break;
    }
    for (const row of b.data) {
      scan.observed++;
      const status = row.access_status || "unknown";
      scan.access[status] = (scan.access[status] || 0) + 1;
      const india =
        Array.isArray(row.countries) &&
        row.countries.some((c) => c.iso === "IN");
      if (india) {
        scan.indiaListed++;
        if (status === "open") scan.indiaOpen++;
      }
      if (
        /hotel|tripadvisor|trivago|agoda|booking|expedia|makemytrip|goibibo|cleartrip|yatra|\boyo\b|treebo|fabhotel|stay22|hostel|dineout|eazydiner/i.test(
          row.name || "",
        ) ||
        (type === "CPC" && india)
      ) {
        const fields = [
          "id",
          "name",
          "domain",
          "access_status",
          "campaign_type",
          "payout",
          "payout_type",
          "payout_currency",
          "countries",
          "deeplink_allowed",
          "sub_ids_allowed",
          "cashback_publishers_allowed",
          "social_media_publishers_allowed",
          "missing_transactions_accepted",
          "cookie_duration",
          "reporting_type",
          "updated_at",
        ];
        scan.relevant.push(
          Object.fromEntries(fields.map((k) => [k, row[k] ?? null])),
        );
      }
    }
    console.log(
      `${type}: page ${page}/${b.meta?.total_pages}; ${scan.observed} read; India-listed/open ${scan.indiaListed}/${scan.indiaOpen}.`,
    );
    if (!b.meta?.next_page) {
      scan.complete = true;
      break;
    }
  }
}
report.finishedAt = new Date().toISOString();
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    report.scans.map(
      ({
        type,
        complete,
        observed,
        access,
        indiaListed,
        indiaOpen,
        relevant,
      }) => ({
        type,
        complete,
        observed,
        access,
        indiaListed,
        indiaOpen,
        relevant: relevant.length,
      }),
    ),
    null,
    2,
  ),
);
