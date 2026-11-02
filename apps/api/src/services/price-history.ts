import { db } from '../db/index.js';

/**
 * PRICE HISTORY, HONESTLY.
 *
 * The site started recording snapshots on 1 November 2026. On 3 November that
 * is two days of records — and a chart labelled "last 30 days" drawn from two
 * points is a lie told with a straight face. Every shopping site in this market
 * draws that chart, because the axis is free to draw and nobody checks.
 *
 * So a window is only *renderable* when we actually hold records across it.
 * Until then the interface says what it has, when the window unlocks, and shows
 * the observations as a list of dated prices — a fact, not a trend.
 *
 * Three quantities per window:
 *
 *  - `spanDays`   — how many days separate our oldest and newest record inside
 *                   the window. This is the thing that must reach `days`.
 *  - `daysRecorded` — how many distinct days inside the window carry a record.
 *                   A gap in the middle is a different failure from youth, and
 *                   needs a different sentence.
 *  - `coverage`   — spanDays / days, 0..1.
 *
 * A window is covered when the span is within 5% of the full window and at least
 * 70% of its days carry a record. The 5% allowance exists because the first
 * snapshot lands at 19:48 rather than midnight; demanding an exact 168 hours
 * would push every unlock a day late for no reader-visible reason.
 */

export const HISTORY_WINDOWS = [7, 30, 90] as const;
export type HistoryWindowDays = (typeof HISTORY_WINDOWS)[number];

export interface HistoryPoint {
  observedAt: string;
  priceMinor: number;
  platformSlug: string;
  dataOrigin: string;
}

export interface HistoryWindow {
  days: number;
  observations: number;
  daysRecorded: number;
  spanDays: number;
  coverage: number;
  covered: boolean;
  from: string | null;
  to: string | null;
  /** Written here, not in the browser, so the API and the page cannot disagree. */
  verdict: string;
  /** The date this window becomes renderable, when we can predict it honestly. */
  unlocksOn: string | null;
  points: HistoryPoint[];
}

export interface VariantHistory {
  observations: number;
  daysRecorded: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  /** Every point we hold inside the widest window, cheapest-first per day. */
  points: HistoryPoint[];
  /** Keyed by window length in days. */
  windows: Record<string, HistoryWindow>;
}

const DAY_MS = 86_400_000;

function daysBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / DAY_MS;
}

function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * The pure part: given every point we hold for a variant, describe each window.
 * Exported so it can be tested against edge cases that a live database will not
 * produce for months — a 90-day window that is one day short, a window with a
 * hole in the middle, a variant that has never been observed.
 */
