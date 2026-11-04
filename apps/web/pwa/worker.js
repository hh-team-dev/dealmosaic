/* Generated configuration is injected at build time. No API or customer data is cached. */
const CONFIG = __DM_PWA_CONFIG__;
const PREFIX = 'dealmosaic-pwa-';
const CACHE = PREFIX + CONFIG.build;
const ASSETS = new Set(CONFIG.assets.map(path => new URL(path, self.location.origin).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await Promise.all(CONFIG.assets.map(async path => {
        const response = await fetch(new Request(path, { cache: 'reload', credentials: 'omit' }));
        if (!response.ok || response.redirected) throw new Error('Incomplete offline release');
        const type = response.headers.get('content-type') || '';
        if (/\.(js|css|woff2|png|svg)$/.test(path) && type.includes('text/html')) throw new Error('Asset returned HTML');
        await cache.put(path, response);
      }));
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
    // Updates wait. Never interrupt checkout, owner edits or another tab's form.
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const older = (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE);
    // Keep one preceding release for lazy chunks in an already-open tab.
    await Promise.all(older.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'VERSION') event.ports[0]?.postMessage({ version: CONFIG.version, build: CONFIG.build });
});

async function cachedAsset(request) {
  const hit = await caches.match(request, { cacheName: CACHE });
  if (hit) return hit;
  for (const key of (await caches.keys()).filter(key => key.startsWith(PREFIX) && key !== CACHE)) {
    const old = await caches.match(request, { cacheName: key });
    if (old) return old;
  }
  return fetch(request);
}

async function navigation(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    // Network first, without ever storing a visited HTML page or a private URL.
    return await fetch(request, { cache: 'no-store', signal: controller.signal });
  } catch {
    const shell = await caches.match('/pwa-shell.html', { cacheName: CACHE });
    if (shell) return shell;
    return new Response('<!doctype html><html lang="en-IN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Reconnect to open DealMosaic</title></head><body style="margin:0;background:#FFF9F0;color:#4A2B22;font:18px/1.6 system-ui"><main style="max-width:640px;padding:32px;margin:auto"><p>DealMosaic</p><h1>Reconnect to open DealMosaic</h1><p>The offline app files are unavailable. Your browser may have cleared them. Live prices, orders and payments need a connection; nothing has been queued.</p><p>Reconnect, then reopen the website to prepare offline access again.</p><a href="/" style="display:inline-block;padding:12px;color:#4A2B22">Open the website</a></main></body></html>', {
      status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  } finally { clearTimeout(timer); }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache, retry, queue or replay a mutation, API call or affiliate redirect.
  if (request.method !== 'GET' || url.origin !== self.location.origin || /^\/api(?:\/|$)/.test(url.pathname)) return;
  if (request.mode === 'navigate') { event.respondWith(navigation(request)); return; }
  if (ASSETS.has(url.href) || (!url.search && /^\/assets\/[a-zA-Z0-9_.-]+\.(js|css)$/.test(url.pathname))) {
    event.respondWith(cachedAsset(request));
  }
});
