// Offline support for the installed app. Online, pages and pictures are always fetched fresh (so a new
// screenshot or page shows right away) and kept as the offline copy; files whose names change whenever
// their content does (the built game in assets/, voice clips, emoji) are taken from the cache first.
// The cache name changes when old copies must go (v2: screenshots kept their names but changed).
const CACHE = 'babymo-craft-v2';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  // only our own old caches: on babymo.id the site's other pages share this storage (and keep their own caches)
  for (const k of await caches.keys()) if (k.startsWith('babymo-craft-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
/** a file whose name changes with its content: safe to take from the cache without asking */
const fixedName = path => /\/(assets|voice|emoji)\//.test(path);
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (fixedName(url.pathname)) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }
    // everything else: fresh when online, the stored copy when offline
    try { const res = await fetch(req); if (res.ok && res.type === 'basic') cache.put(req, res.clone()); return res; }
    catch {
      const isPage = req.mode === 'navigate' || req.destination === 'document';
      return (await cache.match(req)) || (isPage ? await cache.match('./') : undefined) || Response.error();
    }
  })());
});
