# Radio Mix Online

Radio web multigénero, instalable como app (PWA), con audio real de fuentes autorizadas.

**Enlace público:** https://onemoreint.github.io/apps/radio-mix/app/

## 1. Qué hace

- 19 categorías musicales con portada, descripción y estado real: **en vivo** (tiene al menos una fuente autorizada) o **pendiente de configuración** (no reproduce nada y lo dice).
- Reproductor persistente (un único elemento de audio para toda la app: nunca se duplica), mini reproductor inferior y reproductor ampliado con canción, artista, avance, volumen, estados de conexión/carga/error y botón para volver a conectar.
- Streams **MP3/AAC/OGG** (Icecast, Shoutcast, AzuraCast, Zeno…) y **HLS** (nativo en Safari; `hls.js` se descarga solo si hace falta).
- **Programas continuos** con pistas de licencia libre de Internet Archive: todos los oyentes escuchan la misma pista al mismo segundo, como una radio.
- Metadatos solo reales: de la propia pista, o de Icecast `status-json.xsl` / AzuraCast `nowplaying`. Si la emisora no publica la canción, se dice.
- Búsqueda (sin importar tildes), favoritos y recientes guardados en el dispositivo.
- Spotify: playlists con el **reproductor embebido oficial** y conexión **OAuth PKCE** para que el dueño importe sus playlists.
- PWA: manifiesto, iconos 192/512 (+ maskable y Apple), service worker, modo standalone, botón «Instalar», instrucciones para iPhone, pantalla de bienvenida y **actualización controlada** («Hay una versión nueva → Actualizar»).
- Panel de administración, páginas de privacidad, condiciones y fuentes/licencias.

## 2. Arquitectura y decisiones

| Decisión | Motivo |
|---|---|
| React 19 + TypeScript + Vite 8 + Tailwind 4, sin backend | Lo más simple que cumple el criterio de aceptación; se aloja gratis con HTTPS. |
| Enrutado por hash (`#/categorias`) | Funciona en GitHub Pages sin redirecciones; la PWA siempre abre en la raíz. |
| Catálogo en `src/data/catalog.json` | Añadir emisoras no exige tocar código. Lo valida `src/lib/validate.ts`. |
| Identidad en `src/config/brand.ts` | Nombre, logotipo, colores y contacto en un solo lugar (UI, manifiesto, textos legales). |
| Spotify solo como descubrimiento | Sus condiciones prohíben usarlo como fuente de una emisión no interactiva. |
| Panel sin servidor | Edita un borrador local y exporta `catalog.json`; publicar exige la cuenta de GitHub (ver §7). |

```
src/
  config/brand.ts        identidad de la radio
  data/catalog.json      categorías, emisoras y playlists publicadas
  lib/                   validación, Internet Archive, metadatos, almacenamiento
  player/engine.ts       motor de audio único (streams, HLS, programas, reintentos, Media Session)
  spotify/               oEmbed, embed oficial, OAuth PKCE y API
  screens/ components/   interfaz
  admin/                 panel (se carga aparte, solo si se abre)
```

## 3. Fuentes de audio (verificadas el 25-oct-2026)

| Emisora | Categoría | Fuente | Licencia |
|---|---|---|---|
| Clásica Musopen | Instrumental y relajación | Internet Archive `MusopenCollectionAsFlac` (145 pistas, ~16,6 h) | Dominio público (Public Domain Mark 1.0) |
| Calma y bienestar | Instrumental y relajación | Kevin MacLeod: Calming, Healing, Organic Meditations | CC BY 4.0 (atribución visible) |
| Pulso Electrónico | Música electrónica | Kevin MacLeod: Light/Medium/Hard Electronic | CC BY 4.0 |
| Latinesque Instrumental | Música tropical y bailable | Kevin MacLeod: Latinesque | CC BY 4.0 |

Descartadas: **SomaFM** (sus términos prohíben su uso en apps de terceros) y los streams de emisoras comerciales sin autorización escrita. Una URL pública no es un permiso.

**Música comercial** (salsa, vallenato, reguetón, pop…): para difundirla hace falta licencia de comunicación pública en cada país donde se ofrezca — en Colombia, Organización Sayco-Acinpro (OSA); en Venezuela, SACVEN y AVINPRO. La vía práctica:

1. Contrata un servidor de radio (AzuraCast propio, Zeno.fm, Radio.co, Listen2MyRadio…) con HTTPS.
2. Tramita las licencias (o usa un proveedor que las incluya en tu país) y sube tu música.
3. En el panel → Emisoras → Nueva emisora: pega la URL `https://…` del stream, indica la licencia y pulsa **Probar conexión**.

## 4. Spotify (reglas vigentes desde feb-2026)

- Modo desarrollo: el dueño de la app debe tener **Premium**; máximo **5 usuarios** autorizados (los añades en *User Management*).
- `GET /playlists/{id}/items` solo devuelve canciones de playlists **propias o colaborativas**; `GET /users/{id}/playlists` ya no existe.
- Por eso los oyentes usan el **embed oficial** (sin cuenta oyen fragmentos; con su sesión de Spotify abierta, completas según su plan) y solo el dueño se conecta por OAuth.

