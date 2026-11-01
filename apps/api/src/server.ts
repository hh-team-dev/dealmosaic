import { serve } from '@hono/node-server';
import app from './app.js';

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '0.0.0.0';

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`[dealmosaic-api] listening on http://${hostname}:${info.port}`);
  console.log(`[dealmosaic-api] environment: ${process.env.NODE_ENV ?? 'development'}`);
  console.log('[dealmosaic-api] market: IN only (India launch)');
});
