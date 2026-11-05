import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fixture = JSON.parse(readFileSync("/tmp/dm-audit-fixtures.json", "utf8"));
const base = "http://127.0.0.1:5173";
const future = (n) =>
  new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const store = "dealmosaic.hospitality-quotes.v1";
let errors = [],
  external = [];
test.beforeAll(async ({ request, baseURL }) => {
  expect(baseURL).toBe(base);
  expect((await (await request.get("/api/health")).json()).environment).toBe(
    "test",
  );
});
test.beforeEach(async ({ page, context }, info) => {
  errors = [];
  external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${25 + ([...info.testId].reduce((a, c) => a + c.charCodeAt(0), 0) % 200)}`,
  });
  await page.route("**/*", (r) => {
    if (new URL(r.request().url()).origin !== base) {
      external.push(r.request().url());
      return r.abort();
    }
    return r.continue();
  });
});
test.afterEach(() => {
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
async function size(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("navigation", { name: "Explore DealMosaic" }),
  ).toHaveCount(1);
}
async function axe(page) {
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  expect(
    await page.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ),
  ).toEqual([]);
}
async function plan(page, dining = false) {
  await page
    .getByLabel(dining ? "Visit or order date" : "Arrival date", {
      exact: true,
    })
    .fill(future(3));
  await page
    .getByLabel(dining ? "Visit or order time (India)" : "Departure date", {
      exact: true,
    })
    .fill(dining ? "19:00" : future(5));
  await page
    .getByRole("button", { name: "Apply my plan", exact: true })
    .click();
}
async function entry(
  page,
  provider,
  amount = "12000",
  dining = false,
  complete = true,
) {
  const venue = page.locator(
    `[data-comparison-venue="${dining ? "qmin-ginger-jamshedpur" : "ginger-mumbai-airport"}"]`,
  );
  await venue.getByRole("button", { name: /Add a quote/ }).click();
  const editor = page.locator(".hc-editor");
  await editor.getByLabel("Who quoted this price?").fill(provider);
  await editor
    .getByLabel(
      dining
        ? "Exact meal, quantities and offer conditions"
        : "Exact room, beds and occupancy configuration",
    )
    .fill(
      dining
        ? "Two same mains and two drinks; offer eligibility confirmed"
        : "Deluxe King, same configuration",
    );
  await editor.locator("[name=baseMinor]").fill(amount);
  for (const name of [
    "extraFeesMinor",
    "onSiteMinor",
    "extrasMinor",
    "depositMinor",
    "cashbackMinor",
  ])
    await editor
      .locator(`[name=${name}]`)
      .fill(
        name === "extraFeesMinor"
          ? "500"
          : name === "depositMinor"
            ? "2000"
            : name === "cashbackMinor"
              ? "1000"
              : "0",
      );
  if (!dining)
    await editor.getByLabel("Meal inclusion").selectOption("room-only");
  await editor
    .getByLabel("Cancellation terms")
    .selectOption(dining ? "not-applicable" : "non-refundable");
  await editor.getByLabel("Payment timing").selectOption("pay-now");
  await editor
    .getByLabel("Rate or offer eligibility", { exact: true })
    .selectOption("public");
  if (complete) await editor.locator("[name=complete]").check();
  return editor;
}
async function save(page) {
  await page
    .getByRole("button", { name: "Save my quote", exact: true })
    .click();
  await expect(page.locator(".hc-editor")).toHaveCount(0);
}

test("native entry points, sourced counts, city filters, shortlist and accessible mobile layout", async ({
  page,
}) => {
  await page.goto("/stays?city=mumbai");
  await page
    .getByRole("link", { name: /Compare hotels on DealMosaic/ })
    .click();
  await expect(page.locator("h1")).toContainText("The right stay.");
  await expect(page.locator(".hc-header")).toContainText("40 selected stays");
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(2);
  await expect(
    page.getByLabel("Destination", { exact: true }).locator("option"),
  ).toHaveCount(17);
  await page
    .locator('[data-comparison-venue="ginger-mumbai-airport"]')
    .getByRole("button", { name: /Shortlist/ })
    .click();
  await expect(
    page.getByRole("region", { name: "Place shortlist" }),
  ).toContainText("Ginger Mumbai");
  await page.getByLabel("Find a place or neighbourhood").fill("no-such-venue");
  await expect(
    page.getByRole("heading", {
      name: "No match in this selected collection.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear place filters" }).click();
  await size(page);
  await axe(page);
  await page.getByRole("link", { name: "Compare dining", exact: true }).click();
  await expect(page.locator(".hc-header")).toContainText(
    "33 selected dining places",
  );
  await page
    .getByLabel("Destination", { exact: true })
    .selectOption("haridwar");
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(1);
  await expect(page.locator("[data-comparison-venue]")).toContainText(
    "The Dining Room",
  );
  await size(page);
  await axe(page);
});
test("dates, room allocation and every child age are validated before comparing", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await page
    .getByRole("button", { name: "Apply my plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Choose valid dates");
  await page.getByLabel("Arrival date", { exact: true }).fill(future(3));
  await page.getByLabel("Departure date", { exact: true }).fill(future(5));
  await page.getByLabel("Rooms needed").selectOption("2");
  await page.getByLabel("Children travelling").selectOption("1");
  await page
    .getByRole("button", { name: "Apply my plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("child ages");
  await page.getByLabel("Child 1 age").selectOption("7");
  await page
    .getByLabel("Room allocation, without names")
    .fill("Room 1: 1 adult; room 2: 1 adult and child aged 7");
  await page
    .getByRole("button", { name: "Apply my plan", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .locator('[data-comparison-venue="ginger-mumbai-airport"]')
    .getByRole("button", { name: /Add a quote/ })
    .click();
  await expect(page.locator(".hc-editor")).toContainText("children aged 7");
  await size(page);
  await axe(page);
});
test("hotel quotes persist, compare identical conditions, keep deposit and cashback separate", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  await entry(page, "Provider A");
  await save(page);
  await entry(page, "Provider B", "11000");
  await save(page);
  await expect(page.locator("[data-personal-quote]")).toHaveCount(2);
  await expect(page.locator(".hc-match")).toHaveCount(1);
  await expect(page.locator(".hc-match")).toContainText("Provider B: ₹11,500");
  await expect(page.locator(".hc-match li").first()).toContainText(
    "Lowest entered total",
  );
  await expect(page.locator("[data-personal-quote]").first()).toContainText(
    "₹14,500",
  );
  await expect(page.locator("[data-personal-quote]").first()).toContainText(
    "Possible later cashback—not deducted",
  );
  await page.reload();
  await expect(page.locator("[data-personal-quote]")).toHaveCount(2);
  await expect(page.locator(".hc-match")).toHaveCount(0);
  await plan(page);
  await expect(page.locator(".hc-match")).toHaveCount(1);
  await size(page);
  await axe(page);
});
test("unknown fees never become zero or a comparison winner; pricing filters have real effects", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  const editor = await entry(
    page,
    "Unconfirmed provider",
    "9000",
    false,
    false,
  );
  await editor.locator("[name=onSiteMinor]").fill("");
  await save(page);
  await expect(page.locator("[data-personal-quote]")).toContainText(
    "Known costs only",
  );
  await expect(page.locator(".hc-match")).toHaveCount(0);
  await entry(page, "Complete provider", "11000");
  await save(page);
  await page
    .getByLabel("Whole-stay budget (₹)", { exact: false })
    .fill("12000");
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(2);
  await page.getByLabel("Include places without a priced quote").uncheck();
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(1);
  await page
    .getByLabel("Whole-stay budget (₹)", { exact: false })
    .fill("10000");
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(0);
  await page.getByLabel("Whole-stay budget (₹)", { exact: false }).fill("");
  await expect(page.locator("[data-comparison-venue]")).toHaveCount(1);
});
test("different cancellation or payment terms cannot create an unfair winning group", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  await entry(page, "A");
  await save(page);
  const e = await entry(page, "B", "10000");
  await e.getByLabel("Payment timing").selectOption("pay-at-venue");
  await save(page);
  await expect(page.locator(".hc-match")).toHaveCount(0);
  await expect(page.locator("[data-personal-quote]")).toHaveCount(2);
});
test("storage failures keep the unsaved entry visible and never claim a successful save", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  await entry(page, "Blocked storage");
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "dealmosaic.hospitality-quotes.v1")
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, k, v);
    };
  });
  await page
    .getByRole("button", { name: "Save my quote", exact: true })
    .click();
  await expect(page.locator(".hc-editor")).toBeVisible();
  await expect(page.locator(".hc-editor")).toContainText(
    "The quote was not saved",
  );
  await expect(page.locator("[data-personal-quote]")).toHaveCount(0);
  await expect(page.getByLabel("Who quoted this price?")).toHaveValue(
    "Blocked storage",
  );
});
test("CSV export is formula-safe and deleting quotes is explicit", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  await entry(page, "=1+2");
  await save(page);
  const promise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export hotel quotes" }).click();
  const file = await promise;
  const csv = readFileSync(await file.path(), "utf8");
  expect(csv).toContain("'=1+2");
  expect(csv).toContain("Personal, not provider-verified");
  await file.delete();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Clear hotel quotes", exact: true })
    .click();
  await expect(page.locator("[data-personal-quote]")).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).quotes.length,
      store,
    ),
  ).toBe(0);
});
test("dining compares only the same occasion and never pretends to send a reservation", async ({
  page,
}) => {
  await page.goto("/dining/compare?city=jamshedpur");
  await plan(page, true);
  await entry(page, "Dining quote A", "1800", true);
  await save(page);
  await entry(page, "Dining quote B", "1700", true);
  await save(page);
  await expect(page.locator(".hc-match")).toContainText("₹2,200");
  await expect(page.locator(".hc-feedback").first()).toContainText(
    "No booking, reminder or message was sent",
  );
  await page.getByLabel("Visit or order time (India)").fill("12:00");
  await page
    .getByRole("button", { name: "Apply my plan", exact: true })
    .click();
  await expect(page.locator(".hc-match")).toHaveCount(0);
  await expect(page.locator("[data-personal-quote]")).toHaveCount(2);
  await size(page);
  await axe(page);
});
test("offline local quotes remain editable, but outside sources are not offered", async ({
  page,
  context,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  await context.setOffline(true);
  await expect(
    page.getByRole("status").filter({ hasText: "You are offline" }),
  ).toBeVisible();
  await entry(page, "Offline personal note");
  await save(page);
  await expect(page.locator("[data-personal-quote]")).toHaveCount(1);
  await page
    .locator('[data-comparison-venue="ginger-mumbai-airport"] summary')
    .click();
  await expect(
    page.locator('[data-comparison-venue="ginger-mumbai-airport"]'),
  ).toContainText("Reconnect to open the source");
  await expect(
    page.locator(
      '[data-comparison-venue="ginger-mumbai-airport"] a[target=_blank]',
    ),
  ).toHaveCount(0);
  await context.setOffline(false);
});
test("owner-only business desk has truthful gates, works on phones and calculates only hypothetical contribution", async ({
  page,
  context,
  request,
}) => {
  expect((await request.get("/api/admin/hospitality")).status()).toBe(401);
  await context.addCookies([
    {
      name: "dm_session",
      value: fixture.users.super_admin.token,
      url: base,
      httpOnly: true,
    },
  ]);
  await page.goto("/admin?tab=hospitality");
  await expect(
    page.getByRole("heading", { name: "Hospitality business desk" }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("Connected room-rate APIs");
  await expect(page.locator(".admin-tile-value").first()).toHaveText("0");
  await expect(page.getByLabel("Partner application brief")).toContainText(
    "not acceptance of a contract",
  );
  for (const [name, value] of Object.entries({
    qualifiedPlans: "1000",
    actionPercent: "30",
    bookingPercent: "5",
    completionPercent: "80",
    acceptancePercent: "90",
    payoutMinor: "300",
    servicePerEventMinor: "20",
    servicePerPlanMinor: "0",
    fixedCostMinor: "0",
  }))
    await page.locator(`[name=${name}]`).fill(value);
  await page.getByRole("button", { name: "Calculate this scenario" }).click();
  await expect(page.locator("main")).toContainText("₹3,024");
  await expect(page.locator("main")).toContainText("not actual transactions");
  await size(page);
  await axe(page);
});

test("conditional eligibility and unsaved in-site navigation are explicit", async ({
  page,
}) => {
  await page.goto("/stays/compare?city=mumbai");
  await plan(page);
  const e = await entry(page, "Conditional provider");
  await e
    .getByLabel("Rate or offer eligibility", { exact: true })
    .selectOption("conditional-confirmed");
  await page
    .getByRole("button", { name: "Save my quote", exact: true })
    .click();
  await expect(e.getByRole("alert")).toContainText("eligibility");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("link", { name: "Compare dining", exact: true }).click();
  await expect(e.getByLabel("Who quoted this price?")).toHaveValue(
    "Conditional provider",
  );
  await e
    .getByLabel("Eligibility conditions, without personal details", {
      exact: false,
    })
    .fill("Member tier A, app-only");
  await save(page);
  await entry(page, "Public provider", "13000");
  await save(page);
  await expect(page.locator(".hc-match")).toHaveCount(0);
});
