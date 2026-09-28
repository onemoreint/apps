# DREAMMAP AI — MVP

**App lista para usar:** [`app/index.html`](app/index.html) — con GitHub Pages activo en este repo: https://onemoreint.github.io/apps/dreammap-ai/app/

Mapa de sueños que funciona igual para **celular, redes, pantalla, póster, cuadro, hoja impresa y pendón**, sin rehacer el diseño.

```bash
npm install
npm run dev          # desarrollo
npm test             # pruebas del núcleo (formatos, distribución, calidad, prompts)
npm run build        # sitio estático en dist/
npm run build:single # un solo HTML autónomo en dist-single/index.html
```

Stack: React 19 + TypeScript + Vite. Sin backend obligatorio. Persistencia local en IndexedDB. Exportación PNG/JPG/PDF 100 % en el navegador (jsPDF).

## Arquitectura: 5 capas independientes

| Capa | Dónde | Qué contiene |
|---|---|---|
| **CONTENIDO** | `core/types.ts` → `BoardContent`, `Dream` | Título, frase, sueños (texto, categoría, lugar, imagen, encuadre, referencias) |
| **DISEÑO** | `core/templates.ts` → `DesignTemplate` | Paleta, tipografías, tarjetas, pies de foto, proporción de celda |
| **FORMATO** | `core/formats.ts` → `PrintFormat`, `CustomFormat`, `DocumentFormat` | Catálogo, unidades, orientación, DPI, sangrado, zona segura, recomendaciones |
| **FUENTE DE IMAGEN** | `providers/*` → `ImageSource`, `ImageAsset`, `ImageSearchProvider`, `AIImageProvider`, `LocalImageProvider`, `PinterestReferenceProvider` | Dispositivo, biblioteca, web, IA, Pinterest (referencias) |
| **EXPORTACIÓN** | `core/export.ts` → `ExportSettings` | PNG, JPG, PDF con medidas físicas, PNG con DPI embebido |

Transversales: `core/layout.ts` (`VisionBoardCanvas`, motor de distribución), `core/render.ts` (renderizado único para vista previa y exportación), `core/validation.ts` (`PrintValidation`, alertas).

### «Reorganizar para este formato»
La distribución **nunca se guarda en píxeles**: se calcula a partir de contenido + plantilla + formato. Por eso pasar de 1080×1920 px a 50×70 cm o a un pendón 80×200 cm recompone cabecera, cuadrícula, márgenes y textos sin perder nada. Las «versiones de la plantilla» (Móvil, Instagram, A4, A3, 50×70, Pendón, 4K) son el mismo proyecto renderizado en cada formato.

### Calidad de imagen (sin trampas)
Para cada imagen se calcula el DPI real que tendrá en su celda (`píxeles reales ÷ pulgadas que ocupa`) y se compara con el objetivo del formato:
🟢 ≥ 85 % · 🟡 ≥ 50 % (mín. 72 DPI) · 🔴 por debajo. Nunca se amplía una imagen para presentarla como profesional.

Calidad del documento: Estándar 150 DPI · Alta 200 DPI · Profesional 300 DPI. Si el navegador no puede crear un lienzo tan grande (Safari/iOS ≈ 16,7 MP), la app lo avisa y exporta al máximo DPI posible.

### Fuentes de imagen
- **Mi dispositivo:** subir archivo o tomar foto (móvil).
- **Biblioteca local:** 20 ilustraciones vectoriales propias + todas las imágenes del usuario (buscar, filtrar, previsualizar, reemplazar, eliminar).
- **Búsqueda web:** `ImageSearchProvider` con Openverse y Wikimedia Commons (licencias abiertas, sin API key). Muestra fuente, autor, licencia y si permite uso comercial. Consulta generada desde el sueño (y traducida al inglés opcionalmente).
- **Pinterest:** sin scraping. Abre la búsqueda en Pinterest y guarda enlaces como **referencias** (no se imprimen).
- **Generar con IA:** `AIImageProvider`. Prompt automático (sueño + lugar + estilo + preferencias + plantilla + orientación). Sin servidor configurado funciona en **modo demo** claramente marcado. Para imágenes reales use `server/generate-image.example.mjs` (la API key vive en el servidor).

### Agregar un proveedor
Implemente la interfaz y regístrelo:
```ts
class MiProveedor implements ImageSearchProvider { id = 'mio'; name = 'Mi banco'; search(q) {…}; fetchAsset(r) {…} }
SEARCH_PROVIDERS.push(new MiProveedor()); // providers/web.ts
```

## Pendiente para siguientes fases
- Cuentas y sincronización en la nube (hoy todo es local al navegador).
- Marcas de corte en el PDF y perfil de color CMYK para imprentas que lo exijan.
- Edición libre de posiciones (hoy la distribución es automática + encuadre por imagen).

## Subir a GitHub y publicar gratis (GitHub Pages)
```bash
git init && git add . && git commit -m "DREAMMAP AI MVP"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/dreammap-ai.git
git push -u origin main
```
Para publicarlo: `npm run build:single` y sube `dist-single/index.html` como `index.html` a una rama `gh-pages` (o a la raíz de un repo con Pages activado en *Settings → Pages*). La búsqueda web con Openverse/Wikimedia funciona en GitHub Pages; para IA real necesitas desplegar el servidor de `server/` aparte (Render, Railway, Vercel…).
