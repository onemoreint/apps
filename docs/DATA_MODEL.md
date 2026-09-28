# Modelo de datos

Fuente de verdad: `packages/db/migrations/0001_init.sql`. Espejo tipado: `packages/db/src/schema.ts` (verificado por `schema-drift.test.ts`).

## Convenciones

- `id uuid` · `created_at`, `updated_at timestamptz` · `row_version integer` (tablas mutables).
- Toda entidad comercial tiene `company_id` y política RLS.
- Referencias internas de una empresa: FK compuesta `(company_id, x_id) → tabla(company_id, id)`.
- Borrado lógico (`deleted_at`) en clientes y proyectos; productos usan `status ACTIVO/INACTIVO`.
- Valores monetarios `numeric(18,4)`; ratios como fracción (`0.19`, nunca `19`).

## Entidades

| Grupo | Tablas |
|---|---|
| Referencia | `currencies`, `countries`, `roles`, `permissions`, `role_permissions` |
| Normativa | `regulatory_profiles` → `regulatory_versions` → `technical_rules`; `grid_emission_factors` |
| Empresa | `companies`, `users`, `company_memberships`, `company_settings`, `document_settings`, `tax_rules` |
| Clientes y proyectos | `clients`, `projects` (fija `regulatory_version_id`), `solar_resources` |
| Diagnóstico | `energy_diagnostics`, `energy_consumption`, `bill_extracted_fields`, `equipment_loads` |
| Catálogo | `components` (base) + `solar_panels`, `inverters`, `batteries`, `structures`, `cables`, `protections`; `suppliers`, `supplier_prices` |
| Costos | `labor_items`, `costs`, `bom_rules` |
| Ingeniería | `solar_scenarios`, `project_materials` |
| Comercial | `budgets`, `budget_items`, `proposals`, `proposal_versions` |
| Trazabilidad | `audit_logs` |

## Relaciones principales

```
companies ─┬─ company_memberships ── users
           ├─ company_settings / document_settings
           ├─ clients ── projects ─┬─ solar_resources
           │                       ├─ energy_diagnostics ─┬─ energy_consumption
           │                       │                      ├─ bill_extracted_fields
           │                       │                      └─ equipment_loads
           │                       ├─ solar_scenarios ── project_materials ── components
           │                       ├─ budgets ── budget_items
           │                       └─ proposals ── proposal_versions ── budgets
           ├─ components (propios) ── solar_panels | inverters | batteries | …
           ├─ suppliers ── supplier_prices
           └─ labor_items, costs, bom_rules, tax_rules (propias)

countries ── regulatory_profiles ── regulatory_versions ── technical_rules
```

## Reglas de integridad destacadas

| Regla | Dónde |
|---|---|
| Consumo ausente ≠ 0 (`kwh NULL`) | `energy_consumption.kwh` nullable; `bill_extracted_fields`: `NO_DISPONIBLE` no admite valor |
| Toda regla técnica cita fuente | `technical_rules.source_reference NOT NULL` |
| Una regla pertenece a una versión normativa **o** a una empresa | `CHECK` exclusivo |
| Una sola versión normativa VIGENTE por perfil | índice único parcial |
| Colombia y Venezuela no comparten reglas | perfiles distintos por país; reglas cuelgan de la versión |
| Ficha de panel coherente | `vmp < voc`, `imp < isc` |
| Inversor coherente | `mppt_min < mppt_max ≤ max_dc_voltage` |
| Producto con precio tiene moneda | `CHECK` en `components` |
| Producto usado no se borra | FK `ON DELETE RESTRICT` desde materiales, escenarios, BOM, precios |
| Presupuesto emitido inmutable | trigger `app.lock_issued_budget` |
| Versión de propuesta inmutable | trigger + sin privilegio `UPDATE/DELETE` |

## Seed

Carga monedas (ISO 4217), Colombia (NIT, COP, Departamento) y Venezuela (RIF, VES, Estado) con sus campos obligatorios de empresa (§7), roles, permisos y un perfil normativo por país con versión `0.0-borrador` **vacía**.

No se cargan impuestos, reglas técnicas, factores de emisión, productos ni precios: deben ingresarse con fuente por un responsable (Módulos 1 y 5).
