// Offline support for the installed app. Online, pages and pictures are always fetched fresh (so a new
// screenshot or page shows right away) and kept as the offline copy; files whose names change whenever
// their content does (the built game in assets/ and the voice clips) are taken from the cache first.
// The cache name changes when old copies must go (v3: emoji pictures fetched fresh; old game builds pruned).
const CACHE = 'babymo-craft-v3';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  // only our own old caches: on babymo.id the site's other pages share this storage (and keep their own caches)
  for (const k of await caches.keys()) if (k.startsWith('babymo-craft-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
/** a file whose name changes with its content: safe to take from the cache without asking */
const fixedName = path => /\/(assets|voice)\//.test(path);
/**
 * Each new version of the game is a new file in assets/ (its name has a hash). When a fresh page arrives,
 * the builds it no longer uses are removed from the cache, so the offline copy doesn't grow with every update.
 */
async function pruneOldBuilds(cache, html) {
  const used = new Set([...html.matchAll(/assets\/[\w.-]+/g)].map(m => m[0]));
  if (!used.size) return;
  for (const req of await cache.keys()) {
    const p = new URL(req.url).pathname, m = p.match(/assets\/[\w.-]+$/);
    // (only the built game: index-*.js / .css and three-*.js; other assets like fonts stay)
    if (m && /assets\/(index|three)-[\w-]+\.(js|css)$/.test(m[0]) && !used.has(m[0])) await cache.delete(req);
  }
}
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // audio and video ask for parts of a file (Range): leave those to the browser (a cached whole file can fail to
  // play on iOS, and a partial answer can't be cached)
  if (req.headers.has('range')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const keep = res => { if (res.status === 200 && res.type === 'basic') cache.put(req, res.clone()).catch(() => {}); };
    if (fixedName(url.pathname)) {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      keep(res);
      return res;
    }
    // everything else: fresh when online, the stored copy when offline
    const isPage = req.mode === 'navigate' || req.destination === 'document';
    try {
      const res = await fetch(req);
      keep(res);
      if (isPage && res.status === 200) e.waitUntil(res.clone().text().then(html => pruneOldBuilds(cache, html)).catch(() => {}));
      return res;
    } catch {
      return (await cache.match(req)) || (isPage ? await cache.match('./') : undefined) || Response.error();
    }
  })());
});
