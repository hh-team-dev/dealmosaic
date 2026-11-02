/**
 * Cloudflare Pages Function (advanced mode) — runs on the edge for every request.
 *
 * It does two jobs that static hosting cannot:
 *
 * 1. REAL 404s. A single-page app normally answers every unknown URL with
 *    `200 index.html`. Search engines treat that as a soft 404 and it dilutes
 *    crawl budget. Here, only URLs matching a known client route are handed the
 *    app shell; anything else gets a genuine 404 status and a real page.
 *
 * 2. SAME-ORIGIN API. `/api/*` is proxied to the API service, so the browser
 *    only ever talks to one origin. That keeps cookies first-party, removes CORS
 *    entirely, and means a future domain change does not touch front-end code.
 *    The upstream is read from the `API_ORIGIN` environment variable, so the
 *    deployed code contains no host that can go stale.
 *
 * No imports: this file is deployed verbatim, so it must be self-contained.
 */

/** Client-side routes from apps/web/src/App.tsx. Keep this list in sync. */
const SPA_ROUTES = [
  /^\/$/,
  /^\/search\/?$/,
  /^\/browse\/?$/,
  /^\/deals\/?$/,
  /^\/c\/[^/]+\/?$/, // category
  /^\/p\/[^/]+\/?$/, // product
  /^\/how-we-rank\/?$/,
  /^\/data-sources\/?$/,
  /^\/register\/?$/,
  /^\/login\/?$/,
  /^\/verify-email\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password\/?$/,
  /^\/privacy\/?$/,
  /^\/terms\/?$/,
  /^\/disclosure\/?$/,
  /^\/contact\/?$/,
  /^\/app(\/.*)?$/,
];

const isSpaRoute = (pathname) => SPA_ROUTES.some((re) => re.test(pathname));

const jsonError = (status, code, message) =>
  new Response(JSON.stringify({ error: code, message }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    /* ---- 1. API proxy ------------------------------------------------- */
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      const origin = env.API_ORIGIN?.trim();
      if (!origin) {
        // Honest failure: the API is not wired up yet. Never fake a 200.
        return jsonError(503, 'api_unavailable', 'The API service is not configured yet.');
      }
      const target = new URL(pathname + url.search, origin);
      const proxied = new Request(target, request);
      // The upstream sees the real path; strip our own forwarding header if present.
      proxied.headers.delete('x-dealmosaic-proxy');
      const response = await fetch(proxied);
      // Re-wrap so we can attach a marker without mutating immutable headers.
      const out = new Response(response.body, response);
      out.headers.set('x-dealmosaic-proxy', 'pages');
      return out;
    }

    /* ---- 2. Static asset ---------------------------------------------- */
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    /* ---- 3. Client route → app shell with a real 200 ------------------ */
    if (isSpaRoute(pathname)) {
      const shell = await env.ASSETS.fetch(new URL('/index.html', url));
      return new Response(shell.body, {
        status: 200,
        headers: shell.headers,
      });
    }

    /* ---- 4. Anything else → real 404 ---------------------------------- */
    const notFound = await env.ASSETS.fetch(new URL('/404.html', url));
    if (notFound.status === 404) {
      return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain' } });
    }
    return new Response(notFound.body, {
      status: 404,
      headers: notFound.headers,
    });
  },
};
