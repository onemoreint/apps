// Guarda la app para que funcione sin conexión. Las rutas son relativas para servirse desde cualquier carpeta.
const VERSION = 'jarvis-v1.2.0';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/app.js',
  'js/actions.js',
  'js/analyzer.js',
  'js/brain.js',
  'js/dateparse.js',
  'js/engine-local.js',
  'js/engine-remote.js',
  'js/reactor.js',
  'js/reminders.js',
  'js/store.js',
  'js/ui.js',
  'js/voice.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/fonts/chakra-petch-latin-500-normal.woff2',
  'assets/fonts/chakra-petch-latin-600-normal.woff2',
  'assets/fonts/saira-latin-400-normal.woff2',
  'assets/fonts/saira-latin-500-normal.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('jarvis-') && k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Solo se atiende la propia app: el backend de IA y los sitios externos nunca pasan por la caché.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(VERSION);
        cache.put('index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fresh = await fetch(request);
    if (fresh.ok && url.pathname.startsWith(new URL('./', self.location).pathname)) {
      const cache = await caches.open(VERSION);
      cache.put(request, fresh.clone());
    }
    return fresh;
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list[0]) return list[0].focus();
    return self.clients.openWindow('./');
  })());
});
