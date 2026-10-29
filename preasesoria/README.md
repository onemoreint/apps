# Valoración de bienestar · Jaqueline Cataño

Formulario de preasesoría con envío a WhatsApp para **Jaqueline Cataño, especialista en pérdida de peso** (+57 302 291 7846 · diosjake86@gmail.com). La foto está en la bienvenida, en la cabecera de todas las pantallas y junto al botón de envío.

Formulario web (React) para que los prospectos respondan, desde el celular, un cuestionario de hábitos, sueño, salud y objetivos antes de una asesoría personalizada. Al final se abre WhatsApp con todas las respuestas ordenadas y dirigidas a **+57 302 291 7846**; el prospecto solo pulsa **Enviar**.

**Enlace para compartir:** https://onemoreint.github.io/apps/preasesoria/app/

## Qué hace

- 6 secciones, una por pantalla, con barra de progreso y botones «Anterior» / «Continuar».
- Respuestas con tarjetas grandes de selección simple; texto o números solo donde hace falta.
- Preguntas condicionales: «Otro» (actividad laboral y objetivo), tipo de ejercicio, tiempo para volver a dormir, condiciones de salud, lista de medicamentos (añadir/eliminar sin límite práctico, máx. 25) y alergias.
- Validaciones: nombre, edad, peso y estatura obligatorios, edad 1–120, peso 2–400 kg, estatura 0.40–2.60 m (detecta si escriben centímetros), decimales con punto o coma, sin negativos.
- Las respuestas se conservan al ir y volver; pantalla de revisión con botón «Editar» por sección.
- Autorizaciones (Ley 1581 de 2012): datos personales siempre; datos sensibles de salud solo si se compartieron; representante legal si la edad es menor de 18. Sueño y preguntas de salud son opcionales.
- Mensaje con las respuestas reales, por secciones, sin incluir condicionales que no aplican. Opcionales vacías = «Sin respuesta».
- Enlace oficial `https://wa.me/573022917846?text=…` con codificación correcta de acentos, ñ, emojis, saltos de línea y símbolos.
- Si el mensaje es demasiado largo (enlace > 6.000 caracteres), se divide en «Parte 1 de N», «Parte 2 de N»… sin quitar nada.
- Pantalla final «Tu formulario está listo»: abrir WhatsApp de nuevo, copiar respuestas, ver el mensaje, volver a corregir. Nunca dice que el asesor las recibió.
- No guarda nada en servidores ni en el navegador: los datos viven en la pestaña hasta que se envían por WhatsApp.

## Configurar

Edita `src/config.ts`:

| Campo | Para qué |
|---|---|
| `whatsappNumero` | Número receptor (solo dígitos con indicativo). |
| `whatsappVisible` | Cómo se muestra el número. |
| `responsableNombre`, `nombreCorto`, `especialidad` | Datos de Jaqueline que se muestran en la app y en la política. |
| `responsableCorreo` | Correo para consultas sobre datos. |
| `politicaPrivacidadUrl` | Vacío = se usa la política incluida en la app (`src/components/Politica.tsx`). |
| Foto | `src/foto-jaqueline.webp` y `src/foto-jaqueline-mini.webp`. |
| `maxLongitudEnlace` | Límite para dividir mensajes largos. |

Después: `npm run build` y sube los cambios.

## Ejecutar y probar

```bash
cd preasesoria
npm install
npm run dev          # http://localhost:5173 — ábrelo también desde el celular en la misma red con: npm run dev -- --host
npm test             # 20 pruebas: validaciones, mensaje, codificación, número y división de mensajes largos
npm run build        # genera app/index.html (un solo archivo)
python3 tests/e2e.py # recorrido completo en tamaño celular con datos ficticios (requiere Playwright)
```

Prueba manual recomendada: abre el enlace en tu celular, llena con datos ficticios, pulsa «ENVIAR MIS RESPUESTAS POR WHATSAPP» y confirma que se abre el chat con +57 302 291 7846 y el mensaje escrito.

## Publicar

La app ya queda publicada con GitHub Pages desde la rama `main` del repositorio `onemoreint/apps`:

1. Cada vez que cambies algo: `npm run build` dentro de `preasesoria/`.
2. Haz commit y push de la carpeta `preasesoria/` (incluida `app/index.html`).
3. En 1–2 minutos el enlace https://onemoreint.github.io/apps/preasesoria/app/ muestra la versión nueva.

Alternativa: arrastra `app/index.html` a Netlify Drop (https://app.netlify.com/drop) para obtener otro enlace.

## Pendiente para producción

1. **Revisar la política incluida** en la app (botón «Leer la política…» en el paso 6) y ajustarla si un abogado lo recomienda.
2. **Probar en tu celular** el flujo completo (Android e iPhone si es posible).
3. **Dominio propio (opcional):** para un enlace más corto o de marca.
4. **Recepción automática (opcional):** hoy el prospecto envía el mensaje manualmente. Si quieres recibir las respuestas sin depender de eso, o confirmar el envío, se necesita un backend privado (p. ej. una función serverless) con la API oficial de WhatsApp Business (Meta Cloud API), número verificado y token guardado como secreto del servidor, nunca en esta página. No está configurado.
5. **Resguardo de los chats:** las respuestas incluyen datos de salud; protege el teléfono que las recibe y borra lo que ya no necesites.
