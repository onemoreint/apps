# CarteraPro — MVP (versión 1.0)

Gestión de clientes, créditos, cuotas, pagos y cartera. Aplicación web progresiva (PWA): se instala en celular, tablet o computador y funciona sin internet. HTML + CSS + JavaScript (módulos ES), sin frameworks ni backend. Los datos se guardan en IndexedDB, dentro del navegador del dispositivo.

## Ejecutar localmente

Los módulos ES y el service worker no funcionan abriendo `index.html` con doble clic. Usa un servidor local desde esta carpeta:

```bash
python3 -m http.server 8080      # o: npx serve -l 8080 .
```

Abre http://localhost:8080 (en `localhost` también funcionan el PIN y el modo sin conexión).

## Publicar para usarla en el celular

Cualquier hosting estático gratuito con **https** sirve. Ejemplos:

- **Netlify Drop**: entra a app.netlify.com/drop y arrastra la carpeta `carterapro`. Te da un enlace `https://…netlify.app`.
- **GitHub Pages**: sube la carpeta a un repositorio y activa Pages en Settings → Pages.
- **Cloudflare Pages**: crea un proyecto y sube la carpeta.

No requiere configuración de servidor. Después abre el enlace en el celular e instálala.

## Instalar como app

- **Android (Chrome)**: menú ⋮ → "Instalar app". En la app también aparece el botón en Más → Instalar la app.
- **iPhone/iPad (Safari)**: botón Compartir → "Agregar a inicio".
- **Computador (Chrome/Edge)**: ícono de instalar en la barra de direcciones.

## Funcionamiento sin conexión

`service-worker.js` guarda todos los archivos de la app la primera vez que se abre. Después, la app abre y funciona completa sin internet: crear clientes y créditos, registrar pagos, reportes, copias. Los datos nunca dependieron de internet porque viven en IndexedDB.

Al publicar cambios: edita los archivos, cambia `VERSION` en `service-worker.js` y ejecuta `node tools/actualizar-sw.mjs` si agregaste o quitaste archivos. Los usuarios verán el aviso "Hay una versión nueva" con el botón Actualizar.

## IndexedDB

Base de datos `carterapro` con tablas (object stores): `clientes`, `creditos`, `cuotas`, `pagos`, `config`, `contadores` (consecutivos de crédito y recibo) y `meta` (copia previa a una restauración). Solo `js/data/db.js` habla con IndexedDB. Para cambiar el esquema, sube `VERSION` en ese archivo y agrega un bloque `if (anterior < N)` en `migrar()`.

Reglas: dinero en enteros (unidad mínima de la moneda), fechas como `YYYY-MM-DD`, estados y saldos calculados (nunca guardados). Los pagos nunca se borran: se anulan y se revierten en las cuotas.

## Copia de seguridad

Más → Copia de seguridad.

- **Exportar copia completa**: archivo `.json` con clientes, créditos, cuotas, pagos, contadores y configuración. En el celular abre el menú de compartir (Drive, WhatsApp, correo).
- **Restaurar**: valida formato, versión e integridad (que cada crédito tenga su cliente, cada pago sus cuotas…), muestra el resumen ("43 clientes, 51 créditos…") y pide confirmación. Antes de reemplazar guarda los datos actuales; "Deshacer la última restauración" los recupera.
- Las copias **no incluyen el PIN** (cada dispositivo tiene el suyo).
- El inicio avisa si pasaron más de 7 días sin copia.
- **CSV para Excel** de clientes, créditos, cuotas y pagos, e **importación de clientes desde CSV** (columnas Nombre y Teléfono obligatorias; se omiten duplicados y filas inválidas, indicando el motivo).

## Seguridad

Más → Seguridad. PIN de 4 a 8 números guardado como hash PBKDF2-SHA256 (150.000 iteraciones, sal aleatoria); tras 5 intentos fallidos espera 30 segundos. Bloqueo automático por inactividad o al volver a la app. Botón para ocultar valores. El PIN protege la pantalla; no cifra la base de datos del navegador.

## Pruebas

```bash
node --test tests/*.test.mjs        # 19 pruebas del motor (cálculos, reportes, copias, CSV, diagnóstico, idiomas)
python3 tests/e2e.py                # recorrido completo en Chromium (requiere playwright y el servidor en :8080)
python3 tests/e2e_etapa4.py         # copia/restauración, importación, PIN, apariencia y modo sin conexión
python3 tests/e2e_final.py          # caso Carlos Pérez de la especificación, accesibilidad y rendimiento
```

## Estructura

```
index.html, manifest.webmanifest, service-worker.js
css/app.css           Estilos mobile first, tema claro/oscuro, impresión
icons/                Íconos de la app (normal, maskable, Apple)
js/app.js             Arranque, rutas, bloqueo, service worker
js/core/              Fechas, dinero, router, eventos, errores, idiomas (i18n + locales)
js/data/db.js         Única capa que toca IndexedDB
js/domain/            Reglas puras: interés, cuotas, pagos, estados, métricas, riesgo, reportes, copias, diagnóstico
js/services/          Casos de uso: clientes, créditos, pagos, copia, seguridad, WhatsApp, instalación…
js/ui/                Plantillas seguras, iconos, componentes, diálogos, pantalla de bloqueo
js/views/             Una pantalla por archivo (se cargan bajo demanda)
tools/actualizar-sw.mjs  Regenera la lista de archivos del service worker
tests/                Pruebas unitarias y de navegador
```

## Funciones por etapa

- **Etapa 2**: base de datos, dashboard, clientes, créditos (4 modalidades de interés), cuotas, pagos con aplicación en cascada y prorrateo, anulación, demo.
- **Etapa 3**: cobranzas, calendario, recibos, reportes con CSV, buscador global, plantillas de WhatsApp editables.
- **Etapa 4**: copia y restauración, exportación CSV completa, importación de clientes, PIN y bloqueo automático, logo, tema y color, PWA instalable y sin conexión.
- **Etapa 5**: Analista IA (diagnóstico local y resumen anónimo para copiar a un asistente), ayuda y aviso legal, estructura de idiomas (español, inglés y portugués parcial), foco de teclado al navegar, pruebas finales.

Para añadir funciones (pantallas, campos, tipos de interés, sincronización en la nube, IA conectada, idiomas) consulta **ARQUITECTURA.md**.
