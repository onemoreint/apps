# Microapps para Negocios, de José Lugo

Herramientas web para emprendedores y pymes. Cada una es una página autocontenida (PWA): funciona sin internet, se instala en el celular y guarda los datos solo en el dispositivo.

Índice: https://onemoreint.github.io/apps/microapps/

| Microapp | Enlace |
|---|---|
| Punto de Equilibrio | https://onemoreint.github.io/apps/microapps/punto-equilibrio/ |
| Precios Multimoneda | https://onemoreint.github.io/apps/microapps/precios-multimoneda/ |
| Comisiones de Venta | https://onemoreint.github.io/apps/microapps/comisiones-ventas/ |
| Cotizador y Facturador | https://onemoreint.github.io/apps/microapps/facturador/ |
| Control de Caja | https://onemoreint.github.io/apps/microapps/control-caja/ |
| Kardex de Inventario | https://onemoreint.github.io/apps/microapps/kardex-inventario/ |

## Cómo está organizado

- `src/core/`: diseño, utilidades y firma compartidos por todas las apps.
- `src/apps/<app>/`: `meta.json` (nombre, color, ícono, pestañas), `body.html`, `app.js` y `app.css` opcional.
- `src/build.py`: genera cada carpeta `microapps/<app>/` (index.html, manifest, service worker, ícono) y la página índice.

Para regenerar después de un cambio: `python3 microapps/src/build.py`

El perfil del negocio (nombre, logo, NIT, moneda) se comparte entre todas las microapps del mismo dispositivo.

---
Diseño y desarrollo: **José Lugo**, WhatsApp +57 312 638 7467, jose.lugocdv@gmail.com
