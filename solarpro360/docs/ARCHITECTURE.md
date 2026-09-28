# Arquitectura

## Capas

```
USUARIO
   ↓
apps/web (Next.js)          ← interfaz; nunca calcula ni decide permisos
   ↓  HTTPS + JWT de Supabase + X-Company-Id
apps/api (Fastify)          ← autenticación, autorización, validación (zod), orquestación
   ├── packages/calculation-engine   ← motor de negocio puro (sin E/S)
   └── packages/db                   ← acceso a datos con contexto de seguridad
          ↓
PostgreSQL / Supabase       ← RLS por empresa, FK compuestas, auditoría, inmutabilidad
          ↓
Documentos / PDF            ← Módulo 7
```

SolarAI (Módulo 9) será un consumidor de resultados ya calculados: lee `CalcResult` persistidos (fórmula, variables, supuestos, validaciones) y los explica. No tiene acceso de escritura a cálculos.

## Decisiones clave

| Decisión | Motivo |
|---|---|
| Monorepo pnpm con paquetes separados | El motor se prueba sin UI ni BD (§39); la API y el frontend comparten enums y permisos sin duplicarlos. |
| Aislamiento en la base de datos (RLS), no solo en la API | Un error en una ruta futura no puede filtrar datos de otra empresa: la BD responde vacío. |
| FK compuestas `(company_id, id)` | Impide que un proyecto de la empresa A apunte a un cliente de la empresa B, aunque alguien fabrique el id. |
| Contexto de sesión verificado (`app.current_company_id()`) | La API declara la empresa; la BD confirma la membresía antes de aceptarla. |
| Supabase Auth para identidad | La plataforma nunca almacena contraseñas. La API solo verifica JWT (HS256 o JWKS). |
| Enums como `TEXT + CHECK` | Ampliables sin migraciones complejas; los valores viven en `packages/shared`. |
| `row_version` en tablas mutables | Base para concurrencia optimista y sincronización offline (§45). |
| Snapshots JSON en materiales, ítems y versiones de propuesta | El histórico conserva precios y fichas aunque cambie el catálogo (§43, §33). |
| Reglas técnicas y tasas como datos con fuente obligatoria | Nada normativo está codificado en el motor (§6, §27). |
| Motor con `decimal.js` para dinero | Sumas exactas; redondeo solo al presentar o persistir (§41). |

## Flujo de una petición

1. `preHandler` global verifica el JWT y carga el usuario interno (`users`).
2. Si llega `X-Company-Id`, exige membresía activa (o SUPER_ADMIN) → si no, **403**.
3. `requirePermission('recurso:acción')` compara contra la matriz de `packages/shared`.
4. La ruta valida el cuerpo con zod y ejecuta dentro de `withTenant(db, ctx, fn)`, que abre una transacción y fija `app.user_id`, `app.company_id`, `app.ip` con alcance de transacción.
5. PostgreSQL aplica RLS, FK compuestas, triggers de auditoría y de inmutabilidad.
6. Errores: `400` validación · `401` identidad · `403` permiso · `404` inexistente *o ajeno* (no se revela) · `409` integridad · `422` entrada física inválida para el motor · `429` rate limit.

## Mapa de API

Implementado en el Módulo 0:

| Método | Ruta | Permiso |
|---|---|---|
| GET | `/api/health` | público |
| GET | `/api/auth/me` | autenticado |
| POST | `/api/auth/login-event`, `/api/auth/logout-event` | autenticado (auditoría) |
| GET | `/api/companies/current` | `company:settings.read` |
| POST | `/api/companies` | `platform:companies.manage` (SUPER_ADMIN) |
| GET | `/api/countries` | autenticado |
| GET | `/api/regulations` | `regulations:read` |
| GET/POST | `/api/clients`, GET `/api/clients/:id` | `clients:read` / `clients:write` |
| GET | `/api/audit` | `audit:read` |
| POST | `/api/solar/size` | `sizing:run` o `diagnostics:preliminary` (vendedor → preliminar) |
| POST | `/api/solar/strings`, `/api/solar/inverter-compatibility` | `compatibility:review` |
| POST | `/api/batteries/size` | `sizing:run` o `scenarios:write` |
| POST | `/api/pricing/quote` | `budgets:write` — moneda desde la empresa; VE añade precio final en Bs |
| POST | `/api/quotes/preview` | `budgets:write` — desglose completo por línea y categoría; VE añade precio en Bs |
| POST | `/api/roi` | `budgets:read` |
| GET | `/api/currency-settings` | `company:settings.read` |
| POST | `/api/exchange-rates` | `pricing:configure` (global: SUPER_ADMIN) |
| GET | `/api/exchange-rates/latest` | `budgets:read` |

Reservado para módulos siguientes: `/api/users`, `/api/projects`, `/api/diagnostics`, `/api/products`, `/api/panels`, `/api/inverters`, `/api/batteries` (CRUD), `/api/bom`, `/api/costs`, `/api/budgets`, `/api/proposals`, `/api/reports`, `/api/ai`.

## Offline (preparado, no implementado)

Todas las tablas mutables tienen `row_version`, incrementado por trigger. La sincronización futura enviará `row_version` esperado; si no coincide, hay conflicto y se resuelve por versión (§45).
