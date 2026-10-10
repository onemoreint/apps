# OptiConsulta

Aplicación web para ópticas independientes con consultorio de optometría en Colombia: agenda, historia clínica optométrica, fórmulas, ventas, inventario, laboratorio y caja, con separación estricta de datos entre ópticas.

**Estado: Fase C completada** — además de la base (autenticación, organizaciones, roles, RLS, auditoría), ya funcionan agenda, pacientes, autorizaciones, profesionales, consulta optométrica y fórmulas con versiones, con el modelo de datos preparado para el RDA. Ventas, inventario, caja y laboratorio llegan en las fases D y E. Ver [docs/fase-c.md](docs/fase-c.md) y [docs/catalogos.md](docs/catalogos.md).

> OptiConsulta no está certificado ni habilitado ante ninguna autoridad. Implementar controles técnicos no equivale a cumplimiento legal; ver la matriz de requisitos de la Fase A antes de cualquier piloto con datos reales.

## Stack

| Pieza | Versión fijada |
| --- | --- |
| Next.js (App Router, `proxy.ts`) | 16.4.0 |
| React | 19.3.0 |
| TypeScript (modo estricto) | 6.0.3 |
| Supabase JS / SSR | 2.117.3 / 0.12.7 |
| Zod / React Hook Form | 4.6.5 / 7.89.0 |
| Tailwind CSS | 4.3.3 |
| Vitest / Playwright | 5.0.3 / 1.64.0 |
| PostgreSQL (Supabase local) | 17 |

Versiones comprobadas en el registro npm el 9 de octubre de 2026. Por qué TypeScript 6 y no 7, y otras decisiones: [docs/fase-b.md](docs/fase-b.md).

## Inicio rápido

Requisitos: Node 22.12 o superior y Docker (para el stack local de Supabase).

```bash
npm install
npx supabase start            # levanta Postgres, Auth, Studio y Mailpit; aplica las migraciones
cp .env.example .env.local    # pega la URL y la clave anon que imprime el comando anterior
npm run dev                   # http://localhost:3000
```

Crea una cuenta en `/registro`; el correo de confirmación llega a Mailpit (http://127.0.0.1:54324). Antes de atender, importa los catálogos CIE-10 y SISPRO ([docs/catalogos.md](docs/catalogos.md)). Guía completa: [docs/instalacion-local.md](docs/instalacion-local.md).

## Pruebas

```bash
npm run typecheck   # TypeScript estricto
npm run test:unit   # validaciones y mensajes (sin base de datos)
npm run test:db     # aislamiento, permisos, clínica y endurecimiento del esquema (PostgreSQL)
npm run test:e2e    # Playwright contra el stack local de Supabase
```

`test:db` usa una base PostgreSQL desechable (`TEST_DATABASE_URL`, el nombre debe terminar en `_test`) con un shim que reproduce los roles y privilegios por defecto de Supabase, para que las pruebas midan RLS y no la ausencia de permisos.

## Estructura

```text
app/                 rutas: (auth) acceso, configuracion-inicial, invitacion, (app)/[org] módulos
modules/<dominio>/   schemas.ts (Zod compartido) y actions.ts (Server Actions)
lib/                 clientes Supabase, autorización, entorno, errores, formatos
components/          interfaz y formularios accesibles
supabase/migrations  migraciones SQL versionadas (fuente de verdad del esquema y RLS)
supabase/tests       shim de Supabase para pruebas en PostgreSQL plano
tests/               unit, integration (base de datos) y e2e (Playwright)
docs/                instalación, matriz de permisos, notas por fase
```

## Seguridad en una línea por capa

- **Base de datos:** RLS en todas las tablas; altas y cambios sensibles solo por funciones RPC que verifican sesión y permiso; auditoría de solo inserción.
- **Servidor:** cada Server Action valida con Zod y exige el permiso antes de llamar a la base, que vuelve a verificar.
- **Navegador:** solo la clave pública; sesión en cookies httpOnly; CSP y cabeceras de seguridad; sin caché offline de datos.
- La clave `service_role` no se usa en ninguna ruta de la aplicación.
