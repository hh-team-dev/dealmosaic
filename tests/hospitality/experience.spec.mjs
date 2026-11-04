import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const fixtures = JSON.parse(
  readFileSync("/tmp/dm-audit-fixtures.json", "utf8"),
);
const dock = (p) => p.getByRole("navigation", { name: "Explore DealMosaic" });
let errors = [];
test.beforeAll(async ({ request, baseURL }) => {
  expect(baseURL).toBe("http://127.0.0.1:5173");
  expect((await (await request.get("/api/health")).json()).environment).toBe(
    "test",
  );
});
test.beforeEach(async ({ page, context }, info) => {
  errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.setExtraHTTPHeaders({
    "x-forwarded-for": `198.51.100.${20 + ([...info.testId].reduce((s, c) => s + c.charCodeAt(0), 0) % 220)}`,
  });
});
test.afterEach(() => expect(errors).toEqual([]));
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
async function geometry(page) {
  await expect(dock(page)).toHaveCount(1);
  await expect(page.locator(".bottom-nav")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    ),
  ).toBe(false);
  const r = await dock(page).boundingBox(),
    height = await page.evaluate(() => innerHeight);
  expect(r.y + r.height).toBeLessThanOrEqual(height + 1);
  for (const l of await dock(page).getByRole("link").all()) {
    const box = await l.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
}
function future(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
async function mockFeed(page, rows) {
  const r = await page.request.get("/api/coupons?limit=1");
  const body = await r.json();
  await page.route("**/api/coupons?*", (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("limit") !== "200") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...body,
        coupons: rows.map((x) => ({
          ...body.coupons[0],
          id: "local-only-" + x.platformSlug,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          outboundUrl: "https://example.test/offer",
          startsAt: null,
          ...x,
        })),
      }),
    });
  });
}

test("one global switcher on all route families, top and bottom; no hospitality auto-open", async ({
  page,
  context,
}) => {
  for (const path of [
    "/",
    "/deals",
    "/browse",
    "/saved",
    "/privacy",
    "/login",
    "/install",
    "/handcrafted",
    "/buy/" + fixtures.productId,
    "/not-a-real-page",
    "/stays",
    "/dining",
  ]) {
    await page.goto(path);
    await expect(
      dock(page).getByRole("link", { name: "Hotels", exact: true }),
    ).toBeVisible();
    await geometry(page);
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await geometry(page);
    if (!["/stays", "/dining"].includes(path))
      await expect(page.locator(".hospitality")).toHaveCount(0);
  }
  await context.addCookies([
    {
      name: "dm_session",
      value: fixtures.users.super_admin.token,
      url: "http://127.0.0.1:5173",
      httpOnly: true,
    },
  ]);
  for (const path of ["/admin?tab=shop", "/app/settings"]) {
    await page.goto(path);
    await expect(dock(page)).toBeVisible();
    await geometry(page);
  }
});

