# JC Shops

Tienda web de ropa femenina para compradoras en Colombia. Precios en pesos colombianos (COP), pedidos por WhatsApp a Jaqueline Cataño (+57 302 291 7846) y pagos por transferencia Bancolombia o Llave Bre-B.

Es una sola página (`index.html`) sin servidor: el carrito, los favoritos y la paleta elegida se guardan en el navegador de cada clienta.

## Panel de precios

`admin.html` (https://onemoreint.github.io/apps/jcshops/admin.html) muestra todas las prendas con su costo de proveedor, precio de oferta, precio regular, ganancia por unidad y existencias por talla. Al cambiar un costo, los precios se recalculan con el margen elegido (65 % por defecto); también se pueden escribir a mano. Desde ahí se puede ocultar una prenda sin borrarla y marcarla como nueva.

«Publicar en la tienda» guarda los cambios en `catalogo.js` directamente en GitHub. Necesita un token personal de GitHub (fine-grained, solo el repositorio `onemoreint/apps`, permiso *Contents: Read and write*), que se guarda únicamente en el navegador de quien lo usa. Sin token se puede revisar y descargar `catalogo.js` para subirlo a mano. La tienda tarda uno o dos minutos en reflejar los cambios.

## Qué editar

El catálogo vive en `catalogo.js` (JSON). Lo demás se edita dentro de `index.html`, en los bloques marcados con comentarios:

| Qué | Dónde |
|---|---|
| Prendas, costos, precios, tallas, existencias y colores | `catalogo.js` (o el panel `admin.html`). `costo` y `costoRegular` son lo que cobra el proveedor; `oculto: true` la saca de la tienda |
| Fotos de cada color | `colores[].fotos`, con claves `'foto:nombre'` que apuntan a `window.JC_FOTOS` |
| Archivos de las fotos | Carpeta `img/` (formato vertical, idealmente 3:4) |
| WhatsApp, banco, cuenta y llave Bre-B | Bloque `CONFIGURACIÓN DE LA TIENDA` (`const TIENDA = {...}`) |
| QR oficial de pago | `img/qr-breb-bancolombia.png` y la línea `window.JC_QR_OFICIAL`. Si se deja vacía, la tienda muestra solo la transferencia manual |
| Paletas de color | Bloque `PALETAS` (rosa empolvado por defecto, champán y negro, salvia y arena). La rosa pasa sola a modo noche si el celular está en modo oscuro |
| Cuenta regresiva de ofertas | `TIENDA.ofertaHasta` con una fecha, por ejemplo `'2026-11-30T23:59:00-05:00'` (`null` la oculta) |
| Barra de envío gratis | `TIENDA.envioGratisDesde` con un monto en COP, por ejemplo `250000` (`null` la oculta) |
| QR visible en «Cómo comprar» | `img/qr-breb-recorte.png` y la línea `window.JC_QR_RECORTE` |

## Precios

Precio de venta = precio del proveedor (Shein / Temu) + 65 %, redondeado a la centena hacia arriba. Las prendas con descuento muestran tres renglones: precio de oferta, precio regular tachado y ahorro en pesos y porcentaje, calculados a partir de `precio` y `oferta`.

## Para agregar una prenda

1. Guarda sus fotos en `img/` (por ejemplo `r06-negro-1.jpg`).
2. Agrega la clave en `window.JC_FOTOS`: `"r06-negro-1": "img/r06-negro-1.jpg"`.
3. Agrega la prenda en `catalogo.js` siguiendo el formato de las existentes. Si usas una categoría nueva (por ejemplo `Vestidos`), aparece sola en los menús y filtros.

## Enlaces para compartir

Cada prenda tiene su enlace directo: `.../jcshops/#prenda-r02` abre la ficha del conjunto polo. El botón «Compartir» debajo de cada artículo ofrece WhatsApp, Facebook, copiar enlace y, en celular, el menú de compartir del teléfono.
