# Seguridad

## Identidad

- Supabase Auth autentica. La plataforma **no almacena contraseñas** (`users.id` = id de Supabase).
- La API verifica firma, expiración, emisor y audiencia del JWT (`HS256` con `SUPABASE_JWT_SECRET` o `RS256/ES256` con `SUPABASE_JWKS_URL`).
- Un usuario autenticado en Supabase pero sin registro activo en `users` recibe **401**.

## Autorización (dos capas)

1. **API**: matriz rol → permisos en `packages/shared/src/permissions.ts` (única fuente; el seed la replica en `role_permissions`).
2. **Base de datos**: RLS con funciones `SECURITY DEFINER` que verifican membresía:

| Función | Devuelve |
|---|---|
| `app.current_user_id()` | usuario de la sesión |
| `app.current_company_id()` | la empresa pedida **solo si** el usuario es miembro activo (o SUPER_ADMIN) |
| `app.current_role()` | rol real en esa empresa, leído de `company_memberships` |
| `app.can_write()` | falso para `CONSULTA` |
| `app.is_company_admin()` | `ADMIN_EMPRESA` o `SUPER_ADMIN` |

Grupos de políticas:

| Grupo | Lectura | Escritura |
|---|---|---|
| Referencia (países, monedas, roles, normativa) | cualquier sesión identificada | SUPER_ADMIN |
| Negocio (clientes, proyectos, diagnósticos, escenarios, presupuestos, propuestas…) | miembros de la empresa | miembros con `can_write` |
| Configuración (ajustes, documentos, mano de obra, costos, reglas de BOM) | miembros | administradores |
| Catálogo (`components` y fichas) | globales + propios | propios: administradores · globales: SUPER_ADMIN |
| Impuestos y reglas técnicas | país + propios | propios: administradores · país: SUPER_ADMIN |
| Auditoría | administradores de la empresa | nadie (solo funciones del sistema) |

## Protección contra acceso horizontal

- `company_id` se toma **siempre** de la sesión, nunca del cuerpo de la petición.
- FK compuestas `(company_id, id)` impiden referencias cruzadas entre empresas.
- Recursos ajenos devuelven **404**, igual que los inexistentes.
- Probado en `packages/db/test/isolation.test.ts` y `apps/api/test/api.test.ts`.

## Rol de base de datos

La API se conecta con `solarpro_app`: `NOSUPERUSER`, `NOBYPASSRLS`, no es dueño de las tablas. Sin `INSERT/UPDATE/DELETE` sobre `audit_logs`, sin `UPDATE/DELETE` sobre `proposal_versions`.

La migración crea el rol sin `LOGIN`. Para habilitarlo:

```sql
ALTER ROLE solarpro_app LOGIN PASSWORD '<secreto-fuerte>';
```

**En Supabase:** usar la cadena de conexión con este rol para `DATABASE_URL` (pooler en modo *transaction* compatible, porque el contexto se fija con `set_config(..., true)` dentro de cada transacción). No conceder permisos sobre estas tablas a `anon` ni `authenticated`: el acceso de datos pasa solo por la API.

## Auditoría e inmutabilidad

- Trigger `app.audit_row()` en todas las tablas relevantes: usuario, empresa, acción, entidad, id, IP, valor anterior y nuevo.
- `app.log_event()` para `LOGIN`, `LOGOUT`, `EXPORT`, `GENERATE_PDF`, `APPROVE`, `REJECT`.
- `audit_logs` y `proposal_versions` rechazan `UPDATE/DELETE` por trigger.
- Un presupuesto `EMITIDO` solo puede pasar a `ANULADO`; sus ítems quedan congelados.

## Plataforma

- `helmet` (cabeceras seguras), CORS con lista de orígenes, `@fastify/rate-limit`.
- Límite de cuerpo 1 MB; validación zod en todas las entradas.
- Los logs redactan `Authorization` y `Cookie`; los errores 500 no exponen detalles.
- Secretos solo por variables de entorno (`.env` fuera del repositorio; ver `.env.example`).
- Backups: responsabilidad de la infraestructura (Supabase PITR o `pg_dump` programado) — se configura al desplegar.
