# Instalación local

## 1. Requisitos

- Node.js 22.12 o superior (`node -v`).
- Docker Desktop o Docker Engine en ejecución (lo usa la CLI de Supabase).
- Git.

## 2. Dependencias

```bash
npm install
```

La CLI de Supabase queda instalada como dependencia de desarrollo; se usa con `npx supabase`.

## 3. Stack local de Supabase

```bash
npx supabase start
```

La primera vez descarga las imágenes (varios minutos). Al terminar imprime, entre otros:

| Dato | Uso |
| --- | --- |
| API URL (`http://127.0.0.1:54321`) | `NEXT_PUBLIC_SUPABASE_URL` |
| anon key / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Studio (`http://127.0.0.1:54323`) | explorar tablas y políticas |
| Mailpit (`http://127.0.0.1:54324`) | leer correos de confirmación y recuperación |

`supabase start` aplica todas las migraciones de `supabase/migrations`. Para reconstruir la base desde cero: `npm run db:reset`.

## 4. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. **No** copies la clave `service_role` en ninguna variable `NEXT_PUBLIC_`; la aplicación no la usa (solo el script de demostración, ver README).

## 5. Ejecutar

```bash
npm run dev
```

Abre http://localhost:3000, crea una cuenta en «Crear una cuenta», confirma desde Mailpit y configura tu óptica.

## 6. Regenerar los tipos de la base

`lib/supabase/database.types.ts` tiene los tipos de las fases B y C escritos a mano; los de las fases D a F están en `lib/supabase/database.generated.ts`, generado desde la base de pruebas migrada (Insert/Update según los privilegios reales por columna):

```bash
npm run db:types                # reconstruye opticonsulta_test y regenera database.generated.ts
npm run db:types:supabase       # con el stack de Docker: tipos oficiales en database.supabase.ts, para comparar
```

## 7. Pruebas de base de datos sin Supabase

`npm run test:db` solo necesita un PostgreSQL 15 o superior con las extensiones `pgcrypto`, `citext` y `btree_gist`:

```bash
export TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_test
npm run test:db
```

La base indicada se **borra y recrea** en cada ejecución; por eso el script exige que su nombre termine en `_test`.

## 8. Pruebas de extremo a extremo

```bash
npx playwright install chromium   # una sola vez
DEMO_PASSWORD=ClaveDemo2026 node --env-file=.env.local scripts/seed-demo.mjs
DEMO_PASSWORD=ClaveDemo2026 npm run test:e2e
```

Requiere el stack de Supabase y `npm run dev` (Playwright lo arranca si no está corriendo). Sin Docker: [pruebas-e2e.md](pruebas-e2e.md).
