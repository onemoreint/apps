# Vender el sistema: alta de una tienda nueva

Todas las tiendas comparten el mismo código y el mismo proyecto Supabase; cada negocio es una fila en `dp_tiendas` y sus datos están aislados por RLS. Crear una tienda **no requiere programar**.

## Qué es de quién

| Elemento | Dónde vive | Quién lo cambia |
|---|---|---|
| Código de la aplicación | `dulce-pedido/` (común a todas) | Tú (programación) |
| Configuración del negocio, textos, colores, WhatsApp | `dp_tiendas` | La propietaria, desde el panel |
| Catálogo, precios, variantes | `dp_categorias`, `dp_productos`, `dp_variantes` | La propietaria |
| Fotos y logo | Storage `dulce-pedido/{tienda_id}/` | La propietaria |
| Entregas, zonas, calendario | `dp_tiendas`, `dp_zonas`, `dp_fechas_bloqueadas` | La propietaria |
| Activar/desactivar tienda, límite anti-abuso, slug | `dp_tiendas` | Tú (SQL) |
| Dominio y alojamiento | GitHub Pages / Netlify / Cloudflare | Tú |

## Pasos (10 minutos)

1. **Crea la tienda** en Supabase → SQL Editor:
   ```sql
   select public.dp_crear_tienda('postres-luz', 'Postres Luz', 'correo.de.la.duena@gmail.com', '+573001112233');
   ```
   El `slug` (primer valor) va en el enlace: solo minúsculas, números y guiones.
2. **Crea la cuenta de la propietaria:** Supabase → Authentication → Users → *Add user → Create new user*, con el mismo correo, una contraseña temporal y **Auto Confirm User** activado. Al entrar al panel queda como propietaria automáticamente (la invitación se acepta sola). Pídele que cambie la contraseña con «Olvidé mi contraseña» (requiere la URL en *Redirect URLs*, ver PUBLICAR.md).
3. **Comparte los enlaces:**
   - Tienda: `https://onemoreint.github.io/apps/dulce-pedido/app/?tienda=postres-luz`
   - Panel: el mismo enlace + `#/admin`
4. **Sesión de configuración** con ella siguiendo [GUIA-PROPIETARIA.md](GUIA-PROPIETARIA.md): fotos reales, precios, zonas y textos.
5. Revisa [LANZAMIENTO.md](LANZAMIENTO.md) antes de que lo publique.

## Dominio propio por cliente

Opciones, de menor a mayor esfuerzo:

1. **Sin dominio:** el enlace `…/app/?tienda=slug` (gratis).
2. **Dominio propio apuntando a una copia compilada para esa tienda:** compila con `VITE_TIENDA=slug PUBLIC_URL=https://dominio.com/ npm run build:pages` y publica `app/` en Netlify o Cloudflare Pages con el dominio de la clienta. Mismo backend, sin cambiar código. Detalles en [PUBLICAR.md](PUBLICAR.md).

## Desactivar una tienda (fin de contrato)

```sql
update public.dp_tiendas set activa = false where slug = 'postres-luz';
```
La tienda deja de mostrarse y no recibe pedidos; los datos se conservan. Para borrar todo (incluidas las fotos en Storage → `dulce-pedido/{tienda_id}`): `delete from public.dp_tiendas where slug = 'postres-luz';`.

## Qué cobrar (referencia, ajusta a tu mercado)

- Configuración inicial (carga de catálogo, fotos, textos).
- Mensualidad por alojamiento y soporte.
- Dominio propio como adicional.

No prometas confirmación automática de pedidos, pagos en línea ni WhatsApp automático: no están implementados (ver [PRUEBAS.md](PRUEBAS.md)).
