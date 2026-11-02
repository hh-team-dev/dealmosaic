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

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'dealmosaic-api',
    version: '1.0.0',
    time: new Date().toISOString(),
    database: db.open ? 'connected' : 'unavailable',
    markets: ['IN'],
    environment: process.env.NODE_ENV ?? 'development',
  }),
);

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
