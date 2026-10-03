# Arquitectura

Documento completo con diagramas (Fase 0): [Android Control Center — Arquitectura](https://claude.ai/code/artifact/b92b2d80-e678-4b6f-91df-e510d3dff283). Este archivo resume lo esencial.

## Componentes

| Componente | Tecnología | Responsabilidad |
| --- | --- | --- |
| `web/` | React 18, TypeScript, Vite, Tailwind CSS 4, Recharts, Zustand | Panel administrativo. Hoy funciona en modo demo con un backend simulado en el navegador que aplica las mismas reglas (RBAC, multi-tenant, capacidades, auditoría). |
| `backend/` | Kotlin 2, Spring Boot 3, Spring Security, Flyway, PostgreSQL 16 | API REST, autenticación, motor de capacidades, integración con AMAPI y Pub/Sub. |
| `android-agent/` | Kotlin, WorkManager, OkHttp, DevicePolicyManager | Heartbeat, inventario, configuración administrada; Device Owner en modo laboratorio. |
| `shared/` | OpenAPI 3 | Contrato único entre web, agente y backend. |
| `infra/` | Docker Compose, Caddy | Despliegue con HTTPS automático. |

## Flujo de un comando

1. La persona administradora confirma la acción (doble confirmación para borrar).
2. `POST /api/devices/{id}/commands` → el backend valida rol, organización y capacidad del modo.
3. Se guarda el `Command` en estado `QUEUED` y se audita.
4. `ManagementProvider` lo envía: AMAPI `devices.issueCommand` en producción, broadcast `adb` en laboratorio, simulación en demo.
5. El resultado vuelve por Pub/Sub (o por el agente) → `SUCCEEDED` / `FAILED` / `EXPIRED`, auditado.

## Multi-tenant

Toda tabla de negocio lleva `organization_id`. PostgreSQL Row Level Security filtra por `current_setting('app.current_org')`, que el backend fija en cada transacción. La aplicación se conecta con un rol que **no** es dueño de las tablas para que RLS se aplique siempre (Fase 3).

## Seguridad

Ver [README](../README.md#seguridad) y [SECURITY.md](../SECURITY.md).
