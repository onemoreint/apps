-- =============================================================================
-- OptiConsulta · Migración 0003 · Funciones de autorización, auditoría,
-- invitaciones y control de intentos de acceso
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones de autorización (SECURITY DEFINER para evitar recursión de RLS).
-- Todas dependen de auth.uid(): el usuario de la sesión, nunca un parámetro.
-- -----------------------------------------------------------------------------
create or replace function private.is_member(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
     where m.organization_id = p_org
       and m.user_id = (select auth.uid())
       and m.status = 'activa'
  );
$$;

create or replace function private.has_permission(p_org uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships m
      join public.role_permissions rp
        on rp.organization_id = m.organization_id and rp.role = m.role
     where m.organization_id = p_org
       and m.user_id = (select auth.uid())
       and m.status = 'activa'
       and rp.permission_code = p_perm
  );
$$;

create or replace function private.member_role(p_org uuid)
returns public.membership_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.memberships m
   where m.organization_id = p_org
     and m.user_id = (select auth.uid())
     and m.status = 'activa';
$$;

-- ¿El usuario de la sesión comparte alguna organización activa con p_user?
create or replace function private.shares_org_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.memberships a
      join public.memberships b on b.organization_id = a.organization_id
     where a.user_id = (select auth.uid()) and a.status = 'activa'
       and b.user_id = p_user
  );
$$;

-- Lanza error 42501 si el usuario no tiene el permiso. Para uso dentro de RPC.
create or replace function private.require_permission(p_org uuid, p_perm text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Sesión requerida' using errcode = '28000';
  end if;
  if not private.has_permission(p_org, p_perm) then
    raise exception 'Permiso denegado: %', p_perm using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.is_member(uuid)                from public;
revoke all on function private.has_permission(uuid, text)     from public;
revoke all on function private.member_role(uuid)              from public;
revoke all on function private.shares_org_with(uuid)          from public;
revoke all on function private.require_permission(uuid, text) from public;
grant execute on function private.is_member(uuid)            to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.member_role(uuid)          to authenticated;
grant execute on function private.shares_org_with(uuid)      to authenticated;

-- -----------------------------------------------------------------------------
-- Auditoría: solo inserción. Nunca guarda contenido clínico ni contraseñas;
-- en cambios de fila registra los NOMBRES de columnas modificadas.
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete restrict,
  actor_id        uuid,
  action          text not null check (char_length(action) between 3 and 80),
  entity          text not null check (char_length(entity) between 2 and 80),
  entity_id       text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create or replace function private.forbid_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs es de solo inserción' using errcode = '42501';
end;
$$;
revoke all on function private.forbid_audit_mutation() from public;

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function private.forbid_audit_mutation();

create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function private.forbid_audit_mutation();

create or replace function private.write_audit(
  p_org uuid, p_action text, p_entity text, p_entity_id text, p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (organization_id, actor_id, action, entity, entity_id, metadata)
  values (p_org, (select auth.uid()), p_action, p_entity, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke all on function private.write_audit(uuid, text, text, text, jsonb) from public;

-- Trigger de auditoría genérico para tablas con organization_id.
-- Registra la acción y los nombres de columnas cambiadas, no sus valores.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_new, v_old);
  v_changed text[];
  v_org uuid;
begin
  v_org := coalesce(
    (v_row ->> 'organization_id')::uuid,
    case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid end
  );
  if tg_op = 'UPDATE' then
    select array_agg(key order by key) into v_changed
      from jsonb_each(v_new) n
     where n.value is distinct from v_old -> n.key
       and n.key not in ('updated_at');
    if v_changed is null then
      return new;
    end if;
  end if;
  insert into public.audit_logs (organization_id, actor_id, action, entity, entity_id, metadata)
  values (
    v_org,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'organization_id'),
    case when v_changed is not null then jsonb_build_object('changed', to_jsonb(v_changed))
         else '{}'::jsonb end
  );
  return coalesce(new, old);
end;
$$;
revoke all on function private.audit_row_change() from public;

create trigger organizations_audit after update on public.organizations
  for each row execute function private.audit_row_change();
create trigger locations_audit after insert or update on public.locations
  for each row execute function private.audit_row_change();
create trigger memberships_audit after insert or update or delete on public.memberships
  for each row execute function private.audit_row_change();
create trigger role_permissions_audit after insert or delete on public.role_permissions
  for each row execute function private.audit_row_change();
create trigger org_settings_audit after update on public.org_settings
  for each row execute function private.audit_row_change();

-- -----------------------------------------------------------------------------
-- Invitaciones: el token se entrega una sola vez; se guarda solo su hash.
-- -----------------------------------------------------------------------------
create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           extensions.citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role            public.membership_role not null,
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  accepted_at     timestamptz,
  revoked_at      timestamptz,
  invited_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index invitations_org_idx on public.invitations (organization_id);
create unique index invitations_one_pending
  on public.invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

-- -----------------------------------------------------------------------------
-- Intentos de acceso fallidos (bloqueo temporal por correo).
-- El correo se guarda como hash SHA-256; nunca en claro.
-- -----------------------------------------------------------------------------
create table private.login_failures (
  id          bigint generated always as identity primary key,
  email_hash  text not null,
  created_at  timestamptz not null default now()
);
create index login_failures_email_idx on private.login_failures (email_hash, created_at desc);
revoke all on table private.login_failures from public, authenticated;
