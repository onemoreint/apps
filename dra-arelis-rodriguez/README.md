# Dra. Arelis Rodríguez de Díaz · Odontología general

Página web de una sola sección para presentar la atención de **odontología general** de la **Dra. Arelis Rodríguez de Díaz** (lunes a viernes, de 3:00 a 6:00 p. m., previa cita) y convertir las visitas en conversaciones por WhatsApp (+58 416 783 1789).

**Publicada en:** https://onemoreint.github.io/apps/dra-arelis-rodriguez/app/

Hecha con React 19, Vite, Tailwind CSS 4 y los íconos de Lucide. No tiene servidor, base de datos ni agenda automática: todos los botones y el formulario abren WhatsApp con un mensaje ya escrito.

---

## 1. Estructura de carpetas

```
dra-arelis-rodriguez/
├── app/                    ← versión compilada que publica GitHub Pages (no editar a mano)
├── public/
│   ├── favicon.svg         ← ícono de la pestaña
│   └── og.png              ← imagen al compartir el enlace (WhatsApp, Facebook…)
├── scripts/build-pages.mjs ← compila la página para GitHub Pages
├── src/
│   ├── contenido.ts        ← ★ TEXTOS, SERVICIOS, FOTOS, NÚMERO Y DATOS POR CONFIRMAR
│   ├── whatsapp.ts         ← mensajes y enlaces de WhatsApp
│   ├── validacion.ts       ← reglas del formulario
│   ├── secciones/          ← una pieza por sección (Encabezado, Hero, Servicios…)
│   ├── componentes/        ← botón flotante, aviso de privacidad, enlaces
│   ├── index.css           ← colores, tipografías y estilos base
│   └── whatsapp.test.ts    ← pruebas automáticas de mensajes y validación
├── index.html              ← título SEO, descripción y metadatos
└── package.json
```

## 2. Instalar y ejecutar

