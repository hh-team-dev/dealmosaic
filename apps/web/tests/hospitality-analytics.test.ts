import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyticsSession,
  readConsent,
  rotateAnalyticsSession,
  trackHospitality,
  writeConsent,
} from "../src/lib/hospitality-analytics";

const store = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
};

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-05T12:00:00Z"));
  vi.stubGlobal("localStorage", store());
  vi.stubGlobal("navigator", {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("hospitality analytics consent", () => {
  it("starts unset, records allow/deny, and clears identity on deny", () => {
    expect(readConsent()).toBe("unset");
    expect(writeConsent("granted")).toBe(true);
    expect(readConsent()).toBe("granted");
    const id = analyticsSession();
    expect(id).toMatch(/^[0-9a-f]{24}$/);
    expect(analyticsSession()).toBe(id);
    expect(writeConsent("denied")).toBe(true);
    expect(readConsent()).toBe("denied");
  });

  it("rotates the anonymous session id daily and on demand", () => {
    writeConsent("granted");
    const first = analyticsSession();
    vi.setSystemTime(new Date("2026-11-06T12:00:00Z"));
    const second = analyticsSession();
    expect(second).toMatch(/^[0-9a-f]{24}$/);
    expect(second).not.toBe(first);
    expect(rotateAnalyticsSession()).toBe(true);
    expect(analyticsSession()).not.toBe(second);
  });

  it("survives blocked storage without throwing", () => {
    vi.stubGlobal(
      "localStorage",
      {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    );
    expect(readConsent()).toBe("unset");
    expect(writeConsent("granted")).toBe(false);
    expect(analyticsSession()).toBeNull();
    expect(() =>
      trackHospitality({ type: "quote", kind: "hotel", city: "mumbai" }),
    ).not.toThrow();
  });
});

describe("trackHospitality", () => {
  it("sends nothing without consent", () => {
    trackHospitality({ type: "quote", kind: "hotel", city: "mumbai" });
    vi.runAllTimers();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends consented counts to the same-origin endpoint only", () => {
    writeConsent("granted");
    trackHospitality({
      type: "search",
      kind: "hotel",
      city: "mumbai",
      nights: 2,
      rooms: 1,
      adults: 2,
      children: 0,
      filterKeys: ["budget", "pet"],
    });
    vi.runAllTimers();
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit & { body: string },
    ];
    expect(url).toBe("/api/hospitality-events");
    const body = JSON.parse(init.body);
    expect(body.session).toMatch(/^[0-9a-f]{24}$/);
    expect(body.events).toHaveLength(1);
    expect(JSON.stringify(body)).not.toMatch(/rooming|provider name|Taj Lake/i);
  });

  it("drops malformed events instead of sending them", () => {
    writeConsent("granted");
    trackHospitality({
      type: "search",
      kind: "hotel",
      city: "mumbai'; DROP TABLE hospitality_events;--",
      nights: 2,
      rooms: 1,
      adults: 2,
      children: 0,
      filterKeys: ["budget"],
    });
    trackHospitality({
      type: "provider",
      kind: "hotel",
      city: "mumbai",
      venue: "ginger-mumbai-airport",
      provider: "booking-evil<script>",
    });
    vi.runAllTimers();
    expect(fetch).not.toHaveBeenCalled();
  });
});
