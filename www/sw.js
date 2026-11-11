/* ============================================================
   BabyMo Craft — service worker
   Gives the game offline support + instant repeat loads.
   Strategy:
     - navigations  → network-first (fresh when online, cached
       copy when offline) so updates never get stuck stale.
     - same-origin static → cache-first (fast), refreshed in background.
     - cross-origin (CDN three.js, fonts) → opportunistic cache.
   ============================================================ */
const CACHE = "babymo-craft-v1";

const SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/fonts/fonts.css",
  "/babymo-hijaiyah.html",
  "/babymo-hutan-ajaib.html",
  "/baby-mo-poses/baby-mo-pose-05.png",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return r;
        })
        .catch(() =>
          caches.match(req).then((m) => m || caches.match("/index.html"))
        )
    );
    return;
  }

  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(
        (m) =>
          m ||
          fetch(req)
            .then((r) => {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
              return r;
            })
            .catch(() => m)
      )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (m) =>
        m ||
        fetch(req)
          .then((r) => {
            try {
              const copy = r.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            } catch (_) {}
            return r;
          })
          .catch(() => m)
    )
  );
});
