# Mi Perfil de Bienestar — José Lugo (PWA)

Cuestionario de bienestar orientativo que se abre desde un enlace público (WhatsApp, redes, correo, QR o navegador), se puede instalar como app y funciona sin conexión una vez descargado.

**Enlace publicado:** https://onemoreint.github.io/apps/mi-perfil-bienestar/ (repositorio `onemoreint/apps`, carpeta `mi-perfil-bienestar/`).

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Estructura de la app: cuestionario, informe, mensaje al asesor y ventanas de privacidad. |
| `styles.css` | Diseño adaptable a celular, tableta y computador (modo claro y oscuro). |
| `app.js` | Lógica: pasos, validación, informe, borrador en IndexedDB, borrado de datos, WhatsApp, instalación y estado de conexión. |
| `manifest.webmanifest` | Nombre, iconos, colores y configuración de instalación. |
| `service-worker.js` | Guarda en caché **solo los archivos de la app** para abrirla sin internet. |
| `icons/` | Iconos 192, 512, 512 adaptable (maskable), iPhone (180) y favicon. |
| `.nojekyll` | Evita que GitHub Pages procese los archivos. |
| `pruebas/prueba-automatica.py` | Prueba automática opcional (no la necesita la app). |

## Qué funciona sin conexión y qué no

Funciona sin internet **después de haber abierto la app una vez con conexión** en ese dispositivo y navegador:

- Abrir la app (instalada o desde el navegador donde se abrió antes).
- Completar, revisar y editar todas las secciones.
- Generar el informe preliminar y el índice orientativo.
- Copiar el informe y el mensaje (si el dispositivo lo permite).
- Preparar y editar el mensaje al asesor.
- Guardar, recuperar y eliminar el borrador (si el cliente lo autorizó).

**Requiere internet:**

- La primera apertura del enlace. Un dispositivo que nunca abrió la app no puede abrirla sin conexión.
- Enviar por WhatsApp. Sin conexión la app muestra: «Estás sin conexión. Tu informe está preparado, pero todavía no se ha enviado».
- Recibir actualizaciones de la app.

## Privacidad (cómo está construida)

- No hay servidor ni base de datos: las respuestas nunca salen del dispositivo, salvo cuando el cliente decide enviarlas por WhatsApp.
- Sin analíticas, sin fuentes ni scripts externos, sin registros de depuración. Una política de seguridad (CSP) bloquea cualquier conexión a terceros.
- Por defecto todo vive solo en memoria: si se cierra la app, se pierde.
- El borrador solo se guarda en IndexedDB si el cliente lo activa, después de ver el aviso de que no está cifrado y de que cualquiera con acceso al dispositivo podría verlo. Caduca solo (24 h, 3 días o 7 días) y se borra al instante si se desactiva.
- Las preguntas de salud son opcionales, requieren consentimiento expreso y por defecto **no** se incluyen en el mensaje al asesor (hay una casilla para incluirlas).
- Las respuestas nunca van en la dirección web. La app incluso limpia cualquier parámetro que se le añada al enlace.
- La caché del service worker solo contiene los 10 archivos de la app.
- «Eliminar todos mis datos» borra respuestas, informe, mensaje y borrador; opcionalmente también los archivos de la app.
- Sobre WhatsApp: el botón principal («Copiar mensaje y abrir WhatsApp») abre el chat sin texto en el enlace y el cliente pega el mensaje. El botón alternativo («con el mensaje escrito») pasa el texto dentro del enlace `wa.me`, lo que es cómodo pero puede dejarlo en el historial del navegador; la app lo explica en pantalla.
- La app nunca marca un informe como «enviado»: WhatsApp no le confirma el envío. Muestra «Abriste WhatsApp… verifica en tu chat».

## Publicar gratis en GitHub Pages

GitHub Pages sirve los archivos con HTTPS, que es obligatorio para que el service worker y la instalación funcionen.

