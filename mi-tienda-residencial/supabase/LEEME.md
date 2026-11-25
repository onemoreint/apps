# Base de datos (Supabase)

Proyecto: `mi-tienda-residencial` (región São Paulo, sa-east-1).

Aquí está el SQL que creó la base de datos, en el orden en que se aplicó.
Sirve para documentar y para crear la misma estructura en otro proyecto
(otra tienda u otro cliente) desde el **SQL Editor** de Supabase.

| Archivo | Qué hace |
|---|---|
| `01_esquema_tienda.sql` | Tablas, reglas de seguridad (RLS) y permisos por rol |
| `02_funciones_pedidos.sql` | `crear_pedido` y `consultar_pedido` (precios, existencias, total y número los calcula el servidor) |
| `03_ajustes.sql` | Función de roles en esquema privado y corrección de validación |

**Seguridad**
- Los residentes solo pueden **leer** el catálogo activo y usar las dos funciones.
  No pueden leer ni modificar pedidos de nadie.
- La consulta de estado pide número + últimos 4 dígitos del celular y nunca devuelve
  nombre ni teléfono.
- El personal (tabla `miembros_tienda`, roles `dueno`, `admin`, `vendedor`) podrá ver
  y gestionar los pedidos de su tienda cuando se active el panel (fase 3).
- En el repositorio solo va la clave **publicable**. La clave secreta nunca se sube.
