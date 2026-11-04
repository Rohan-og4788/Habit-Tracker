// HabitForge - offline shell + network-fallback for API
const CACHE_NAME = "habitforge-v1";
const ASSETS = ["/", "/dashboard", "/auth/login", "/auth/register", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin GET: cache-first for shell, network for API
  if (url.origin === self.location.origin && request.method === "GET") {
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(
        fetch(request).catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(JSON.stringify({ error: "offline", queued: false }), { status: 503, headers: { "Content-Type": "application/json" } });
        })
      );
    } else {
      event.respondWith(
        caches.match(request).then((cached) => cached || fetch(request).catch(() => cached))
      );
    }
  }
});
