# Plan por fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0 | Arquitectura, modelo de datos, flujos, matriz de capacidades | Hecho |
| 1 | Estructura del monorepo, documentación, contrato OpenAPI | Hecho |
| 2 | Backend base (salud, OpenAPI, capacidades, heartbeat) | Hecho |
| 3 | PostgreSQL y migraciones (V1 con RLS y auditoría inmutable) | Hecho; falta rol de base de datos no propietario |
| 4 | Autenticación JWT, refresh tokens, RBAC en backend | Pendiente (RBAC ya aplicado en el panel demo) |
| 5 | Panel web | Hecho en modo demo; falta conectarlo al backend |
| 6 | Agente Android | Hecho: laboratorio USB, heartbeat, inventario, config. administrada |
| 7 | Inscripción con AMAPI | Pendiente (QR de laboratorio hecho) |
| 8 | Políticas → AMAPI | Pendiente (editor hecho en el panel) |
| 9 | Managed Configurations → AMAPI | Pendiente (editor y validación hechos) |
| 10 | Comandos → AMAPI y agente | Pendiente en backend (flujo completo simulado en el panel) |
| 11 | Auditoría persistente | Esquema hecho; falta escritura desde el backend |
| 12 | Testing (integración con Testcontainers, E2E con Playwright) | Parcial: pruebas unitarias en los tres componentes |
| 13 | Docker | Hecho |
| 14 | GitHub Actions | Hecho |
| 15 | Documentación | Hecho, se amplía con cada fase |