Configuración:
1. https://developer.spotify.com/dashboard → *Create app* → marca *Web API*.
2. *Redirect URI* (exacta): `https://onemoreint.github.io/apps/radio-mix/app/`
3. Copia el **Client ID** en el panel → Spotify (o en la variable `VITE_SPOTIFY_CLIENT_ID` al compilar). No hay secreto: PKCE no lo necesita. El token se guarda solo en la pestaña (sessionStorage).

## 5. Trabajar en local

```bash
cd radio-mix
npm install
npm run dev          # http://localhost:5173
npm test             # 56 pruebas (Vitest)
npm run typecheck
npm run icons        # regenera iconos tras cambiar colores en brand.ts
```

Variables de entorno (opcionales; ver `.env.example`): `VITE_SPOTIFY_CLIENT_ID`, `VITE_BASE`.

## 6. Publicar

**GitHub Pages (actual):**
```bash
npm run build:pages   # compila en app/
git add . && git commit -m "Radio Mix: actualización" && git push
```
GitHub Pages sirve `radio-mix/app/` con HTTPS en ~1 minuto. El workflow `.github/workflows/radio-mix-ci.yml` ejecuta tipos, pruebas, auditoría y build en cada cambio.

**Dominio propio** (p. ej. `radio.tudominio.com`) con Netlify o Vercel: importa el repo, carpeta base `radio-mix`, comando `npx vite build`, carpeta de salida `dist`, variable `VITE_BASE=/`. Añade el dominio en la plataforma y crea el registro CNAME que te indique; el HTTPS se emite solo. Recuerda añadir la nueva Redirect URI en Spotify.

**Comprobar desde otro dispositivo:** abre el enlace en el celular → Categorías → Instrumental y relajación → ▶. Debe sonar en 1–3 s y mostrar compositor y obra.

**Compartir e instalar:** comparte el enlace. Android/Chrome: botón **Instalar** (o menú ⋮ → Instalar app). iPhone: Safari → Compartir → *Añadir a pantalla de inicio* (la app muestra estas instrucciones).

## 7. Panel de administración (`#/admin`)

Permite añadir/editar/eliminar categorías y emisoras, ordenar, activar/desactivar, cambiar portadas y descripciones, añadir playlists de Spotify, probar las conexiones de verdad y previsualizar en tu navegador.

Al no haber servidor, los cambios son un **borrador local**: nadie más los ve. Para publicarlos se descarga `catalog.json`, se sustituye `src/data/catalog.json` y se publica; esa escritura exige tu cuenta de GitHub, que es la protección real. No hay contraseñas fijas en el código.
**Ampliación prevista:** catálogo central en Supabase con inicio de sesión del administrador y reglas RLS (lectura pública, escritura solo para tu correo), para editar desde el celular y publicar al instante.

Nombre, logotipo y colores: `src/config/brand.ts` (+ `npm run icons`).

## 8. Seguridad y políticas

- **Políticas en la app** (enlazadas desde el pie y «Mi radio → Legal y seguridad», `#/legal`): privacidad y tratamiento de datos (Ley 1581 de 2012), seguridad, cookies y almacenamiento, términos y condiciones (uso aceptable), derechos de autor y retirada de contenido, fuentes y licencias. Fecha de vigencia en `brand.legalUpdated`.
- **CSP y cabeceras**: fuente única en `src/config/security.ts`. El build inserta la CSP como `<meta>` y genera `app/_headers`; `npm run headers` regenera `vercel.json`. En GitHub Pages las cabeceras HSTS/anti-clickjacking no se pueden fijar: con dominio propio en Netlify/Vercel/Cloudflare se aplican todas.
- **Reporte de vulnerabilidades**: `SECURITY.md`, `app/.well-known/security.txt` (caduca el 25-oct-2027; renuévalo antes) y `#/seguridad`.
- **Dependabot** semanal (`.github/dependabot.yml`) y `npm audit` en CI.
- Recomendado en tu cuenta de GitHub: verificación en dos pasos y protección de la rama `main`.

## 9. Limitaciones reales

- **iPhone/iPad:** el audio de una app web puede pausarse al bloquear la pantalla o cambiar de app durante un rato, y el volumen solo se controla con los botones físicos.
- **Android:** suele seguir sonando en segundo plano (Chrome); el ahorro de batería agresivo de algunas marcas puede cortarlo.
- **Sin conexión** se abre la interfaz, pero no hay audio: no se ofrece escucha offline.
- Los programas de Internet Archive dependen de su ancho de banda; para muchos oyentes simultáneos conviene un servidor de streaming propio.

## 10. Pruebas

`npm test` cubre: validación de URLs (solo https, sin hosts locales ni credenciales), catálogo publicado (19 categorías, licencias y atribuciones), programación en vivo (posición exacta, determinismo, vuelta al final), lectura de Internet Archive y de metadatos Icecast/AzuraCast, motor de audio (desbloqueo en el gesto, salto al segundo en vivo, pista siguiente, reintento y error claro, fuente caída a los 20 s, no reproducir sin licencia, un solo elemento de audio, volumen, bloqueo de autoplay), favoritos persistentes tras recargar, la interfaz (categorías pendientes sin botón de reproducir, búsqueda sin tildes, panel) y la seguridad (CSP sin `eval` ni scripts externos, cabeceras sincronizadas, `security.txt` vigente). Además, `e2e/` ejecuta 35 comprobaciones en Chromium tamaño celular, todas con la CSP activa.
