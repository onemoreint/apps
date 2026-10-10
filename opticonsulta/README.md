# OptiConsulta

Aplicación web para ópticas independientes con consultorio de optometría en Colombia: agenda, historia clínica optométrica, fórmulas, ventas, inventario, laboratorio y caja, con separación estricta de datos entre ópticas.

**Estado: fases A–G completadas.** Funcionan autenticación, ópticas con roles y permisos editables, agenda, pacientes y autorizaciones, consulta optométrica y fórmulas con versiones (modelo preparado para el RDA), cotizaciones, ventas, pagos con recibo interno, caja, inventario, laboratorio con control de calidad, entregas, garantías, indicadores, reportes, exportaciones registradas, solicitudes de titulares de datos, óptica de demostración y respaldo con restauración verificada. Resumen: [docs/fases-d-g.md](docs/fases-d-g.md).

> OptiConsulta no está certificado ni habilitado ante ninguna autoridad, y no declara cumplimiento legal: implementar controles técnicos no equivale a cumplir. Antes de un piloto con datos reales, un asesor jurídico debe revisar la [matriz legal](docs/matriz-legal.md). El recibo de caja es un **recibo interno, no una factura electrónica**.

**Fuera de alcance:** envío del RDA al Ministerio (requiere credenciales y la guía oficial; no se simula), RIPS, factura electrónica DIAN, integraciones con EPS, WhatsApp/SMS, diagnóstico o cambios de fórmula por IA, contabilidad, nómina, multisede avanzada y portal del paciente.

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

Requisitos: Node 22.12 o superior y Docker (para el stack local de Supabase). Sin Docker, ver [docs/pruebas-e2e.md](docs/pruebas-e2e.md).

```bash
npm install
npx supabase start            # levanta Postgres, Auth, Studio y Mailpit; aplica las migraciones
cp .env.example .env.local    # pega la URL y la clave anon que imprime el comando anterior
npm run dev                   # http://localhost:3000
```

Crea una cuenta en `/registro`; el correo de confirmación llega a Mailpit (http://127.0.0.1:54324). Antes de atender, importa los catálogos CIE-10 y SISPRO ([docs/catalogos.md](docs/catalogos.md)). Guía completa: [docs/instalacion-local.md](docs/instalacion-local.md).

### Óptica de demostración

```bash
DEMO_PASSWORD=UnaClaveDemo2026 node --env-file=.env.local scripts/seed-demo.mjs
```

Crea la óptica `optica-demo` con un usuario por rol (`propietario@`, `admin@`, `optometra@`, `asistente@` y `caja@demo-opticonsulta.test`) y datos **ficticios**. Necesita `SUPABASE_SERVICE_ROLE_KEY` en el archivo de entorno solo para crear esas cuentas. No la uses con datos reales.

## Pruebas

```bash
npm run typecheck   # TypeScript estricto
npm run test:unit   # validaciones, CSV y cálculos de formulario (sin base de datos)
npm run test:db     # aislamiento, permisos, clínica, comercio, laboratorio, reportes, respaldo y endurecimiento (PostgreSQL)
npm run test:e2e    # Playwright contra un backend local de Supabase y la óptica de demostración
```

`test:db` usa una base PostgreSQL desechable (`TEST_DATABASE_URL`, el nombre debe terminar en `_test`) con un shim que reproduce los roles y privilegios por defecto de Supabase, para que las pruebas midan RLS y no la ausencia de permisos. Último resultado: 40 unitarias, 141 de base de datos y 23 de extremo a extremo aprobadas ([detalle](docs/fases-d-g.md#resultado-de-las-pruebas-9-de-octubre-de-2026)).

## Estructura

```text
app/                 rutas: (auth) acceso, configuracion-inicial, invitacion, (app)/[org] módulos
modules/<dominio>/   schemas.ts (Zod compartido) y actions.ts (Server Actions)
lib/                 clientes Supabase, autorización, entorno, errores, formatos
components/          interfaz y formularios accesibles
supabase/migrations  migraciones SQL versionadas (fuente de verdad del esquema y RLS)
supabase/tests       shim de Supabase para pruebas en PostgreSQL plano
scripts/             demo, respaldo/restauración, importador de catálogos, tipos, pila local sin Docker
tests/               unit, integration (base de datos) y e2e (Playwright)
docs/                instalación, despliegue, guías, indicadores, matriz legal y de permisos, riesgos
```

## Seguridad en una línea por capa

- **Base de datos:** RLS en todas las tablas; altas y cambios sensibles solo por funciones RPC que verifican sesión y permiso; auditoría de solo inserción.
- **Servidor:** cada Server Action valida con Zod y exige el permiso antes de llamar a la base, que vuelve a verificar.
- **Navegador:** solo la clave pública; sesión en cookies httpOnly; CSP y cabeceras de seguridad; sin caché offline de datos.
- La clave `service_role` no se usa en ninguna ruta de la aplicación; solo en el script de demostración.

## Documentación

| Documento | Para |
| --- | --- |
| [instalacion-local.md](docs/instalacion-local.md) | Desarrollo local |
| [despliegue.md](docs/despliegue.md) | Poner la aplicación en producción |
| [guia-administrador.md](docs/guia-administrador.md) | Propietario y administradores |
| [manual-usuario.md](docs/manual-usuario.md) | Personal de la óptica, por tarea |
| [matriz-permisos.md](docs/matriz-permisos.md) | Qué puede hacer cada rol |
| [indicadores.md](docs/indicadores.md) | Definición de cada cifra |
| [respaldo-y-restauracion.md](docs/respaldo-y-restauracion.md) | Respaldo, restauración verificada y exportación |
| [matriz-legal.md](docs/matriz-legal.md) | Normas a validar con el asesor jurídico |
| [riesgos.md](docs/riesgos.md) | Riesgos abiertos |
| [catalogos.md](docs/catalogos.md) | Importar CIE-10, CUPS y tablas SISPRO |
| [pruebas-e2e.md](docs/pruebas-e2e.md) | Pruebas de extremo a extremo con o sin Docker |
| [fase-b.md](docs/fase-b.md), [fase-c.md](docs/fase-c.md), [fases-d-g.md](docs/fases-d-g.md) | Decisiones y resultados por fase |
