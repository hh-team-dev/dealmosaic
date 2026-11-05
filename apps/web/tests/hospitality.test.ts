import { describe, it, expect } from "vitest";
import {
  CITIES,
  FOOD_BRANDS,
  LOCAL_DINING_TYPES,
  localDiningSearch,
  brandCitySearch,
  cityById,
  dateValid,
  nightsBetween,
  indiaToday,
  validateStay,
  bookingSearch,
  hotelDirectory,
  moneyInput,
  diningTotal,
  hospitalityCoupon,
  type StayPlan,
} from "../src/lib/hospitality";
import type { CouponView } from "../src/lib/coupons-api";
import { readFileSync } from "node:fs";
const plan: StayPlan = {
  city: "delhi-ncr",
  area: "Gurugram",
  checkin: "2026-11-05",
  checkout: "2026-11-07",
  adults: 2,
  rooms: 1,
  ages: [],
};
const today = "2026-11-04";
const now = Date.parse(today + "T12:00:00Z");
const coupon = (extra: Partial<CouponView> = {}) =>
  ({
    id: "test-only",
    title: "Provider-listed hotel promotion",
    platformSlug: "itc-hotels",
    outboundUrl: "https://example.test",
    trustState: "listed",
    expiresAt: "2026-11-10T23:59:59Z",
    startsAt: null,
    ...extra,
  }) as CouponView;