test("distinct warm pages, one h1, original illustrations, canonical and accessibility", async ({
  page,
}) => {
  for (const path of ["/stays", "/dining"]) {
    await page.goto(path + "?city=jaipur");
    await expect(page.locator(".hospitality")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByLabel("City region")).toHaveValue("jaipur");
    expect(await page.locator("link[rel=canonical]").getAttribute("href")).toBe(
      "http://127.0.0.1:5173" + path,
    );
    await expect(page.locator(".hospitality-art")).toBeVisible();
    await geometry(page);
    await axe(page);
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await geometry(page);
    await expect(
      dock(page).getByRole("link", {
        name: path === "/stays" ? "Hotels" : "Dining",
        exact: true,
      }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("all nine cities change context and provider guide without claiming inventory", async ({
  page,
}) => {
  await page.goto("/stays");
  const cities = [
    "delhi-ncr",
    "mumbai",
    "bengaluru",
    "chennai",
    "hyderabad",
    "kolkata",
    "pune",
    "ahmedabad",
    "jaipur",
  ];
  await expect(page.getByLabel("City region").locator("option")).toHaveCount(9);
  for (const city of cities) {
    await page.getByLabel("City region").selectOption(city);
    await expect(page).toHaveURL(new RegExp("city=" + city));
    await expect(page.locator(".hospitality-coverage")).toContainText(
      "not confirmation",
    );
    await expect(
      page.getByRole("link", { name: /Open city hotel guide/ }),
    ).toHaveAttribute("href", /makemytrip.com\/hotels\/[a-z]+-hotels.html/);
  }
  await page.goto("/stays?city=unknown");
  await expect(page.getByLabel("City region")).toHaveValue("delhi-ncr");
});

test("date and child-age validation precedes a precise external search; no automatic booking", async ({
  page,
}) => {
  await page.goto("/stays");
  await page.getByRole("button", { name: "Prepare my hotel search" }).click();
  await expect(page.getByRole("alert")).toContainText("valid arrival");
  await page.getByLabel("Check-in", { exact: true }).fill(future(2));
  await page.getByLabel("Check-out", { exact: true }).fill(future(4));
  await page
    .getByRole("combobox", { name: "Children", exact: true })
    .selectOption("2");
  await page.getByRole("button", { name: "Prepare my hotel search" }).click();
  await expect(page.getByRole("alert")).toContainText("age of each child");
  await page.getByLabel("Child 1 age").selectOption("0");
  await page.getByLabel("Child 2 age").selectOption("12");
  await page.getByLabel("NCR destination").selectOption("Noida");
  await page.getByRole("button", { name: "Prepare my hotel search" }).click();
  const a = page.getByRole("link", {
    name: /Search these dates on Booking.com/,
  });
  await expect(a).toBeVisible();
  const url = new URL(await a.getAttribute("href"));
  expect(url.searchParams.get("ss")).toBe("Noida, India");
  expect(url.searchParams.get("checkin")).toBe(future(2));
  expect(url.searchParams.getAll("age")).toEqual(["0", "12"]);
  await expect(a).toHaveAttribute("rel", "noopener noreferrer");
  await page.getByLabel("Check-out", { exact: true }).fill(future(5));
  await expect(a).toHaveCount(0);
  await geometry(page);
  await axe(page);
});

test("strict hotel promotions exclude misclassified goods, unknown validity and future offers", async ({
  page,
}) => {
  await mockFeed(page, [
    {
      platformSlug: "itc-hotels",
      platformName: "ITC Hotels",
      title: "Isolated eligible hotel offer",
    },
    { platformSlug: "boat", title: "Misclassified electronics offer" },
    {
      platformSlug: "cleartrip-hotels",
      title: "Unknown validity hotel offer",
      expiresAt: null,
    },
    {
      platformSlug: "itc-hotels",
      title: "Future hotel offer",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ]);
  await page.goto("/stays");
  await expect(page.locator(".hospitality-offer")).toHaveCount(1);
  await expect(page.locator(".hospitality-offer")).toContainText(
    "provider listed",
  );
  await expect(page.locator(".hospitality-offer")).toContainText(
    "Not checkout-tested",
  );
  await expect(page.locator(".hospitality-offer a")).toHaveAttribute(
    "href",
    /\/api\/go\/local-only-itc-hotels\?src=hospitality-stays/,
  );
  await expect(page.locator(".hospitality-offer a")).toHaveAttribute(
    "rel",
    /sponsored/,
  );
  await page.locator(".hospitality-offer summary").click();
  await expect(page.locator(".hospitality-offer")).toContainText(
    "Full eligibility",
  );
  await axe(page);
});

test("entered hotel totals include mandatory extras and reset after edits", async ({
  page,
}) => {
  await page.goto("/stays");
  await page.getByLabel("Quote A: entire stay room cost").fill("8000");
  await page.getByLabel("Quote A: extra mandatory charges").fill("1200");
  await page.getByLabel("Quote B: entire stay room cost").fill("8500");
  await page.getByLabel("Quote B: extra mandatory charges").fill("300");
  await page.getByRole("button", { name: "Compare entered totals" }).click();
  await expect(page.locator(".hospitality-calculation-result")).toContainText(
    "Quote B is ₹400 lower",
  );
  await page.getByLabel("Quote B: extra mandatory charges").fill("800");
  await expect(page.locator(".hospitality-calculation-result")).toHaveCount(0);
});

test("all requested food chains are discoverable; filters and reset work", async ({
  page,
}) => {
  await page.goto("/dining?city=mumbai");
  await expect(page.locator(".hospitality-brand-card")).toHaveCount(9);
  for (const name of [
    "KFC",
    "McDonald’s",
    "Domino’s",
    "Pizza Hut",
    "Wow! Momo",
    "Mainland China",
    "Chinese Wok",
    "Taco Bell",
  ])
    await expect(
      page
        .locator(".hospitality-brand-card")
        .getByRole("heading", { name, exact: true }),
    ).toHaveCount(1);
  await page.getByLabel("Find a brand or cuisine").fill("momos");
  await expect(page.locator(".hospitality-brand-card")).toHaveCount(1);
  await expect(page.locator(".hospitality-brand-card")).toContainText(
    "Wow! Momo",
  );
  await page
    .getByRole("combobox", { name: "Experience", exact: true })
    .selectOption("Restaurant");
  await expect(
    page.getByRole("button", { name: "Reset brand filters" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset brand filters" }).click();
  await expect(page.locator(".hospitality-brand-card")).toHaveCount(9);
  await page
    .getByRole("combobox", { name: "Choose a brand", exact: true })
    .selectOption("chinese-wok");
  await expect(page).toHaveURL(/brand=chinese-wok/);
  await expect(page.locator(".hospitality-brand-card")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Your plan", exact: true })
    .selectOption("delivery");
  await expect(page.locator(".hospitality-brand-card a")).toHaveAttribute(
    "href",
    "https://www.thechinesewok.com/order-now",
  );
  await expect(page.locator(".hospitality-brand-card a")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
  await axe(page);
});

test("dining discount caps, excluded items, taxes and minimum bill are explicit", async ({
  page,
}) => {
  await page.goto("/dining");
  for (const [name, value] of [
    ["Eligible food amount", "2000"],
    ["Discount (%)", "25"],
    ["Discount cap", "200"],
    ["Minimum eligible spend", "1000"],
    ["Excluded items", "300"],
    ["Final taxes & fees", "100"],
  ])
    await page.getByLabel(name, { exact: false }).fill(value);
  await page.getByRole("button", { name: "Calculate my bill" }).click();
  await expect(page.locator(".hospitality-calculation-result")).toContainText(
    "₹2,200",
  );
  await expect(page.locator(".hospitality-calculation-result")).toContainText(
    "₹200",
  );
  await page.getByLabel("Minimum eligible spend").fill("2500");
  await page.getByRole("button", { name: "Calculate my bill" }).click();
  await expect(page.locator(".hospitality-calculation-result")).toContainText(
    "₹2,400",
  );
  await expect(page.locator(".hospitality-calculation-result")).toContainText(
    "minimum spend is not met",
  );
});

test("offer-feed error has a real retry; absence is not a claim of no provider offers", async ({
  page,
}) => {
  let fail = true;
  await page.route("**/api/coupons?*", (r) =>
    new URL(r.request().url()).searchParams.get("limit") === "200" && fail
      ? r.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"error":"unavailable"}',
        })
      : r.continue(),
  );
  await page.goto("/stays");
  await expect(
    page.getByRole("button", { name: "Retry offer feed" }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Retry offer feed" }).click();
  await expect(
    page.getByText("No matching current codes to display", { exact: false }),
  ).toBeVisible();
});

test("navigation protects unfinished account and hospitality forms", async ({
  page,
}) => {
  for (const path of ["/login", "/stays"]) {
    await page.goto(path);
    if (path === "/login")
      await page.locator("input[type=email]").fill("unsent@example.test");
    else await page.getByLabel("Quote A: entire stay room cost").fill("5000");
    page.once("dialog", (d) => d.dismiss());
    await dock(page).getByRole("link", { name: "Dining", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(path + "$"));
    page.once("dialog", (d) => d.accept());
    await dock(page).getByRole("link", { name: "Dining", exact: true }).click();
    await expect(page).toHaveURL(/\/dining$/);
  }
});

test("offline suppresses current offers and external provider actions", async ({
  page,
  context,
}) => {
  await page.goto("/dining");
  await expect(page.locator(".hospitality-brand-card")).toHaveCount(9);
  await context.setOffline(true);
  await expect(page.locator(".hospitality-brand-card a")).toHaveCount(0);
  await expect(page.locator(".hospitality-offer")).toHaveCount(0);
  await expect(
    page.getByText("Reconnect to check current offers.", { exact: false }),
  ).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await geometry(page);
});

test("city sharing excludes travel details and calculator values", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.__copied = text;
        },
      },
    });
  });
  await page.goto("/stays?city=pune");
  await page.getByLabel("Check-in", { exact: true }).fill(future(2));
  await page.getByLabel("Quote A: entire stay room cost").fill("9000");
  await page.getByRole("button", { name: "Copy city link" }).click();
  expect(await page.evaluate(() => window.__copied)).toBe(
    "http://127.0.0.1:5173/stays?city=pune",
  );
});

test("city context follows the direct Hotels–Dining switch without storing guest data", async ({
  page,
}) => {
  await page.goto("/stays?city=jaipur");
  await dock(page).getByRole("link", { name: "Dining", exact: true }).click();
  await expect(page).toHaveURL(/dining\?city=jaipur$/);
  await expect(page.getByLabel("City region")).toHaveValue("jaipur");
  await dock(page).getByRole("link", { name: "Hotels", exact: true }).click();
  await expect(page).toHaveURL(/stays\?city=jaipur$/);
});

test("expiry removes a displayed hotel offer without navigation", async ({
  page,
}) => {
  await mockFeed(page, [
    {
      platformSlug: "itc-hotels",
      platformName: "ITC Hotels",
      title: "Local expiring hotel offer",
      expiresAt: new Date(Date.now() + 5000).toISOString(),
    },
  ]);
  await page.goto("/stays");
  await expect(page.locator(".hospitality-offer")).toHaveCount(1);
  await expect(page.locator(".hospitality-offer")).toHaveCount(0, {
    timeout: 8000,
  });
  await expect(
    page.getByText("No matching current codes to display", { exact: false }),
  ).toBeVisible();
});

test("malformed successful feed is an error, not a fabricated empty result", async ({
  page,
}) => {
  await page.route("**/api/coupons?*", (r) =>
    new URL(r.request().url()).searchParams.get("limit") === "200"
      ? r.fulfill({
          status: 200,
          contentType: "application/json",
          body: '{"coupons":[null]}',
        })
      : r.continue(),
  );
  await page.goto("/stays");
  await expect(
    page.getByRole("button", { name: "Retry offer feed" }),
  ).toBeVisible();
  await expect(
    page.getByText("No matching current codes to display", { exact: false }),
  ).toHaveCount(0);
});
