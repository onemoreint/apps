# Modelo de datos propuesto · Fase 2 (Supabase)

> **Propuesta, aún no implementada.** Nada de esto existe todavía en Supabase.
> Se revisa contigo antes de crearlo.

## Idea general

Una sola base de datos atiende a **muchas tiendas** (una por unidad residencial).
Cada fila lleva `tienda_id`, y las reglas de seguridad (Row Level Security) hacen que
cada administrador solo vea su tienda y que los residentes nunca vean datos de otros.

```
tiendas ──< categorias
   │    ──< productos
   │    ──< metodos_pago
   │    ──< horarios
   │    ──< miembros_tienda >── auth.users (administradores / vendedores)
   │    ──< pedidos ──< pedido_items
   │                ──< pedido_eventos (historial de estados)
   │                ──< comprobantes (archivo en Storage privado)
```

## Tablas

| Tabla | Campos principales | Quién la lee |
|---|---|---|
| `tiendas` | id, slug (único), nombre, conjunto, eslogan, logo_url, whatsapp, prefijo_pedido, costo_domicilio, domicilio_gratis_desde, pedido_minimo, punto_recogida, torres (lista), activa | Pública (solo campos públicos, vía vista) |
| `categorias` | id, tienda_id, nombre, emoji, orden, activa | Pública |
| `productos` | id, tienda_id, categoria_id, nombre, descripcion, unidad, precio (entero COP), stock, imagen_url, activo, actualizado_en | Pública (solo activos) |
| `metodos_pago` | id, tienda_id, tipo (nequi/daviplata/transferencia), titular, banco, tipo_cuenta, numero, documento, instrucciones, activo | Pública (solo activos) |
| `horarios` | id, tienda_id, dia_semana, abre, cierra | Pública |
| `miembros_tienda` | tienda_id, user_id, rol (`dueno`, `admin`, `vendedor`) | Solo el propio usuario |
| `pedidos` | id, tienda_id, numero (único por tienda), solicitud_id (único por tienda), cliente_nombre, cliente_telefono, torre, apto, tipo_entrega, subtotal, costo_domicilio, total, metodo_pago, referencia_pago, **estado_pago**, **estado_pedido**, notas, creado_en | Solo personal de la tienda |
| `pedido_items` | pedido_id, producto_id, nombre (copia), precio_unitario (copia), cantidad, subtotal | Solo personal de la tienda |
| `pedido_eventos` | pedido_id, tipo (pedido/pago), de, a, usuario_id, fecha | Solo personal de la tienda |
| `comprobantes` | pedido_id, ruta_storage, tipo, tamano | Solo personal de la tienda |

Estados separados, como pediste:

- `estado_pedido`: pendiente → confirmado → preparando → listo → entregado (o cancelado)
- `estado_pago`: pendiente_verificacion → verificado (o rechazado)

## Cómo se crea un pedido de forma segura

El residente **no inserta** directamente en `pedidos`. Llama a una función del servidor
`crear_pedido(tienda_slug, solicitud_id, items[{producto_id, cantidad}], datos_cliente, entrega, pago)` que:

1. Si ya existe un pedido con ese `solicitud_id` en la tienda, devuelve ese mismo (anti-duplicados).
2. Lee precios y existencias **desde la tabla**, ignora cualquier precio que mande el navegador.
3. Verifica stock, pedido mínimo y horario; calcula domicilio y total.
4. Descuenta existencias y crea pedido + ítems en una sola transacción.
5. Genera el número de pedido en el servidor.
6. Devuelve solo: número, total y estados.

Consulta de estado: función `consultar_pedido(tienda_slug, numero, ultimos4)` que devuelve
solo número, estados, fecha y total (sin nombre, teléfono ni apartamento), con límite de intentos.

## Seguridad

- En el frontend solo va la **clave pública** (publishable/anon) de Supabase, que está
  pensada para ser visible. La clave secreta (service_role) **nunca** va al repositorio.
- RLS activado en todas las tablas. Los residentes no pueden leer `pedidos` directamente.
- Comprobantes en un bucket **privado**; solo el personal de la tienda obtiene enlaces temporales.
- Teléfonos y apartamentos solo visibles para el personal de la tienda.
