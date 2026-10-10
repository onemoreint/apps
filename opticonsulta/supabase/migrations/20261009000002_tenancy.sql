-- =============================================================================
-- OptiConsulta · Migración 0002 · Tenencia: organizaciones, sedes, perfiles,
-- membresías, catálogo de permisos y permisos por rol
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Organizaciones (cada óptica cliente del servicio)
-- -----------------------------------------------------------------------------
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  slug          extensions.citext not null unique
                  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$')
                  -- Rutas de la aplicación que no pueden ser dirección de una óptica.
                  check (slug::text not in ('login', 'registro', 'recuperar', 'restablecer', 'auth', 'api',
                                            'configuracion-inicial', 'invitacion', 'admin', 'static', 'manifest')),
  trade_name    text not null check (char_length(trade_name) between 2 and 120),
  legal_name    text check (legal_name is null or char_length(legal_name) between 2 and 160),
  -- NIT tal como lo declara el cliente. No se valida contra la DIAN.
  nit           text check (nit is null or nit ~ '^[0-9]{5,12}(-[0-9])?$'),
  timezone      text not null default 'America/Bogota',
  currency      char(3) not null default 'COP' check (currency = 'COP'),
  is_demo       boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.organizations.is_demo is
  'Marca organizaciones con datos ficticios de demostración. Nunca mezclar con datos reales.';

create or replace function private.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Zona horaria no válida: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_timezone() from public;

create trigger organizations_validate_tz
  before insert or update of timezone on public.organizations
  for each row execute function private.validate_timezone();

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Sedes. unique(id, organization_id) permite FKs compuestas que garantizan que
-- una sede referenciada pertenece a la misma organización.
-- -----------------------------------------------------------------------------
create table public.locations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name            text not null check (char_length(name) between 2 and 120),
  address         text check (address is null or char_length(address) <= 200),
  city            text check (city is null or char_length(city) <= 80),
  phone           text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id)
);
create index locations_org_idx on public.locations (organization_id);

create trigger locations_updated_at
  before update on public.locations
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Perfiles: datos visibles del usuario, 1:1 con auth.users
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  -- Copia del correo de auth.users para que el equipo identifique a sus colegas.
  -- Solo la mantiene el trigger; el usuario no puede editarla.
  email       text,
  phone       text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Crea el perfil al registrarse un usuario en Supabase Auth.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
revoke all on function private.sync_user_email() from public;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_user_email();

-- -----------------------------------------------------------------------------
-- Membresías: usuario × organización × rol
-- -----------------------------------------------------------------------------
create table public.memberships (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.membership_role not null,
  status          public.membership_status not null default 'activa',
  location_id     uuid,
  invited_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id),
  foreign key (location_id, organization_id)
    references public.locations (id, organization_id) on delete restrict
);
create index memberships_user_idx on public.memberships (user_id) where status = 'activa';

create trigger memberships_updated_at
  before update on public.memberships
  for each row execute function private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Catálogo global de permisos (lo define el producto, no el cliente)
-- -----------------------------------------------------------------------------
create table public.permissions (
  code        text primary key check (code ~ '^[a-z_]+\.[a-z_]+$'),
  area        text not null,
  description text not null,
  -- Permisos que dan acceso a contenido clínico. Mientras el asesor jurídico
  -- no indique otra cosa, solo el rol optómetra puede tenerlos.
  is_clinical boolean not null default false
);

