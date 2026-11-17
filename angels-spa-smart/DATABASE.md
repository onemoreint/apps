# Base de datos · Supabase / PostgreSQL

Migraciones en `supabase/migrations/` (orden por nombre):

| Archivo | Contenido |
|---|---|
| `…01_schema.sql` | Tipos, 16 tablas, índices, restricciones, `updated_at`, vista `client_consents` |
| `…02_rls.sql` | RLS en todas las tablas y funciones `is_member()`, `has_role()` |
| `…03_booking_functions.sql` | Reservas transaccionales, estados + puntos, auditoría, tope de pagos, supresión |

## Entidades
`businesses`, `profiles` (usuario Auth ↔ negocio + rol owner/admin/staff), `staff`, `services`, `clients`, `appointments`, `availability_rules`, `schedule_blocks`, `payments`, `loyalty_transactions`, `promotions`, `consent_records`, `audit_logs`, más `gallery_items` y `booking_requests_log` (límite de solicitudes).

Todas usan UUID, `created_at`/`updated_at`, `business_id` y **FK compuestas `(business_id, id)`**: una cita no puede apuntar a una clienta, servicio o profesional de otra empresa.

Restricciones destacadas:
- `clients unique (business_id, phone)` con teléfono normalizado (`normalize_phone()`).
- `appointments_no_overlap`: `EXCLUDE USING gist (staff_id =, tstzrange(starts_at, ends_at) &&)` para estados activos → imposible solapar citas aunque lleguen al mismo tiempo.
- Pagos: trigger impide que la suma supere el precio de la cita.

## RLS
| Rol | Puede |
|---|---|
| `anon` | Leer columnas públicas del negocio, servicios activos, galería, promociones vigentes, profesionales activas y horario. Ejecutar `book_appointment()` y `get_busy_intervals()` (solo horas ocupadas, sin datos personales). Nada más. |
| `authenticated` miembro | CRUD de su propio `business_id`. Puntos y consentimientos: leer/insertar (no editar ni borrar). |
| owner/admin | Además: leer auditoría, editar el negocio, suprimir clientas, gestionar perfiles. |

Nadie puede borrar ni editar `audit_logs` (solo lo escriben triggers).

## Funciones
- `book_appointment(business, service, staff, starts_at, name, phone, notes, consent_data, consent_marketing)` — SECURITY DEFINER. Valida entradas, límites (por teléfono/24 h y por negocio/hora), servicio y profesional del mismo negocio, horario de atención, anticipación, bloqueos, ocupación y duplicados; toma `pg_advisory_xact_lock` por profesional+día; crea/reutiliza la clienta y registra consentimientos.
- `set_appointment_status(id, status)` — verifica pertenencia; otorga puntos una sola vez al completar y los revierte si la cita deja de estar completada.
- `anonymize_client(id)` — derecho de supresión (owner/admin).
- `get_busy_intervals(business, from, to)` — horas ocupadas para el portal.

## Probar
`npm run test:db` levanta un PostgreSQL efímero, aplica un stub mínimo de Supabase (`supabase/tests/00_local_supabase_stub.sql`, solo local) y ejecuta las pruebas. Ver TESTING.md.
