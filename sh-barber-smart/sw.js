/* SH BARBER SMART — service worker solo para notificaciones push.
   No guarda páginas ni convierte el panel en app instalable. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'SH Barber Smart', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || '📥 Nueva cita solicitada', {
    body: d.body || 'Revisa tu panel de citas.',
    icon: 'brand/logo-mark.png',
    badge: 'brand/logo-mark.png',
    tag: d.id || 'shbs-aviso',
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: d.url || './', id: d.id || null }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  const target = new URL(data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
    for (const w of wins) {
      if (w.url.startsWith(self.registration.scope)) {
        w.postMessage({ type: 'openAppt', id: data.id });
        return w.focus();
      }
    }
    return self.clients.openWindow(target);
  }));
});
