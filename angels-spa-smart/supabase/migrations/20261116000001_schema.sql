-- =====================================================================
-- Angels Spa Smart · Esquema base (multiempresa desde el día uno)
-- Todas las tablas de negocio llevan business_id. Las FK compuestas
-- (business_id, id) impiden mezclar registros de empresas distintas.
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- ---------- Tipos ----------
create type public.appointment_status as enum ('pendiente', 'confirmada', 'completada', 'cancelada', 'no_asistio');
create type public.member_role as enum ('owner', 'admin', 'staff');
create type public.payment_kind as enum ('anticipo', 'abono', 'pago_total');
create type public.loyalty_kind as enum ('acumulacion', 'redencion', 'reversion', 'ajuste');
create type public.consent_purpose as enum ('tratamiento_datos', 'marketing', 'cumpleanos');
create type public.block_kind as enum ('bloqueo', 'descanso');

-- ---------- Utilidades ----------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Normaliza celulares colombianos a E.164 sin '+'. Devuelve null si es inválido.
create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 10 and (d like '3%' or d like '60%') then return '57' || d; end if;
  if length(d) = 12 and (d like '573%' or d like '5760%') then return d; end if;
  if btrim(p) like '+%' and d not like '57%' and length(d) between 8 and 15 then return d; end if;
  return null;
end $$;

-- ---------- Empresas y perfiles ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  timezone text not null default 'America/Bogota',
  address text,
  whatsapp text,
  instagram text,
  welcome text,
  -- reglas de reserva y fidelización configurables
  settings jsonb not null default jsonb_build_object(
    'slot_step_min', 30, 'min_lead_min', 60, 'max_days_ahead', 45,
    'max_requests_per_phone_per_day', 3, 'max_requests_per_business_per_hour', 40,
    'payment_methods', jsonb_build_array('Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'),
    'loyalty', jsonb_build_object('enabled', true, 'points_per_visit', 10, 'rewards', '[]'::jsonb)
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un usuario de Supabase Auth pertenece a un negocio con un rol.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text,
  role public.member_role not null default 'staff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_business_idx on public.profiles (business_id);

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  name text not null check (length(name) between 2 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  description text not null default '' check (length(description) <= 300),
  duration_min int not null check (duration_min between 15 and 480),
  price numeric(12, 0) check (price is null or price >= 0), -- null = por confirmar
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id)
);
create index services_business_idx on public.services (business_id, active, sort_order);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (length(name) between 2 and 80),
  phone text not null check (length(phone) between 8 and 20),
  birthday text check (birthday is null or birthday ~ '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$'),
  preferences text not null default '' check (length(preferences) <= 500),
  notes text not null default '' check (length(notes) <= 2000),
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  unique (business_id, phone) -- sin duplicados por teléfono normalizado
);
create index clients_name_idx on public.clients (business_id, lower(name));

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  service_id uuid not null,
  staff_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'pendiente',
  price numeric(12, 0) check (price is null or price >= 0),
  client_notes text not null default '' check (length(client_notes) <= 500),
  internal_notes text not null default '' check (length(internal_notes) <= 2000),
  source text not null default 'admin' check (source in ('publico', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (business_id, id),
  foreign key (business_id, client_id) references public.clients (business_id, id),
  foreign key (business_id, service_id) references public.services (business_id, id),
  foreign key (business_id, staff_id) references public.staff (business_id, id),
  -- Garantía atómica contra solapamientos: dos citas activas de la misma
  -- profesional nunca pueden cruzarse, aunque lleguen al mismo tiempo.
  constraint appointments_no_overlap exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pendiente', 'confirmada', 'completada'))
);
create index appointments_day_idx on public.appointments (business_id, starts_at);
create index appointments_client_idx on public.appointments (business_id, client_id, starts_at desc);
create index appointments_status_idx on public.appointments (business_id, status);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = domingo
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade
);
create index availability_staff_idx on public.availability_rules (business_id, staff_id, weekday);

create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid, -- null = todo el salón
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind public.block_kind not null default 'bloqueo',
  reason text not null default '' check (length(reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (business_id, staff_id) references public.staff (business_id, id) on delete cascade
);
create index schedule_blocks_idx on public.schedule_blocks (business_id, starts_at);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  appointment_id uuid,
  client_id uuid not null,
  amount numeric(12, 0) not null check (amount > 0),
  kind public.payment_kind not null,
  method text not null check (length(method) between 2 and 30),
  paid_on date not null,
  note text not null default '' check (length(note) <= 300),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (business_id, client_id) references public.clients (business_id, id),
  foreign key (business_id, appointment_id) references public.appointments (business_id, id)
);
create index payments_day_idx on public.payments (business_id, paid_on);
create index payments_appt_idx on public.payments (appointment_id);

create table public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  appointment_id uuid,
  points int not null check (points <> 0),
  kind public.loyalty_kind not null,
  description text not null default '',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (business_id, client_id) references public.clients (business_id, id),
  foreign key (business_id, appointment_id) references public.appointments (business_id, id)
);
create index loyalty_client_idx on public.loyalty_transactions (business_id, client_id);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (length(title) between 2 and 60),
  description text not null default '' check (length(description) <= 300),
  valid_from date not null,
  valid_to date not null,
  active boolean not null default true,
  service_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to >= valid_from),
  foreign key (business_id, service_id) references public.services (business_id, id)
);
create index promotions_active_idx on public.promotions (business_id, active, valid_to);

create table public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title text not null check (length(title) between 1 and 50),
  category text not null default 'Diseños',
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registro inmutable de autorizaciones (Ley 1581 de 2012): cada cambio es una fila nueva.
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  client_id uuid not null,
  purpose public.consent_purpose not null,
  granted boolean not null,
  source text not null check (source in ('reserva_publica', 'panel', 'solicitud_titular')),
  policy_version text not null default 'v1',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (business_id, client_id) references public.clients (business_id, id) on delete cascade
);
create index consent_client_idx on public.consent_records (business_id, client_id, purpose, created_at desc);

-- Vista con el estado vigente de cada autorización
create view public.client_consents with (security_invoker = true) as
select distinct on (business_id, client_id, purpose) business_id, client_id, purpose, granted, created_at
from public.consent_records
order by business_id, client_id, purpose, created_at desc;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_business_idx on public.audit_logs (business_id, created_at desc);

-- Registro de solicitudes públicas para limitar abuso (rate limiting).
create table public.booking_requests_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  phone text,
  accepted boolean not null,
  reason text,
  created_at timestamptz not null default now()
);
create index booking_requests_idx on public.booking_requests_log (business_id, phone, created_at desc);
create index booking_requests_recent_idx on public.booking_requests_log (business_id, created_at desc);

-- ---------- updated_at ----------
do $$
declare t text;
begin
  foreach t in array array['businesses','profiles','staff','services','clients','appointments','availability_rules','schedule_blocks','payments','promotions','gallery_items'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;
