# Inscripción de dispositivos

| Escenario | Modo | Método | Requisito |
| --- | --- | --- | --- |
| Equipo de la empresa | Totalmente administrado | QR en la pantalla de bienvenida (6 toques), `afw#setup` o zero-touch | Restablecido de fábrica |
| Quiosco / uso dedicado | Dedicado | QR o zero-touch | Restablecido de fábrica |
| Empresa con uso personal | Totalmente administrado + perfil de trabajo | QR o zero-touch | Restablecido de fábrica |
| Teléfono personal | Perfil de trabajo | Enlace de inscripción | Ninguno |
| Laboratorio | Device Owner propio | `adb` por USB o QR con el APK | Sin cuentas en el teléfono |

## Con AMAPI (producción)

1. El panel pide un token: `POST /api/devices/enroll` con escenario y política.
2. El backend llama `enterprises.enrollmentTokens.create` y devuelve el QR.
3. Android Device Policy se instala, aplica la política (que fuerza la instalación del agente) y AMAPI publica `ENROLLMENT` en Pub/Sub.
4. El backend crea el `Device`, calcula sus capacidades y espera el primer heartbeat del agente.

## Laboratorio por QR

El QR de laboratorio sigue el formato oficial de aprovisionamiento de Android:

```json
{
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME": "com.acc.agent/.lab.AccDeviceAdminReceiver",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION": "https://github.com/onemoreint/apps/releases/download/acc-agent-latest/acc-agent.apk",
  "android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM": "EbA63MXU_t62gR3IhENVXaZVhHxMWbbyovTHF6ddG8A",
  "android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED": true
}
```

Requiere un teléfono recién restablecido y puede ser bloqueado por Play Protect porque el agente no está en la lista de DPC aprobados de Google. Para un teléfono propio es más fiable el método USB: [android-agent.md](android-agent.md).
