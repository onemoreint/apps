/* Service worker: permite abrir la tienda sin internet (catálogo guardado).
   Cada vez que cambies archivos: sube VERSION aquí y el ?v= de index.html
   (y de esta lista) para que los teléfonos descarguen la versión nueva. */
const VERSION = "mtr-v1.5.2";
const ARCHIVOS = [
  "./",
  "index.html",
  "css/estilos.css?v=1.5.2",
  "js/config.tienda.js?v=1.5.2",
  "js/productos.demo.js?v=1.5.2",
  "js/utilidades.js?v=1.5.2",
  "js/qr.js?v=1.5.2",
  "js/codigos.js?v=1.5.2",
  "js/tienda.js?v=1.5.2",
  "css/tienda.css?v=1.5.2",
  "tienda.html",
  "panel.html",
  "manifest-panel.webmanifest",
  "css/panel.css?v=1.5.2",
  "js/auth.js?v=1.5.2",
  "js/panel.js?v=1.5.2",
  "manifest-tienda.webmanifest",
  "js/datos.js?v=1.5.2",
  "js/nube.js?v=1.5.2",
  "js/carrito.js?v=1.5.2",
  "js/app.js?v=1.5.2",
  "js/flor.js?v=1.5.2",
  "img/logo-flor-de-lotto.webp",
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
  // "no-cache": siempre pregunta al servidor si hay versión nueva (rápido,
  // usa ETag), así los residentes ven los cambios apenas se publican.
  const destino = req.mode === "navigate" ? req.url : req;
  e.respondWith(
    fetch(destino, { cache: "no-cache" })
      .then((res) => {
        const copia = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copia));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
