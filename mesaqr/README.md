# MesaQR

**Escanea. Elige. Envía tu pedido.**

Menú digital por QR de mesa con pedidos por WhatsApp, pensado para restaurantes de comida rápida. El cliente escanea el QR de su mesa, arma su pedido desde el teléfono (sin registrarse ni instalar nada) y lo envía al WhatsApp del restaurante con la mesa, los productos, las personalizaciones y el total ya escritos.

Incluye un panel para el dueño, usable desde el celular. Desde ahí se cambian precios, se marcan productos agotados, se administran mesas y QR, se actualiza la tasa USD/Bs. y se configura el número de WhatsApp.

Primer cliente: restaurante de comida rápida en Maracay, Aragua (Venezuela). La arquitectura es multinegocio para poder convertirse en SaaS.

---

## Contenido

1. [Qué incluye](#1-qué-incluye)
2. [Requisitos](#2-requisitos)
3. [Instalar](#3-instalar)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Configurar Supabase](#5-configurar-supabase)
6. [Ejecutar en local](#6-ejecutar-en-local)
7. [Crear el usuario administrador](#7-crear-el-usuario-administrador)
8. [Datos demo](#8-datos-demo)
9. [Generar e imprimir los QR](#9-generar-e-imprimir-los-qr)
10. [Desplegar](#10-desplegar)
11. [Cambiar el número de WhatsApp](#11-cambiar-el-número-de-whatsapp)
12. [Cambiar la tasa de cambio](#12-cambiar-la-tasa-de-cambio)
13. [Agregar productos](#13-agregar-productos)
14. [Pruebas](#14-pruebas)
15. [Seguridad](#15-seguridad)
16. [Limitaciones conocidas](#16-limitaciones-conocidas)

Arquitectura y decisiones de diseño: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

---

## 1. Qué incluye

**Cliente (`/menu?mesa=TOKEN`)**
- Mesa detectada desde el QR, con un token aleatorio y no adivinable que valida el servidor.
- Menú por categorías con fotos, precios en USD y su equivalente en Bs., y productos agotados bloqueados.
- Personalización: quitar ingredientes, extras con precio y opciones obligatorias como el tamaño. Combos con su contenido.
- Carrito persistente durante la sesión, con cantidades, edición, observaciones (máx. 280 caracteres) y sugerencias discretas.
- Confirmación, pedido registrado en la base de datos con código `#M7-0042` y apertura de WhatsApp con el mensaje listo.
- Botón "Necesito ayuda" para llamar al mesero, pedir la cuenta, pedir algo más u otra cosa.
- Tras enviar se puede seguir pidiendo sin volver a escanear.

**Panel (`/dashboard`)**
- Inicio: pedidos de hoy, productos disponibles y agotados, mesas, pedidos recientes, tasa del día y avisos de datos demo.
- Productos: crear, editar, eliminar, ocultar, marcar como agotado con un toque, subir foto (se comprime a WebP en el teléfono), asignar extras y crear combos.
- Categorías: crear, ordenar, ocultar, asignar extras a toda la categoría.
- Extras y opciones: grupos reutilizables con mínimo/máximo, opciones gratis o con precio.
- Mesas: crear una o varias, nombre opcional, activar o desactivar, ver, descargar e imprimir QR, generar un QR nuevo.
- Pedidos: lista con actualización automática y cambio de estado.
- Configuración: datos del negocio, logo, WhatsApp (validado), mostrar Bs., tasa y color principal.

**Técnico**
- React 19, TypeScript estricto, Vite, Tailwind CSS 4 y PWA instalable (opcional).
- Supabase: PostgreSQL, Row Level Security, Auth y Storage.
- El menú público no carga la librería de Supabase: hace 2 llamadas `fetch`. El panel admin se descarga aparte, solo al entrar a `/dashboard`.

## 2. Requisitos

- Node.js 20 o superior y npm.
- Una cuenta gratuita en [supabase.com](https://supabase.com).
- Una cuenta gratuita en Vercel o Cloudflare Pages para publicar.

## 3. Instalar

```bash
git clone https://github.com/onemoreint/mesaqr.git
cd mesaqr
npm install
```

Dependencias principales: `react`, `react-router`, `@supabase/supabase-js` (solo en el panel), `zustand` (carrito), `qrcode` (solo en el panel), `lucide-react` (iconos) y `vite-plugin-pwa`.

## 4. Variables de entorno

Copia `.env.example` como `.env.local`:

```bash
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

En Supabase están en **Project Settings → API Keys**. Usa la clave **anon / publishable**, que es pública por diseño porque la seguridad la ponen las políticas RLS. **Nunca** uses la clave `service_role` / `secret` en el frontend.

## 5. Configurar Supabase

1. Crea un proyecto nuevo. Elige la región más cercana, por ejemplo `us-east-1` para Venezuela.
2. Ve a **SQL Editor → New query**, pega **todo** el archivo [`supabase/setup.sql`](supabase/setup.sql) y pulsa **Run**. Un solo paso crea tablas, seguridad, funciones, el bucket de fotos y los datos demo.
   - `setup.sql` se genera con `npm run db:setup` a partir de `supabase/migrations/` y `supabase/seed.sql`, que son la fuente de verdad.
   - Con la [CLI de Supabase](https://supabase.com/docs/guides/cli): `supabase link --project-ref TU_REF` y `supabase db push`. El seed se ejecuta aparte.
3. **Desactiva el registro público:** Authentication → Sign In / Providers → desmarca *Allow new users to sign up*. Los administradores se crean a mano (sección 7).

## 6. Ejecutar en local

**Con tu proyecto Supabase:**

```bash
npm run dev
```

Abre `http://localhost:5173/dashboard` para el panel. Para el menú, entra a **Mesas → QR → Probar**.

**Sin Supabase (solo el menú público):** hay una API local que ejecuta las mismas migraciones sobre Postgres en memoria.

```bash
# .env.local
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=dev

npm run dev:api     # terminal 1: imprime los enlaces de cada mesa demo
npm run dev         # terminal 2
```

Para que los pedidos de prueba lleguen a tu teléfono: `WHATSAPP=+58412XXXXXXX npm run dev:api`. El panel admin necesita un proyecto Supabase real.

## 7. Crear el usuario administrador

1. Supabase → **Authentication → Users → Add user → Create new user**. Escribe correo y contraseña y marca *Auto Confirm User*.
2. **SQL Editor**: vincula ese usuario al restaurante.

```sql
insert into public.business_members (business_id, user_id, role)
select b.id, u.id, 'owner'
from public.businesses b, auth.users u
where b.slug = 'demo'                   -- slug del negocio
  and u.email = 'dueno@restaurante.com'; -- correo del usuario
```

3. Entra a `/dashboard` con ese correo y contraseña.

**Sin datos demo:** crea primero el negocio y después vincula el usuario.

```sql
insert into public.businesses (slug, name, whatsapp, exchange_rate)
values ('mi-restaurante', 'Mi Restaurante', '+58412XXXXXXX', 1);
```

## 8. Menú inicial

`supabase/seed.sql` carga el **menú real del restaurante**, tomado de sus menús impresos (oct. 2026):

| Categoría | Productos | Precios (USD) |
|---|---|---|
| Hamburguesas | Clásica, con Queso, con Queso y Tocineta, con Queso, Tocineta y Huevo | 7.50 · 8 · 8.50 · 9 (Crispy/Mixta +2.50) |
| Pepitos | Clásico, con Queso, con Queso y Tocineta, con Queso, Tocineta y Huevo | 15 · 16 · 17 · 17 (Mixto +2) |
| Terneritos | Clásico, de la Casa | 5 · 7 (carne, pollo o mixto) |
| Polacos | Clásico, de la Casa | 5 · 7 |
| Salchipapas | Clásica, de la Casa | 8.50 · 12 |
| Shawarmas | Clásico, de la Casa (Falafel) | 10 (Mixto +2) · 13 |
| Club House | Doble Pollo, Doble Carne, Mixto, Triple, de la Casa | 13 · 14 · 15 · 17 · 19 |
| Granjeros | 15 cm, 35 cm | 7 · 15 |
| Ensaladas | César de Pollo, de Carne, Mixta, de Pollo Crispy | 10 · 10 · 10 · 13 |
| Raciones | Papas + 2 salsas, Papas con tocineta y queso | 4.50 · 6 |
| Menú Kids | Nuggets con papas, Tenders con papas, Hamburguesa con queso | 7 · 7 · 4 |

Las variantes de proteína son opciones del producto. El cliente elige, por ejemplo, *Pollo crispy*, y el precio se ajusta solo. También carga 12 mesas.

Datos confirmados: **Lorenz Express**, WhatsApp **+58 424 323 0113**, tasa inicial **900 Bs./USD** (el panel avisa cuando la tasa no se ha actualizado en el día). Las imágenes son ilustraciones locales en `public/demo/`; reemplázalas con fotos reales desde el panel.

Si el negocio ya existe, el seed no hace nada.

## 9. Generar e imprimir los QR

Panel → **Mesas**:
- **Agregar**: una mesa o varias a la vez (por ejemplo, de la 1 a la 20).
- Icono **QR** de una mesa:
  - **Descargar**: PNG con el nombre del negocio, el QR y "Mesa 7".
  - **Imprimir**: vista de impresión.
  - **Probar**: abre el menú de esa mesa.
  - **QR nuevo**: invalida el QR anterior, por ejemplo si alguien lo fotografió y pide desde fuera del local.
- **Imprimir QR de todas las mesas**: tarjetas de unos 8 × 12 cm, 4 por hoja.

El QR apunta a `https://TU-DOMINIO/menu?mesa=TOKEN`, usando el dominio desde el que abres el panel. **Genera e imprime los QR desde el dominio definitivo**, no desde `localhost`.

## Publicación actual

MesaQR está publicado en **https://onemoreint.github.io/apps/mesaqr/app/**, dentro del repo `onemoreint/apps`, que GitHub Pages sirve directo desde la rama `main`.

- `mesaqr/app/` es la app **compilada**. Se genera con `npm run build:pages` y se sube tal cual.
- Como ese hosting no reescribe rutas, el QR de cada mesa apunta a `…/app/?mesa=TOKEN` y el panel a `…/app/#/dashboard`.
- `.github/workflows/mesaqr-ci.yml`, en la raíz del repo `apps`, corre pruebas, tipos y compilación en cada cambio dentro de `mesaqr/`.

**Modo demostración (activo mientras no haya Supabase):**
- El menú real funciona completo y los pedidos abren WhatsApp con su código, pero **no se guardan** en una base de datos.
- El panel muestra que se activa al conectar Supabase.
- Las mesas demo usan tokens fijos (`mesa01demo` … `mesa12demo`). Su hoja de QR imprimible está en `…/app/qr/`.

**Pasar a modo completo:** crea el proyecto Supabase (sección 5) y luego compila con las variables y sube `app/`:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co VITE_SUPABASE_ANON_KEY=... npm run build:pages
```

Después genera los QR **desde el panel**, porque los tokens reales son aleatorios. Los QR demo dejan de valer.

## 10. Desplegar

### GitHub Pages (configurado, gratis)

El repositorio incluye `.github/workflows/deploy.yml`: en cada push a `main` instala dependencias, **ejecuta todas las pruebas**, compila y publica en `https://onemoreint.github.io/mesaqr/`. Si una prueba falla, no se publica.

Configuración, una sola vez:
1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables** (pestaña *Variables*, no *Secrets*):
   - `VITE_SUPABASE_URL` = `https://xxxx.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = clave anon / publishable
3. **Actions → Desplegar → Run workflow**, o cualquier push a `main`.

En GitHub Pages las rutas profundas (`/mesaqr/menu?mesa=…`) funcionan gracias a una copia de `index.html` como `404.html` que hace el workflow.

### Dominio propio (`menu.restaurante.com`)

- **En GitHub Pages:** Settings → Pages → *Custom domain*, más un registro CNAME en tu DNS hacia `onemoreint.github.io`. Crea además la variable `VITE_BASE` = `/` y vuelve a desplegar.
- **En Vercel o Cloudflare Pages:** importa el repo con Build `npm run build` y Output `dist`, y agrega las dos variables. Ya están incluidos `vercel.json`, `public/_redirects` y `public/_headers`.

⚠️ Después de cambiar de dominio, **vuelve a imprimir los QR**: apuntan al dominio desde el que se generan.

### Supabase en producción

Los proyectos gratuitos se **pausan tras 7 días sin actividad**. Un restaurante abierto todos los días lo mantiene activo, pero si el menú deja de usarse una semana tendrás que reactivarlo desde el panel de Supabase. Para operación seria, considera el plan Pro.

## 11. Cambiar el número de WhatsApp

Panel → **Configuración → Pedidos por WhatsApp**. Escríbelo con código de país, por ejemplo `+58 412 1234567`. Se valida el formato y puedes probarlo con el enlace *Probar este número*. El número nunca está en el código.

## 12. Cambiar la tasa de cambio

Panel → **Inicio**, en la tarjeta **Tasa del día**: escribe cuántos Bs. vale 1 USD y pulsa *Guardar tasa*. También está en Configuración. Los precios se guardan siempre en USD; los Bs. se calculan al momento y cada pedido guarda la tasa con la que se hizo. Para ocultar los Bs., desactiva *Mostrar precios en Bs.*

## 13. Agregar productos

Panel → **Productos → Nuevo**:
1. Nombre, descripción y precio en USD.
2. Categoría.
3. Foto: desde la cámara o la galería; se reduce y comprime automáticamente.
4. Extras: marca los grupos de opciones. Los que vienen de la categoría aparecen marcados.
5. Opcional: *Es un combo* y lo que incluye; *Sugerir para completar el pedido*.
6. **Crear producto**. Aparece en el menú de inmediato.

Para marcar un producto como agotado basta el interruptor de la lista de productos.

## 14. Pruebas

```bash
npm test           # todo: lógica del cliente + base de datos
npm run test:db    # solo base de datos (Postgres real en memoria)
npm run typecheck
npm run build
```

Qué cubren:
- **QR:** mesa existente, inexistente, desactivada, token manipulado o con inyección.
- **Carrito:** agregar, quitar, cantidades 1–20, extras, edición, agotados y totales en centavos exactos.
- **Pedido (servidor):**
  - recalcula precios aunque el navegador envíe otros;
  - rechaza opciones de otro producto, grupos obligatorios vacíos, carritos malformados y productos de otro negocio;
  - aplica el límite de 5 pedidos por mesa cada 2 minutos;
  - numera los pedidos de forma consecutiva.
- **WhatsApp:** formato del mensaje, hora de Caracas, codificación de acentos, ñ, emojis, saltos de línea, `&` y `#`.
- **Moneda:** formato USD y Bs., conversión, cambio de tasa.
- **Administración (RLS):**
  - un usuario autorizado edita su negocio;
  - un usuario no autorizado no ve ni modifica nada;
  - nadie puede alterar los totales de pedidos ni el contador;
  - no se pueden mezclar datos entre negocios.

## 15. Seguridad

- **El público no tiene acceso a ninguna tabla.** Solo puede ejecutar `get_menu(token)` y `create_order(token, …)`, con validación completa en el servidor.
- Los precios y totales se calculan en el servidor; el pedido guarda una copia de nombres y precios.
- RLS en todas las tablas: cada administrador solo ve y modifica su negocio. Puede cambiar el estado de un pedido, pero no sus montos.
- Fotos: lectura pública y escritura solo para miembros del negocio, en su propia carpeta. Máximo 1 MB, solo imágenes.
- Sin registro público, sin secretos en el frontend y con cabeceras de seguridad en el hosting.
- Los errores técnicos se registran en la consola; el cliente solo ve mensajes comprensibles.

## 16. Limitaciones conocidas

- **WhatsApp no confirma el envío.** `wa.me` abre el chat con el mensaje escrito, pero el cliente debe pulsar *Enviar*. El pedido queda como *Pendiente* con su código para cruzarlo con el chat. En la V2, la pantalla de cocina eliminará esta dependencia.
- Alguien que fotografíe un QR podría pedir desde fuera del local. Mitigación actual: límite de frecuencia y *QR nuevo*. En la V2 habrá un código de sesión por visita.
- La hora del mensaje usa la zona de Venezuela (`America/Caracas`). Para negocios en otros países, la zona horaria debe pasar a la configuración del negocio (V3, SaaS).
