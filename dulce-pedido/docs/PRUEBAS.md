# Pruebas y alcance

## Automáticas (`npm test`, también en GitHub Actions)

**Lógica (`src/core/core.test.ts`, 21 pruebas)**
- Formato COP (`$1.250.000`) y lectura de precios escritos a mano.
- Fechas en hora de Colombia: no permite pasadas, respeta horas de preparación desde la hora actual, días de atención, fechas bloqueadas, anticipación máxima y fechas inválidas.
- Carrito: precio por variante, subtotales, agotados, variantes no disponibles, mínimos, productos eliminados del catálogo.
- Domicilio: recogida gratis, tarifa por zona, «pendiente de cotizar» (no se suma al total).
- Mensaje de WhatsApp: contenido completo según el formato pedido, codificación de tildes, saltos, `#`, `&` y comillas.
- Validación del formulario con mensajes comprensibles.

**Base de datos real en memoria (`supabase/tests/db.test.ts`, 23 pruebas)** — PostgreSQL (PGlite) con las migraciones reales y los permisos por defecto de Supabase:
- Catálogo público sin datos internos ni de otras tiendas; tiendas inactivas no se muestran.
- Visitantes no pueden leer ni escribir tablas ni crear tiendas.
- `dp_crear_pedido` ignora precios enviados por el navegador y recalcula todo; rechaza agotados, variantes ajenas, sabores inventados, cantidades fraccionarias/negativas o bajo el mínimo, productos de otra tienda, fechas imposibles, franjas, zonas y direcciones faltantes, falta de autorización; limita solicitudes repetidas.
- Aislamiento entre tiendas (RLS) en pedidos, productos, variantes y fotos.
- La propietaria solo cambia estado y notas de un pedido; no puede alterar consecutivo, límite ni activación.
- Invitaciones solo con correo verificado; anonimización solo por la propietaria.

## Manuales/E2E ejecutadas en esta entrega

- `scripts/e2e-movil.cjs` — Chromium a 390 × 844: inicio, catálogo, búsqueda sin tildes, filtro, ficha con presentaciones, sabores (máximo 2), mínimo de 6, carrito ($150.000), errores del formulario, domicilio ($9.000), total ($159.000), mensaje y enlace `wa.me` completos, carrito vacío después, privacidad, panel y vista de escritorio. Sin desborde horizontal ni errores de consola.
- `scripts/e2e-panel.cjs` — modo con servidor y panel con respuestas de Supabase simuladas: error del servidor mostrado al cliente, registro con código `DP-0003`, solo ids y cantidades enviados, sesión del panel, cambio de estado (solo `estado` y `notas_internas`), todas las secciones del panel en celular y guardado de producto.
- Producción (Supabase): catálogo público visible como `anon`; `anon` sin acceso a pedidos; un pedido de prueba recalculado por el servidor dentro de una transacción revertida (no quedó en la base).

## No probado en esta entrega
- Inicio de sesión real, recuperación de contraseña y subida real de fotos contra Supabase: el entorno de construcción no tiene salida a supabase.co. La lógica de permisos está probada en PGlite; hay que hacer la prueba del panel en vivo (ver LANZAMIENTO.md).
- Safari/iOS real (se probó Chromium móvil).

## No implementado (a propósito, fuera del MVP)
- Pagos en línea, abonos o pasarelas.
- Envío automático de WhatsApp (WhatsApp Business Platform). El cliente siempre envía el mensaje desde su WhatsApp.
- Saber si el cliente efectivamente envió el mensaje.
- Inventario por unidades y descuento automático de existencias.
- Notificaciones push o por correo a la propietaria cuando llega una solicitud (el panel se actualiza cada minuto).
- Registro autoservicio de nuevas tiendas, cobro de suscripción, subdominios automáticos.
- Vista previa al compartir (título/imagen) personalizada por tienda: es la general de Dulce Pedido salvo que se compile una copia con dominio propio.
