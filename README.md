# Android Control Center

Plataforma open source para administrar los dispositivos Android de una organización desde un panel web, usando **solo** mecanismos oficiales de Android Enterprise.

- **Panel demo en línea:** https://onemoreint.github.io/apps/android-control-center/
- **Agente Android (APK):** [última versión](https://github.com/onemoreint/apps/releases/tag/acc-agent-latest)
- **Arquitectura:** [docs/architecture.md](docs/architecture.md)

> Este proyecto no es malware, spyware ni una herramienta para saltarse la seguridad de Android. Solo trabaja con dispositivos inscritos voluntariamente y bajo administración autorizada. Si Android no permite una acción en un modo de administración, la plataforma lo dice: *«Esta operación requiere un modo de administración compatible o no está permitida por Android.»*

## Qué incluye hoy

| Componente | Estado | Dónde |
| --- | --- | --- |
| Panel web (React + TypeScript + Vite + Tailwind) con modo demo | Funcional, publicado en GitHub Pages | [`web/`](web) |
| Agente Android (Kotlin) con Device Owner de laboratorio controlable por USB | Funcional, APK en Releases | [`android-agent/`](android-agent) |
| Scripts USB para Windows, macOS y Linux | Funcional | [`tools/`](tools) |
| Backend (Kotlin + Spring Boot) | Base: salud, OpenAPI, matriz de capacidades, heartbeat del agente | [`backend/`](backend) |
| Base de datos PostgreSQL | Migración V1 completa con multi-tenant (RLS) y auditoría inmutable | [`backend/src/main/resources/db/migration`](backend/src/main/resources/db/migration) |
| Contrato API | OpenAPI 3 | [`shared/openapi/acc-api.yaml`](shared/openapi/acc-api.yaml) |
| Docker Compose + HTTPS (Caddy) | Listo para VPS | [`infra/`](infra) |
| CI (GitHub Actions) | Web, backend y Android | [`.github/workflows`](.github/workflows) |

El plan completo por fases y lo que falta está en [docs/roadmap.md](docs/roadmap.md).

## Arquitectura en una frase

El backend controla los dispositivos a través de la **Android Management API** (AMAPI) de Google; el agente propio solo envía telemetría. Para pruebas en un teléfono propio existe un **modo laboratorio** en el que el agente es Device Owner por USB. Ver [ADR-001](docs/adr/001-amapi-first.md) para el porqué.

```
Panel web ──HTTPS/JWT──> Backend ──API──> Android Management API ──> Android Device Policy (DPC de Google)
                            ^                     │
                            │ Pub/Sub (estado) <──┘
                            └──── HTTPS heartbeat ──── Android Control Agent
```

## Probar el panel sin instalar nada

Abre https://onemoreint.github.io/apps/android-control-center/ y entra con cualquier usuario de demostración. Cada rol (Superadministrador, Administrador, Operador, Auditor, Lector) ve y puede hacer cosas distintas. Los datos son ficticios y se guardan solo en tu navegador; «Restablecer demo» los vuelve a su estado inicial.

## Controlar tu propio teléfono por USB (laboratorio)

Guía paso a paso: [docs/android-agent.md](docs/android-agent.md), también visible en el panel en **Laboratorio USB**.

```bash
# Windows (PowerShell, en la carpeta de platform-tools)
.\acc-usb.ps1 download
.\acc-usb.ps1 install
.\acc-usb.ps1 owner      # requiere quitar antes las cuentas del teléfono
.\acc-usb.ps1 status
.\acc-usb.ps1 lock
.\acc-usb.ps1 release    # deshace todo
```

El agente de laboratorio **no tiene borrado remoto** y su receptor de comandos solo acepta órdenes del shell de `adb`.

## Requisitos para desarrollo

| Herramienta | Versión |
| --- | --- |
| Node.js | 20 o superior |
| JDK | 21 (backend) y 17+ (Android) |
| Android Studio | Ladybug (2024.2) o superior, SDK 35 |
| Docker | 24 o superior (opcional) |
| PostgreSQL | 16 (o el contenedor de `infra/`) |

## Ejecución local

```bash
# Panel web
cd web && npm install && npm run dev        # http://localhost:5173

# Base de datos + backend
cp infra/.env.example infra/.env
docker compose -f infra/docker-compose.yml up -d postgres
cd backend && ./gradlew bootRun             # http://localhost:8080/swagger-ui.html

# Agente Android
cd android-agent && ./gradlew assembleDebug # app/build/outputs/apk/debug/
```

Todo junto con HTTPS en un servidor: `docker compose -f infra/docker-compose.yml up -d` (ver [docs/deployment.md](docs/deployment.md)).

## Pruebas

```bash
cd web && npm test                 # motor de capacidades, RBAC, validación de configuraciones
cd backend && ./gradlew test       # motor de capacidades
cd android-agent && ./gradlew test # parser de comandos USB (bloqueo de wipe, URLs permitidas)
```

## Seguridad

- Contraseñas con Argon2id; nunca en texto plano. JWT de 15 minutos + refresh tokens rotativos con detección de reutilización (Fase 4).
- Multi-tenant con Row Level Security en PostgreSQL: una organización no puede leer datos de otra aunque una consulta tenga un error.
- Auditoría de solo inserción, protegida por un trigger.
- Secretos solo por variables de entorno. CORS restringido. Cabeceras CSP y HSTS.
- El inventario no recoge ubicación, contactos, mensajes, IMEI ni apps personales.

Política de reporte de vulnerabilidades: [SECURITY.md](SECURITY.md).

## Limitaciones de Android

Lo que se puede controlar depende del modo de administración y de la versión de Android. Una app normal casi no puede administrar nada; Device Admin está retirado; Work Profile solo controla el perfil de trabajo. La tabla completa está en [docs/capability-matrix.md](docs/capability-matrix.md) y en el panel, en **Modos y capacidades**.

## Referencias

- [android/enterprise-samples](https://github.com/android/enterprise-samples)
- [mitre/device-admin-sample](https://github.com/mitre/device-admin-sample)
- [android/platform-samples](https://github.com/android/platform-samples)
- [Android Open Source Project](https://source.android.com/)
- [Android Management API](https://developers.google.com/android/management)

## Licencia

[Apache-2.0](LICENSE). Contribuciones bienvenidas: [CONTRIBUTING.md](CONTRIBUTING.md).
