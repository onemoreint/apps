# Microapps para Negocios, de José Lugo

Herramientas web para emprendedores y pymes. Cada una es una página autocontenida (PWA): funciona sin internet, se instala en el celular y guarda los datos solo en el dispositivo.

Vitrina (landing negra con todas las apps): https://onemoreint.github.io/apps/microapps/ . Se genera desde `src/landing.py`.

| Microapp | Enlace |
|---|---|
| Punto de Equilibrio | https://onemoreint.github.io/apps/microapps/punto-equilibrio/ |
| Precios Multimoneda | https://onemoreint.github.io/apps/microapps/precios-multimoneda/ |
| Comisiones de Venta | https://onemoreint.github.io/apps/microapps/comisiones-ventas/ |
| Cotizador y Facturador | https://onemoreint.github.io/apps/microapps/facturador/ |
| Control de Caja | https://onemoreint.github.io/apps/microapps/control-caja/ |
| Kardex de Inventario | https://onemoreint.github.io/apps/microapps/kardex-inventario/ |
| Cuentas por Cobrar y Pagar | https://onemoreint.github.io/apps/microapps/cuentas-cobrar-pagar/ |
| Flujo de Caja a 12 Meses | https://onemoreint.github.io/apps/microapps/flujo-caja/ |
| Estado de Resultados y Balance | https://onemoreint.github.io/apps/microapps/estados-financieros/ |
| Plan de Negocio Express | https://onemoreint.github.io/apps/microapps/plan-negocio/ |
| Nómina Colombia y Venezuela | https://onemoreint.github.io/apps/microapps/nomina/ |
| Horas Extras y Recargos | https://onemoreint.github.io/apps/microapps/horas-extras/ |
| Asistencia y Vacaciones | https://onemoreint.github.io/apps/microapps/asistencia-vacaciones/ |
| Costo de Receta | https://onemoreint.github.io/apps/microapps/costo-receta/ |
| Proyectos Gantt y Kanban | https://onemoreint.github.io/apps/microapps/proyectos/ |
| Calculadoras de Ingeniería Civil | https://onemoreint.github.io/apps/microapps/ingenieria-civil/ |

## Cómo está organizado

- `src/core/`: diseño, utilidades y firma compartidos por todas las apps.
- `src/apps/<app>/`: `meta.json` (nombre, color, ícono, pestañas), `body.html`, `app.js` y `app.css` opcional.
- `src/build.py`: genera cada carpeta `microapps/<app>/` (index.html, manifest, service worker, ícono) y la página índice.

Para regenerar después de un cambio: `python3 microapps/src/build.py`

El perfil del negocio (nombre, logo, NIT, moneda) se comparte entre todas las microapps del mismo dispositivo.

Los valores legales de nómina y horas extra (Colombia y Venezuela) están en `src/apps/nomina/app.js` y `src/apps/horas-extras/app.js`, vigentes a octubre de 2026, y cada usuario puede editarlos desde la app.

---
Diseño y desarrollo: **José Lugo**, WhatsApp +57 312 638 7467, jose.lugocdv@gmail.com
