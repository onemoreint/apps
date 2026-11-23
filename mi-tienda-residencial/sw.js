/* Service worker: permite abrir la tienda sin internet (catálogo guardado).
   Cada vez que cambies archivos, sube el número de VERSION para que los
   teléfonos descarguen la versión nueva. */
const VERSION = "mtr-v1.0.1";
const ARCHIVOS = [
  "./",
  "index.html",
  "css/estilos.css",
  "js/config.tienda.js",
  "js/productos.demo.js",
  "js/utilidades.js",
  "js/datos.js",
  "js/carrito.js",
  "js/app.js",
  "img/logo.svg",
  "img/icono.svg",
  "img/icono-192.png",
  "manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Red primero (para tener siempre lo último) y, si no hay internet, la copia guardada.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
