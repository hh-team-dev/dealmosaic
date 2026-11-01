import { Hono } from 'hono';
import { ApiError } from './lib/http.js';
import { db, seedReferenceData } from './db/index.js';
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
import { seedCatalogue } from './db/catalog-seed.js';

seedReferenceData();
seedCatalogue();

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
app.use('/api/*', loadSession);

app.get('/api/health', (c) =>
  c.json({
    ok: true,
    service: 'dealmosaic-api',
    version: '0.2.0-phase2',
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
