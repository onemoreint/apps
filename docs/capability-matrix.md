# Matriz de capacidades

Qué puede administrar la plataforma según el modo. La misma tabla vive en `web/src/lib/capabilities.ts` y `backend/src/main/kotlin/com/acc/capabilities/CapabilityEngine.kt`; las pruebas de ambos lados verifican los casos clave. Versión interactiva en el panel: **Modos y capacidades**.

✓ disponible · ⚠ parcial o con condiciones · ✕ Android no lo permite

| Capacidad | App normal | Device Admin | Perfil de trabajo | Totalmente administrado | Dedicado | Laboratorio USB |
| --- | --- | --- | --- | --- | --- | --- |
| Información del dispositivo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Número de serie | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Configuraciones administradas | ✕ | ✕ | ✓ | ✓ | ✓ | ✓ |
| Gestión de apps | ✕ | ✕ | ✓ perfil | ✓ | ✓ | ✓ |
| Instalación silenciosa | ✕ | ✕ | ✓ perfil | ✓ | ✓ | ⚠ |
| Política de contraseña | ✕ | ✕ desde Android 10 | ✓ | ✓ | ✓ | ✓ |
| Bloqueo remoto | ✕ | ✓ | ⚠ perfil | ✓ | ✓ | ✓ |
| Cámara | ✕ | ✕ desde Android 10 | ⚠ perfil | ✓ | ✓ | ✓ |
| Captura de pantalla | ✕ | ✕ | ⚠ perfil | ✓ | ✓ | ✓ |
| USB | ✕ | ✕ | ✕ | ✓ Android 12+, ⚠ antes | igual | ⚠ archivos |
| Wi-Fi corporativo | ⚠ sugerencias | ✕ | ⚠ | ✓ | ✓ | ⚠ |
| Bluetooth | ✕ | ✕ | ⚠ | ✓ | ✓ | ✓ |
| Restricciones de usuario | ✕ | ✕ | ⚠ | ✓ | ✓ | ✓ |
| Actualizaciones del sistema | ✕ | ✕ | ✕ | ✓ | ✓ | ⚠ |
| Reinicio remoto | ✕ | ✕ | ✕ | ✓ | ✓ | ✓ |
| Borrado remoto | ✕ | ⚠ | ⚠ solo perfil | ✓ | ✓ | ✕ a propósito |
| Modo quiosco | ✕ | ✕ | ✕ | ⚠ | ✓ | ✓ |

## Modos

- **App normal:** el agente instalado como cualquier app. Solo inventario básico.
- **Device Admin:** API heredada que Google retiró para empresas; varias políticas lanzan `SecurityException` desde Android 10.
- **Perfil de trabajo (BYOD/COPE):** separa apps y datos de trabajo; la parte personal queda fuera de alcance. No requiere restablecer.
- **Totalmente administrado:** equipo de la empresa inscrito tras restablecer de fábrica (QR, `afw#setup` o zero-touch).
- **Dedicado:** totalmente administrado con apps fijadas (quiosco).
- **Laboratorio USB:** el agente es Device Owner por `adb dpm set-device-owner`. Solo para equipos propios de prueba.

Inscripción por escenario: [enrollment.md](enrollment.md).
