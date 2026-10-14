/* Service worker — Mi Perfil de Bienestar
 * Solo guarda en caché los archivos de la app (código, estilos, iconos).
 * Nunca guarda respuestas: la app no envía datos del cuestionario por la red.
 * Para publicar una actualización, cambia VERSION.
 */
'use strict';

const VERSION = '1.0.0';
const CACHE = `mpb-shell-v${VERSION}`;
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];
const SHELL_URLS = new Set(SHELL.map(p => new URL(p, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
  );
  // En la primera instalación se activa solo; en actualizaciones espera a que el usuario pulse «Actualizar».
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('mpb-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'STATUS' && event.ports[0]) {
    (async () => {
      const cache = await caches.open(CACHE);
      const missing = [];
      for (const u of SHELL) if (!(await cache.match(u))) missing.push(u);
      event.ports[0].postMessage({ version: VERSION, ready: missing.length === 0, missing });
    })();
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                 // nunca intercepta envíos
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nada externo (WhatsApp, etc.)
  if (url.searchParams.has('probe')) return;         // prueba de conexión: siempre a la red

  // Navegación: la app es una sola página. Responde con index.html guardado.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      if (cached) return cached;
      try { return await fetch(req); }
      catch (_) {
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Sin conexión</title><body style="font-family:system-ui;padding:24px"><h1>Sin conexión</h1><p>La app aún no terminó de descargarse en este dispositivo. Ábrela una vez con internet y vuelve a intentarlo.</p>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  // Archivos de la app: primero la caché, luego la red. Ningún otro recurso se guarda.
  const clean = url.origin + url.pathname;
  if (SHELL_URLS.has(clean)) {
    event.respondWith(
      caches.open(CACHE).then(c => c.match(clean)).then(hit => hit || fetch(req))
    );
  }
});
