# MALCRIADO · Menú Digital

Menú web interactivo para **MALCRIADO · coffee · waffles · bakery** (La Estrella, Antioquia).
Pedidos directos por WhatsApp, sin pasarela de pago ni API paga.

🔗 **https://onemoreint.github.io/apps/malcriado/**

## Qué incluye

- **Carta completa**: 85 productos en 14 categorías (waffles dulces y salados, especiales, malcrihelados, pancakes, crepes, para picar, fuertes, almuerzo del día, cafés calientes y fríos, bebidas, cócteles y adicionales).
- **Firu, el mesero** 🐶 — recomendador animado. Saluda según la hora del día, ofrece 7 caminos (dulce, salado, para tomar, frío, barato, para compartir, sorpresa) y con *"¿Qué me falta?"* lee el pedido actual para sugerir bebida, postre o adicional.
- **Carrito con WhatsApp**: arma el mensaje con cantidades, subtotales, total y notas, y lo abre en `wa.me/573015259674`.
- **Buscador en vivo** y filtros por categoría.
- **PWA offline**: service worker *network-first* (precios siempre al día, copia local solo sin conexión) e instalable desde el celular.
- Pedido guardado en `localStorage`.

## Estructura

```
malcriado/
├── index.html            # toda la app (HTML + CSS + JS vanilla, sin dependencias)
├── manifest.webmanifest
├── sw.js
└── img/                  # fotos de platos, iconos PWA e imagen para compartir
```

## Actualizar la carta

Los productos están en el array `MENU` dentro de `index.html`:

```js
{c:'waffles-dulces', n:'CHIHUAHUA', d:'½ waffle + helado + fresa + salsa', p:7900, e:'top', et:'Más pedido'}
```

- `c` categoría (ver array `CATEGORIAS`) · `n` nombre · `d` descripción · `p` precio en pesos
- `e` etiqueta opcional: `top`, `chef`, `nuevo`, `temp` · `et` texto de esa etiqueta

Tras cambiar precios, sube el número de versión en `sw.js` (`CACHE = 'malcriado-v2'`) para que a los clientes les llegue la carta nueva.

## Datos del negocio

- 📍 CL 75 S # 54A - 150, Local 9803 · La Estrella, Antioquia
- 🛵 Domicilios: 301 525 9674
- 📷 [@malcriadocoffee](https://instagram.com/malcriadocoffee)
