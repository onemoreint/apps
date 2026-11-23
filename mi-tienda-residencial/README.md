# Mi Tienda Residencial · Fase 1

Tienda web para residentes de un conjunto: catálogo, carrito, pedido con domicilio
o recogida, pago por Nequi, Daviplata o transferencia, y envío del pedido por WhatsApp.

Hecha con HTML, CSS y JavaScript sin frameworks. Funciona en GitHub Pages y se puede
instalar en el celular como aplicación (PWA).

---

## Qué funciona de verdad y qué no (todavía)

| Función | Estado en la fase 1 |
|---|---|
| Catálogo con fotos, precios, categorías | ✅ Funciona (fotos de referencia de Unsplash; si una no carga se muestra un ícono) |
| Buscador (sin importar tildes ni mayúsculas) | ✅ Funciona |
| Carrito con cantidades, límite por existencias y totales automáticos | ✅ Funciona |
| Domicilio al apartamento o recogida en tienda, costo y domicilio gratis desde un monto | ✅ Funciona |
| Formulario con nombre, celular, torre y apartamento (validado) | ✅ Funciona |
| Datos de pago Nequi / Daviplata / transferencia con botón "Copiar número" | ✅ Funciona |
| Aprobación del total: el residente marca "apruebo pagar $X" antes de confirmar (si el total cambia, debe aprobar de nuevo) | ✅ Funciona |
| Código QR en el pedido con los datos de la cuenta y el valor exacto | ✅ Funciona (QR informativo; ver nota abajo) |
| Pago en efectivo: el residente dice con cuánto paga y el pedido muestra el cambio que debe llevar el domiciliario | ✅ Funciona |
| Número de pedido único (ej. `MTR-261123-RXE3`) | ✅ Se genera en el teléfono del residente |
| Evitar pedidos duplicados por doble toque | ✅ Funciona |
| Envío del pedido completo a la tienda por WhatsApp | ✅ Funciona |
| Horario de atención (abierto/cerrado) | ✅ Funciona |
| Instalable y abre sin internet | ✅ Funciona (al publicarla en GitHub Pages) |
| Consulta del estado del pedido | ⚠️ Solo encuentra pedidos hechos **en ese mismo teléfono**, y el estado siempre dice "Pendiente" porque aún no hay panel |
| Comprobante de pago | ⚠️ **No se sube** a ningún lado; el residente lo adjunta en el chat de WhatsApp |
| Inventario | ⚠️ Es de demostración: se descuenta solo en el teléfono de quien compra |
| Panel administrativo, inicio de sesión, base de datos | ❌ Fase 2 y 3 (Supabase) |

La página lo dice abiertamente con la franja amarilla de "Versión de demostración".

---

## Estructura de archivos

```
mi-tienda-residencial/
├── index.html              ← la página (todas las pantallas)
├── manifest.webmanifest    ← datos para instalarla como app
├── sw.js                   ← permite abrirla sin internet
├── css/
│   └── estilos.css         ← colores y diseño (los colores están al inicio, en :root)
├── js/
│   ├── config.tienda.js    ← ★ DATOS DE LA TIENDA: nombre, logo, WhatsApp, pagos, horarios
│   ├── productos.demo.js   ← ★ productos y categorías de ejemplo
│   ├── utilidades.js       ← funciones de apoyo (formato de pesos, horarios…)
│   ├── datos.js            ← capa de datos (hoy: navegador; fase 2: Supabase)
│   ├── carrito.js          ← lógica del carrito
│   └── app.js              ← pantallas y botones
├── img/                    ← logo e íconos
└── docs/
    └── MODELO-DE-DATOS.md  ← propuesta de base de datos para la fase 2
```

Los archivos con ★ son los que se editan para cada tienda nueva.

---

## Paso 1 · Probarla en tu Mac

1. Descomprime el ZIP.
2. Abre la app **Terminal** y escribe (cambia la ruta si la carpeta quedó en otro lugar):
   ```
   cd ~/Downloads/mi-tienda-residencial
   python3 -m http.server 8000
   ```
3. Abre Safari o Chrome en `http://localhost:8000`.
4. Para detener el servidor: en la Terminal presiona `Ctrl + C`.

