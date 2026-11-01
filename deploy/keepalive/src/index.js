/**
 * Keep-alive cron worker.
 *
 * Render's free web service sleeps after 15 minutes without traffic, and the
 * next request then waits 30–60 seconds. For a price-comparison site that first
 * impression is unacceptable, so this Cron Trigger pings the health endpoint
 * every 5 minutes. 750 free instance-hours covers a 744-hour month, so a single
 * always-warm service fits inside the allowance.
 *
 * Deployed separately from the site because Cloudflare Pages Functions cannot
 * run on a schedule — only Workers can.
 */
export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env));
  },
  // A manual GET makes the worker testable without waiting for the cron.
  async fetch(_request, env) {
    const result = await ping(env);
    return new Response(JSON.stringify(result, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  },
};

async function ping(env) {
  const target = `${env.API_ORIGIN}/api/health`;
  const started = Date.now();
  try {
    const res = await fetch(target, { signal: AbortSignal.timeout(25_000) });
    return { target, status: res.status, ms: Date.now() - started, ok: res.ok };
  } catch (error) {
    // Never throw from a cron: a failed ping is logged, not fatal.
    return { target, error: String(error), ms: Date.now() - started, ok: false };
  }
}
