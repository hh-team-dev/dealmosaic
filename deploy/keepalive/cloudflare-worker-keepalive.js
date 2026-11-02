/**
 * DealMosaic keep-alive — Cloudflare Worker with a Cron Trigger.
 *
 * WHY THIS EXISTS
 * ---------------
 * Render's free tier puts a web service to sleep after 15 minutes idle. Measured
 * cold start: the first request to /api/health took 22.5 s; warm it is 0.23 s.
 *
 * A GitHub Actions schedule was installed first (.github/workflows/keepalive.yml).
 * It works when run manually — run #1 pinged the API and got HTTP 200 — but the
 * *scheduler* never fired it: 57 minutes after the workflow went active there were
 * still zero `schedule` runs. GitHub's cron is best-effort and commonly delayed,
 * sometimes for hours on quiet repositories.
 *
 * This Worker removes that dependency entirely. Cloudflare Cron Triggers do fire
 * reliably, the free plan allows them, and no new account is needed — the owner
 * already has Cloudflare for Pages.
 *
 * COST: zero. One request every 5 minutes is ~8,640 requests/day, well inside the
 * Workers free allowance of 100,000 requests/day.
 *
 * HOW TO INSTALL — Cloudflare dashboard, no CLI, no API token
 * -----------------------------------------------------------
 *  1. dash.cloudflare.com → Workers & Pages → Create → Workers → Create Worker
 *  2. Name it `dealmosaic-keepalive` → Deploy
 *  3. Edit code → replace the sample with everything below → Deploy
 *  4. Worker → Settings → Triggers → Cron Triggers → Add Cron Trigger
 *     Cron expression:  * /5 * * * *      (written without the space)
 *  5. Save. The first run happens within 5 minutes.
 *
 * VERIFY: Worker → Logs (or the deployment's "View logs") should show one line per
 * run. A healthy run logs `warm 200 in NNNms`. The first run after a sleep logs a
 * much larger number — that is the Worker waking Render, which is the point.
 *
 * The endpoint is /api/health, which touches the database, so it wakes the whole
 * service rather than just the process.
 */

const TARGET = 'https://dealmosaic-api.onrender.com/api/health';

export default {
  // Fired by the cron trigger. No HTTP response is returned to anyone.
  async scheduled(_event, _env, ctx) {
    ctx.waitUntil(ping('cron'));
  },

  // Allows a manual browser visit to the Worker URL to test it.
  async fetch(_request, _env, ctx) {
    const started = Date.now();
    const result = await ping('manual');
    return new Response(`${result}\n(${Date.now() - started}ms)\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};

async function ping(source) {
  const started = Date.now();
  try {
    // A cold Render start can exceed 30 s, so allow well beyond that.
    const res = await fetch(TARGET, {
      signal: AbortSignal.timeout(90_000),
      headers: { 'user-agent': `dealmosaic-keepalive/${source}` },
    });
    const ms = Date.now() - started;
    const body = await res.text();
    const line = `${new Date().toISOString()} ${source} ${res.status} in ${ms}ms ${body.slice(0, 120)}`;
    console.log(line);
    return line;
  } catch (err) {
    // Never throw: a failed ping should be a log line, not a Worker error storm.
    const line = `${new Date().toISOString()} ${source} FAILED after ${Date.now() - started}ms: ${err?.message ?? err}`;
    console.log(line);
    return line;
  }
}
