/* JC — Mi Día en Equilibrio · Service worker
   Estrategia:
   - Instalación: guarda en caché los archivos esenciales (app shell).
   - Navegación y archivos propios: caché primero (abre al instante y sin conexión).
   - Para publicar una versión nueva se cambia VERSION: el navegador detecta el sw.js nuevo,
     descarga la versión nueva en una caché aparte y la app muestra «Actualizar».
   - Actualización controlada: la nueva versión espera hasta que la usuaria toca «Actualizar». */
const VERSION = 'jc-mi-dia-v1.1.0';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('jc-mi-dia-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // no intercepta otros dominios

  if (req.mode === 'navigate') {
    // Sirve la versión instalada (rápida y offline). Las versiones nuevas llegan con el service worker nuevo.
    e.respondWith(
      caches.open(VERSION).then(c => c.match('./index.html')).then(cached => cached || fetch(req).catch(() => new Response(
        '<!doctype html><meta charset="utf-8"><title>JC Mi Día</title><body style="font-family:system-ui;padding:24px">Sin conexión. Abre la app una vez con internet para que funcione sin conexión.</body>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } })))
    );
    return;
  }

  e.respondWith(
    caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true })).then(cached => {
      const net = fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => cached || new Response('', { status: 504, statusText: 'Sin conexión' }));
      return cached || net;
    })
  );
});

/* Al tocar una notificación (proverbio o recordatorio), abre o enfoca la app */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./index.html');
  }));
});