export function describeWindows(allPoints: HistoryPoint[], now = new Date()): Record<string, HistoryWindow> {
  const sorted = [...allPoints].sort((a, b) => a.observedAt.localeCompare(b.observedAt));
  const windows: Record<string, HistoryWindow> = {};

  for (const days of HISTORY_WINDOWS) {
    const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString();
    const points = sorted.filter((p) => p.observedAt >= cutoff);
    const daysRecorded = new Set(points.map((p) => isoDay(p.observedAt))).size;
    const first = points[0];
    const last = points[points.length - 1];
    const spanDays = first && last ? daysBetween(first.observedAt, last.observedAt) : 0;
    const coverage = Math.min(1, spanDays / days);

    // Youth and gaps are the same verdict to a reader ("not yet") but different
    // facts, so they get different sentences.
    /*
     * Round, not ceil. A real snapshot lands at 20:24 one day and 20:42 the next,
     * which makes a two-day record span 0.985 days — and ceil(6.015) then tells
     * the reader "needs 7 more days" when six will do. Understating by a day is a
     * smaller error than overstating one, and the unlock date carries the detail.
     */
    const needsDays = Math.max(1, Math.round(days - spanDays));
    const covered = points.length >= 2 && coverage >= 0.95 && daysRecorded >= Math.ceil(days * 0.7);

    let verdict: string;
    if (points.length === 0) {
      verdict = `Nothing recorded for this variant in the last ${days} days.`;
    } else if (points.length === 1) {
      verdict =
        `One observation so far, on ${shortDate(points[0]!.observedAt)}. ` +
        `A ${days}-day view needs records spread across the whole window, and we will not draw a line through one point.`;
    } else if (!covered && spanDays < days * 0.95) {
      verdict =
        `We hold ${daysRecorded} day${daysRecorded === 1 ? '' : 's'} of records for this variant, from ` +
        `${shortDate(first!.observedAt)} to ${shortDate(last!.observedAt)}. ` +
        `A ${days}-day view needs ${needsDays} more day${needsDays === 1 ? '' : 's'} of history.`;
    } else if (!covered) {
      verdict =
        `Only ${daysRecorded} of the last ${days} days carry a record for this variant — the window has gaps. ` +
        `Drawing it would present those gaps as stable prices.`;
    } else {
      verdict = `${daysRecorded} recorded days across the last ${days}, cheapest observation per day.`;
    }

    /**
     * An unlock date is a promise, so it is only made when waiting actually fixes
     * the problem: a young record fills in day by day, a record with holes in it
     * does not. `daysRecorded >= spanDays` is the gap-free test.
     */
    const gapFree = daysRecorded >= Math.ceil(spanDays);
    const unlocksOn =
      !covered && first && points.length >= 2 && gapFree
        ? new Date(new Date(first.observedAt).getTime() + days * DAY_MS).toISOString().slice(0, 10)
        : null;

    windows[String(days)] = {
      days,
      observations: points.length,
      daysRecorded,
      spanDays: Math.round(spanDays * 10) / 10,
      coverage: Math.round(coverage * 100) / 100,
      covered,
      from: first?.observedAt ?? null,
      to: last?.observedAt ?? null,
      verdict,
      unlocksOn,
      points,
    };
  }

  return windows;
}

/**
 * Two queries for any number of variants, not two per variant. The catalogue
 * detail endpoint asks for up to twelve at once, and twelve round trips to a
 * database in another region is a second of latency for no extra truth.
 */
export async function priceHistoryForVariants(
  variantIds: string[],
  now = new Date(),
): Promise<Record<string, VariantHistory>> {
  const out: Record<string, VariantHistory> = {};
  if (variantIds.length === 0) return out;

  const placeholders = variantIds.map(() => '?').join(',');
  const since = new Date(now.getTime() - Math.max(...HISTORY_WINDOWS) * DAY_MS).toISOString();

  const rows = (await db
    .prepare(
      `SELECT o.variant_id, s.observed_at, s.price_minor, s.data_origin, o.platform_slug
         FROM offer_snapshots s
         JOIN offers o ON o.id = s.offer_id
        WHERE o.variant_id IN (${placeholders})
          AND s.observed_at >= ?
        ORDER BY s.observed_at ASC`,
    )
    .all(...variantIds, since)) as unknown as Array<{
    variant_id: string;
    observed_at: string;
    price_minor: number;
    data_origin: string;
    platform_slug: string;
  }>;

  // One point per day per variant: the cheapest observation that day. A variant
  // sold by four shops would otherwise put four points on one date and make a
  // flat day look like a fall.
  const cheapestPerDay = new Map<string, Map<string, HistoryPoint>>();
  for (const r of rows) {
    const byDay = cheapestPerDay.get(r.variant_id) ?? new Map<string, HistoryPoint>();
    const day = isoDay(r.observed_at);
    const point: HistoryPoint = {
      observedAt: r.observed_at,
      priceMinor: r.price_minor,
      platformSlug: r.platform_slug,
      dataOrigin: r.data_origin,
    };
    const existing = byDay.get(day);
    if (!existing || point.priceMinor < existing.priceMinor) byDay.set(day, point);
    cheapestPerDay.set(r.variant_id, byDay);
  }

  for (const id of variantIds) {
    const byDay = cheapestPerDay.get(id);
    const points = byDay ? [...byDay.values()].sort((a, b) => a.observedAt.localeCompare(b.observedAt)) : [];
    out[id] = {
      observations: points.length,
      daysRecorded: points.length,
      firstObservedAt: points[0]?.observedAt ?? null,
      lastObservedAt: points[points.length - 1]?.observedAt ?? null,
      points,
      windows: describeWindows(points, now),
    };
  }

  return out;
}
