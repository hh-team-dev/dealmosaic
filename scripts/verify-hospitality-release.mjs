/** Production verification is server-read-only. Personal note exercises use only
 * isolated browser storage; all server mutations and external destinations are blocked. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium, webkit } from "@playwright/test";
const origin = process.env.VERIFY_ORIGIN || "https://dealmosaic.pages.dev";
const expectedEnvironment = process.env.VERIFY_ENVIRONMENT || "production";
const receipt =
  process.env.VERIFY_RECEIPT ||
  "docs/source/2026-11-05-hospitality-production-verification.json";
assert.ok(
  expectedEnvironment === "production" || process.env.VERIFY_RECEIPT,
  "Local runs require a separate receipt path",
);
const expected = JSON.parse(
  readFileSync("apps/web/dist/pwa-release.json", "utf8"),
);
const report = {
  checkedAt: new Date().toISOString(),
  origin,
  serverReadOnly: true,
  isolatedBrowserNotesOnly: true,
  checks: [],
  browsers: [],
  externalBlocked: [],
  mutationsBlocked: [],
};
const check = (name, ok) => {
  assert.ok(ok, name);
  report.checks.push(name);
};
const get = (path) =>
  fetch(origin + path, {
    redirect: "manual",
    headers: { "cache-control": "no-cache" },
    signal: AbortSignal.timeout(45000),
  });
const health = await (await get("/api/health")).json();
report.api = {
  version: health.version,
  revision: health.revision,
  environment: health.environment,
};
check(
  "Production API has release version",
  health.version === expected.version &&
    health.environment === expectedEnvironment,
);
const release = await (await get("/pwa-release.json")).json();
report.web = {
  version: release.version,
  build: release.build,
  mode: release.mode,
};
check(
  "Web is exact tested PWA artifact",
  release.build === expected.build && release.mode === "pwa",
);
for (const path of [
  "/stays/compare",
  "/dining/compare",
  "/stays/compare?city=siliguri",
  "/admin?tab=hospitality",
]) {
  const r = await get(path);
  const html = await r.text();
  check(
    "Neutral, private-data-free shell " + path,
    r.status === 200 &&
      html.includes("Your DealMosaic page") &&
      !html.includes("Good deals. Clearer choices."),
  );
  check(
    "Noindex/no-store " + path,
    /noindex/.test(r.headers.get("x-robots-tag") || "") &&
      /no-store/.test(r.headers.get("cache-control") || ""),
  );
}
check(
  "Unknown comparison subroute remains 404",
  (await get("/stays/compare/not-a-route")).status === 404,
);
for (const path of [
  "/api/admin/hospitality",
  "/api/admin/campaigns",
  "/api/me/notifications",
])
  check("Anonymous API denial " + path, (await get(path)).status === 401);
for (const path of ["/privacy", "/terms", "/how-we-rank", "/data-sources"]) {
  const body = await (await get(path)).text();
  check(
    "Static hospitality disclosure " + path,
    /personal (?:hospitality )?quote|personal comparisons/i.test(body),
  );
}
const catalogue = await (await get("/api/catalogue/products?limit=200")).json();
check(
  "Existing 25-product catalogue retained",
  catalogue.products.length === 25,
);
for (const product of catalogue.products) {
  const html = await (
    await get("/p/" + encodeURIComponent(product.slug))
  ).text();
  check(
    "No unsupported prerendered price/rating " + product.slug,
    !/"@type"\s*:\s*"(?:Offer|AggregateOffer|AggregateRating)"/.test(html),
  );
}
const axe = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
for (const [name, engine] of [
  ["chromium", chromium],
  ["webkit", webkit],
]) {
  const browser = await engine.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      serviceWorkers: "block",
      reducedMotion: "reduce",
    });
    await context.route("**/*", (r) => {
      const req = r.request();
      const u = new URL(req.url());
      if (u.origin !== origin) {
        report.externalBlocked.push(u.hostname);
        return r.abort();
      }
      if (
        !["GET", "HEAD"].includes(req.method()) ||
        u.pathname.startsWith("/api/go/")
      ) {
        report.mutationsBlocked.push(req.method() + " " + u.pathname);
        return r.abort();
      }
      return r.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [path, count, title] of [
      ["/stays/compare?city=mumbai", "40 selected stays", "The right stay."],
      [
        "/dining/compare?city=jamshedpur",
        "33 selected dining places",
        "Your next table.",
      ],
    ]) {
      const response = await page.goto(origin + path, {
        waitUntil: "domcontentloaded",
      });
      check(name + " deep route HTTP 200 " + path, response.status() === 200);
      await page.locator("h1").filter({ hasText: title }).waitFor();
      check(
        name + " sourced count " + path,
        (await page.locator(".hc-header").innerText()).includes(count),
      );
      check(
        name + " explicit personal not live provenance " + path,
        (await page.locator(".hc-header").innerText()).includes(
          "not a live price feed",
        ),
      );
      await page.addScriptTag({ content: axe });
      const state = await page.evaluate(async () => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        violations: (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations.map((v) => v.id),
      }));
      check(
        name + " mobile layout and accessibility " + path,
        !state.overflow && !state.violations.length,
      );
    }
    await page.goto(origin + "/stays/compare?city=mumbai");
    await page
      .getByLabel("Arrival date", { exact: true })
      .fill(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    await page
      .getByLabel("Departure date", { exact: true })
      .fill(new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10));
    await page
      .getByRole("button", { name: "Apply my plan", exact: true })
      .click();
    await page
      .locator('[data-comparison-venue="ginger-mumbai-airport"]')
      .getByRole("button", { name: /Add a quote/ })
      .click();
    const form = page.locator(".hc-editor");
    await form
      .getByLabel("Who quoted this price?")
      .fill("Local release check — not a supplier quote");
    await form
      .getByLabel("Exact room, beds and occupancy configuration")
      .fill("Isolated browser validation only");
    await form.locator("[name=baseMinor]").fill("100");
    for (const key of [
      "extraFeesMinor",
      "onSiteMinor",
      "extrasMinor",
      "depositMinor",
      "cashbackMinor",
    ])
      await form.locator(`[name=${key}]`).fill("0");
    await form.getByLabel("Meal inclusion").selectOption("room-only");
    await form.getByLabel("Cancellation terms").selectOption("non-refundable");
    await form.getByLabel("Payment timing").selectOption("pay-now");
    await form
      .getByLabel("Rate or offer eligibility", { exact: true })
      .selectOption("public");
    await form.locator("[name=complete]").check();
    await form
      .getByRole("button", { name: "Save my quote", exact: true })
      .click();
    await page.locator("[data-personal-quote]").waitFor();
    check(
      name + " local quote saved without server mutation",
      (await page.locator("[data-personal-quote]").count()) === 1,
    );
    await page.reload();
    await page.locator("[data-personal-quote]").waitFor();
    check(name + " local quote survives reload", true);
    await page.evaluate(() =>
      localStorage.removeItem("dealmosaic.hospitality-quotes.v1"),
    );
    check(name + " no browser exception", errors.length === 0);
    report.browsers.push({ engine: name, errors, localNotesDeleted: true });
  } finally {
    await browser.close();
  }
}
check(
  "No external provider/affiliate navigation attempted",
  report.externalBlocked.length === 0,
);
check(
  "No API mutation or affiliate click attempted",
  report.mutationsBlocked.length === 0,
);
writeFileSync(receipt, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      checksPassed: report.checks.length,
      api: report.api,
      web: report.web,
      browsers: report.browsers,
      mutations: report.mutationsBlocked.length,
      external: report.externalBlocked.length,
    },
    null,
    2,
  ),
);
