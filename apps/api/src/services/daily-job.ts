import { db, nowIso } from '../db/index.js';
import { recordDailySnapshots } from './snapshots.js';
import { runAlerts } from './alerts.js';
import { syncCampaigns } from './affiliate-campaigns.js';
import { runSavedDigests } from './saved-digest.js';
import { syncAffiliateOffers } from './affiliate-sync.js';
import * as cuelinks from '../lib/cuelinks.js';

/**
 * THE DAILY JOB THAT SCHEDULES ITSELF.
 *
 * Why not a cron? Three routes were tried and only one was free *and* reliable:
 *
 *   1. **GitHub Actions `schedule`** — documented in this repo as never firing on
 *      a quiet repository. Abandoned for that reason.
 *   2. **A second Cloudflare Cron Trigger** — the right answer, except the
 *      Cloudflare token in use has Pages permission and not Workers, so the
 *      worker cannot be updated from here. That is an owner action, not a
 *      blocker worth weeks: see docs/25 §8.
 *   3. **Piggyback on the keep-alive ping** — the worker that exists *today*
 *      calls `/api/health` every five minutes, and Render's free tier keeps the
 *      service awake for it. If the API knows when it last did its daily work,
 *      a health ping is as good as a cron: the job runs within five minutes of
 *      being due, for free, with no new account.
 *
 * Option 3 is what runs now. The cost of the trick is honesty: the work is
 * tracked in `job_runs`, so "did the daily job run?" is a query, not a hope.
 *
 * Two properties are load-bearing:
 *  - **It never blocks a health check.** A health endpoint that waits 25 seconds
 *    for a feed sync is a health endpoint that reports the service as down.
 *  - **It cannot overlap with itself.** The claim is a conditional UPDATE, so
 *    two simultaneous pings cannot both start a run.
 */

const JOB = 'daily-maintenance';
const DUE_AFTER_MS = 20 * 60 * 60 * 1000; // 20 h, so a missed ping still lands today
const STALE_CLAIM_MS = 2 * 60 * 60 * 1000; // a claim older than 2 h is a dead run

let inFlight = false;

