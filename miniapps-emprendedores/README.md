# Mini Apps para Emprendedores — Landing

Landing de venta de mini apps (catálogo + pedidos por WhatsApp) de José Lugo.

**En línea:** https://onemoreint.github.io/apps/miniapps-emprendedores/

## Qué incluye
- Demo interactiva de "La Caserita" con selector de plan (Básica, Intermedia, Avanzada):
  - **Básica:** catálogo con botón directo a WhatsApp por producto.
  - **Intermedia:** carrito, cantidades, subtotal, agotados, domicilio/recoger y pedido armado en WhatsApp.
  - **Avanzada:** adicionales, sabores, tamaños y combos con precio; domicilio por zona; medios de pago; promo del día; código QR descargable; instalación como app.
- Planes de $100.000, $150.000 y $200.000 COP con botón a WhatsApp y "Probar la demo de este plan".
- Formulario con validación y autorización de datos (no guarda nada: prepara el mensaje para WhatsApp).
- Política de privacidad, condiciones y tratamiento de datos (Ley 1581 de 2012).
- PWA instalable (`manifest.webmanifest`, `sw.js`, íconos) y datos estructurados para buscadores.
- Eventos de analítica en `window.dataLayer` sin datos personales.

## Cómo editar
Todo lo configurable está al inicio del `<script>` de `index.html`:
- `CONFIG`: WhatsApp comercial y de demo, dirección, moneda y los tres planes (precio, tiempos, incluye / no incluye).
- `PRODUCTS`, `PROMO`, `ZONES`, `PAYMENTS`: datos del negocio de ejemplo de la demo.
- `FAQ`, `SOLUTIONS`, `GALLERY`: textos y fotos de las secciones.

Si cambias archivos que guarda el service worker, sube el número de `CACHE` en `sw.js` (por ejemplo `miniapps-v2`).

## Fotos
Imágenes de [Unsplash](https://unsplash.com) (licencia libre de Unsplash), cargadas desde su CDN.
