-- =====================================================================
-- INDICADORES PRO · Migración base (Fase 1)
-- Organizaciones, perfiles, membresías, roles, configuración y auditoría.
-- Aislamiento por organización con Row Level Security en TODAS las tablas.
-- =====================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13; no requiere extensiones.

-- ---------- Tipos ----------
create type public.app_role as enum ('admin', 'quality_manager', 'indicator_owner', 'analyst', 'reader');
create type public.membership_status as enum ('active', 'invited', 'disabled');

-- ---------- Utilidades ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- Perfiles (1:1 con auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  locale text not null default 'es' check (locale in ('es', 'en')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- SUPERADMIN de plataforma (no es un rol de organización).
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------- Organizaciones ----------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  nit text,
  address text,
  phone text,
  email text,
  country text,
  city text,
  sector text,
  responsible text,
  logo_url text,
  logo_secondary_url text,
  primary_color text not null default '#2563EB' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#0F172A' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  is_demo boolean not null default false,
  health_mode boolean not null default false,
  onboarding_step smallint not null default 1 check (onboarding_step between 0 and 6),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create trigger organizations_touch before update on public.organizations
  for each row execute function public.touch_updated_at();

-- ---------- Membresías (usuario ↔ organización, con rol) ----------
create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'reader',
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_touch before update on public.memberships
  for each row execute function public.touch_updated_at();

-- ---------- Configuración por organización ----------
create table public.org_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  currency text not null default 'COP',
  locale text not null default 'es' check (locale in ('es', 'en')),
  timezone text not null default 'America/Bogota',
  date_format text not null default 'dd/MM/yyyy' check (date_format in ('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')),
  decimal_separator text not null default ',' check (decimal_separator in (',', '.')),
  percent_decimals smallint not null default 2 check (percent_decimals between 0 and 6),
  updated_at timestamptz not null default now()
);
create trigger org_settings_touch before update on public.org_settings
  for each row execute function public.touch_updated_at();

-- ---------- Auditoría ----------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_idx on public.audit_logs (organization_id, created_at desc);

-- =====================================================================
-- Funciones de seguridad (SECURITY DEFINER + search_path fijo)
-- =====================================================================

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create or replace function public.member_role(p_org uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.memberships
  where organization_id = p_org and user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.member_role(p_org) is not null;
$$;

-- Misma matriz que src/lib/permissions.ts. Si cambia una, cambia la otra (hay prueba que las compara).
create or replace function public.has_permission(p_org uuid, p_permission text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  r public.app_role := public.member_role(p_org);
begin
  if r is null then return false; end if;
  return case p_permission
    when 'dashboard.view' then true
    when 'indicator.view' then true
    when 'plan.view' then true
    when 'alert.view' then true
    when 'indicator.edit' then r in ('admin', 'quality_manager')
    when 'result.record' then r in ('admin', 'quality_manager', 'indicator_owner')
    when 'period.close' then r in ('admin', 'quality_manager')
    when 'period.reopen' then r = 'admin'
    when 'plan.edit' then r in ('admin', 'quality_manager')
    when 'plan.progress' then r in ('admin', 'quality_manager', 'indicator_owner')
    when 'report.export' then r in ('admin', 'quality_manager', 'indicator_owner', 'analyst')
    when 'process.manage' then r = 'admin'
    when 'catalog.manage' then r = 'admin'
    when 'user.manage' then r = 'admin'
    when 'org.manage' then r = 'admin'
    when 'settings.manage' then r = 'admin'
    when 'audit.view' then r = 'admin'
    else false
  end;
end $$;

-- Crea organización + membresía admin + configuración en una sola transacción.
create or replace function public.create_organization(
  p_name text,
  p_nit text default null,
  p_country text default null,
  p_city text default null,
  p_sector text default null,
  p_primary_color text default null,
  p_secondary_color text default null
) returns public.organizations
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  org public.organizations;
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  insert into public.organizations (name, nit, country, city, sector, primary_color, secondary_color, created_by)
  values (
    btrim(p_name), nullif(btrim(p_nit), ''), nullif(btrim(p_country), ''), nullif(btrim(p_city), ''),
    nullif(btrim(p_sector), ''), coalesce(p_primary_color, '#2563EB'), coalesce(p_secondary_color, '#0F172A'), uid
  )
  returning * into org;
  insert into public.memberships (organization_id, user_id, role, status) values (org.id, uid, 'admin', 'active');
  insert into public.org_settings (organization_id) values (org.id);
  return org;
end $$;

-- Perfil automático al registrarse en Supabase Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auditoría genérica: guarda antes y después de cada cambio.
create or replace function public.audit_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := to_jsonb(coalesce(new, old));
  org uuid := coalesce((rec ->> 'organization_id')::uuid, case when tg_table_name = 'organizations' then (rec ->> 'id')::uuid end);
begin
  insert into public.audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
  values (
    org, auth.uid(), lower(tg_op), tg_table_name,
    coalesce(rec ->> 'id', rec ->> 'organization_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger organizations_audit after insert or update or delete on public.organizations
  for each row execute function public.audit_row();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function public.audit_row();
create trigger org_settings_audit after update on public.org_settings
  for each row execute function public.audit_row();

-- Evita que un administrador se quite a sí mismo el último rol admin (organización huérfana).
create or replace function public.keep_one_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active')
     and old.role = 'admin' and old.status = 'active'
     and not exists (
       select 1 from public.memberships
       where organization_id = old.organization_id and user_id <> old.user_id
         and role = 'admin' and status = 'active'
     )
     and exists (select 1 from public.organizations where id = old.organization_id) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;

create trigger memberships_keep_admin before update or delete on public.memberships
  for each row execute function public.keep_one_admin();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.org_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Perfiles: el propio, o los de compañeros de alguna organización en común.
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.memberships mine
    join public.memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = auth.uid() and mine.status = 'active' and theirs.user_id = profiles.id
  )
);
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy platform_admins_select on public.platform_admins for select using (user_id = auth.uid());

-- Organizaciones: se ven si eres miembro; se editan con org.manage. Se crean solo vía create_organization().
create policy organizations_select on public.organizations for select
  using (public.is_member(id) or public.is_platform_admin());
create policy organizations_update on public.organizations for update
  using (public.has_permission(id, 'org.manage'))
  with check (public.has_permission(id, 'org.manage'));

-- Membresías: se ven las de tus organizaciones; las gestiona user.manage.
create policy memberships_select on public.memberships for select
  using (user_id = auth.uid() or public.is_member(organization_id));
create policy memberships_insert on public.memberships for insert
  with check (public.has_permission(organization_id, 'user.manage'));
create policy memberships_update on public.memberships for update
  using (public.has_permission(organization_id, 'user.manage'))
  with check (public.has_permission(organization_id, 'user.manage'));
create policy memberships_delete on public.memberships for delete
  using (public.has_permission(organization_id, 'user.manage'));

create policy org_settings_select on public.org_settings for select using (public.is_member(organization_id));
create policy org_settings_update on public.org_settings for update
  using (public.has_permission(organization_id, 'settings.manage'))
  with check (public.has_permission(organization_id, 'settings.manage'));

-- Auditoría: solo lectura para quien tiene audit.view. Nadie escribe directamente (solo triggers).
create policy audit_logs_select on public.audit_logs for select
  using (public.has_permission(organization_id, 'audit.view'));

-- Permisos de ejecución
revoke all on function public.create_organization(text, text, text, text, text, text, text) from public;
grant execute on function public.create_organization(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.has_permission(uuid, text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
