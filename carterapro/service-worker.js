// Service worker: guarda la app en el dispositivo para que funcione sin internet.
// Al publicar una versión nueva, cambia VERSION para que los teléfonos descarguen los cambios.
const VERSION = 'carterapro-v1.0.0';
const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './js/app.js',
  './js/core/dates.js',
  './js/core/errors.js',
  './js/core/events.js',
  './js/core/i18n.js',
  './js/core/locales/en.js',
  './js/core/locales/es.js',
  './js/core/locales/pt.js',
  './js/core/money.js',
  './js/core/router.js',
  './js/data/db.js',
  './js/domain/copia.js',
  './js/domain/cuotas.js',
  './js/domain/diagnostico.js',
  './js/domain/errores.js',
  './js/domain/estados.js',
  './js/domain/interes.js',
  './js/domain/metricas.js',
  './js/domain/pagos.js',
  './js/domain/reportes.js',
  './js/domain/riesgo.js',
  './js/domain/validaciones.js',
  './js/services/backup.js',
  './js/services/clientes.js',
  './js/services/config.js',
  './js/services/creditos.js',
  './js/services/datos.js',
  './js/services/demo.js',
  './js/services/exportar.js',
  './js/services/ia.js',
  './js/services/instalacion.js',
  './js/services/pagos.js',
  './js/services/seguridad.js',
  './js/services/whatsapp.js',
  './js/ui/bloqueo.js',
  './js/ui/componentes.js',
  './js/ui/dialogos.js',
  './js/ui/html.js',
  './js/ui/icons.js',
  './js/views/analista-ia.js',
  './js/views/ayuda.js',
  './js/views/bienvenida.js',
  './js/views/buscar.js',
  './js/views/calendario.js',
  './js/views/cliente-form.js',
  './js/views/cliente-perfil.js',
  './js/views/clientes.js',
  './js/views/cobranzas.js',
  './js/views/configuracion.js',
  './js/views/copia.js',
  './js/views/credito-detalle.js',
  './js/views/credito-form.js',
  './js/views/creditos.js',
  './js/views/dashboard.js',
  './js/views/instalar.js',
  './js/views/mas.js',
  './js/views/pago-form.js',
  './js/views/pagos.js',
  './js/views/recibo.js',
  './js/views/reportes.js',
  './js/views/seguridad.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

// La página pide activar la versión nueva cuando el usuario toca "Actualizar".
self.addEventListener('message', e => {
  if (e.data?.tipo === 'activar') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Navegación: siempre responde con la app guardada (funciona sin conexión).
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then(r => r || fetch(req)));
    return;
  }

  // Archivos: primero la copia local; si no existe, la red, y se guarda para la próxima vez.
  e.respondWith((async () => {
    const guardado = await caches.match(req, { ignoreSearch: true });
    if (guardado) return guardado;
    try {
      const resp = await fetch(req);
      if (resp.ok && resp.type === 'basic') (await caches.open(VERSION)).put(req, resp.clone());
      return resp;
    } catch {
      return new Response('', { status: 504, statusText: 'Sin conexión' });
    }
  })());
});
