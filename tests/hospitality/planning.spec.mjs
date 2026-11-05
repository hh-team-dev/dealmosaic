import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const labels = [
  "Stay, all nights and rooms",
  "Food and dining",
  "Transport, including getting there",
  "Activities",
  "Other non-refundable costs",
];
let errors = [],
  mutations = [],
  external = [];
test.beforeEach(async ({ page }) => {
  errors = [];
  mutations = [];
  external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (r) => {
    const q = r.request();
    if (new URL(q.url()).origin !== "http://127.0.0.1:5173") {
      external.push(q.url());
      return r.abort();
    }
    if (!["GET", "HEAD"].includes(q.method())) {
      mutations.push(q.url());
      return r.abort();
    }
    return r.continue();
  });
  await page.goto("/stays/plan?city=siliguri");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Plan the whole trip",
  );
});
test.afterEach(() => {
  expect(errors).toEqual([]);
  expect(mutations).toEqual([]);
  expect(external).toEqual([]);
});
async function fillBudget(page) {
  for (const [i, label] of labels.entries()) {
    await page
      .getByLabel("Plan A: " + label, { exact: true })
      .fill(["9000", "2700", "600", "1200", "0"][i]);
    await page
      .getByLabel("Plan B: " + label, { exact: true })
      .fill(["7500", "3600", "1800", "1500", "0"][i]);
  }
  await page.getByLabel("Both plans cover").check();
}
test("whole-trip arithmetic, blanks, stale output and clearing", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Compare trip budgets" }).click();
  await expect(page.getByRole("alert")).toContainText("Confirm");
  await fillBudget(page);
  await page.getByRole("button", { name: "Compare trip budgets" }).click();
  await expect(page.locator("#trip-budget")).toContainText("₹13,500");
  await expect(page.locator("#trip-budget")).toContainText(
    "Plan A has the lower entered budget by ₹900",
  );
  await page.getByLabel("Plan A: " + labels[0], { exact: true }).fill("");
  await expect(page.locator("#trip-budget .sp-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Compare trip budgets" }).click();
  await expect(page.getByRole("alert")).toContainText("Blank means unknown");
  await page
    .getByRole("button", { name: "Clear all planning figures" })
    .click();
  await expect(
    page.getByLabel("Plan B: " + labels[0], { exact: true }),
  ).toHaveValue("");
});
test("rebooking includes cancellation loss and cash gap; validates refund", async ({
  page,
}) => {
  for (const [label, value] of [
    ["Original full-stay total", "10000"],
    ["Already paid for the original stay", "6000"],
    ["Expected cash refund on cancellation", "5000"],
    ["Replacement full-stay total", "8000"],
    ["Additional cancellation fee not already withheld", "200"],
  ])
    await page.getByLabel(label, { exact: true }).fill(value);
  await page.getByLabel("I checked matching").check();
  await page.getByRole("button", { name: "Check rebooking costs" }).click();
  await expect(page.locator("#rebooking-check")).toContainText("₹9,200");
  await expect(page.locator("#rebooking-check")).toContainText("₹800.");
  await expect(page.locator("#rebooking-check")).toContainText("₹8,200");
  await page
    .getByLabel("Expected cash refund on cancellation", { exact: true })
    .fill("7000");
  await expect(page.locator("#rebooking-check .sp-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Check rebooking costs" }).click();
  await expect(page.getByRole("alert")).toContainText("cannot exceed");
});
test("all nine checklists and clipboard denial have usable fallback", async ({
  page,
}) => {
  await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(
    "siliguri",
  );
  for (const need of [
    "general",
    "family",
    "access",
    "attendant",
    "group",
    "pilgrimage",
    "work",
    "policy",
    "pets",
  ]) {
    await page.getByLabel("Your stay needs").selectOption(need);
    await expect(
      page.getByLabel("Stay questions to review and copy"),
    ).toContainText("Siliguri");
    await expect(
      page.getByLabel("Stay questions to review and copy"),
    ).toContainText("not a booking");
  }
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw Error("blocked");
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy stay questions" }).click();
  await expect(
    page.getByText("Copy is unavailable in this browser.", { exact: false }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download questions" }).click();
  expect((await download).suggestedFilename()).toBe(
    "dealmosaic-stay-questions.txt",
  );
});
test("copy exports checklist only, does not persist or send figures", async ({
  page,
}) => {
  await fillBudget(page);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (t) => {
          window.copied = t;
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy stay questions" }).click();
  const copied = await page.evaluate(() => window.copied);
  expect(copied).toContain("Stay questions");
  expect(copied).not.toContain("9000");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((x) => /plan|budget|rebook/.test(x)),
    ),
  ).toEqual([]);
  await page.reload();
  await expect(
    page.getByLabel("Plan A: " + labels[0], { exact: true }),
  ).toHaveValue("");
});
test("all internal destinations resolve and retain city where applicable", async ({
  page,
}) => {
  const links = await page
    .locator(".sp-page a[href]")
    .evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  for (const href of links.filter((h) => h.startsWith("#")))
    expect(await page.locator(href).count()).toBe(1);
  for (const href of links.filter((h) => !h.startsWith("#"))) {
    await page.goto(href);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Page not found", { exact: true })).toHaveCount(
      0,
    );
  }
  await page.goto("/stays?city=siliguri");
  await page
    .getByRole("link", { name: "Plan the whole trip: budget & stay questions" })
    .click();
  await expect(page).toHaveURL(/stays\/plan\?city=siliguri/);
  await page.waitForLoadState("networkidle");
});
test("narrow-screen accessibility and no horizontal overflow", async ({
  page,
}) => {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
  const violations = await page.evaluate(async () =>
    (
      await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
      })
    ).violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  );
  expect(violations).toEqual([]);
});
