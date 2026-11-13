# YOU MOVE FORWARD · Presentación interactiva U-MUVO

Presentación digital de 32 diapositivas: las 30 del PDF «YOU MOVE FORWARD» (Summit Networkers · U-MUVO · One More Global) más la diapositiva «El salto: MLM con IA» y el cierre de contacto con José Lugo.
Funciona sin internet, sin instalar nada y sin servicios pagos.

```
ymf/
├── index.html          ← la presentación completa (HTML + CSS + JavaScript)
├── LEEME.md            ← este archivo
├── DIAGNOSTICO.md      ← análisis del PDF y decisiones tomadas
└── assets/
    ├── img/            ← fotos, productos, logos e íconos recortados del PDF original
    └── fonts/          ← tipografía Montserrat (local)
```

---

## 1. Cómo ejecutarla

1. Descomprime el ZIP **sin separar** `index.html` de la carpeta `assets`.
2. Haz doble clic en `index.html`. Se abre en tu navegador (Chrome, Edge, Safari o Firefox).
3. Pulsa **F** para pantalla completa y usa las flechas del teclado.

### Controles

| Acción | Teclado | Pantalla |
|---|---|---|
| Siguiente / anterior | → / ← · Espacio · Re Pág / Av Pág | Botones ‹ › abajo a la derecha · deslizar con el dedo |
| Ir a una diapositiva | escribe el número + Enter | Escribe el número en el contador |
| Menú de secciones | M | Botón ☰ (arriba a la izquierda) |
| Volver al inicio | Inicio | Botón 🏠 |
| Pantalla completa | F | Botón ⛶ |
| Modo expositor | P | Botón de monitor |
| Notas del expositor | N | Botón de notas |
| Activar / pausar animaciones | A | Ajustes ⚙ |
| Pantalla negra (pausa) | B | — |
| Asistente de preguntas | I | Botón ✦ «Pregunta al asistente» (abajo a la izquierda) |
| Atajos | ? | Menú → Atajos de teclado |

Otras funciones:

- **Barra de progreso:** es la franja de colores inferior de la marca. Al pasar el cursor muestra cada sección y con un clic saltas a ella.
- **Ajustes ⚙:** tipo de transición (cinemática, desvanecer, deslizar, acercar o ninguna), animaciones y ocultar los controles en pantalla completa. Se recuerdan en ese navegador.
- **Modo expositor (P):** abre una segunda ventana con la diapositiva actual, la siguiente, tus notas, un cronómetro y la hora. Lleva la ventana principal al proyector y deja la del expositor en tu portátil. Si el navegador bloquea la ventana emergente, permite ventanas emergentes para el archivo.
- **Imprimir / PDF (botón de impresora):** en el diálogo elige «Guardar como PDF» y activa «Gráficos de fondo». Sale una diapositiva por página (1920 × 1080).
- **Compartir:** copia el enlace a la diapositiva actual (por ejemplo `…/index.html#/17`). Solo funciona cuando la presentación está publicada en internet.
- **Enlaces directos:** `index.html#/24` abre directamente la diapositiva 24.

### Elementos interactivos

| Diap. | Qué hace |
|---|---|
| 3 | Cada pilar se despliega y salta a su sección |
| 7 | Las 5 marcas se amplían al pasar el cursor o al tocarlas |
| 9 | Línea de tiempo: con → avanza etapa por etapa hasta la tecnología transdérmica |
| 11, 12, 13, 14 | Productos y certificado ampliables (clic para hacer zoom) |
| 13 | Selector de las 7 soluciones con su beneficio |
| 15 | Animación del modelo tradicional frente a network marketing |
| **16** | **El salto: comparador arrastrable «MLM tradicional» frente a «MLM con IA» + botón «Dar el salto»** |
| 18 | Selección y resumen de cada franquicia |
| 19, 20, 22, 24–27 | Cifras con contador animado |
| 21 | Calculadora del bono de inicio rápido (20 % – 30 %) |
| 23 | Formar el equipo 4x4 tocando los cuatro círculos (con confeti) |
| 24 | Árbol binario animado |
| 25 | Anillos por nivel + simulador del bono uninivel |
| 27 | Barras proporcionales del matching bonus |
| **32** | **Comunícate con José Lugo: bandera de Colombia, +57 312 638 7467, WhatsApp, llamar y código QR** |

