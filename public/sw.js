// Offline support for the installed app. The page itself is always fetched
// fresh when online (so updates arrive right away) and comes from the cache
// when offline. Built files have unique names, so they're cached on first use.
const CACHE = 'babymo-craft-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || req.destination === 'document';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isPage) {
      try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
      catch { return (await cache.match(req)) || (await cache.match('./')) || Response.error(); }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  })());
});