insert into public.permissions (code, area, description, is_clinical) values
  ('agenda.read',            'Agenda',        'Ver la agenda y las citas', false),
  ('agenda.write',           'Agenda',        'Crear, mover y cancelar citas', false),
  ('patients.read',          'Pacientes',     'Ver la ficha administrativa del paciente', false),
  ('patients.write',         'Pacientes',     'Crear y editar la ficha administrativa', false),
  ('clinical.read',          'Clínica',       'Leer historia clínica y notas de consulta', true),
  ('clinical.write',         'Clínica',       'Registrar, finalizar y adicionar consultas', true),
  ('prescription.write',     'Fórmulas',      'Crear, validar y versionar fórmulas propias', true),
  ('prescription.read',      'Fórmulas',      'Ver los valores de una fórmula validada para venta y laboratorio', false),
  ('prescription.external',  'Fórmulas',      'Registrar una fórmula externa con su procedencia', false),
  ('sales.read',             'Ventas',        'Ver cotizaciones y ventas', false),
  ('sales.manage',           'Ventas',        'Crear cotizaciones y ventas', false),
  ('discount.request',       'Ventas',        'Solicitar descuento por encima del umbral', false),
  ('discount.approve',       'Ventas',        'Aprobar descuentos por encima del umbral', false),
  ('payments.register',      'Pagos',         'Registrar abonos y pagos', false),
  ('payments.reverse',       'Pagos',         'Revertir pagos con motivo', false),
  ('payments.reverse_request','Pagos',        'Solicitar la reversión de un pago', false),
  ('cash.operate',           'Caja',          'Abrir y cerrar su propia caja', false),
  ('cash.read_all',          'Caja',          'Ver todas las cajas y cierres', false),
  ('inventory.read',         'Inventario',    'Ver productos y existencias', false),
  ('inventory.receive',      'Inventario',    'Registrar entradas de mercancía', false),
  ('inventory.adjust',       'Inventario',    'Registrar ajustes de inventario', false),
  ('lab.read',               'Laboratorio',   'Ver órdenes de laboratorio', false),
  ('lab.manage',             'Laboratorio',   'Crear órdenes y cambiar su estado', false),
  ('delivery.manage',        'Entregas',      'Control de calidad y entrega', false),
  ('delivery.handover',      'Entregas',      'Entregar un pedido aprobado', false),
  ('warranty.read',          'Garantías',     'Ver garantías', false),
  ('warranty.manage',        'Garantías',     'Registrar y gestionar garantías', false),
  ('reports.financial',      'Reportes',      'Ver reportes financieros y de ventas', false),
  ('reports.own_cash',       'Reportes',      'Ver el reporte de su propia caja', false),
  ('export.data',            'Exportaciones', 'Exportar datos administrativos y comerciales', false),
  ('export.clinical',        'Exportaciones', 'Exportar datos clínicos', true),
  ('users.manage',           'Usuarios',      'Invitar usuarios y cambiar roles', false),
  ('roles.manage',           'Usuarios',      'Modificar los permisos de cada rol', false),
  ('settings.manage',        'Configuración', 'Editar datos de la óptica, sedes y parámetros', false),
  ('audit.read',             'Auditoría',     'Consultar el registro de auditoría', false),
  ('privacy.manage',         'Privacidad',    'Gestionar consentimientos y solicitudes de titulares', false),
  ('privacy.register',       'Privacidad',    'Registrar solicitudes de titulares', false);

-- -----------------------------------------------------------------------------
-- Permisos por defecto de cada rol (plantilla del producto). Ver matriz en
-- docs/matriz-permisos.md. Se copia a cada organización al crearla.
-- -----------------------------------------------------------------------------
create table private.default_role_permissions (
  role            public.membership_role not null,
  permission_code text not null references public.permissions(code),
  primary key (role, permission_code)
);

insert into private.default_role_permissions (role, permission_code)
select 'propietario'::public.membership_role, code from public.permissions
 where not is_clinical;

