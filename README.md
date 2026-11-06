# LUGO CONNECT

App de macOS para pasar archivos entre un Android y un Mac por Wi-Fi. El teléfono solo usa su navegador: no instala nada.

## Cómo se usa

1. Abre LUGO CONNECT en el Mac. Aparecen un código QR y un PIN.
2. Con el teléfono en la misma Wi-Fi, escanea el QR.
3. Escribe el PIN en el teléfono y pulsa **Aceptar** en el aviso del Mac.
4. En **Enviar al Mac**, elige archivos. Se guardan en `Descargas/LUGO CONNECT`, o en la carpeta que elijas.
5. En sentido contrario, tienes dos opciones:
   - En el Mac, ve a **Mac a Android → Elegir archivos**. Aparecerán en el teléfono, en **Recibir del Mac**.
   - En **Configuración**, añade carpetas compartidas y explóralas desde el teléfono.

## Instalar

### Con Xcode

Necesitas macOS 13 o superior y Xcode 15 o superior, gratis en la App Store. No hacen falta Homebrew ni una cuenta de pago.

1. Abre `LugoConnect.xcodeproj`.
2. Elige el esquema **LugoConnect** y el destino **My Mac**.
3. Pulsa **⌘R**. Con **⌘U** se ejecutan las pruebas del núcleo.

### Generar la app y el instalador

```bash
./Scripts/build_app.sh    # crea dist/LUGO CONNECT.app
./Scripts/make_dmg.sh     # crea dist/LUGO-CONNECT.dmg
```

### Abrir por primera vez fuera de Xcode

La app no está notarizada, porque eso exige la cuenta de pago de Apple. Si viene de un `.dmg` descargado, macOS la bloqueará la primera vez:

1. Intenta abrirla y cierra el aviso.
2. Ve a **Ajustes del Sistema → Privacidad y seguridad**.
3. Pulsa **Abrir igualmente**.

## Permisos de macOS

| Cuándo aparece | Qué elegir |
|---|---|
| Aviso de **red local** (macOS 15 o superior) | Permitir. Sin esto, el teléfono no llega al Mac |
| Aviso del **cortafuegos** | Permitir conexiones entrantes |
| Aviso de **notificaciones** | Opcional. Avisa al terminar una transferencia |

Solo se accede a Descargas y a las carpetas que elijas con el selector de macOS.

## Primeras pruebas en tu Mac y tu HONOR

| # | Haz esto | Debe pasar |
|---|---|---|
| 1 | Abre la app con el Mac en Wi-Fi | Aparecen el QR, el PIN y la dirección `http://192.168…` |
| 2 | Escanea el QR con el HONOR | Se abre la página y pide el PIN |
| 3 | Abre la dirección sin escribir el PIN e intenta usarla | No entra más allá de la pantalla de PIN |
| 4 | Escribe el PIN | El Mac pregunta si aceptas; hasta que aceptes no entra |
| 5 | Envía una foto | Llega a `Descargas/LUGO CONNECT` y se abre bien |
| 6 | En el Mac, elige un PDF en **Mac a Android**; descárgalo en el teléfono | Se abre bien en el teléfono |
| 7 | Envía un vídeo de 1 GB | Progreso, velocidad y tiempo en ambos lados; el vídeo se reproduce |
| 8 | Envía varios archivos a la vez | Llegan todos |
| 9 | Cancela un archivo grande, desde el teléfono o desde el Mac | No queda archivo a medias; los demás siguen |
| 10 | Apaga la Wi-Fi del teléfono a mitad de un envío y vuelve a encenderla | Avisa del corte y reintenta solo, si la IP del teléfono no cambió |
| 11 | Abre **Historial** y luego cierra la app | Lista lo transferido; el teléfono pierde la conexión |

## Solución de problemas

| Síntoma | Solución |
|---|---|
| El teléfono no abre la página | Comprueba que ambos estén en la misma Wi-Fi. Revisa el permiso de red local en Ajustes del Sistema → Privacidad y seguridad → Red local |
| Sigue sin abrir en la misma Wi-Fi | La red puede aislar dispositivos, algo habitual en hoteles y Wi-Fi de invitados. Prueba activando el punto de acceso del teléfono y conectando el Mac a él |
| Chrome avisa de que el sitio no es seguro | Es por usar HTTP local. Elige continuar. Si tienes activado "Usar siempre conexiones seguras", permite este sitio |
| Chrome pregunta por una descarga insegura | Elige conservar el archivo. Es la misma razón |
| El vídeo se corta al apagar la pantalla | Android pausa el navegador. Deja la pantalla encendida durante envíos largos |
| "Demasiados intentos" | Espera 5 minutos o usa el PIN nuevo. El bloqueo es por IP |
| El teléfono vuelve a pedir el PIN | La sesión caducó, la IP cambió o el servidor se reinició |
| `Missing package product 'LugoCore'` | Comprueba que `LugoCore` esté junto al `.xcodeproj`. Luego usa File → Packages → Reset Package Caches |
| Xcode pide un equipo de desarrollo | En Signing & Capabilities, elige Team: None y Sign to Run Locally |

## Límites conocidos

- **Sin cifrado.** La conexión es HTTP dentro de tu red. El PIN y el token controlan quién entra, pero alguien en la misma Wi-Fi podría leer los archivos que pasan. Úsala en redes de confianza.
- **Carpeta de destino en Android.** Chrome guarda en Descargas. El selector de carpetas del navegador solo funciona con HTTPS, así que esa opción no está disponible.
- **ZIP sin comprimir.** Es más rápido y soporta varios GB. Lo abren los lectores habituales, pero alguna app antigua de Android podría no leerlo. Descargar los archivos uno a uno siempre funciona.
- **Subidas interrumpidas.** Se reintentan desde el principio. Las descargas sí se reanudan si el navegador lo pide.

## Estructura

```
LugoConnect.xcodeproj/     Proyecto y esquema compartido
LugoConnect/               App SwiftUI (MVVM)
LugoCore/
  Sources/LugoCore/
    HTTP/                  Servidor, sockets, peticiones y ZIP
    Web/                   Página que se sirve al teléfono
    Security/              PIN, sesiones, rutas y nombres
    Network/               IP local y filtro de red local
    Models/                Transferencias, historial y bandeja
  Sources/LugoDevServer/   Servidor de prueba sin interfaz
  Tests/                   Pruebas automáticas
Scripts/                   Compilación, instalador y generador del proyecto
docs/ARQUITECTURA.md       Diseño técnico
```

Para probar el servidor y la página sin abrir la app:

```bash
cd LugoCore
swift run LugoDevServer --dest /tmp/recibidos --share ~/Documents --port 8642
```
