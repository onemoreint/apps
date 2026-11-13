# YOU MOVE FORWARD · Presentación interactiva U-MUVO

Presentación digital de 30 diapositivas construida a partir del PDF «YOU MOVE FORWARD» (Summit Networkers · U-MUVO · One More Global).
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
| Atajos | ? | Menú → Atajos de teclado |

Otras funciones:

- **Barra de progreso:** es la franja de colores inferior de la marca. Al pasar el cursor muestra cada sección y con un clic saltas a ella.
- **Ajustes ⚙:** tipo de transición (desvanecer, deslizar, acercar o ninguna), animaciones y ocultar los controles en pantalla completa. Se recuerdan en ese navegador.
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
| 15 | Animación del modelo tradicional frente a network marketing (botón para repetirla) |
| 17 | Selección y resumen de cada franquicia |
| 18, 19, 21, 23, 24, 25, 26 | Cifras con contador animado |
| 20 | Calculadora del bono de inicio rápido (20 % – 30 %) |
| 22 | Formar el equipo 4x4 tocando los cuatro círculos |
| 23 | Árbol binario animado |
| 24 | Anillos por nivel + simulador del bono uninivel |
| 26 | Barras proporcionales del matching bonus |

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
