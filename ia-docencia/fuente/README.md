# Inteligencia Artificial Aplicada a la Docencia

Landing page del curso para docentes en Venezuela. Identidad visual: FUTURE EDUCATION AI.
Su objetivo es llevar al visitante al grupo de WhatsApp.

Hecha con React, Vite, Tailwind CSS, Framer Motion y Lucide React.

## Requisitos

Node.js 18 o superior.

## Instalación y ejecución local

```bash
npm install
npm run dev       # abre http://localhost:5173
```

Para generar y revisar la versión final:

```bash
npm run build     # crea la carpeta dist
npm run preview
```

## Cambiar el enlace de WhatsApp y otros datos

Todo está en `src/config/site.js`:

| Variable | Para qué sirve |
| --- | --- |
| `WHATSAPP_GROUP_LINK` | Enlace del grupo. Lo usan todos los botones de conversión. |
| `WHATSAPP_CONTACT_NUMBER` | Opcional. Número que recibe el mensaje del formulario, solo dígitos con código de país. Vacío: WhatsApp pide elegir el chat. |
| `GA_MEASUREMENT_ID` | Opcional. Identificador real de Google Analytics. |
| `META_PIXEL_ID` | Opcional. Identificador real de Meta Pixel. |
| `DATE_NOTE`, `DATE_FAQ` | Textos sobre la fecha. Cámbialos cuando el grupo defina el día. |

Los demás textos del programa, las herramientas y las preguntas están en `src/data/content.js`.

## Seguimiento

Sin identificadores no se carga ningún script externo de medición. Al pegarlos en `site.js`, se envían estos eventos:

- `join_whatsapp_group` en Google Analytics y `Lead` en Meta, con la ubicación del botón (`hero`, `navbar`, `embudo`, `cta-final`, `flotante`, `barra-movil`, etc.).
- `prequalification_prepared` en Google Analytics y `PrequalificationPrepared` en Meta, cuando alguien prepara su mensaje.

## Formulario opcional

La página no tiene backend: no guarda ni transmite datos. El formulario arma un mensaje en el navegador. WhatsApp no permite escribir un texto previo dentro de un grupo, así que el botón principal copia el mensaje y abre el grupo para que la persona lo pegue. También puede enviarlo a otro chat.

## Publicación actual en GitHub Pages

Dirección pública: https://onemoreint.github.io/apps/ia-docencia/

El código fuente está en `ia-docencia/fuente/` y la página compilada en `ia-docencia/`. Después de cualquier cambio, ejecuta esto dentro de `fuente/` y sube el resultado a `main`:

```bash
npm install
npm run build:pages
```

## Publicar gratis en otra dirección

Si publicas en otra dirección, ponla en `VITE_SITE_URL` dentro del archivo `.env`. Así se ve la imagen de vista previa al compartir el enlace.

### Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com), elige **Add New > Project** e importa el repositorio.
3. Vercel detecta Vite. Pulsa **Deploy**.

### Netlify

Opción con repositorio: en [netlify.com](https://www.netlify.com), elige **Add new site > Import an existing project**. La configuración ya está en `netlify.toml`.

Opción sin repositorio: ejecuta `npm run build` y arrastra la carpeta `dist` a [app.netlify.com/drop](https://app.netlify.com/drop).

## Estructura

```
├── index.html               SEO, Open Graph, favicon y fuentes
├── public/                  favicon, imagen para redes, robots.txt
└── src/
    ├── config/site.js       enlace de WhatsApp, medición y textos de fecha
    ├── data/content.js      contenido del curso
    ├── lib/tracking.js      Google Analytics y Meta Pixel
    ├── hooks/useCanvasLoop.js
    ├── assets/logos/        logos de las herramientas
    ├── index.css            estilos y animaciones propias
    ├── App.jsx
    └── components/
        ├── Navbar, Hero, Benefits, Curriculum, Tools
        ├── SpecialEducation, PracticalWorkshop, WhatsAppFunnel
        ├── PrequalForm, FAQ, FinalCTA, Footer, FloatingWhatsApp
        ├── ui/              JoinLink, Counter, Reveal, WhatsAppIcon
        └── effects/         NeuralBrain, ParticleField, Background, ClassroomIllustration
```

## Rendimiento y accesibilidad

- Los efectos se dibujan con canvas y CSS, sin imágenes pesadas.
- Las animaciones de canvas se detienen fuera de pantalla o con la pestaña oculta, y usan menos elementos en teléfonos.
- El desenfoque de vidrio solo se activa en pantallas grandes.
- Con la preferencia "reducir movimiento" las animaciones se apagan y el cerebro queda como imagen fija.
- Navegación por teclado, foco visible, enlace para saltar al contenido y contraste alto.