insert into private.default_role_permissions (role, permission_code) values
  -- Administrador: operación completa, sin datos clínicos ni gestión de roles.
  ('administrador','agenda.read'), ('administrador','agenda.write'),
  ('administrador','patients.read'), ('administrador','patients.write'),
  ('administrador','prescription.read'),
  ('administrador','sales.read'), ('administrador','sales.manage'),
  ('administrador','discount.approve'),
  ('administrador','payments.register'), ('administrador','payments.reverse'),
  ('administrador','cash.operate'), ('administrador','cash.read_all'),
  ('administrador','inventory.read'), ('administrador','inventory.receive'), ('administrador','inventory.adjust'),
  ('administrador','lab.read'), ('administrador','lab.manage'),
  ('administrador','delivery.manage'), ('administrador','delivery.handover'),
  ('administrador','warranty.read'), ('administrador','warranty.manage'),
  ('administrador','reports.financial'), ('administrador','export.data'),
  ('administrador','users.manage'), ('administrador','settings.manage'),
  ('administrador','audit.read'), ('administrador','privacy.manage'), ('administrador','privacy.register'),
  -- Optómetra: clínica completa; consulta comercial.
  ('optometra','agenda.read'), ('optometra','agenda.write'),
  ('optometra','patients.read'), ('optometra','patients.write'),
  ('optometra','clinical.read'), ('optometra','clinical.write'),
  ('optometra','prescription.write'), ('optometra','prescription.read'), ('optometra','prescription.external'),
  ('optometra','sales.read'), ('optometra','lab.read'),
  ('optometra','delivery.manage'), ('optometra','delivery.handover'),
  ('optometra','warranty.read'), ('optometra','warranty.manage'),
  ('optometra','inventory.read'),
  -- Asistente: recepción, ventas y laboratorio; sin clínica.
  ('asistente','agenda.read'), ('asistente','agenda.write'),
  ('asistente','patients.read'), ('asistente','patients.write'),
  ('asistente','prescription.read'), ('asistente','prescription.external'),
  ('asistente','sales.read'), ('asistente','sales.manage'), ('asistente','discount.request'),
  ('asistente','payments.register'),
  ('asistente','inventory.read'), ('asistente','inventory.receive'),
  ('asistente','lab.read'), ('asistente','lab.manage'),
  ('asistente','delivery.manage'), ('asistente','delivery.handover'),
  ('asistente','warranty.read'), ('asistente','warranty.manage'),
  ('asistente','privacy.register'),
  -- Cajero: caja, pagos y ventas; sin clínica ni configuración.
  ('cajero','agenda.read'),
  ('cajero','patients.read'),
  ('cajero','prescription.read'),
  ('cajero','sales.read'), ('cajero','sales.manage'), ('cajero','discount.request'),
  ('cajero','payments.register'), ('cajero','payments.reverse_request'),
  ('cajero','cash.operate'), ('cajero','reports.own_cash'),
  ('cajero','inventory.read'),
  ('cajero','lab.read'), ('cajero','delivery.handover'),
  ('cajero','warranty.read');

-- Permisos efectivos por organización (personalizables por el propietario).
create table public.role_permissions (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role            public.membership_role not null,
  permission_code text not null references public.permissions(code),
  primary key (organization_id, role, permission_code)
);

-- Barrera estructural: los permisos clínicos solo pueden asignarse al rol
-- optómetra. Cambiar esta regla requiere una migración y validación jurídica.
create or replace function private.guard_clinical_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role <> 'optometra' and exists (
       select 1 from public.permissions p
        where p.code = new.permission_code and p.is_clinical) then
    raise exception 'Los permisos clínicos solo pueden asignarse al rol optómetra'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_clinical_permissions() from public;

create trigger role_permissions_guard_clinical
  before insert or update on public.role_permissions
  for each row execute function private.guard_clinical_permissions();

-- -----------------------------------------------------------------------------
-- Parámetros de la organización
-- -----------------------------------------------------------------------------
create table public.org_settings (
  organization_id          uuid primary key references public.organizations(id) on delete cascade,
  -- Porcentaje de descuento a partir del cual se exige aprobación.
  discount_threshold_pct   numeric(5,2) not null default 10.00
                             check (discount_threshold_pct between 0 and 100),
  -- Rangos clínicos: vacíos hasta que el optómetra asesor los apruebe (Fase C).
  clinical_ranges          jsonb not null default '{}'::jsonb
                             check (jsonb_typeof(clinical_ranges) = 'object'),
  cylinder_convention      text check (cylinder_convention in ('negativo', 'positivo')),
  receipt_footer           text check (receipt_footer is null or char_length(receipt_footer) <= 300),
  updated_at               timestamptz not null default now()
);

create trigger org_settings_updated_at
  before update on public.org_settings
  for each row execute function private.set_updated_at();
