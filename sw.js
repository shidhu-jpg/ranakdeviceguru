// Service worker: makes the store installable as an app and keeps it usable on a weak connection.
// Pages and scripts are fetched fresh when online (so updates show up straight away) and fall back to the
// last saved copy when offline. Photos and fonts are served from the cache and refreshed in the background.
// The catalogue is fetched fresh too, with the last copy kept for offline browsing (place_order() re-checks
// prices, so a stale copy can't change what anyone pays). Sign-in and order requests always go to the network.
const CACHE = "rdg-v2";
const SHELL = ["./", "index.html", "app.css", "app.js", "data.js", "config.js", "manifest.webmanifest", "images/hero.jpg", "images/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request, fallback) {
  const cache = await caches.open(CACHE);
  // Pages are saved once per path, so every ?p=<product> link shares the saved store page
  const url = new URL(request.url);
  const key = request.mode === "navigate" ? url.origin + url.pathname : request;
  try {
    // no-cache: check with the server rather than reuse the browser's copy, so a new deploy shows up on the next visit
    const response = await fetch(request.mode === "navigate" ? new Request(request.url, { cache: "no-cache", credentials: "same-origin" }) : new Request(request, { cache: "no-cache" }));
    if (response.ok) cache.put(key, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(key)) || (fallback && (await cache.match(fallback))) || Promise.reject(error);
  }
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(event.request);
  const fresh = fetch(event.request).then((response) => {
    if (response.ok || response.type === "opaque") cache.put(event.request, response.clone());
    return response;
  });
  if (cached) {
    event.waitUntil(fresh.catch(() => {}));
    return cached;
  }
  return fresh;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.mode === "navigate") return event.respondWith(networkFirst(request, "./"));
  if (sameOrigin && request.destination === "image") return event.respondWith(staleWhileRevalidate(event));
  if (sameOrigin || /^\/rest\/v1\/(products|categories)$/.test(url.pathname)) return event.respondWith(networkFirst(request));
  // Product photos in Supabase storage, Google Fonts and the pinned supabase-js build
  if (url.pathname.includes("/storage/v1/object/public/") || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname) || url.hostname === "cdn.jsdelivr.net") {
    return event.respondWith(staleWhileRevalidate(event));
  }
});
