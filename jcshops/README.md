# JC Shops

Tienda web de ropa femenina para compradoras en Colombia. Precios en pesos colombianos (COP), pedidos por WhatsApp a Jaqueline Cataño (+57 302 291 7846) y pagos por transferencia Bancolombia o Llave Bre-B.

Es una sola página (`index.html`) sin servidor: el carrito, los favoritos y la paleta elegida se guardan en el navegador de cada clienta.

## Qué editar

Todo se edita dentro de `index.html`, en los bloques marcados con comentarios:

| Qué | Dónde |
|---|---|
| Prendas, precios, tallas, existencias y colores | Bloque `CATÁLOGO` (`const CATALOGO = [...]`) |
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
3. Agrega la prenda en `CATALOGO` siguiendo el formato de las existentes. Si usas una categoría nueva (por ejemplo `Vestidos`), aparece sola en los menús y filtros.

## Enlaces para compartir

Cada prenda tiene su enlace directo: `.../jcshops/#prenda-r02` abre la ficha del conjunto polo. El botón «Compartir» debajo de cada artículo ofrece WhatsApp, Facebook, copiar enlace y, en celular, el menú de compartir del teléfono.
