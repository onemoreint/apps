# INDICADORES PRO

**Sistema inteligente para gestión, seguimiento, análisis y mejora de indicadores organizacionales.**

Aplicación web (PWA instalable) para administrar indicadores KPI y de sistemas de gestión de calidad: fichas técnicas, fórmulas, metas, resultados, semáforos, planes de acción y dashboard. Multiempresa, multiusuario, con permisos por rol y aislamiento de datos por organización.

- **App publicada:** `https://onemoreint.github.io/apps/indicadores-pro/app/`
- **Documento de arquitectura (Fase 0):** compartido aparte como documento de Claude.

---

## Estado del proyecto

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0 | Análisis, arquitectura, modelo de datos | ✅ |
| 1 | Base: proyecto, diseño, navegación, autenticación, organización, PWA, migración base con RLS | ✅ |
| 2 | Base de datos completa (procesos, catálogos, indicadores, períodos, resultados, planes) + demo | ⏳ |
| 3 | CRUD de procesos, catálogos, usuarios, indicadores, ficha técnica | ⏳ |
| 4 | Motor de fórmulas, metas, dirección, tolerancias, semáforo, resultados | ⏳ |
| 5 | Dashboard con gráficos y filtros | ⏳ |
| 6 | Planes de acción, 5 porqués, Ishikawa | ⏳ |
| 7 | Exportación CSV / XLSX / PDF, respaldo | ⏳ |
| 8 | IA, alertas, auditoría (pantalla), importación | ⏳ |

---

## Dos modos de datos

La app funciona **sin configurar nada**. Según las variables de entorno elige dónde guardar:

| Modo | Cuándo | Dónde viven los datos |
| --- | --- | --- |
| **Local** | Sin `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Solo en el navegador del dispositivo (localStorage). Ideal para probar y demostrar. |
| **Supabase** | Con ambas variables configuradas | PostgreSQL en la nube, con Row Level Security por organización. Multiusuario real. |
| **Demo** | Botón **Ver demostración** | Espacio separado del navegador, marcado DEMO. Nunca toca datos reales. Se reinicia desde el menú de usuario. |

Las pantallas no saben qué modo está activo: hablan con la interfaz `DataRepository` (`src/data/repository.ts`), que tiene un adaptador local y uno de Supabase.

---

## Instalación

Requisitos: Node.js 20 o superior.

```bash
cd indicadores-pro
npm install
cp .env.example .env.local   # opcional: deja vacío para modo local
npm run dev                  # http://localhost:5173
```

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Verificación de tipos TypeScript |
| `npm test` | Pruebas (unitarias, interfaz y base de datos con RLS) |
| `npm run build` | Build de producción en `dist/` |
| `npm run build:pages` | Build para GitHub Pages en `app/` |

---

## Variables de entorno

Ver `.env.example`. Todas son **públicas** (prefijo `VITE_`); nunca pongas secretos en el frontend.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | No | URL del proyecto Supabase. Vacía = modo local. |
| `VITE_SUPABASE_ANON_KEY` | No | Clave pública *anon*. La seguridad la ponen las políticas RLS. |
| `VITE_APP_NAME` | No | Cambia el nombre comercial (por defecto INDICADORES PRO). |

La `service_role` key y las claves de IA **solo** se configuran como secretos de Edge Functions en Supabase (Fase 8).

---

## Conectar Supabase (cuando lo necesites)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. Instala la CLI y enlaza el proyecto:
   ```bash
   npx supabase login
   npx supabase link --project-ref <tu-ref>
   npx supabase db push        # aplica supabase/migrations
   ```
3. En **Project Settings → API** copia la URL y la anon key a `.env.local`.
4. En **Authentication → URL Configuration** agrega la URL de la app publicada como *Site URL* y *Redirect URL*.
5. Vuelve a construir (`npm run build:pages`) y publica.

Para hacer a alguien SUPERADMIN de plataforma: `insert into public.platform_admins (user_id) values ('<uuid del usuario>');` desde el editor SQL.

---

## Arquitectura

```
indicadores-pro/
├─ src/
│  ├─ app/            router (HashRouter), providers, guards, tema, PWA, error boundary
│  ├─ config/         app.config.ts (nombre, colores) y env.ts (única lectura de variables)
│  ├─ i18n/           es.json, en.json (ningún texto fijo en componentes)
│  ├─ lib/            permisos, colores institucionales, errores, logger, utilidades
│  ├─ components/     ui/ (botón, campo, tarjeta, menú…) y componentes compartidos
│  ├─ data/           contrato DataRepository + adaptadores local/ y supabase/
│  └─ features/       auth, organization, dashboard, settings, help, shell, placeholder
├─ supabase/migrations/   SQL versionado: tablas, funciones, RLS, auditoría
├─ tests/             Vitest: unitarias, flujo de interfaz y SQL (PGlite)
├─ public/icons/      íconos PWA (generados con scripts/generate-icons.mjs)
└─ app/               build publicado en GitHub Pages
```

Decisiones clave:

- **Seguridad en la base de datos.** Cada tabla tiene RLS. `has_permission(org, permiso)` en SQL replica la matriz de `src/lib/permissions.ts`; una prueba automática verifica que ambas coinciden.
- **Organizaciones se crean con `create_organization()`**, que en una transacción crea la organización, la membresía de administrador y la configuración.
- **Auditoría por trigger** (`audit_logs`): guarda valor anterior y nuevo de cada cambio.
- **No se puede dejar una organización sin administrador** (trigger `keep_one_admin`).
- **Colores institucionales** se aplican como variables CSS (`src/lib/brand.ts`) a botones, barra lateral y encabezados.
- **HashRouter** para funcionar en GitHub Pages sin reglas de reescritura.

### Roles

| Rol | Puede |
| --- | --- |
| Administrador | Todo dentro de su organización |
| Responsable de calidad | Indicadores, metas, cierre de períodos, planes de acción |
| Responsable de indicador | Registrar resultados y avance de sus planes |
| Analista | Consultar y exportar reportes |
| Lector | Solo lectura |
| Superadmin | Rol de plataforma (soporte); no pertenece a una organización |

---

## Pruebas

```bash
npm test
```

- `tests/permissions.test.ts` — matriz de permisos.
- `tests/local-repository.test.ts` — registro, login, hash de contraseña, aislamiento entre organizaciones, demo separada.
- `tests/app-flow.test.tsx` — flujo real en la interfaz: registro → organización → dashboard, validaciones, demo.
- `tests/sql/rls.test.ts` — aplica las migraciones en PostgreSQL (PGlite) y prueba RLS: un usuario de otra organización no puede leer, editar ni unirse; el lector no modifica; la auditoría registra cambios; SQL y frontend tienen los mismos permisos.

La interfaz se revisa en 360, 390, 768, 1024 y 1440 px sin desplazamiento horizontal.

---

## Despliegue en GitHub Pages

El repositorio publica la rama `main`. Para actualizar la app:

```bash
npm run build:pages
git add app && git commit -m "indicadores-pro: publicar build" && git push
```

El workflow `.github/workflows/indicadores-pro-ci.yml` ejecuta tipos, pruebas y build en cada cambio.

---

## Licencia y propiedad intelectual

Desarrollo original. Librerías con licencias MIT/ISC/Apache-2.0 (React, Vite, Tailwind, Radix UI, Lucide, Supabase JS, i18next, Zod). Fuente Inter (SIL Open Font License).
