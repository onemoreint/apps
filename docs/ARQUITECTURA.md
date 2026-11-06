# Arquitectura de LUGO CONNECT

## Visión general

El Mac hace de servidor HTTP en la red local. El teléfono solo usa su navegador.

```
Vistas SwiftUI → ViewModels → LugoCore (servidor y reglas, sin interfaz)
                                  │  Wi-Fi local, HTTP
                       Página web en el navegador Android
```

- **App (`LugoConnect/`)**: interfaz y lo que depende de macOS, como selectores, permisos, QR y notificaciones.
- **Núcleo (`LugoCore/`)**: servidor, página web, seguridad y modelos. No depende de la interfaz, así que se prueba por separado.

## Decisión: sockets POSIX en vez de Network.framework

El proyecto pedía Network.framework "preferiblemente". El servidor usa sockets POSIX, con un hilo por conexión, por dos motivos:

- **Se puede probar de verdad.** El mismo código corre en macOS y Linux, así que se ejecuta entero en pruebas automáticas fuera de un Mac.
- **Es sencillo.** La lectura y escritura bloqueantes frenan solas al lado más lento, sin acumular datos en memoria.

Network.framework sí se usa para vigilar los cambios de red (`NWPathMonitor`). Para añadir USB u otro transporte, el punto de cambio es `TCPConnection`.

## Flujo de conexión

1. El Mac detecta su IP privada, abre el servidor y muestra el QR y el PIN.
2. El QR contiene solo la dirección, nunca el PIN.
3. El teléfono envía el PIN. Los intentos se limitan por IP y en conjunto.
4. Con el PIN correcto, el Mac muestra un aviso para aceptar o rechazar.
5. Si aceptas, el teléfono recibe una sola vez un token de 256 bits y el PIN cambia.
6. Cada petición lleva el token, que solo vale desde la IP aprobada y caduca sin actividad.

## API del servidor

| Método y ruta | Uso | Autorización |
|---|---|---|
| `GET /`, `/app.js`, `/app.css`, `/icon.svg` | Página web | Ninguna |
| `POST /api/pair` | Enviar PIN | PIN |
| `GET /api/pair/{id}` | Consultar aprobación | Id secreto y misma IP |
| `GET /api/status` | Estado de la sesión | Token |
| `POST /api/upload/check` | Validar antes de enviar | Token |
| `PUT /api/upload?name=&key=` | Subida por bloques | Token |
| `POST /api/upload/cancel` | Cancelar una subida propia | Token |
| `GET /api/folders`, `GET /api/files` | Explorar carpetas autorizadas | Token |
| `GET /api/outbox` | Archivos enviados desde el Mac | Token |
| `POST /api/tickets` | Crear enlace temporal de descarga | Token |
| `GET /dl/{ticket}/{nombre}` | Descarga con `Range`, o ZIP | Enlace válido, sesión activa y misma IP |
| `POST /api/logout` | Cerrar sesión | Token |

El navegador no puede añadir cabeceras a una descarga. Por eso se usa un enlace temporal en lugar de poner el token en una URL.

## Transferencias

- **Subidas:** bloques de 1 MB directos a un archivo oculto `.lugo-part`. Solo al completarse recibe su nombre, con `link`, que nunca sobrescribe. Un archivo repetido queda como `foto (1).jpg`.
- **Cancelar:** corta solo esa conexión y borra su temporal.
- **Corte de red:** la página avisa y reintenta hasta 3 veces cuando el Mac vuelve a responder.
- **Descargas:** bloques de 1 MB con `Range` y `ETag`.
- **ZIP:** sin comprimir, generado al vuelo, con tamaño exacto calculado de antemano y ZIP64 solo si hace falta.
- **Reposo:** el Mac no se duerme mientras haya transferencias.

## Modelo de seguridad

| Riesgo | Defensa |
|---|---|
| Acceso sin permiso | PIN, aprobación en el Mac y token de sesión |
| Adivinar el PIN | 5 intentos por IP, bloqueo de 5 minutos, cambio tras 20 fallos totales, caducidad en 10 minutos |
| Robo de un token | Ligado a la IP aprobada; caduca; se revoca desde el Mac |
| Salir de la carpeta | `PathGuard` sobre la ruta real, incluidos enlaces simbólicos |
| Nombres maliciosos | `FileNameValidator`: separadores, ocultos, controles y Unicode engañoso |
| Ejecutables en el Mac | Se bloquean `.app`, `.command`, `.pkg` y similares. APK, ZIP y RAR se permiten |
| Clientes de fuera de la red | Solo IP privadas; el resto se corta sin leer nada |
| Páginas web maliciosas | Comprobación de `Host` y `Origin` contra DNS rebinding |
| Código en nombres de archivo | La página usa solo texto, con CSP estricta |
| Agotar recursos | Límite de cabecera, conexiones, JSON, tiempos de espera y espacio libre |
| Acceso a otras carpetas | Sandbox de macOS y selector explícito |
| Servidor abierto al salir | Cerrar la ventana termina la app y cierra el puerto |

No se abre ningún puerto del router ni se guarda el PIN o el token en disco. El tráfico no va cifrado: ver "Límites conocidos" en el README.

## Configuración del proyecto

- **macOS 13 como mínimo**, por `NavigationSplitView` y `Window`.
- **Sandbox activo**, con permisos de servidor de red, Descargas y carpetas elegidas.
- **Hardened Runtime desactivado**, porque solo sirve para notarizar con la cuenta de pago de Apple.
- **Sin dependencias externas.**

## Preparado para el futuro

USB, carpetas completas, sincronización y copia de seguridad se añadirían como otro transporte o servicio sobre el mismo núcleo, sin tocar las reglas de seguridad. Bonjour ya está declarado en `Info.plist` con el servicio `_lugoconnect._tcp`.
