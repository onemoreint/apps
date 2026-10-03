# Android Control Agent y laboratorio USB

El agente (`com.acc.agent`) tiene dos papeles:

- **Producción:** app complementaria instalada por Android Device Policy. Lee su configuración administrada (`backend_url`, `enrollment_secret`, `heartbeat_minutes`) y envía heartbeat e inventario cada 15 minutos o más con WorkManager.
- **Laboratorio:** Device Owner de un teléfono propio, controlado por USB con `adb`.

## Laboratorio USB paso a paso (ejemplo: Honor X8D)

### 1. Prepara el computador
Instala [Android SDK Platform-Tools](https://developer.android.com/tools/releases/platform-tools) y copia en esa carpeta `tools/acc-usb.ps1` (Windows) o `tools/acc-usb.sh` (macOS/Linux).

### 2. Activa la depuración USB en el teléfono
Ajustes › Acerca del teléfono › toca 7 veces **Número de compilación**. Luego Ajustes › Sistema y actualizaciones › Opciones de desarrollador › **Depuración USB**. Conecta el cable, elige «Transferir archivos» y acepta el aviso.

```powershell
.\adb devices          # debe mostrar el teléfono con la palabra "device"
.\acc-usb.ps1 check    # modelo, versión y usuarios
```

### 3. Quita cuentas y usuarios extra
Android solo acepta un Device Owner en un teléfono sin cuentas. Haz copia de seguridad y elimina temporalmente la cuenta de Google, el ID de Honor y cualquier otra cuenta (correo, WhatsApp Business). Elimina también App Twin o Espacio privado si los usas. `pm list users` debe mostrar un único usuario.

Tus fotos, apps y archivos no se borran al quitar las cuentas.

### 4. Instala y activa el agente
```powershell
.\acc-usb.ps1 download
.\acc-usb.ps1 install
.\acc-usb.ps1 owner     # "Success: Device owner set ..."
```
Después puedes volver a añadir tus cuentas.

### 5. Úsalo
```powershell
.\acc-usb.ps1 status
.\acc-usb.ps1 lock
.\acc-usb.ps1 camera-off
.\acc-usb.ps1 camera-on
.\acc-usb.ps1 screenshots-off
.\acc-usb.ps1 bluetooth-off
.\acc-usb.ps1 usb-files-off   # adb sigue funcionando
.\acc-usb.ps1 reboot
```
Sin scripts, cada comando es un broadcast:
```bash
adb shell am broadcast -a com.acc.agent.COMMAND -n com.acc.agent/.lab.AdbCommandReceiver --es cmd status
```
El resultado aparece en la línea `data="..."`. La app del agente también muestra el estado y botones para las mismas acciones.

### 6. Deshaz todo
```powershell
.\acc-usb.ps1 release
.\acc-usb.ps1 uninstall
```

## Garantías de seguridad del modo laboratorio

- **Sin borrado:** no existe código que llame a `wipeData`; los comandos `wipe` se rechazan.
- **Solo adb:** `AdbCommandReceiver` exige el permiso de sistema `android.permission.DUMP`, que solo tiene el shell. Ninguna app instalada puede enviar órdenes.
- **No se desactiva la depuración USB**, para no perder el acceso por cable.
- `release` quita cámara, capturas y restricciones antes de liberar la administración.
- El inventario no recoge ubicación, contactos, mensajes, IMEI ni apps personales.

## Problemas frecuentes

| Mensaje | Solución |
| --- | --- |
| `already some accounts on the device` | Queda una cuenta. Revisa Ajustes › Usuarios y cuentas y cuentas de apps. |
| `already several users on the device` | Elimina App Twin / Espacio privado y repite `pm list users`. |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | El APK nuevo está firmado con otra clave. Ejecuta `release`, desinstala e instala de nuevo. |
| `el agente no es Device Owner` | Repite `owner`. |
| Algunos fabricantes bloquean `set-device-owner` | Prueba con el teléfono recién restablecido, sin configurar cuentas, y activa la depuración desde el asistente inicial. |

## Compilar
```bash
cd android-agent
./gradlew test assembleRelease   # app/build/outputs/apk/release/app-release.apk
```
Si defines `ACC_KEYSTORE_PATH`, `ACC_KEYSTORE_PASSWORD`, `ACC_KEY_ALIAS` y `ACC_KEY_PASSWORD`, el APK se firma con tu clave; si no, con la de depuración.