> También puedes abrir `index.html` con doble clic: todo funciona, excepto el modo sin internet.

**Prueba completa sugerida:** busca "leche", agrega productos, intenta agregar más café
del que hay (son 3), ve al carrito, confirma el pedido sin llenar nada (verás los avisos),
llénalo, confirma y toca "Enviar pedido por WhatsApp". Luego ve a "Mi pedido" y consulta
con el número y los últimos 4 dígitos del celular.

Para reiniciar la demo (existencias y pedidos), abre la consola del navegador y escribe
`Datos.reiniciarDemo()`.

---

## Paso 2 · Personalizar una tienda

Abre `js/config.tienda.js` con un editor de texto (TextEdit en modo texto, o VS Code) y cambia:

- `nombre`, `conjunto`, `eslogan`
- `logo`: pon el archivo del logo en la carpeta `img/` y escribe su ruta, ej. `"img/logo-tienda.png"`
- `whatsapp`: `57` + el celular, solo números. Ej: `"573126387467"`
- `prefijoPedido`: 3 letras para los números de pedido, ej. `"TPV"`
- `torres`: la lista de torres del conjunto
- `entrega`: costo de domicilio, desde cuánto es gratis, pedido mínimo, punto de recogida
- `horarios`: días y horas de atención
- `pagos`: titular, número, banco. Pon `activo: false` para ocultar un método (incluido "Efectivo")

**Sobre el código QR:** si la tienda no tiene QR propio, la app genera uno con los datos de la
cuenta y el valor. Al escanearlo con la cámara se leen esos datos, pero **no abre el pago
automático** en Nequi o Daviplata. Si la tienda tiene el QR **oficial** de su banco (Nequi,
Daviplata o Bre-B), guarda esa imagen en `img/` y pon su ruta en `qrImagen` del método de pago:
la app mostrará ese QR, que sí se puede escanear para pagar desde la app del banco.

Para los productos, edita `js/productos.demo.js`. Las fotos actuales son **de referencia** (Unsplash, licencia gratuita) solo para la demostración; reemplázalas por fotos propias de cada tienda. Para usar fotos reales, guarda las imágenes
en `img/productos/` (cuadradas, idealmente 600×600 px, en .webp o .jpg) y agrega al producto
`imagen: "img/productos/arroz.webp"`. Si no hay foto, se muestra el emoji.

Para cambiar colores, edita las primeras líneas de `css/estilos.css` (`--verde`, `--dorado`…).

**Importante:** en estos archivos solo van datos que el residente igual ve en pantalla.
Nunca pongas contraseñas ni claves.

---

## Paso 3 · Subirla a GitHub (repo onemoreint/apps)

1. Copia la carpeta `mi-tienda-residencial/` completa dentro de tu copia local del repo `apps`.
2. En la Terminal, dentro de la carpeta del repo:
   ```
   git add mi-tienda-residencial
   git commit -m "Mi Tienda Residencial: fase 1 (frontend)"
   git push
   ```
3. En 1 o 2 minutos quedará en `https://onemoreint.github.io/apps/mi-tienda-residencial/`
   (si GitHub Pages ya está activo en ese repo, como en tus otras microapps).

Cuando cambies archivos más adelante, sube el número de `VERSION` en `sw.js`
(ej. `mtr-v1.0.1`) para que los celulares descarguen la versión nueva.

---

## Fases del proyecto

1. **Fase 1 (esta):** frontend del residente con datos de demostración y pedido por WhatsApp.
2. **Fase 2:** Supabase. Base de datos real, catálogo desde la nube, pedidos guardados en
   el servidor con precio, existencias, total y número calculados allá (el residente no
   puede alterarlos), comprobantes en almacenamiento privado, consulta de estado real.
3. **Fase 3:** panel administrativo con inicio de sesión: productos, precios, existencias,
   pedidos, verificación de pagos, estados, ventas y configuración de la tienda.
4. **Fase 4:** multi-tienda comercial: varias unidades residenciales en una sola instalación,
   cada una con su enlace, logo, productos y cuentas bancarias.

Desarrollado por José Lugo · +57 312 638 7467 · jose.lugocdv@gmail.com