export async function ensureJobTable(): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS job_runs (
      name             TEXT PRIMARY KEY,
      last_started_at  TEXT,
      last_finished_at TEXT,
      last_ok          INTEGER,
      last_result      TEXT
    );
  `);
}

export interface JobStatus {
  due: boolean;
  lastStartedAt: string | null;
  lastFinishedAt: string | null;
  lastOk: boolean | null;
  lastResult: string | null;
}

export async function dailyJobStatus(): Promise<JobStatus> {
  await ensureJobTable();
  const row = (await db.prepare('SELECT * FROM job_runs WHERE name = ?').get(JOB)) as
    | { last_started_at: string | null; last_finished_at: string | null; last_ok: number | null; last_result: string | null }
    | undefined;
  const last = row?.last_finished_at ?? row?.last_started_at ?? null;
  const due = !last || Date.now() - new Date(last).getTime() > DUE_AFTER_MS;
  return {
    due,
    lastStartedAt: row?.last_started_at ?? null,
    lastFinishedAt: row?.last_finished_at ?? null,
    lastOk: row?.last_ok === null || row?.last_ok === undefined ? null : row.last_ok === 1,
    lastResult: row?.last_result ?? null,
  };
}

/**
 * Claims the run, then does it. Safe to call on every health check.
 * Returns immediately when a run is in progress or not due.
 */
export async function maybeRunDaily(): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const status = await dailyJobStatus();
    if (!status.due) return;

    // Conditional claim: one writer wins, the others see a fresh timestamp and
    // walk away. This is the only concurrency control the job needs.
    const claim = await db
      .prepare(
        `INSERT INTO job_runs (name, last_started_at) VALUES (?, ?)
         ON CONFLICT(name) DO UPDATE SET last_started_at = excluded.last_started_at
         WHERE job_runs.last_finished_at IS NULL
            OR julianday('now') - julianday(job_runs.last_finished_at) > 20.0/24.0
            OR julianday('now') - julianday(job_runs.last_started_at) > 2.0/24.0`,
      )
      .run(JOB, nowIso());
    if (claim.changes === 0) return;

    await runDailyNow('self-scheduled');
  } catch (err) {
    // A scheduling failure must never surface as a failed health check.
    console.error(`[daily] scheduling failed: ${(err as Error).message}`);
  } finally {
    inFlight = false;
  }
}

/** The actual work. Also callable directly by `POST /api/maintenance/daily`. */
export async function runDailyNow(_source: string): Promise<{
  ok: boolean;
  tookMs: number;
  steps: Array<Record<string, unknown>>;
}> {
  await ensureJobTable();
  const started = Date.now();
  const steps: Array<Record<string, unknown>> = [];

  // 1. Refresh the affiliate feed. The deal wall is the front page; a stale feed
  //    is a stale front page, and an expired offer that still looks live is
  //    worse than no offer at all.
  let ok = true;
  if (cuelinks.isConfigured()) {
    try {
      const sync = await syncAffiliateOffers(40);
      ok = ok && sync.ok;
      steps.push({ step: 'affiliate', ok: sync.ok, seen: sync.seen, inserted: sync.inserted, updated: sync.updated });
    } catch (err) {
      ok = false;
      steps.push({ step: 'affiliate', ok: false, error: (err as Error).message });
    }
  }

  // 2. Record today's prices. Before the alerts, so every promise has a record.
  try {
    const snapshots = await recordDailySnapshots();
    steps.push({ step: 'snapshots', ok: true, ...snapshots });
  } catch (err) {
    ok = false;
    steps.push({ step: 'snapshots', ok: false, error: (err as Error).message });
  }

  // 3. Send the alerts that genuinely triggered.
  try {
    const alerts = await runAlerts();
    steps.push({
      step: 'alerts',
      ok: true,
      checked: alerts.checked,
      skipped: alerts.skipped,
      fired: alerts.triggered.length,
      emailed: alerts.triggered.filter((t) => t.sent).length,
    });
  } catch (err) {
    ok = false;
    steps.push({ step: 'alerts', ok: false, error: (err as Error).message });
  }

  /**
   * 4. Refresh affiliate approval status — weekly, not daily.
   *
   * Campaign approval changes when a network reviews an application, which is a
   * matter of weeks. Re-pulling 1,884 campaigns every day would burn 19 throttled
   * requests for information that did not change, so it runs at most once every
   * six days. It is last because it is the least urgent step and the slowest.
   */
  if (cuelinks.isConfigured()) {
    try {
      const last = (await db
        .prepare('SELECT MAX(synced_at) AS last FROM affiliate_campaigns')
        .get()) as { last: string | null } | undefined;
      const ageMs = last?.last ? Date.now() - new Date(last.last).getTime() : Number.POSITIVE_INFINITY;
      if (ageMs > 6 * 86_400_000) {
        const camps = await syncCampaigns(20);
        steps.push({
          step: 'campaigns',
          ok: camps.ok,
          seen: camps.seen,
          earning: camps.joined,
          pending: camps.pending,
          pages: camps.pages,
          errors: camps.errors,
        });
      } else {
        steps.push({ step: 'campaigns', ok: true, skipped: 'fresh', lastSyncedAt: last?.last ?? null });
      }
    } catch (err) {
      steps.push({ step: 'campaigns', ok: false, error: (err as Error).message });
    }
  }

  /**
   * 5. The weekly saved-deal nudge.
   *
   * Runs daily and decides for itself who is due — a shopper gets at most one
   * email every seven days, and only when there is something worth saying: an
   * offer about to end, one that has just ended, or a deal saved since we last
   * wrote. `notify_email = 0` means never.
   */
  try {
    const digest = await runSavedDigests();
    steps.push({
      step: 'saved-digest',
      ok: true,
      people: digest.considered,
      sent: digest.sent,
      skipped: digest.skipped,
    });
  } catch (err) {
    ok = false;
    steps.push({ step: 'saved-digest', ok: false, error: (err as Error).message });
  }

  const tookMs = Date.now() - started;
  await db
    .prepare('UPDATE job_runs SET last_finished_at = ?, last_ok = ?, last_result = ? WHERE name = ?')
    .run(nowIso(), ok ? 1 : 0, JSON.stringify({ tookMs, steps }).slice(0, 2000), JOB);

  return { ok, tookMs, steps };
}