describe("hospitality directory and truthful scope", () => {
  it("has the 18 agreed destination choices without duplicate Hyderabad", () =>
    expect(CITIES.map((c) => c.name)).toEqual([
      "Delhi NCR",
      "Mumbai",
      "Bengaluru",
      "Chennai",
      "Hyderabad",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Jaipur",
      "Mysuru (Mysore)",
      "Bhubaneswar",
      "Visakhapatnam (Vizag)",
      "Jamshedpur",
      "Siliguri",
      "Haridwar",
      "Gurugram (Gurgaon)",
      "Noida",
      "Vijayawada",
    ]));
  it("unknown city input has a safe known fallback", () =>
    expect(cityById("javascript:alert(1)")).toBe(CITIES[0]));
  it("has all eight named chains including Chinese Wok", () =>
    expect(FOOD_BRANDS.map((b) => b.id)).toEqual(
      expect.arrayContaining([
        "kfc",
        "mcdonalds",
        "dominos",
        "pizza-hut",
        "wow-momo",
        "mainland-china",
        "chinese-wok",
        "taco-bell",
      ]),
    ));
  it("directory links are HTTPS without tracking or invented branch IDs", () => {
    for (const b of FOOD_BRANDS)
      for (const href of [b.site, b.locator, b.order].filter(Boolean)) {
        const u = new URL(href!);
        expect(u.protocol).toBe("https:");
        expect(u.search).toBe("");
      }
    for (const c of CITIES)
      expect(hotelDirectory(c)).toMatch(
        /^https:\/\/www.makemytrip.com\/hotels\/[a-z]+-hotels.html$/,
      );
  });
  it("adds only two canonical entry pages, no thin city pages", () => {
    const seo = readFileSync("scripts/generate-seo.mjs", "utf8");
    expect(seo).toContain("path: '/stays'");
    expect(seo).toContain("path: '/dining'");
    expect(seo).not.toMatch(/path: '\/(stays|dining)\//);
  });
});
describe("stay search validation", () => {
  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "abc", "2026-1-01"])(
    "rejects impossible date %s",
    (v) => expect(dateValid(v)).toBe(false),
  );
  it("accepts leap days and computes full days without DST dependence", () => {
    expect(dateValid("2028-02-29")).toBe(true);
    expect(nightsBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
  it("uses India midnight for date boundaries", () =>
    expect(indiaToday(new Date("2026-11-04T19:00:00Z"))).toBe("2026-11-05"));
  it("rejects past, reversed, zero-night and unsupported long stays", () => {
    for (const edit of [
      { checkin: "2026-11-03" },
      { checkout: "2026-11-05" },
      { checkout: "2026-11-04" },
      { checkout: "2026-12-20" },
    ])
      expect(validateStay({ ...plan, ...edit }, today)).not.toBeNull();
  });
  it("rejects unknown city and area", () => {
    expect(validateStay({ ...plan, city: "unknown" }, today)).not.toBeNull();
    expect(validateStay({ ...plan, area: "<script>" }, today)).not.toBeNull();
  });
  it("requires all child ages, allows zero and never silently assumes ages", () => {
    for (const ages of [[""], ["18"], ["-1"], ["2.4"], ["NaN"]])
      expect(validateStay({ ...plan, ages }, today)).not.toBeNull();
    expect(validateStay({ ...plan, ages: ["0", "17"] }, today)).toBeNull();
  });
  it("bounds adults, rooms and children", () => {
    for (const edit of [
      { adults: 0 },
      { adults: 9 },
      { adults: 1.5 },
      { rooms: 0 },
      { rooms: 5 },
      { ages: ["1", "2", "3", "4", "5"] },
    ])
      expect(validateStay({ ...plan, ...edit }, today)).not.toBeNull();
  });
  it("encodes accurate dates, occupancy, ages and NCR locality into official search", () => {
    const url = new URL(bookingSearch({ ...plan, ages: ["0", "12"] }, today));
    expect(url.hostname).toBe("www.booking.com");
    expect(url.searchParams.get("ss")).toBe("Gurugram, India");
    expect(url.searchParams.get("checkin")).toBe(plan.checkin);
    expect(url.searchParams.get("checkout")).toBe(plan.checkout);
    expect(url.searchParams.get("group_children")).toBe("2");
    expect(url.searchParams.getAll("age")).toEqual(["0", "12"]);
    expect(url.searchParams.get("selected_currency")).toBe("INR");
  });
  it("will not construct a usable search for invalid input", () =>
    expect(() => bookingSearch({ ...plan, checkout: "" }, today)).toThrow());
  it.each(CITIES)("maps $name without arbitrary user-controlled URLs", (city) =>
    expect(
      new URL(
        bookingSearch({ ...plan, city: city.id }, today),
      ).searchParams.get("ss"),
    ).toBe(city.id === "delhi-ncr" ? "Gurugram, India" : city.query),
  );
});
describe("entered money, not live prices", () => {
  it.each([
    "-1",
    "1e8",
    "NaN",
    "Infinity",
    "1.001",
    "1000000.01",
    "₹200",
    "1,000",
  ])("rejects ambiguous or unsafe money %s", (v) =>
    expect(moneyInput(v)).toBeNull(),
  );
  it("handles paise and optional zero without floating-point totals", () => {
    expect(moneyInput("12.34")).toBe(1234);
    expect(moneyInput("")).toBeNull();
    expect(moneyInput("", true)).toBe(0);
    expect(moneyInput("1000000")).toBe(100000000);
  });
  const input = {
    eligible: "2000",
    excluded: "300",
    fees: "100",
    percent: "25",
    cap: "200",
    minimum: "1000",
  };
  it("applies the cap only to eligible items and excludes fees from the discount", () =>
    expect(diningTotal(input)).toEqual({
      saving: 20000,
      total: 220000,
      belowMinimum: false,
    }));
  it("does not apply a discount below the entered minimum", () =>
    expect(diningTotal({ ...input, minimum: "2500" })).toEqual({
      saving: 0,
      total: 240000,
      belowMinimum: true,
    }));
  it("distinguishes an explicit zero cap from an unspecified cap", () => {
    expect(diningTotal({ ...input, cap: "0" })?.saving).toBe(0);
    expect(diningTotal({ ...input, cap: "" })?.saving).toBe(50000);
  });
  it("cannot return a negative bill or invent cashback", () =>
    expect(diningTotal({ ...input, percent: "100", cap: "" })).toEqual({
      saving: 200000,
      total: 40000,
      belowMinimum: false,
    }));
  it.each(["101", "-1", "", "0.001", "NaN"])(
    "rejects invalid percentage %s",
    (percent) => expect(diningTotal({ ...input, percent })).toBeNull(),
  );
});
describe("strict hospitality feed boundary", () => {
  it("accepts current known Indian hotel-group/provider listings, not verified claims", () =>
    expect(hospitalityCoupon(coupon(), "stays", undefined, now)).toBe(true));
  it.each([
    "boat",
    "r-for-rabbit",
    "firstcry",
    "anantara",
    "klook",
    "trip-com",
  ])("rejects broad or misclassified travel merchant %s", (platformSlug) =>
    expect(
      hospitalityCoupon(coupon({ platformSlug }), "stays", undefined, now),
    ).toBe(false),
  );
  it.each([null, "not-a-date", "2026-11-03T12:00:00Z"])(
    "withholds unknown/invalid/expired validity %s",
    (expiresAt) =>
      expect(
        hospitalityCoupon(coupon({ expiresAt }), "stays", undefined, now),
      ).toBe(false),
  );
  it("withholds future and malformed start dates", () => {
    for (const startsAt of ["2026-11-09", "bad"])
      expect(
        hospitalityCoupon(coupon({ startsAt }), "stays", undefined, now),
      ).toBe(false);
  });
  it("rejects hidden, rejected or destinationless rows", () => {
    expect(
      hospitalityCoupon(
        coupon({ trustState: "rejected" }),
        "stays",
        undefined,
        now,
      ),
    ).toBe(false);
    expect(
      hospitalityCoupon(coupon({ outboundUrl: null }), "stays", undefined, now),
    ).toBe(false);
  });
  it("matches an exact selected dining merchant, not a grocery brand mentioning chicken", () => {
    expect(
      hospitalityCoupon(
        coupon({ platformSlug: "kfc" }),
        "dining",
        FOOD_BRANDS[0],
        now,
      ),
    ).toBe(true);
    expect(
      hospitalityCoupon(
        coupon({ platformSlug: "grocery", title: "KFC-style food" }),
        "dining",
        FOOD_BRANDS[0],
        now,
      ),
    ).toBe(false);
    expect(
      hospitalityCoupon(
        coupon({ platformSlug: "kfc" }),
        "dining",
        undefined,
        now,
      ),
    ).toBe(false);
  });
});

describe("expanded destinations and local dining", () => {
  it("keeps identifiers unique and Hyderabad single while exposing NCR subcities", () => {
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(18);
    expect(CITIES.filter((c) => c.id === "hyderabad")).toHaveLength(1);
    for (const id of ["delhi-ncr", "gurugram", "noida"])
      expect(cityById(id).id).toBe(id);
  });
  it.each([
    ["mysore", "mysuru"],
    ["bhubaneshwar", "bhubaneswar"],
    ["vizag", "visakhapatnam"],
    ["gurgaon", "gurugram"],
  ])("recognises %s links as %s", (alias, id) =>
    expect(cityById(alias).id).toBe(id),
  );
  it("keeps Siliguri explicitly in West Bengal", () =>
    expect(cityById("siliguri").query).toContain("West Bengal"));
  it.each(CITIES)(
    "builds all four local searches and every chain search for $name",
    (city) => {
      const destination =
        city.id === "delhi-ncr" ? "Delhi NCR, India" : city.query;
      for (const category of LOCAL_DINING_TYPES) {
        const u = new URL(localDiningSearch(city, category.id));
        expect(u.origin).toBe("https://www.google.com");
        expect(u.pathname).toBe("/maps/search/");
        expect(u.searchParams.get("api")).toBe("1");
        expect(u.searchParams.get("query")).toBe(
          `${category.query} in ${destination}`,
        );
        expect(u.searchParams.has("key")).toBe(false);
      }
      for (const brand of FOOD_BRANDS) {
        const u = new URL(brandCitySearch(city, brand));
        expect(u.searchParams.get("query")).toBe(
          `${brand.name} in ${destination}`,
        );
      }
    },
  );
  it("encodes search input as query text, never as a new URL", () => {
    const u = new URL(
      localDiningSearch(
        cityById("siliguri"),
        "restaurants",
        "https://evil.test/?a=1&b=2 <script>",
      ),
    );
    expect(u.origin).toBe("https://www.google.com");
    expect(u.searchParams.get("query")).toContain(
      "https://evil.test/?a=1&b=2 <script> restaurants in Siliguri, West Bengal, India",
    );
    expect([...u.searchParams.keys()]).toEqual(["api", "query"]);
  });
  it("bounds refinements and falls back to the actual restaurants category", () => {
    const u = new URL(
      localDiningSearch(cityById("mysuru"), "invalid", "x".repeat(500)),
    );
    expect(u.href.length).toBeLessThan(2048);
    expect(u.searchParams.get("query")).toBe(
      "x".repeat(100) + " restaurants in Mysuru, Karnataka, India",
    );
  });
  it("rejects unlisted cities and brands", () => {
    expect(() =>
      localDiningSearch({ ...CITIES[0]!, id: "not-listed" }),
    ).toThrow();
    expect(() =>
      brandCitySearch(CITIES[0]!, { ...FOOD_BRANDS[0]!, id: "not-listed" }),
    ).toThrow();
  });
  it("uses the same destination data for frontend and prerender", () => {
    const html = readFileSync("scripts/prerender.mjs", "utf8");
    expect(html).toContain("apps/web/src/data/hospitality-cities.json");
    expect(html).toContain("esc(HOSPITALITY_NAMES)");
  });
});
