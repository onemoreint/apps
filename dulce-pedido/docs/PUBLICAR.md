# Ejecutar, publicar y configurar el dominio

## Local

```bash
npm install
npm run dev            # modo demostración (sin Supabase) → http://localhost:5173
```
Para trabajar contra Supabase: copia `.env.example` a `.env.local` con URL y clave **publicable**.

## GitHub Pages (actual)

```bash
npm run build:pages    # genera app/ con el proyecto Supabase de producción
git add app && git commit -m "Publicar Dulce Pedido" && git push
```
GitHub Pages del repo `onemoreint/apps` sirve `dulce-pedido/app/` en
https://onemoreint.github.io/apps/dulce-pedido/app/ (puede tardar 1–2 minutos en actualizarse).

Variables útiles: `VITE_TIENDA` (tienda por defecto), `PUBLIC_URL` (URL final, para la vista previa al compartir), `SIN_SERVIDOR=1` (compila en modo demostración).

## Netlify o Cloudflare Pages con dominio propio

1. Compila para la raíz del dominio:
   ```bash
   PUBLIC_URL=https://www.dulcesdeluz.com/ VITE_TIENDA=postres-luz npm run build:pages
   ```
2. Sube la carpeta `app/` (Netlify: arrastrar a *Deploys*; Cloudflare Pages: *Upload assets*).
3. En el panel del hosting agrega el dominio y crea en tu proveedor de dominio el registro que te indiquen (normalmente un `CNAME` para `www`). El certificado HTTPS es automático.

No hace falta configurar redirecciones: la app navega con `#/`.

## Supabase: ajustes de una sola vez

1. **Authentication → URL Configuration → Redirect URLs:** agrega la URL de cada tienda/panel (por ejemplo `https://onemoreint.github.io/apps/dulce-pedido/app/**` y cada dominio propio). Sin esto, el enlace de «Olvidé mi contraseña» puede llevar a otra app del mismo proyecto.
2. **Authentication → Sign In / Providers:** deja desactivado el registro abierto si no lo necesitas (las cuentas se crean por invitación).
3. **Authentication → Passwords:** activa la protección contra contraseñas filtradas (el revisor de seguridad de Supabase lo recomienda).
4. **Proyecto nuevo:** ejecuta `supabase/setup.sql` (generado con `npm run db:setup`) en el SQL Editor.

## Respaldos

El plan gratuito no incluye respaldos descargables. Opciones:
- Semanal manual: `pg_dump "postgresql://postgres:[CLAVE]@db.nkzjjrbzdfyppsxvcvbg.supabase.co:5432/postgres" -t 'public.dp_*' > respaldo-dulce-pedido.sql`
- Plan Pro de Supabase: respaldos diarios automáticos.

## Mantener el proyecto activo

Los proyectos gratuitos se pueden pausar tras una semana con poca actividad. Las visitas a la tienda cuentan como actividad. Si una tienda está quieta, entra al panel una vez por semana o reactiva el proyecto desde el panel de Supabase.