**Asistente de la presentación (✦):** disponible en todas las diapositivas. Responde preguntas sobre productos, plan de compensación, certificaciones, IA y contacto. Lleva a la diapositiva correspondiente y puede leer las respuestas en voz alta (botón de altavoz). En Chrome también acepta preguntas por voz (micrófono). Funciona sin internet y responde **solo con la información de la presentación**: no es un modelo de IA conectado a la nube. Si no sabe algo, invita a escribirle a José por WhatsApp. Sus respuestas están en el JavaScript, en la lista `KB`.

**Efectos:** red de partículas que reacciona al cursor (sección de IA y contacto), brillo que sigue al cursor, inclinación 3D de tarjetas, botones magnéticos, fotos con paralaje, títulos que se «decodifican», confeti, barra de progreso con destello y transición cinemática. Todo se apaga con la tecla **A** o en Ajustes, y respeta la opción «reducir movimiento» del sistema.

---

## 2. Publicarla gratis en GitHub Pages

1. Entra a <https://github.com> e inicia sesión.
2. Crea un repositorio nuevo, público (por ejemplo `you-move-forward`).
3. En el repositorio pulsa **Add file → Upload files** y arrastra **el contenido** de la carpeta `ymf` (`index.html`, `assets/`, `LEEME.md`…). Pulsa **Commit changes**.
4. Ve a **Settings → Pages**. En **Source** elige *Deploy from a branch*, rama `main` y carpeta `/ (root)`. Guarda.
5. En 1 a 2 minutos queda en línea en `https://TU-USUARIO.github.io/you-move-forward/`.

Esta copia ya está publicada en `onemoreint/apps`, carpeta `you-move-forward/`: https://onemoreint.github.io/apps/you-move-forward/

Con la presentación publicada ya funcionan el botón **Compartir** y los enlaces por diapositiva.

---

## 3. Cómo modificar textos e imágenes

Abre `index.html` con cualquier editor de texto (VS Code, Bloc de notas, TextEdit en modo texto sin formato).

**Textos.** Cada diapositiva es un bloque `<section class="slide" …>` con un comentario que la numera, por ejemplo `<!-- 17 · FRANQUICIA PERSONAL -->`. Busca el texto (Ctrl/Cmd + F) y reemplázalo. Ten cuidado de no borrar las etiquetas `< >`.

- `data-title="…"` es el nombre que aparece en el menú.
- `data-section="…"` agrupa la diapositiva en el menú y en la barra de progreso.
- `<aside class="notes">…</aside>` son las notas del expositor (no se ven en pantalla).

**Cifras animadas.** Tienen dos atributos, por ejemplo `data-count="60000" data-final="USD 60,000"`. Si cambias una cifra, actualiza los dos y el texto visible.

**Imágenes.** Reemplaza el archivo en `assets/img/` por otro con **el mismo nombre**, o cambia la ruta en `src="assets/img/…"`. Usa JPG de unos 1200–1900 px de ancho.

**Productos de la diapositiva 13.** Están en el JavaScript, en la lista `PRODS` (nombre, beneficio y posición del marcador en %).

**Porcentajes del uninivel (diap. 24).** Están en la lista `const LV=[10,10,20,12,7,5];`. El total 64 % está en la tarjeta `data-count="64"`.

**Colores.** Al inicio del `<style>`, en `:root`: `--navy`, `--blue`, `--cyan` y `--spectrum` (la franja de la marca).

**Agregar una diapositiva.** Copia un bloque `<section class="slide" …>…</section>` completo, pégalo donde la quieras y cambia su `id` por uno nuevo y único (por ejemplo `s31`). El menú, el contador y la barra de progreso se actualizan solos.

**Generador de invitaciones (diap. 18).** Los textos están en el JavaScript, en el objeto `T` (por interés: `salud`, `negocio`, `ambos`; por tono: `cercano`, `pro`). Puedes agregar más versiones a cada lista.

**Contacto (diap. 32).** El número y el mensaje de WhatsApp están en el bloque `<!-- CONTACTO · JOSÉ LUGO -->`. Si cambias el número, cambia también el enlace `wa.me` y regenera el código QR.
