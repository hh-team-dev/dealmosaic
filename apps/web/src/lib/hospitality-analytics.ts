/**
 * First-party hospitality analytics: anonymous, consent-gated, minimal.
 *
 * - Nothing is sent until the customer chooses "Allow anonymous counts".
 * - Events carry counts and fixed-vocabulary keys only. Free text (place
 *   search words, room allocation, provider names typed by the customer) is
 *   never included, so a name can never leak into an event.
 * - The session id is a random daily-rotating local value, not an account id,
 *   fingerprint or advertising id. Rotating it severs the link to past events.
 * - The server stores no IP address, user agent, account id, contact details
 *   or payment data, and deletes events after 180 days.
 */

export type HospitalityConsent = "unset" | "granted" | "denied";
const CONSENT_KEY = "dealmosaic.hospitality-analytics-consent.v1";
const SESSION_KEY = "dealmosaic.hospitality-analytics-session.v1";

export function readConsent(): HospitalityConsent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

export function writeConsent(value: "granted" | "denied"): boolean {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    if (value === "denied") {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
        // The consent choice itself is what matters.
      }
    }
    return true;
  } catch {
    return false;
  }
}

function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Random local id, rotated daily. Null when storage is unavailable. */
export function analyticsSession(): string | null {
  try {
    const day = todayIST();
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { id?: unknown; day?: unknown };
        if (parsed.day === day && typeof parsed.id === "string" && /^[0-9a-f]{24}$/.test(parsed.id))
          return parsed.id;
      } catch {
        // Fall through and mint a fresh id.
      }
    }
    const id = randomId();
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, day }));
    return id;
  } catch {
    return null;
  }
}

/** Mint a fresh id immediately, severing the link to earlier events. */
export function rotateAnalyticsSession(): boolean {
  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: randomId(), day: todayIST() }),
    );
    return true;
  } catch {
    return false;
  }
}

export type HospitalityEvent =
  | {
      type: "search";
      kind: "hotel" | "restaurant";
      city: string;
      nights: number;
      rooms: number;
      adults: number;
      children: number;
      filterKeys: string[];
    }
  | {
      type: "shortlist";
      kind: "hotel" | "restaurant";
      city: string;
      action: "add" | "remove";
      shortlistSize: number;
    }
  | {
      type: "provider";
      kind: "hotel" | "restaurant";
      city: string;
      venue: string;
      provider: string;
    }
  | {
      type: "outcome";
      kind: "hotel" | "restaurant";
      city: string;
      venue: string;
      provider: string;
      outcome: "booked" | "not-booked" | "looking";
    }
  | { type: "quote"; kind: "hotel" | "restaurant"; city: string };

const CITY = /^[a-z0-9-]{2,32}$/;
const VENUE = /^[a-z0-9-]{2,80}$/;
const PROVIDER = /^[a-z]{2,12}$/;
const FILTER_KEY = /^[a-z]{2,12}$/;

function clean(e: HospitalityEvent): HospitalityEvent | null {
  if (e.kind !== "hotel" && e.kind !== "restaurant") return null;
  if (!CITY.test(e.city)) return null;
  switch (e.type) {
    case "search": {
      const ints = [e.nights, e.rooms, e.adults, e.children].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 60,
      );
      if (!ints || !Array.isArray(e.filterKeys) || e.filterKeys.length > 20)
        return null;
      const keys = [...new Set(e.filterKeys)].filter((k) => FILTER_KEY.test(k));
      if (keys.length !== e.filterKeys.length) return null;
      return { ...e, filterKeys: keys };
    }
    case "shortlist":
      if (e.action !== "add" && e.action !== "remove") return null;
      return Number.isInteger(e.shortlistSize) &&
        e.shortlistSize >= 0 &&
        e.shortlistSize <= 4
        ? e
        : null;
    case "provider":
      return VENUE.test(e.venue) && PROVIDER.test(e.provider) ? e : null;
    case "outcome":
      return VENUE.test(e.venue) &&
        PROVIDER.test(e.provider) &&
        ["booked", "not-booked", "looking"].includes(e.outcome)
        ? e
        : null;
    case "quote":
      return e;
    default:
      return null;
  }
}

let queue: HospitalityEvent[] = [];
let scheduled = false;

function flush() {
  scheduled = false;
  if (!queue.length || readConsent() !== "granted") {
    queue = [];
    return;
  }
  const session = analyticsSession();
  if (!session) {
    queue = [];
    return;
  }
  const body = JSON.stringify({ session, events: queue.slice(0, 10) });
  queue = [];
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/hospitality-events", blob)) return;
    }
    void fetch("/api/hospitality-events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics must never surface an error to the customer.
    });
  } catch {
    // Storage, beacon and network failures are all silent here.
  }
}

/** Fire-and-forget. Never throws, never blocks, never sends without consent. */
export function trackHospitality(event: HospitalityEvent): void {
  try {
    const valid = clean(event);
    if (!valid || readConsent() !== "granted") return;
    queue.push(valid);
    if (queue.length > 10) queue = queue.slice(-10);
    if (!scheduled) {
      scheduled = true;
      setTimeout(flush, 1200);
    }
  } catch {
    // Analytics is best-effort by design.
  }
}