1. Entra a github.com con tu cuenta.
2. Botón **New** (nuevo repositorio). Nombre sugerido: `mi-perfil-bienestar`. Elige **Public** (Pages gratis requiere repositorio público; el repositorio solo contiene código, nunca datos de clientes). Crea el repositorio.
3. En el repositorio: **Add file → Upload files**. Arrastra **el contenido** de la carpeta (no la carpeta en sí): `index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `service-worker.js`, `.nojekyll`, la carpeta `icons` y, si quieres, `README.md` y `pruebas`. `index.html` debe quedar en la raíz.
   - Si `.nojekyll` no aparece al arrastrar (los archivos que empiezan con punto se ocultan), créalo con **Add file → Create new file**, nombre `.nojekyll`, vacío.
4. Pulsa **Commit changes**.
5. Ve a **Settings → Pages**. En **Build and deployment → Source** elige **Deploy from a branch**; rama `main`, carpeta `/ (root)`. **Save**.
6. Espera 1–2 minutos y recarga la página de Settings → Pages. Aparecerá tu dirección: `https://TU-USUARIO.github.io/mi-perfil-bienestar/`. Verifica que **Enforce HTTPS** esté marcado.
7. Abre la dirección en el celular con internet. Pulsa **Datos**: en «Modo sin conexión» debe decir **Listo ✓**.

**Alternativa:** si prefieres tenerla junto a tus otras apps, súbela como subcarpeta (por ejemplo `mi-perfil-bienestar/`) de tu repositorio de apps que ya publica en Pages. Todas las rutas son relativas, así que funciona igual en una subcarpeta.

### Publicar una actualización

1. Cambia el código.
2. Sube el número de versión en **dos** lugares: `VERSION` en `service-worker.js` y `APP_VERSION` en `app.js` (por ejemplo, `1.0.1`).
3. Sube los archivos modificados al repositorio.
4. Quienes ya tengan la app verán el aviso «Hay una versión nueva» y podrán pulsar **Actualizar**.

## Compartir el enlace

- **WhatsApp, redes y correo:** pega `https://TU-USUARIO.github.io/mi-perfil-bienestar/`. Ejemplo de texto: «Completa tu Perfil de Bienestar en 5 minutos, sin registrarte: [enlace]. Tus respuestas se quedan en tu celular hasta que tú decidas enviármelas».
- **Código QR:** genera un QR de la dirección con cualquier generador gratuito (por ejemplo, el de Chrome: menú ⋮ → Compartir → Código QR). Úsalo en presentaciones, tarjetas o flyers.
- **Recomienda instalarla:** así el cliente puede completarla luego sin internet.
- No añadas datos del cliente al enlace (por ejemplo `?nombre=...`); no hace falta y la app los ignora.

## Instalar la app

**Android (Chrome, Edge, Samsung Internet)**
1. Abre el enlace con internet.
2. Pulsa **Instalar** en la barra superior de la app (o menú ⋮ → **Instalar aplicación** / **Agregar a pantalla principal**).
3. Confirma. El icono naranja aparece en la pantalla de inicio.

**iPhone / iPad (Safari)**
1. Abre el enlace en **Safari** con internet (desde WhatsApp, toca «Abrir en Safari»).
2. Botón **Compartir** (cuadro con flecha) → **Agregar a inicio** → **Agregar**.
3. Abre la app una vez desde el icono con internet para que quede lista sin conexión.
   - Nota: en iPhone, la app instalada y Safari guardan datos por separado, y iOS puede borrar el almacenamiento de apps web que no se usan durante varias semanas.

**Computador (Chrome o Edge en Windows, Mac o Linux)**
1. Abre el enlace.
2. Pulsa **Instalar** en la app o el icono de instalar en la barra de direcciones (monitor con flecha).
3. La app se abre en su propia ventana y queda en el menú de aplicaciones. Safari en Mac: **Archivo → Agregar al Dock**. Firefox no instala PWAs en computador, pero la página sí funciona sin conexión tras la primera visita.

## Pruebas manuales (hazlas tras publicar)

Usa el enlace HTTPS publicado, no el archivo abierto desde tu computador.

### 1. Preparación offline
1. Con internet, abre la app. Pulsa **Datos**.
2. Esperado: «Conexión: Conectado», «Modo sin conexión: Listo ✓».
3. En computador también puedes ver: F12 → Application → Service workers (activado) y Cache storage (`mpb-shell-v1.0.0` con 10 archivos).

