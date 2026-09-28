# SOLARPRO 360

**Dimensiona · Costea · Cotiza · Instala**

Plataforma SaaS multiempresa para prefactibilidad, dimensionamiento, materiales, costos, presupuestos y propuestas técnico-comerciales de sistemas solares fotovoltaicos. Mercados iniciales: **Colombia** y **Venezuela**.

> Estado: **Módulo 0 completado** — arquitectura, modelo de datos, seguridad, roles, multiempresa, multipaís, motor de cálculo, estructura normativa, catálogos, costos, documentos y pruebas. Los módulos 1–14 se construyen encima, uno por uno, con aprobación entre módulos.

## Principio rector

```
DATOS → MOTOR MATEMÁTICO → RESULTADOS VERIFICADOS → SolarAI → EXPLICACIÓN
```

La IA **nunca** calcula. Cada resultado del motor trae fórmula, variables con unidades, supuestos y validaciones (`OK · WARNING · ERROR · REVIEW_REQUIRED`). El sistema **no certifica** cumplimiento normativo: señala criterios verificados, advertencias y revisiones profesionales requeridas.

## Estructura

```
solarpro360/
├── apps/
│   ├── api/                  API Fastify (auth Supabase JWT, roles, aislamiento, auditoría)
│   └── web/                  Frontend Next.js (mobile-first)
├── packages/
│   ├── calculation-engine/   Motor matemático puro y testeable
│   │   └── src/{core,energy,solar,strings,inverter,battery,bom,costs,pricing,roi,environmental}
│   ├── db/                   Migraciones SQL (RLS), esquema Drizzle, seed, utilidades de prueba
│   └── shared/               Enums, roles y matriz de permisos compartidos
├── docs/                     Arquitectura, modelo de datos, seguridad, fórmulas, checklist del Módulo 0
└── infrastructure/           docker-compose de PostgreSQL local
```

## Reglas de moneda

| País | Cotiza en | Precio final |
|---|---|---|
| Colombia | COP, sin decimales | COP |
| Venezuela | USD | Bs = precio USD × (tasa BCV del día + 200 Bs) |

La tasa BCV se registra cada día en `/api/exchange-rates` (fecha y fuente quedan guardadas); el recargo de 200 Bs es configurable por empresa.

## Cotizador (demo)

`demo/cotizador.html` es una página autónoma que ejecuta el motor real en el navegador (modo vendedor): escenarios comparables y desglose línea por línea de materiales por componente, mano de obra, transporte, ingeniería, costos indirectos y otros; precio en COP o en USD con precio final en Bs. Los precios que trae son de ejemplo y se editan en la página. Se regenera con `demo/build.sh`.

## Stack

Next.js · Fastify · TypeScript · PostgreSQL (Supabase: Postgres + Auth + Storage) · Drizzle ORM · Vitest · pnpm workspaces.

## Puesta en marcha local

```bash
pnpm install
cp .env.example .env                      # completar valores
docker compose -f infrastructure/docker-compose.yml up -d

export DATABASE_ADMIN_URL=postgres://postgres:postgres@localhost:5432/solarpro360
pnpm db:migrate
pnpm db:seed
psql "$DATABASE_ADMIN_URL" -c "ALTER ROLE solarpro_app LOGIN PASSWORD 'cambia-esto'"

pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:3000
```

## Pruebas

```bash
export TEST_DATABASE_ADMIN_URL=postgres://postgres:postgres@localhost:5432/postgres
pnpm test
```

| Suite | Qué prueba | Pruebas |
|---|---|---|
| `calculation-engine` | Consumo, cargas, dimensionamiento, strings, inversor, baterías, BOM, costos, margen, impuestos, ROI, CO₂, conversión USD→Bs, cotización con desglose | 44 |
| `shared` | Matriz de permisos por rol | 5 |
| `db` | Aislamiento multiempresa con RLS en PostgreSQL real, roles en BD, auditoría, inmutabilidad, drift de esquema, reglas de moneda | 29 |
| `api` | Autenticación JWT, autorización, acceso horizontal, validación, auditoría, rate limiting, endpoints de cálculo, moneda por país, desglose | 31 |

Las pruebas de base de datos y API crean una base de datos efímera y se conectan con el rol real de la aplicación (sin privilegios, sujeto a RLS).

## Documentación

- [Arquitectura](docs/ARCHITECTURE.md)
- [Modelo de datos](docs/DATA_MODEL.md)
- [Seguridad](docs/SECURITY.md)
- [Fórmulas del motor](docs/FORMULAS.md)
- [Checklist de aceptación del Módulo 0](docs/MODULE-0.md)
- [Especificación original](docs/requisitos/MODULO-0-especificacion.md)
