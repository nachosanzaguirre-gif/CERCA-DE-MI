/* Cerca — service worker. Cachea la "app shell" para arranque offline.
   Las teselas del mapa y las búsquedas (Overpass/ORS) van a la red: no se
   interceptan y no funcionan sin conexión (el mapa offline completo es una
   función aparte, más grande). */
const CACHE = "cerca-v7";
const ASSETS = ["./cerca.html", "./manifest.webmanifest", "./icon192.png", "./icon512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var url = new URL(e.request.url);
  // Solo servimos desde caché los ficheros propios; el resto (mapa, APIs) va a la red.
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(e.request).then(function (r) { return r || fetch(e.request); }));
  }
});
