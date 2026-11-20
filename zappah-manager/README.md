# Zappah Manager

App Android (Kotlin + Jetpack Compose) para revisar y administrar la app **Zappah** en un **HONOR X8d** con MagicOS, **sin root** y usando solo las herramientas oficiales de Android.

> Zappah Manager no desinstala nada por su cuenta ni evita políticas de administración. Abre las pantallas oficiales de Android y, cuando algo está bloqueado, explica la causa conocida y las vías autorizadas.

## Qué hace

| Función | Cómo lo hace |
|---|---|
| Encuentra Zappah | Busca “zappah” en el nombre visible y en el paquete de las apps instaladas (`PackageManager`). No supone el identificador. Si no la encuentra, puedes elegirla a mano. |
| Detecta cuándo se abre | Servicio en primer plano que lee los eventos de uso (`UsageStatsManager`) cada 2 s. Requiere que concedas *Acceso a datos de uso*. |
| Aviso | Notificación: **“Zappah detectada. ¿Deseas revisar sus opciones de administración?”** con *Información*, *Opciones* y *Cancelar*. |
| Opciones | Abrir información de la app, consultar opciones de desactivación, solicitar desinstalación (solo si Android lo permite) y cancelar. |
| Diagnóstico | Nombre, paquete, versión, si está habilitada, si es app de sistema, si es administrador de dispositivo, si una política bloquea su desinstalación y restricciones activas. Cada dato indica si está **Confirmado** o **No disponible**. |
| Permisos | Estado de los permisos de Zappah Manager y lista de permisos concedidos a Zappah, con acceso a la pantalla oficial. |
| Sin duplicados | Solo avisa al pasar de otra app a Zappah y respeta una espera configurable (30 s – 15 min). |

### Pantallas
Inicio · Diagnóstico · Monitor · Permisos · Configuración.

## Por qué el botón *Desinstalar* aparece gris

El diagnóstico te dirá cuál de estas causas aplica (todas se consultan con APIs públicas):

1. **Administrador de dispositivo activo**: hay que desactivarlo primero en *Ajustes > Seguridad > Más ajustes > Administradores de dispositivo*. Si ese interruptor también está gris, la app es *Device Owner* o la protege una política.
2. **Bloqueo por política** (`isUninstallBlocked`) o restricción `DISALLOW_UNINSTALL_APPS`: lo puso un administrador (empresa, financiera, operador o MDM). Solo él puede quitarlo.
3. **App de sistema**: sin root no se desinstala; como mucho se deshabilita si MagicOS lo permite.

Lo que Android **no** deja consultar a otra app: si Zappah es exactamente el *Device Owner*, quién aplicó la política y los bloqueos internos de MagicOS. La app lo muestra como *No disponible* en lugar de inventarlo.

> Nota: si en este teléfono se configuró antes un *Device Owner* de laboratorio (por ejemplo, el agente de Android Control Center), esa configuración también puede bloquear desinstalaciones.

## Permisos que declara

| Permiso | Para qué |
|---|---|
| `PACKAGE_USAGE_STATS` | Saber qué app está en primer plano. Lo concedes tú en Ajustes. |
| `QUERY_ALL_PACKAGES` | Ver las apps instaladas para encontrar Zappah. (APK de instalación directa, no de Google Play.) |
| `REQUEST_DELETE_PACKAGES` | Abrir el diálogo oficial de desinstalación. Android siempre pide confirmación. |
| `POST_NOTIFICATIONS` | Mostrar el aviso. |
| `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE` | Mantener el monitor encendido con notificación visible. |

No usa permisos privilegiados, root, accesibilidad ni exploits.

## Compilar

- **GitHub Actions**: el workflow `.github/workflows/zappah-manager-apk.yml` corre las pruebas, compila y publica el artefacto **zappah-manager-debug-apk** en cada push a `feature/zappah-manager` o `main` que toque esta carpeta. También se puede lanzar a mano (*Run workflow*).
- **Android Studio**: abre la carpeta `zappah-manager/` y ejecuta *Run*.
- **Terminal**: `cd zappah-manager && ./gradlew assembleDebug` (necesita JDK 17 y Android SDK 35).

Versiones: AGP 8.9.1 · Gradle 8.14.3 · Kotlin 2.1.20 · compileSdk/targetSdk 35 · minSdk 26 (Android 8.0).

## Instalar en el HONOR X8d

1. Descarga `zappah-manager-debug.apk` (artefacto de GitHub Actions; viene dentro de un .zip).
2. Pásalo al teléfono y ábrelo desde *Archivos*.
3. Si MagicOS lo pide, permite *Instalar apps desconocidas* para *Archivos* (o el navegador que uses).
4. Si ya tenías otra compilación instalada y da error de firma, desinstala la anterior primero (cada compilación de depuración en GitHub usa una firma distinta).
5. Abre **Zappah Manager** → **Monitor**:
   - Elige la app (si no se seleccionó sola).
   - *Conceder acceso* → activa Zappah Manager en *Acceso a datos de uso*.
   - *Permitir notificaciones*.
   - *Iniciar monitoreo*.
6. Recomendado en HONOR: *Ajustes > Batería > Inicio de apps > Zappah Manager > Gestionar manualmente* y activa las tres opciones; así MagicOS no apaga el monitor.

## Pruebas

- **Automáticas (CI)**: `DetectionGateTest` (detección y anti-duplicados) y `UninstallAssessorTest` (evaluación de desinstalación). Más lint.
- **Requieren un teléfono físico** (no se pueden hacer en el entorno de compilación):
  - Que Zappah aparezca en la búsqueda y su paquete real.
  - Que el aviso salga al abrir Zappah y no se repita.
  - Que el monitor siga vivo con la pantalla apagada en MagicOS.
  - Que las pantallas de Ajustes abran bien en MagicOS (Información de la app, Acceso a datos de uso, Seguridad, Batería).
  - Qué causa concreta reporta el diagnóstico para Zappah.

**Estado:** compilado en GitHub Actions; **no probado todavía en un HONOR X8d real**.

## Estructura

```
zappah-manager/
├── app/src/main/java/com/onemoreint/zappahmanager/
│   ├── core/        # Inspección de apps, evaluación de desinstalación, permisos, preferencias
│   ├── monitor/     # Servicio de monitoreo, notificaciones
│   └── ui/          # Compose: tema, componentes y las 5 pantallas + diálogo de opciones
└── app/src/test/    # Pruebas unitarias
```
