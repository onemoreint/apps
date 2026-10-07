# MesaQR

**Un enlace. Elige. Envía tu pedido.**

Menú digital por **enlace único** con pedidos por WhatsApp para restaurantes de comida rápida. El restaurante comparte un solo enlace por WhatsApp, Instagram o estados. El cliente lo abre, arma su pedido sin registrarse ni instalar nada, indica cómo lo quiere (para llevar, delivery o comer en el local) y cómo paga, y lo envía al WhatsApp del restaurante con todo escrito.

El dueño tiene un panel, usable desde el teléfono, para cambiar precios, marcar productos agotados, ver los pedidos, actualizar la tasa USD/Bs., configurar formas de pago y tipos de pedido, y compartir el enlace.

Primer cliente: **Lorenz Express**, comida rápida en Maracay, Aragua (Venezuela).

| | |
|---|---|
| **Menú (enlace para clientes)** | https://onemoreint.github.io/apps/mesaqr/app/ |
| **Panel del restaurante** | https://onemoreint.github.io/apps/mesaqr/app/#/dashboard |
| **Base de datos** | Supabase, proyecto `mesaqr` (`nkzjjrbzdfyppsxvcvbg`, us-east-1) |

Arquitectura y decisiones: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

---

## 1. Qué hace

**Cliente**
- Menú por categorías con fotos referenciales, precios en USD y su equivalente en Bs. a la tasa del día. Los productos agotados quedan bloqueados.
- Personalización: proteína (por ejemplo, Pollo crispy +$2.50) y quitar ingredientes.
- Carrito con cantidades, edición, observaciones y sugerencias discretas, como las papas.
- Al confirmar, el cliente indica:
  - nombre y teléfono (opcional);
  - **para llevar**, **delivery** (con dirección) o **comer en el local**;
  - forma de pago.
- El pedido se **guarda en la base de datos** con número `#0042` y se abre WhatsApp con el mensaje listo:

```text
🍔 NUEVO PEDIDO #0042
👤 María Pérez
📞 0414 555 1234
🛵 Delivery
📍 Urb. La Esmeralda, calle 3, casa 12
💳 Pago móvil
────────────
1x Hamburguesa con Queso
   + Pollo crispy
1x Papas Fritas + 2 Salsas
────────────
💰 TOTAL: $15.00 (≈ Bs. 13.500,00)
⏰ 4:15 PM
```

- El teléfono recuerda los datos del cliente para su próximo pedido. Esos datos no salen del dispositivo, salvo dentro de un pedido confirmado.
- Botón **Escríbenos** para consultas directas por WhatsApp.

**Panel (`#/dashboard`)**
- **Inicio:** enlace para copiar o compartir, tasa del día, pedidos y ventas de hoy, productos agotados.
- **Pedidos:** cliente, tipo, dirección, teléfono (toque para llamar), pago, productos y cambio de estado. Se actualiza solo cada 20 segundos.
- **Productos:** precio, foto (se comprime a WebP), agotado con un toque, extras, combos.
- **Categorías** y **Extras y opciones**.
- **Ajustes:**
  - nombre, logo, WhatsApp y color;
  - tipos de pedido aceptados y formas de pago;
  - mostrar Bs. y tasa;
  - cambiar la contraseña.

## 2. Primer ingreso al panel

1. Abre https://onemoreint.github.io/apps/mesaqr/app/#/dashboard
2. Entra con **clerigman@gmail.com** y la contraseña temporal que te dio Claude.
3. Ve a **Ajustes → Contraseña del panel** y cámbiala.

Para agregar otro administrador:
1. En Supabase, ve a **Authentication → Users → Add user** con *Auto Confirm User*.
2. En el **SQL Editor**, ejecuta:

```sql
insert into public.business_members (business_id, user_id, role)
select b.id, u.id, 'admin'
from public.businesses b, auth.users u
where b.slug = 'lorenz-express' and u.email = 'correo@ejemplo.com';
```

**Recomendado:** en Supabase, ve a **Authentication → Sign In / Providers** y desactiva *Allow new users to sign up*. Aunque alguien se registre, no vería ni podría modificar nada, porque los permisos lo impiden. Aun así es mejor cerrarlo.

## 3. Uso diario

- **Tasa:** en Inicio, escribe la tasa BCV del día y pulsa *Guardar tasa*. El panel avisa si no se ha actualizado en el día. Los precios se guardan en USD y cada pedido guarda la tasa con la que se hizo.
- **Agotado:** en Productos, apaga el interruptor *Disponible*.
- **Compartir el menú:** en Inicio, usa *Compartir*. Es siempre el mismo enlace.
- **WhatsApp que recibe pedidos:** se cambia en Ajustes. Ahora es +58 424 323 0113.

## 4. Desarrollo

```bash
npm install
npm test            # 49 pruebas: lógica + base de datos (Postgres real en memoria, con RLS)
npm run typecheck
npm run dev         # con .env.local (ver .env.example)
```

**Sin Supabase:** `npm run dev:api` levanta una API local con las mismas migraciones y el menú real. Usa `.env.local` con `VITE_SUPABASE_URL=http://127.0.0.1:54321` y `VITE_SUPABASE_ANON_KEY=dev`.

**Base de datos:** las migraciones están en `supabase/migrations/` y el menú inicial en `supabase/seed.sql`. `npm run db:setup` genera `supabase/setup.sql` con todo en un solo archivo.

## 5. Publicar cambios

La app se publica en el repo `onemoreint/apps`, que GitHub Pages sirve desde la rama `main`. La carpeta `mesaqr/app/` es la versión compilada.

```bash
VITE_SUPABASE_URL=https://nkzjjrbzdfyppsxvcvbg.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_tG6MVcZDRJvlAnb5TNEzwQ_04drexLP \
npm run build:pages     # compila en app/ → luego commit y push
```

La clave `sb_publishable_…` es pública por diseño: la seguridad la ponen las reglas de la base de datos. **Nunca** uses la clave `service_role` o `secret` en la app.

Si se compila sin las variables de Supabase, la app funciona en **modo demostración**: el menú incluido funciona y los pedidos van a WhatsApp, pero no se guardan.

`.github/workflows/mesaqr-ci.yml`, en el repo `apps`, corre pruebas, tipos y compilación en cada cambio.

## 6. Seguridad

- El público **no tiene acceso a ninguna tabla**. Solo puede ejecutar `get_public_menu(slug)` y `create_public_order(slug, items, cliente, notas)`, que validan todo en el servidor:
  - precios recalculados;
  - opciones válidas y productos disponibles;
  - datos del cliente;
  - límite de 20 pedidos por minuto.
- Cada administrador solo ve y modifica su negocio. Puede cambiar el estado de un pedido, pero no sus montos.
- Las fotos se suben a la carpeta del negocio. Máximo 1 MB, solo imágenes.

## 7. Limitaciones

- **WhatsApp no confirma el envío.** El enlace abre el chat con el mensaje escrito, pero el cliente debe pulsar *Enviar*. El pedido queda guardado como *Pendiente* en el panel aunque no lo envíe.
- **Las fotos son referenciales**, de [Unsplash](https://unsplash.com/license) (licencia libre). Reemplázalas con fotos reales desde el panel.
- **Supabase gratis pausa el proyecto tras 7 días sin actividad.** Con uso diario no pasa. Si ocurre, se reactiva desde supabase.com.
- La tabla `dining_tables` y las funciones por mesa quedan en la base de datos sin uso y sin acceso público, por si algún día se vuelve al modo QR por mesa.