### 2. Funcionamiento sin conexión
1. Instala la app. Activa **modo avión**.
2. Abre la app desde el icono. Esperado: abre normalmente, indicador «Sin conexión» y banner naranja.
3. Completa todas las secciones, revisa, edita una sección con **Editar**, genera el informe.
4. Pulsa **Copiar informe** y pégalo en notas. Esperado: el texto completo.
5. Esperado: aviso «Estás sin conexión. Tu informe está preparado, pero todavía no se ha enviado» y botones de WhatsApp desactivados.
6. En computador: F12 → Network → «Offline» simula lo mismo.

### 3. Sin autorización no se guarda nada
1. Sin activar el borrador, responde un par de preguntas y cierra la app por completo.
2. Ábrela de nuevo. Esperado: formulario vacío.
3. En computador: F12 → Application → IndexedDB. Esperado: no existe `mpb-borradores`.

### 4. Conservación del borrador
1. Activa **Guardar borrador temporal**, lee el aviso y acepta.
2. Responde varias secciones y escribe algo en el mensaje al asesor. Cierra la app (desliza para cerrarla).
3. Ábrela otra vez, con o sin internet. Esperado: «Recuperamos tu borrador guardado el…» y todo restaurado, en el mismo paso.
4. En **Datos** debe decir la fecha en que se borrará automáticamente.
5. Desactiva el guardado. Esperado: «El borrador se eliminó», y al reabrir la app el formulario está vacío.

### 5. Eliminación de datos
1. Con borrador activo y respuestas completas, pulsa **Datos → Eliminar todos mis datos → Eliminar**.
2. Esperado: vuelve al inicio, formulario vacío, y en Datos «Borrador guardado: No».
3. Reabre la app: nada recuperado. En F12 → IndexedDB: sin base de datos.
4. Repite marcando «También eliminar los archivos de la app». Esperado: en modo avión la app ya no abre hasta volver a abrirla con internet.

### 6. Salud opcional y consentimiento
1. En Salud elige «Quiero responder» y pulsa continuar sin marcar el consentimiento. Esperado: mensaje de error.
2. Elige «Prefiero tratarlo con el asesor». Esperado: puedes avanzar y el informe dice que lo tratarás directamente.
3. Si respondes, en el mensaje al asesor la salud no aparece hasta marcar «Incluir mis respuestas de salud».

### 7. Envío por WhatsApp al recuperar internet
1. Con el informe generado en modo avión, desactiva el modo avión.
2. Esperado: banner verde «Conexión recuperada. Tu informe aún no se ha enviado» y botones de WhatsApp activos.
3. Pulsa **Copiar mensaje y abrir WhatsApp**. Esperado: se abre el chat con +57 312 638 7467; pega el mensaje, revísalo y envíalo.
4. Vuelve a la app. Esperado: «Abriste WhatsApp… La app no puede confirmar si el mensaje se envió». Nunca dice «enviado».
5. Prueba **Abrir WhatsApp con el mensaje escrito**: el chat abre con el texto ya escrito.

### 8. Privacidad de red (computador)
1. F12 → Network, recarga y completa el cuestionario.
2. Esperado: solo peticiones a tu propio dominio (archivos de la app y una comprobación de conexión `manifest.webmanifest?probe=…` sin datos). Ninguna petición a terceros ni con respuestas en la URL.

### Prueba automática (opcional, para desarrolladores)
Requiere Python y Playwright (`pip install playwright` y `playwright install chromium`).
```
cd mi-perfil-bienestar
python3 -m http.server 8765        # en otra terminal
python3 pruebas/prueba-automatica.py . http://localhost:8765/
```
Recorre 32 comprobaciones: caché offline, apertura sin conexión, borrador, caducidad, eliminación, consentimiento de salud, WhatsApp al recuperar conexión, ausencia de peticiones a terceros y de errores de CSP.

## Aviso

El perfil es orientativo. No diagnostica ni prescribe, y el informe lo indica de forma explícita. Si el cliente reporta embarazo, medicamentos, condiciones de salud, sensibilidad a adhesivos o es menor de edad, el informe recomienda consultar con un médico antes de usar cualquier suplemento o parche.
