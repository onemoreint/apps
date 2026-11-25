# Mi Tienda Residencial · Fase 2 (con base de datos)

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
| Número de pedido único (ej. `FDL-261124-RXE3`) | ✅ Lo genera el servidor |
| Pedidos guardados en la base de datos (Supabase) | ✅ Precios, domicilio, total y existencias los calcula y valida el servidor |
| Evitar pedidos duplicados por doble toque | ✅ Funciona |
| Envío del pedido completo a la tienda por WhatsApp | ✅ Funciona |
| Horario de atención (abierto/cerrado) | ✅ Funciona |
| Instalable y abre sin internet | ✅ Funciona (al publicarla en GitHub Pages) |
| Consulta del estado del pedido | ✅ Desde cualquier teléfono (número + 4 dígitos). El estado avanza cuando la tienda lo cambie (panel, fase 3) |
| Comprobante de pago | ⚠️ **No se sube** a ningún lado; el residente lo adjunta en el chat de WhatsApp |
| Inventario | ✅ Se descuenta en la base de datos con cada pedido; no deja vender más de lo que hay |
| Panel administrativo con inicio de sesión | ❌ Fase 3. Mientras tanto, los pedidos se ven en Supabase → Table Editor → `pedidos` |

La página lo dice con la franja amarilla de "Versión de prueba".

## Base de datos (fase 2)

- Proyecto Supabase: `mi-tienda-residencial` (São Paulo). El SQL está en la carpeta `supabase/`.
- La tienda se identifica por `slug` en `js/config.tienda.js` (`flor-de-lotto`). Nombre, WhatsApp,
  pagos, horarios, domicilio y productos se editan **en la base de datos** (tablas `tiendas`,
  `metodos_pago`, `horarios`, `categorias`, `productos`); el panel de la fase 3 lo hará con botones.
- Sin internet, la tienda muestra el último catálogo guardado; crear o consultar pedidos sí necesita conexión.
- Si se borra el bloque `supabase` de `js/config.tienda.js`, todo vuelve al modo demostración local.
- **Nueva tienda (otro conjunto):** insertar otra fila en `tiendas` con su `slug`, y publicar una
  copia de la carpeta con ese `slug` y su logo en `js/config.tienda.js`.

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

## Modo tienda (pistola lectora de códigos)

Página para el personal de la tienda: **`tienda.html`**
(en línea: `https://onemoreint.github.io/apps/mi-tienda-residencial/tienda.html`).
No aparece en la tienda de los residentes; se abre con ese enlace y se puede instalar
como app en el computador o tablet de la tienda.

**La pistola:** cualquier lector USB o Bluetooth en modo teclado (HID). Debe ser **2D** para
leer los QR de pedido; una 1D solo lee códigos de barras. Lo leído entra en la casilla grande
y la app decide qué es. En Chrome de Android aparece además un botón 📷 para leer con la cámara.

| Pestaña | Qué hace |
|---|---|
| 📦 Pedidos | El cliente muestra el **código de su pedido** (sale en la confirmación). Al escanearlo se ven el número, la torre y el apartamento, el total, el método de pago y, si es efectivo, el **cambio a entregar**. "Marcar como entregado" lo registra y avisa si se escanea dos veces. |
| 🧾 Mostrador | Venta en mostrador: cada producto escaneado suma una unidad. Muestra el total, calcula el cambio y registra la venta del día. |
| 🏷️ Productos | Al escanear un producto se ven su precio y existencias. Incluye una **hoja de códigos de prueba** para imprimir y probar la pistola. |

**Límites de esta fase (dilo así al cliente):**
- Entregas y ventas se guardan **solo en ese equipo**. Las existencias no se descuentan.
- El QR del pedido trae los datos principales del pedido (no la lista de productos). La tienda
  los compara con el mensaje de WhatsApp. Con la base de datos (fase 2), escanear el pedido
  traerá el pedido completo y su estado real.
- Los códigos de barras de la demo son **de prueba** (`7709990…`). En la fase 3 cada producto
  se registrará escaneando el código real de su empaque.

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

Cuando cambies archivos más adelante, sube el número de `VERSION` en `sw.js` y el `?v=`
de los archivos en `index.html` (ej. `?v=1.2.2`) para que los celulares descarguen la versión nueva.

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
