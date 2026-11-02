/**
 * Keep-alive + daily maintenance cron worker.
 *
 * TWO JOBS, TWO SCHEDULES, ONE WORKER.
 *
 * 1. EVERY 5 MINUTES — wake the API.
 *    Render's free web service sleeps after 15 minutes without traffic, and the
 *    next request then waits 30-60 s. For a price-comparison site that first
 *    impression is unacceptable, so this trigger pings /api/health, which touches
 *    the database and therefore wakes the whole service, not just the process.
 *
 * 2. ONCE A DAY — take the price snapshots and send the price alerts.
 *    `POST /api/maintenance/daily` runs, in order: record today's price for every
 *    live offer, then email anyone whose target has actually been beaten. The
 *    order matters: the record is written before the promise is made, so an alert
 *    can always be traced back to a snapshot we hold.
 *
 *    The token arrives as the `SYNC_TOKEN` secret (`wrangler secret put`), never
 *    as a variable in this repository.
 *
 * A failed run is a log line, never an exception: a cron that throws is a cron
 * that stops, and a silent morning is worse than a noisy one.
 */
const KEEPALIVE_PATH = '/api/health';
const MAINTENANCE_PATH = '/api/maintenance/daily';

export default {
  async scheduled(event, env, ctx) {
    // `event.cron` tells us which trigger fired, so the two schedules can share
    // one script without guessing from the time of day.
    const isDaily = event.cron !== undefined && event.cron !== env.KEEPALIVE_CRON;
    ctx.waitUntil(isDaily ? runDaily(env) : ping(env));
  },

  // A manual GET makes the worker testable without waiting for a cron.
  async fetch(request, env) {
    const url = new URL(request.url);
    const run = url.searchParams.get('run');
    const result = run === 'daily' ? await runDaily(env) : await ping(env);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  },
};

async function ping(env) {
  const target = `${env.API_ORIGIN}${KEEPALIVE_PATH}`;
  const started = Date.now();
  try {
    // A cold Render start can exceed 30 s, so allow well beyond that.
    const res = await fetch(target, { signal: AbortSignal.timeout(90_000) });
    return { target, status: res.status, ms: Date.now() - started, ok: res.ok };
  } catch (error) {
    console.log(`${new Date().toISOString()} keepalive FAILED: ${error}`);
    return { target, error: String(error), ms: Date.now() - started, ok: false };
  }
}

async function runDaily(env) {
  const target = `${env.API_ORIGIN}${MAINTENANCE_PATH}`;
  const started = Date.now();
  if (!env.SYNC_TOKEN) {
    console.log('daily: SYNC_TOKEN secret is not set — skipping');
    return { target, ok: false, error: 'SYNC_TOKEN not configured' };
  }
  try {
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        'x-sync-token': env.SYNC_TOKEN,
        'content-type': 'application/json',
        'user-agent': 'dealmosaic-daily-cron',
      },
      signal: AbortSignal.timeout(90_000),
    });
    const body = await res.text();
    const line = `${new Date().toISOString()} daily ${res.status} in ${Date.now() - started}ms ${body.slice(0, 400)}`;
    console.log(line);
    return { target, status: res.status, ok: res.ok, tookMs: Date.now() - started, body: body.slice(0, 2000) };
  } catch (error) {
    console.log(`${new Date().toISOString()} daily FAILED: ${error}`);
    return { target, error: String(error), ok: false, ms: Date.now() - started };
  }
}
