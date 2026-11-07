# NEXO DIGITAL STUDIO

Sitio web de agencia digital premium: landing pages, páginas web, menús digitales QR, catálogos, pedidos por WhatsApp, microaplicaciones e inteligencia artificial.

- **Sitio publicado:** https://onemoreint.github.io/apps/nexo/
- **Código fuente:** esta carpeta (`nexo-digital-studio/`) · **Compilado:** `../nexo/`

## Tecnología

React 18 · Vite · TypeScript · Tailwind CSS 3 · Motion (Framer Motion) · Lucide · tipografías Sora + Manrope autoalojadas.

## Ejecutar en tu computadora

```bash
cd nexo-digital-studio
npm install
npm run dev        # http://localhost:5173
npm run build      # compila a ../nexo (lo que publica GitHub Pages)
npm run preview    # sirve la versión compilada
```

## Qué editar (todo centralizado)

| Qué | Archivo |
|---|---|
| Nombre comercial, WhatsApp, horario, zona, correo, redes, crédito | `src/config/site.ts` |
| Colores de marca | `tailwind.config.js` y `src/config/theme.ts` |
| Servicios (A–D) y soluciones complementarias | `src/data/services.ts` |
| Proyectos del showroom | `src/data/showroom.ts` |
| Productos y categorías del demo de menú | `src/data/menuDemo.ts` |
| Preguntas frecuentes | `src/data/faq.ts` |
| Pasos del proceso | `src/data/process.ts` |
| Respuestas de NEXO AI (motor de reglas) | `src/services/ai/ruleEngine.ts` |
| Orden de secciones de la portada | `src/pages/HomePage.tsx` |

Valores marcados como **PENDIENTE** en el código deben personalizarse antes de usar un dominio propio.

## Variables de entorno

Archivo `.env` (público, versionado) — se puede sobrescribir con `.env.local` o en el hosting:

| Variable | Uso |
|---|---|
| `VITE_WHATSAPP_NUMBER` | WhatsApp de la agencia, solo dígitos con indicativo (ej. `573126387467`) |
| `VITE_SITE_URL` | URL final del sitio (canonical, Open Graph, datos estructurados). Debe terminar en `/` |
| `VITE_AI_ENDPOINT` | Endpoint del backend de IA. Vacío = NEXO AI usa reglas locales |

Solo en el servidor (nunca con prefijo `VITE_`): `ANTHROPIC_API_KEY`, `AI_MODEL`, `ALLOWED_ORIGIN`.

## Estructura

```
src/
  components/   piezas reutilizables (Button, Navbar, Footer, TiltCard, ParticleField, DemoShell…)
  sections/     secciones de la portada (Hero, PAS, Servicios, Showroom, NEXO AI, Proceso, FAQ, Contacto)
  pages/        HomePage, PrivacyPage y demos/ (MenuDemo, LandingDemo, CorporateDemo)
  data/         contenido editable (servicios, showroom, menú, FAQ, proceso)
  hooks/        enrutador por hash, media queries, contador animado, bloqueo de scroll
  services/     whatsapp.ts (enlaces y formato) y ai/ (proveedor de NEXO AI)
  config/       site.ts (datos del negocio) y theme.ts (colores)
  styles/       index.css
netlify/functions/nexo-ai.ts   backend seguro para conectar una IA real
public/                        favicon, íconos, og-image, robots.txt, sitemap.xml, manifest
```

Rutas: `#/demo/menu`, `#/demo/landing`, `#/demo/corporativa`, `#/privacidad`. Las anclas sin barra (`#servicios`) navegan dentro de la portada.

## Agregar un servicio o un demo

- **Servicio:** añade un objeto en `src/data/services.ts`. Si quieres otro tipo de mockup, agrega un caso en `src/components/ServiceMockup.tsx`.
- **Demo:** crea `src/pages/demos/MiDemo.tsx` (envuélvelo en `DemoShell`), regístralo en el objeto `demos` de `src/App.tsx` y añade su tarjeta en `src/data/showroom.ts`.

## Publicar

**GitHub Pages (actual):** `npm run build` y sube los cambios de `nexo/` y `nexo-digital-studio/` a la rama `main` del repo `onemoreint/apps`.

**Dominio propio / Netlify (con IA real):**
1. Crea un sitio en Netlify apuntando a este repo con *base directory* `nexo-digital-studio` (el `netlify.toml` ya define build, carpeta y funciones).
2. En *Environment variables* agrega `ANTHROPIC_API_KEY`, `ALLOWED_ORIGIN=https://tudominio.com`, `VITE_SITE_URL=https://tudominio.com/` y `VITE_AI_ENDPOINT=/.netlify/functions/nexo-ai`.
3. Actualiza las URL de `public/robots.txt` y `public/sitemap.xml`.

**Cualquier hosting estático (Hostinger, cPanel…):** `npm run build` y sube el contenido de `../nexo/`. Funciona en cualquier subcarpeta (`base: "./"`).
