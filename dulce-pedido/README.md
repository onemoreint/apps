# DULCE PEDIDO

Tienda digital para emprendimientos de repostería: los clientes abren un enlace, ven el catálogo con precios, arman su pedido y lo envían por WhatsApp con un resumen listo. La propietaria administra productos, fotos, entregas, calendario y pedidos desde un panel protegido.

- **Tienda publicada (demo):** https://onemoreint.github.io/apps/dulce-pedido/app/
- **Panel:** https://onemoreint.github.io/apps/dulce-pedido/app/#/admin

> La tienda de demostración (`dulce-pedido-demo`) usa productos y precios **de ejemplo** con fotografías reales de banco (Unsplash) marcadas como «Foto de referencia» ([créditos](docs/CREDITOS.md)). Si un producto no tiene foto, se muestra un espacio neutro «Foto próximamente»; nunca dibujos.

## Qué hace

| Cliente (sin registrarse) | Propietaria (panel con contraseña) |
|---|---|
| Inicio con portada, categorías, destacados, cómo pedir, entregas, eventos, preguntas frecuentes y testimonios reales (si existen) | Pedidos con 7 estados, notas internas, botón para escribir al cliente |
| Catálogo con búsqueda (sin importar tildes) y filtro por categoría | Productos: fotos (se optimizan solas), precios, presentaciones con precio propio, sabores, mínimos, tiempo de preparación, alérgenos, conservación, agotado/oculto, orden |
| Ficha con presentaciones, sabores (cajas surtidas: varios), cantidad mínima | Categorías: crear, renombrar, ordenar, ocultar |
| Carrito persistente: cambiar cantidades, quitar, vaciar | Entregas: recogida, domicilio por zonas (tarifa o «se cotiza»), días de atención, franjas, anticipación máxima, fechas bloqueadas |
| Formulario mínimo con validación y fechas posibles según preparación, días y bloqueos | Mi negocio: nombre, WhatsApp, logo, foto principal, colores, todos los textos, FAQ, testimonios, redes, política de privacidad, retención de datos |
| Mensaje de WhatsApp armado, con código de solicitud y total estimado | Estadísticas: solicitudes, confirmadas, ventas, ticket promedio, más pedidos |

**Solicitado ≠ confirmado.** Al preparar el pedido, el sistema registra una *solicitud* (estado «Solicitud recibida») y abre WhatsApp con el mensaje. No envía nada solo, no simula pagos y no reserva fechas: la vendedora confirma por WhatsApp y cambia el estado en el panel. El sistema no puede saber si el cliente pulsó «enviar» en WhatsApp; el panel lo advierte.

## Arquitectura (resumen)

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 4. Archivos estáticos (GitHub Pages, Netlify, Cloudflare Pages o cualquier hosting). Navegación por `#/ruta`, sin configurar servidor. PWA instalable.
- **Backend:** Supabase (Postgres + Auth + Storage). Tablas `dp_*` con **RLS** por tienda. Los visitantes no leen tablas: usan dos funciones públicas:
  - `dp_tienda_publica(slug)` — catálogo sin datos privados.
  - `dp_crear_pedido(slug, pedido)` — **recalcula precios, valida fechas, mínimos, sabores, zonas** y registra la solicitud. El navegador solo envía identificadores y cantidades.
- **Multi-tienda desde el día uno**, sin complejidad extra: cada fila tiene `tienda_id`; una tienda nueva es una fila más (`dp_crear_tienda`). Detalles en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).
- **Modo demostración:** sin variables de Supabase, la tienda funciona con `public/demo/catalogo.json` (sin panel ni registro de pedidos).

## Ejecutar localmente

```bash
cd dulce-pedido
npm install
npm run dev                # modo demostración en http://localhost:5173
cp .env.example .env.local # (opcional) poner URL y clave publicable de Supabase → modo real
npm test                   # 44 pruebas: lógica + base de datos real en memoria (PGlite) con RLS
npm run typecheck
```

## Publicar

`npm run build:pages` compila en `app/` para GitHub Pages (con el proyecto Supabase de producción). Dominio propio, Netlify/Cloudflare y configuración de Supabase: [docs/PUBLICAR.md](docs/PUBLICAR.md).

## Documentos

- [docs/GUIA-PROPIETARIA.md](docs/GUIA-PROPIETARIA.md) — uso diario para la dueña del negocio.
- [docs/NUEVA-TIENDA.md](docs/NUEVA-TIENDA.md) — vender el sistema: alta de una tienda nueva sin programar.
- [docs/LANZAMIENTO.md](docs/LANZAMIENTO.md) — lista de comprobación antes de compartir el enlace.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — datos, seguridad, decisiones y ruta de evolución.
- [docs/PRUEBAS.md](docs/PRUEBAS.md) — qué se probó, cómo, y qué no está implementado.

## Estructura

```
dulce-pedido/
├─ src/core/        lógica pura y probada: dinero, fechas, carrito, validación, WhatsApp
├─ src/tienda/      tienda pública
├─ src/admin/       panel (se descarga solo al entrar a #/admin)
├─ src/datos/       acceso a Supabase o al catálogo demo
├─ supabase/        migraciones, seed demo, setup.sql y pruebas de base de datos
├─ public/          íconos, imagen para compartir y catálogo demo
├─ scripts/         compilación para Pages, datos demo, SQL de instalación, pruebas E2E móviles
└─ app/             versión publicada (generada)
```

---
Desarrollado para José Lugo · +57 312 638 7467.
