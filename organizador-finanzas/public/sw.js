// Service worker: la app funciona sin internet. Los datos NO pasan por aquí (viven cifrados en IndexedDB).
const VERSION = 'of-v1';
const BASE = ['./', './index.html', './manifest.webmanifest', './icono.svg', './icono-180.png', './icono-192.png', './icono-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Fuentes: caché primero
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const r = await fetch(req);
          if (r.ok || r.type === 'opaque') c.put(req, r.clone());
          return r;
        } catch {
          // sin conexión y sin copia: la app usa las fuentes del sistema
          return new Response('', { status: 200, headers: { 'Content-Type': url.hostname === 'fonts.googleapis.com' ? 'text/css' : 'font/woff2' } });
        }
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  // App: red primero (para recibir actualizaciones), caché si no hay conexión
  e.respondWith(
    fetch(req)
      .then((r) => {
        if (r.ok) caches.open(VERSION).then((c) => c.put(req, r.clone()));
        return r;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  );
});
