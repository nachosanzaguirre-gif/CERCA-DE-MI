/* Cerca — service worker. Cachea la "app shell" para arranque offline.
   Las teselas del mapa y las búsquedas (Overpass/ORS) van a la red: no se
   interceptan y no funcionan sin conexión (el mapa offline completo es una
   función aparte, más grande).

   IMPORTANTE al publicar una versión nueva: sube el número de CACHE (v8 -> v9...).
   Es lo que hace que los navegadores que ya tienen la app instalada descarten
   la versión vieja y se queden con la nueva. */
const CACHE = "cerca-v9";
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
  if (url.origin !== self.location.origin) return; // mapa y APIs: directo a la red

  var isDocument = e.request.mode === "navigate" ||
                   url.pathname.endsWith(".html") ||
                   url.pathname.endsWith("/");

  if (isDocument) {
    /* RED PRIMERO para el HTML: así una versión nueva se ve siempre al recargar
       con conexión. Si no hay red, se sirve la copia cacheada (arranque offline).
       Antes era caché primero, y por eso las actualizaciones no llegaban nunca. */
    e.respondWith(
      fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        return resp;
      }).catch(function () {
        return caches.match(e.request).then(function (r) { return r || caches.match("./cerca.html"); });
      })
    );
    return;
  }

  /* Iconos y manifest: caché primero (no cambian casi nunca), pero se refrescan
     en segundo plano para la próxima visita. */
  e.respondWith(
    caches.match(e.request).then(function (r) {
      var net = fetch(e.request).then(function (resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        return resp;
      }).catch(function () { return r; });
      return r || net;
    })
  );
});
