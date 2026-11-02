import { describe, expect, it } from 'vitest';
import { HISTORY_WINDOWS, describeWindows, type HistoryPoint } from '../src/services/price-history.js';

/**
 * THE LINE WE REFUSE TO DRAW.
 *
 * These tests exist because the failure mode here is invisible: a chart drawn from
 * two points looks exactly as convincing as one drawn from ninety. Nothing throws,
 * nothing logs, the page looks better than the honest version. The only defence is
 * a rule written down and tested.
 */

const NOW = new Date('2026-11-03T12:00:00.000Z');
const DAY = 86_400_000;

/** `count` daily observations ending today, at a stable price. */
function dailyPoints(count: number, priceMinor = 19900): HistoryPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    observedAt: new Date(NOW.getTime() - (count - 1 - i) * DAY).toISOString(),
    priceMinor,
    platformSlug: 'zepto',
    dataOrigin: 'live',
  }));
}

describe('describeWindows', () => {
  it('refuses every window when nothing has been recorded', () => {
    const windows = describeWindows([], NOW);
    for (const days of HISTORY_WINDOWS) {
      const w = windows[String(days)]!;
      expect(w.covered).toBe(false);
      expect(w.observations).toBe(0);
      expect(w.verdict).toContain('Nothing recorded');
      expect(w.unlocksOn).toBeNull();
    }
  });

  it('refuses to draw a line through a single observation', () => {
    const windows = describeWindows(dailyPoints(1), NOW);
    const w = windows['7']!;
    expect(w.covered).toBe(false);
    expect(w.observations).toBe(1);
    expect(w.verdict).toContain('One observation');
    expect(w.points).toHaveLength(1);
  });

  it('says exactly how many days are missing, and when the window unlocks', () => {
    // Two days of records, asking for seven: five days short.
    const points = dailyPoints(2);
    const w = describeWindows(points, NOW)['7']!;
    expect(w.covered).toBe(false);
    expect(w.daysRecorded).toBe(2);
    expect(w.spanDays).toBe(1);
    expect(w.verdict).toContain('needs 6 more days');
    expect(w.unlocksOn).toBe(new Date(new Date(points[0]!.observedAt).getTime() + 7 * DAY).toISOString().slice(0, 10));
  });

  it('does not overstate the shortfall when snapshots land at different clock times', () => {
    // Real snapshots drift by minutes, so a two-day record spans 0.985 days.
    const points: HistoryPoint[] = [
      { observedAt: new Date(NOW.getTime() - DAY - 18 * 60_000).toISOString(), priceMinor: 19900, platformSlug: 'zepto', dataOrigin: 'live' },
      { observedAt: new Date(NOW.getTime()).toISOString(), priceMinor: 19900, platformSlug: 'zepto', dataOrigin: 'live' },
    ];
    const w = describeWindows(points, NOW)['7']!;
    expect(w.covered).toBe(false);
    expect(w.verdict).toContain('needs 6 more days');
    expect(w.verdict).not.toContain('needs 7 more days');
  });

  it('covers a window only when the records span it', () => {
    // Eight daily records span seven days, which is what a "7-day" view claims.
    const seven = describeWindows(dailyPoints(8), NOW);
    expect(seven['7']!.covered).toBe(true);
    expect(seven['30']!.covered).toBe(false);
    expect(seven['90']!.covered).toBe(false);

    // The verdict flips to a statement of fact, not an apology.
    expect(seven['7']!.verdict).toContain('8 recorded days');
  });

  it('covers 30 and 90 days once there are 90 days of records', () => {
    const windows = describeWindows(dailyPoints(91), NOW);
    expect(windows['7']!.covered).toBe(true);
    expect(windows['30']!.covered).toBe(true);
    expect(windows['90']!.covered).toBe(true);
    expect(windows['90']!.coverage).toBe(1);
  });

  it('rejects a window with holes rather than drawing the gaps as stable prices', () => {
    // 30 days of span, but only five days recorded: the shape of a sync that keeps
    // dying, which would render as a flat month.
    const points = [0, 7, 14, 21, 29].map((d) => ({
      observedAt: new Date(NOW.getTime() - d * DAY).toISOString(),
      priceMinor: 19900,
      platformSlug: 'zepto',
      dataOrigin: 'live',
    }));
    const w = describeWindows(points, NOW)['30']!;
    expect(w.covered).toBe(false);
    expect(w.daysRecorded).toBe(5);
    expect(w.spanDays).toBe(29);
    expect(w.verdict).toContain('gaps');
    // A gap is not fixable by waiting, so no unlock date is promised.
    expect(w.unlocksOn).toBeNull();
  });

  it('ignores records older than the window', () => {
    const old: HistoryPoint = {
      observedAt: new Date(NOW.getTime() - 200 * DAY).toISOString(),
      priceMinor: 15000,
      platformSlug: 'blinkit',
      dataOrigin: 'live',
    };
    const windows = describeWindows([old, ...dailyPoints(2)], NOW);
    expect(windows['90']!.observations).toBe(2);
    expect(windows['90']!.points).not.toContainEqual(old);
  });

  it('never reports coverage above 1, however old the records are', () => {
    const windows = describeWindows(dailyPoints(200), NOW);
    for (const days of HISTORY_WINDOWS) {
      const w = windows[String(days)]!;
      expect(w.coverage).toBeLessThanOrEqual(1);
      expect(w.coverage).toBe(1);
    }
  });

  it('treats an unsorted feed of points the same as a sorted one', () => {
    const points = dailyPoints(10);
    const shuffled = [points[3]!, points[0]!, points[9]!, points[1]!, points[5]!, points[2]!, points[4]!, points[6]!, points[8]!, points[7]!];
    const a = describeWindows(points, NOW)['7']!;
    const b = describeWindows(shuffled, NOW)['7']!;
    expect(b.covered).toBe(true);
    expect(b.spanDays).toBe(a.spanDays);
    expect(b.points.map((p) => p.observedAt)).toEqual(a.points.map((p) => p.observedAt));
  });

  it('is exactly one day short of the mark, not rounded into a pass', () => {
    // Seven daily records span six days: 0.857 coverage of the window, refused.
    const w = describeWindows(dailyPoints(7), NOW)['7']!;
    expect(w.coverage).toBeLessThan(0.95);
    expect(w.covered).toBe(false);
    expect(w.verdict).toContain('1 more day');
  });
});
