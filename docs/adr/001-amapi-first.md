# ADR-001: AMAPI primero, DPC propio solo en laboratorio

- Estado: aceptada
- Fecha: 2026-10-03

## Contexto

Un MDM puede controlar Android de dos formas: con un DPC propio (la app del MDM es Device Owner o Profile Owner y llama a `DevicePolicyManager`) o con la **Android Management API** (AMAPI), donde el DPC es Android Device Policy, mantenido por Google.

Android Enterprise ya no acepta nuevos registros de DPC propios a través de la Play EMM API y recomienda AMAPI para soluciones nuevas ([fuente](https://developers.google.com/android/work/play/emm-api/register)). Además, desde 2025 el aprovisionamiento de DPC propios está sujeto a una lista de DPC aprobados y Play Protect puede bloquear uno no aprobado ([fuente](https://bayton.org/android/android-enterprise-faq/amapi-vs-custom-dpc/)).

## Decisión

1. **Producción:** políticas, inscripción, apps, comandos y configuraciones administradas van por AMAPI. El backend las expone detrás de la interfaz `ManagementProvider`.
2. **Android Control Agent:** app complementaria distribuida por Managed Google Play. Recibe configuración administrada y envía heartbeat, inventario y eventos.
3. **Laboratorio:** el mismo agente puede ser Device Owner por `adb` en teléfonos de prueba. Sirve para aprender `DevicePolicyManager` y probar sin cuenta de Google Cloud. No se usa en producción y no incluye borrado remoto.
4. **Demo:** proveedor simulado para probar el panel sin dispositivos.

## Consecuencias

- Para producción se necesita un proyecto de Google Cloud y una enterprise de Android.
- Algunas funciones dependen del calendario de AMAPI; a cambio no mantenemos un DPC ni dependemos de la aprobación de Google.
- El agente nunca necesita permisos peligrosos ni accesibilidad.