Requisito: [Node.js 22](https://nodejs.org) o superior.

```bash
cd dra-arelis-rodriguez
npm install        # instala dependencias (una sola vez)
npm run dev        # abre la página en http://localhost:5173 y se actualiza al guardar
npm test           # pruebas de mensajes de WhatsApp y del formulario
npm run build      # versión final en la carpeta dist/ (para Netlify, Vercel, hosting propio)
```

## 3. Cómo cambiar textos, fotos y servicios

Casi todo está en **`src/contenido.ts`**, con comentarios en español:

| Quiero cambiar… | Dónde |
|---|---|
| Número de WhatsApp | `WHATSAPP` (solo dígitos con código de país) y `WHATSAPP_VISIBLE` |
| Servicios | `SERVICIOS`: borra o copia un bloque `{ … }`. El formulario se actualiza solo |
| Datos de la doctora | `PERFIL`: escribe el texto en lugar de `null` |
| Horario de atención | `HORARIO` (texto), `DIAS_ATENCION` (días que acepta el formulario) y `FRANJAS` (opciones de horario del formulario) |
| Ubicación | `UBICACION` (aparece en «Sobre mí», el pie y las preguntas frecuentes) |
| Preguntas frecuentes | `PREGUNTAS` |
| Fotos | `FOTOS` y la `foto` de cada servicio. Copia la foto en `public/fotos/` y usa `local('nombre.jpg')`. Si es del consultorio real, pon `ilustrativa: false` |
| Foto de la doctora | ya está en `public/fotos/` (retrato y avatar); para cambiarla, reemplaza esos archivos con el mismo nombre |
| Recuadros «Por confirmar» | `MOSTRAR_PENDIENTES = false` para la versión final: los datos sin confirmar se ocultan |
| Crédito del desarrollador | `CREDITO.mostrar` |
| Títulos y textos de cada sección | el archivo de esa sección en `src/secciones/` |
| Colores | variables `--color-…` en `src/index.css` |
| Título y descripción para Google | `index.html` |

Recomendación para las fotos propias: formato JPG o WebP, unos 1200 px de ancho y menos de 300 KB.

## 4. Publicar

**GitHub Pages (actual).** Después de editar:

```bash
npm run build:pages   # compila en app/
git add -A && git commit -m "Actualiza landing" && git push
```

En uno o dos minutos se actualiza https://onemoreint.github.io/apps/dra-arelis-rodriguez/app/

**Dominio propio con Netlify o Vercel.** Importa el repositorio y configura:
- Carpeta base: `dra-arelis-rodriguez`
- Comando: `npm run build`
- Carpeta publicada: `dist`
- Variable de entorno `PUBLIC_URL=https://tudominio.com/` (para la vista previa al compartir)

**Hosting tradicional (cPanel).** `PUBLIC_URL=https://tudominio.com/ npm run build` y sube el contenido de `dist/` a `public_html`.

## 5. Datos que la doctora debe confirmar antes de publicar

- [x] Nombre completo, especialidad (odontología general) y horario (lunes a viernes, 3:00 a 6:00 p. m., previa cita)
- [x] Fotografía de la doctora
- [ ] Servicios que realmente ofrece (y si quiere agregar o quitar alguno)
- [ ] Formación académica y experiencia
- [ ] Ubicación del consultorio (ciudad, dirección o zona)
- [ ] Fotos reales de su consultorio (para reemplazar las ilustrativas)
- [ ] Que el número +58 416 783 1789 recibirá las solicitudes
- [ ] Texto de privacidad y tratamiento de datos (revisar según la normativa local)
- [ ] Redes sociales, si quiere mostrarlas
- [ ] Dominio propio, si lo tendrá
- [ ] Después de confirmar todo: `MOSTRAR_PENDIENTES = false`

## 6. Revisión final realizada

| Punto | Resultado |
|---|---|
| Enlaces de WhatsApp | 12 enlaces al número de la doctora (consulta general, uno por servicio y solicitud de cita) con mensaje codificado con `encodeURIComponent` |
| Acentos y saltos de línea | Verificados en pruebas automáticas (`ñ`, `í`, `&`, `\n` → `%0A`) |
| Formulario | Valida nombre, servicio, día (no permite fechas pasadas ni sábados y domingos) y franja de la tarde (3 a 6 p. m.); teléfono y comentario opcionales; lleva el foco al primer error; muestra «Abriendo WhatsApp…» y luego una confirmación con botón de respaldo si el navegador no abrió WhatsApp |
| Aviso de no confirmación | Visible junto al formulario y en preguntas frecuentes |
| Datos médicos | El formulario no los pide y advierte no enviarlos en el mensaje inicial |
| Navegación | Todas las anclas del menú llevan a su sección; menú móvil se cierra al elegir y con Esc |
| Versión móvil | Revisada a 390 px: sin desplazamiento horizontal, botones de 48 px de alto mínimo |
| Accesibilidad | Etiquetas en todos los campos, mensajes de error asociados, enlace «Saltar al contenido», foco visible, aviso de privacidad en `<dialog>` accesible, respeta «reducir movimiento» |
| SEO | Título, descripción, Open Graph con imagen, datos estructurados `Dentist`, idioma español |
| Fotos ilustrativas | Marcadas como «Imagen ilustrativa»; si no cargan, queda el fondo de color sin texto roto |

## Fotografías

- **Doctora:** foto propia (`public/fotos/dra-arelis-retrato.webp` y `dra-arelis-avatar.webp`), en el inicio, «Sobre mí», el cierre y la imagen para compartir.
- **Consultorio y servicios:** fotos reales de referencia de [Unsplash](https://unsplash.com) (licencia gratuita, uso comercial permitido). **No son del consultorio de la doctora**, por eso llevan la etiqueta «Imagen ilustrativa». Se cargan desde los servidores de Unsplash; cuando haya fotos propias conviene guardarlas en `public/fotos/`.

---

Desarrollado por **José Lugo** · +57 312 638 7467 · jose.lugocdv@gmail.com
