# JARVIS – José Lugo AI Assistant

Asistente personal instalable, con voz, tareas, recordatorios, memoria local y acciones con autorización. No requiere servidor ni pagos mensuales.

## Qué es real en esta versión

| Función | Estado |
|---|---|
| Comandos en español por texto y voz | Funciona con reglas locales, sin IA |
| Tareas, recordatorios, notas y preferencias | Funcionan y se guardan en este dispositivo |
| Sistema de autorizaciones con historial | Funciona |
| Borradores de WhatsApp, correo y Google Calendar | Se abren tras autorizar; el envío lo haces tú |
| Uso sin conexión e instalación como app | Funcionan tras la primera visita con internet |
| Conversación libre con Claude | **No está activa.** Requiere el backend de `backend/`, y la API cobra por uso |

## Límites que debes conocer

- **Voz:** el reconocimiento funciona en Chrome y Edge; Safari puede fallar y Firefox no lo ofrece. En Chrome, el audio pasa por servidores de Google y requiere internet. La calidad de la voz hablada depende de las voces instaladas en el dispositivo.
- **Memoria:** queda en este navegador y no se sincroniza. Usa **Exportar copia** para respaldarla o pasarla a otro equipo.
- **Recordatorios:** avisan con la app abierta. Un sitio estático no puede despertar el dispositivo; para un aviso con la app cerrada, envía el recordatorio a Google Calendar.
- **Modo local:** reconoce frases, no razona. La planificación es una plantilla general y el análisis de texto cuenta y detecta patrones. Lo indica en cada respuesta.

## Cómo probar cada función

Abre **Ayuda** (icono de interrogación) y toca un ejemplo.

1. **Tareas:** «Tarea urgente pagar el dominio para mañana», luego «Completa la tarea 1».
2. **Recordatorios:** «Recuérdame revisar el horno en 1 minuto». Deja la app abierta y espera el aviso.
3. **Memoria:** «Anota que el cliente prefiere pago por Bold», luego «Busca Bold en la memoria».
4. **Voz:** pulsa el micrófono, permite el acceso y di «Qué hora es». Revisa **Configuración → Compatibilidad**.
5. **Autorizaciones:** «Envía un WhatsApp a 3001234567 diciendo hola». No ocurre nada hasta pulsar **Autorizar**, y aun así eres tú quien envía.
6. **Sin conexión:** abre la app, activa el modo avión y recárgala.

## Publicar en GitHub Pages sin Terminal

1. Crea en GitHub un repositorio público llamado `jarvis-jose-lugo`.
2. Pulsa **Add file → Upload files**, arrastra el contenido de esta carpeta y confirma.
3. En **Settings → Pages**, elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
4. Abre `https://TU-USUARIO.github.io/jarvis-jose-lugo/`.

Cada vez que publiques cambios, sube el valor de `VERSION` en `service-worker.js` para que la app ofrezca actualizarse.

## Estructura

```
index.html, styles.css     Interfaz
manifest.json              Datos de instalación
service-worker.js          Funcionamiento sin conexión
js/app.js                  Conecta todas las piezas
js/ui.js, reactor.js       Paneles y reactor
js/voice.js                Reconocimiento y síntesis de voz
js/brain.js                Decide qué motor responde
js/engine-local.js         Comandos locales
js/engine-remote.js        Conexión con tu backend
js/actions.js              Lista cerrada de acciones y autorizaciones
js/store.js                Memoria del dispositivo
js/reminders.js            Vigilancia de recordatorios
js/dateparse.js            Interpreta fechas en español
js/analyzer.js             Análisis local de textos
backend/                   Plantilla para conectar Claude
tests/                     Pruebas automatizadas
```

Se usan varios módulos en vez de un solo `app.js` para que cada capa, sobre todo el motor de IA, pueda cambiar sin tocar el resto.

## Pruebas

```
node --test tests/unit.test.mjs
node tests/e2e.cjs
```

El nombre JARVIS y la inspiración provienen de una marca de terceros. Es adecuado para uso personal; consulta a un abogado de marcas antes de venderlo con ese nombre.
