/* Network-only rollback at the SAME worker URL. Never reload an open form. */
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  await Promise.all((await caches.keys()).filter(key => key.startsWith('dealmosaic-pwa-')).map(key => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
})()));
// Intentionally no fetch, sync or push handler: requests go to the network.
