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

## Versión «con tu marca» (licencias)

`src/marca.py` genera en minutos la copia personalizada de un cliente: su logo, colores y nombre en todas las pantallas, ícono propio al instalarla, datos guardados aparte de la demo pública, número de licencia en el pie y `noindex` para buscadores.

```
python3 microapps/src/marca.py cliente.json --entrega ./entregas
```

`cliente.json` lleva al menos `nombre` y `pack` (`nomina`, `tienda`, `receta`, `civil`, `finanzas` o una lista de apps); opcionales `logo`, `color`, `doc`, `tel`, `email`, `dir`, `ciudad`, `moneda`. La copia queda en `clientes/<carpeta>/` con un sufijo aleatorio en la dirección, y `--entrega` produce el PDF con QR y el mensaje para el cliente. Para actualizar una copia ya entregada sin cambiar su enlace, se repiten `carpeta` y `licencia` en el JSON.

Demos públicas: [Nómina](https://onemoreint.github.io/apps/microapps/clientes/demo-nomina/) y [Sistema administrativo](https://onemoreint.github.io/apps/microapps/clientes/demo-tienda/), con marcas de ejemplo.

## Seguridad y normativa

- **Política de privacidad** (Ley 1581 de 2012 de Colombia y art. 28 de la Constitución de Venezuela): `privacidad/`. **Términos de uso**: `terminos/`. Se generan desde `src/legal.py` y se enlazan desde la landing y la firma de cada app.
- **Content-Security-Policy** en cada página con hash SHA-256 de cada script en línea (`src/seguridad.py`): solo se ejecuta el código propio; sin `eval` ni scripts de terceros.
- **Sin peticiones a terceros**: las fuentes (licencia OFL) se sirven desde `fonts/`. No hay cookies, analítica ni rastreadores; los datos del usuario quedan en su dispositivo.
- **Referrer-Policy** estricta y enlaces externos con `rel="noopener noreferrer"`.
- **Exportación CSV protegida** contra inyección de fórmulas en Excel.
- Límite de GitHub Pages: no admite cabeceras HTTP propias (HSTS, X-Frame-Options); para eso habría que servir el sitio detrás de un proxy como Cloudflare o Netlify.

---
Diseño y desarrollo: **José Lugo**, WhatsApp +57 312 638 7467, jose.lugocdv@gmail.com
