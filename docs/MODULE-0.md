# Módulo 0 — Checklist de aceptación (§49)

| Criterio | Estado | Evidencia |
|---|---|---|
| **Arquitectura** | | |
| Arquitectura modular | ✅ | Monorepo `apps/` + `packages/` |
| Separación frontend/backend | ✅ | `apps/web` (Next.js) y `apps/api` (Fastify) independientes |
| Motor matemático independiente | ✅ | `packages/calculation-engine`, sin E/S; 35 pruebas |
| **Seguridad** | | |
| Autenticación | ✅ | JWT Supabase verificado · `api.test.ts › autenticación` |
| Roles | ✅ | 5 roles, 34 permisos · `permissions.test.ts`, `isolation.test.ts › roles` |
| Aislamiento por empresa | ✅ | RLS + FK compuestas · `isolation.test.ts`, `api.test.ts › aislamiento` |
| **Multiempresa** | | |
| Una empresa no puede acceder a otra | ✅ | Lectura, inserción, edición, borrado, suplantación de cabecera y FK cruzada probados |
| Datos con asociación empresarial | ✅ | `company_id` en toda tabla comercial; `schema-drift.test.ts` verifica RLS en todas |
| **Países** | | |
| Colombia existe como perfil | ✅ | Seed: NIT, COP, perfil normativo propio |
| Venezuela existe como perfil | ✅ | Seed: RIF, VES, Estado, perfil normativo propio |
| Reglas independientes | ✅ | Reglas cuelgan de versiones de perfiles distintos |
| **Catálogo** | | |
| Productos configurables | ✅ | `components` + fichas tipadas, global o por empresa |
| Precios no hardcodeados | ✅ | Precios solo en BD; el motor los recibe como parámetro |
| **Normativa** | | |
| Control de versiones | ✅ | `regulatory_versions` (BORRADOR/VIGENTE/REEMPLAZADA/ARCHIVADA); proyectos fijan su versión |
| No afirma cumplimiento automático | ✅ | Estados `OK/WARNING/ERROR/REVIEW_REQUIRED`; sin reglas inventadas (probado) |
| **Cálculos** | | |
| Fórmulas documentadas | ✅ | `docs/FORMULAS.md` + `formula` en cada resultado |
| Unidades normalizadas | ✅ | `core/units.ts` como capa única |
| Cálculos con pruebas | ✅ | Valores esperados calculados a mano en los comentarios de las pruebas |
| **Auditoría** | | |
| Cambios relevantes registrados | ✅ | Trigger en 35 tablas + eventos; inmutable · `isolation.test.ts › auditoría` |

## Pruebas (§48)

| Tipo | Ubicación |
|---|---|
| Unitarias / cálculo | `packages/calculation-engine/src/engine.test.ts`, `packages/shared/src/permissions.test.ts` |
| Integración (BD real) | `packages/db/test/*.test.ts` |
| Autorización y aislamiento | `packages/db/test/isolation.test.ts`, `apps/api/test/api.test.ts` |
| API | `apps/api/test/api.test.ts` |
| Generación de PDF | Pendiente — llega con el Módulo 7 |

## Decisiones que requieren tu validación

1. **Decimales de moneda**: el seed usa ISO 4217 (COP = 2). Si las cotizaciones en Colombia deben mostrarse sin decimales, se cambia a 0 en `currencies`.
2. **Moneda por defecto de Venezuela**: VES. Si la operación real cotiza en USD, se ajusta por empresa en `company_settings.currency_code`.
3. **Modo de margen por defecto**: `MARKUP` (utilidad = costo × margen). La alternativa `GROSS_MARGIN` está disponible por empresa y por presupuesto.
4. **Severidades de strings**: Voc en frío sobre el máximo y cortocircuito sobre el admitido = ERROR; Vmp caliente bajo MPPT y corriente de operación sobre la máxima = ADVERTENCIA. Un ingeniero debería confirmar este criterio.

## Siguiente: Módulo 1

Empresa + configuración Colombia/Venezuela: formulario de empresa con validación de campos por país, carga de logo y firma (Supabase Storage), configuración comercial y de documentos, gestión de usuarios y membresías.
