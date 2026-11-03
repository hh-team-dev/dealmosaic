import { Hono } from 'hono';
import { ApiError } from './lib/http.js';
import { db, initDb, seedReferenceData } from './db/index.js';
import { loadSession, type AppBindings } from './middleware/session.js';
import { generalLimiter } from './lib/rate-limit.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';
import { metaRoutes } from './routes/meta.js';
import { fxRoutes } from './routes/fx.js';
import { devRoutes } from './routes/dev.js';
import { searchRoutes } from './routes/search.js';
import { catalogueRoutes } from './routes/catalogue.js';
import { communityRoutes } from './routes/community.js';
import { locationRoutes } from './routes/location.js';
import { couponRoutes } from './routes/coupons.js';
import { alertRoutes } from './routes/alerts.js';
import { maintenanceRoutes } from './routes/maintenance.js';
import { adminRoutes } from './routes/admin.js';
import { goRoutes } from './routes/go.js';
import { maybeRunDaily } from './services/daily-job.js';
import { seedCatalogue } from './db/catalog-seed.js';

/**
 * Boot must complete before the first request is served: the schema, reference
 * data and catalogue seed are all asynchronous now that the database can be
 * remote. `ready` is awaited by the request pipeline so a cold start never
 * answers with a half-initialised database.
 */
const ready = (async () => {
  await initDb();
  await seedReferenceData();
  await seedCatalogue();
})();

export { ready };

export const app = new Hono<AppBindings>();

app.use('*', async (c, next) => {
  const started = Date.now();
  await next();
  const ms = Date.now() - started;
  if (!c.req.path.startsWith('/api/health')) {
    c.header('Server-Timing', `app;dur=${ms}`);
  }
});

// Baseline hardening for every API response. HTML-level CSP is configured at the
// host (Cloudflare Pages headers) so it can allow the app's own assets.
app.use('/api/*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Cross-Origin-Resource-Policy', 'same-origin');
  c.header('X-Robots-Tag', 'noindex');
  c.header('Cache-Control', 'no-store');
});

app.use('/api/*', generalLimiter);
app.use('/api/*', async (c, next) => {
  try {
    await ready;
  } catch (error) {
    // Surface a real failure rather than serving from an unseeded database.
    console.error('[dealmosaic-api] initialisation failed', error);
    return c.json(
      { error: { code: 'initialising', message: 'The service is starting up. Try again shortly.' } },
      503,
    );
  }
  await next();
});

app.use('/api/*', loadSession);

/**
 * The health check also acts as the scheduler's heartbeat.
 *
 * A free uptime ping calls this every five minutes to keep the Render instance
 * awake. That is a reliable, zero-cost tick, so the daily maintenance job asks
 * "am I due?" here rather than needing a cron of its own. The call is
 * fire-and-forget and the response is sent first: a health endpoint that waits
 * 25 seconds for a feed sync reports the service as down.
 */
app.get('/api/health', (c) => {
  const res = c.json({
    ok: true,
    service: 'dealmosaic-api',
    version: '1.0.0',
    time: new Date().toISOString(),
    database: db.open ? 'connected' : 'unavailable',
    markets: ['IN'],
    environment: process.env.NODE_ENV ?? 'development',
  });
  /**
   * THE DAILY JOB SCHEDULES ITSELF OFF THIS PING.
   *
   * The keep-alive worker already calls `/api/health` every five minutes, so the
   * API can ask "am I due?" on each ping and run at most once per 20 hours. That
   * removes the need for a second cron trigger, a paid scheduler, or a GitHub
   * Actions workflow that does not fire.
   *
   * The response is built first and the work is fired afterwards without being
   * awaited, so a health check never waits for it. `runDailyNow` claims its slot
   * with a conditional UPDATE, so two simultaneous pings cannot both start it.
   *
   * Never inside a test run: the job writes rows and sends email, and a test
   * suite must be able to reach neither.
   */
  if (!process.env.VITEST && process.env.NODE_ENV !== 'test' && process.env.DAILY_JOB !== 'off') {
    void maybeRunDaily().catch((err) => console.warn('[daily] skipped:', (err as Error).message));
  }
  return res;
});

app.route('/api/auth', authRoutes);
app.route('/api/me', meRoutes);
app.route('/api/meta', metaRoutes);
app.route('/api/fx', fxRoutes);
app.route('/api/dev', devRoutes);

app.route('/api/search', searchRoutes);
app.route('/api/catalogue', catalogueRoutes);
app.route('/api/community-prices', communityRoutes);
app.route('/api/location', locationRoutes);
app.route('/api/coupons', couponRoutes);
app.route('/api/alerts', alertRoutes);
app.route('/api/maintenance', maintenanceRoutes);
app.route('/api/admin', adminRoutes);
  // The money route: every coupon tap leaves through here so the sale can be
  // attributed to us. See routes/go.ts.
  app.route('/api/go', goRoutes);

/**
 * `POST /api/maintenance/daily` was the original entry point for the scheduler.
 * It still works, and still needs the token; see services/daily-job.ts for why
 * the running system no longer depends on an external cron calling it.
 */

app.notFound((c) =>
  c.json({ error: { code: 'not_found', message: `No route for ${c.req.method} ${c.req.path}` } }, 404),
);

app.onError((err, c) => {
  if (err instanceof ApiError) {
    return c.json(
      { error: { code: err.code, message: err.message, ...(err.fields ? { fields: err.fields } : {}) } },
      err.status,
    );
  }
  console.error('[api] unhandled', err);
  return c.json(
    { error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' } },
    500,
  );
});

export default app;
