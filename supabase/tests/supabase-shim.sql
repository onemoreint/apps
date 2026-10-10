-- =============================================================================
-- Shim de Supabase para pruebas en PostgreSQL plano (NO se aplica en Supabase).
-- -----------------------------------------------------------------------------
-- Reproduce lo que las migraciones esperan de una base Supabase:
--   * roles anon, authenticated y service_role (este último con BYPASSRLS);
--   * esquema auth con auth.users y auth.uid() leyendo request.jwt.claims,
--     igual que la implementación de Supabase;
--   * los privilegios POR DEFECTO que Supabase concede en el esquema public a
--     anon y authenticated. Esto es clave: si no se replicaran, las pruebas
--     pasarían por falta de GRANT y no por las políticas RLS.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique,
  email_confirmed_at  timestamptz,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now()
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text;
$$;

grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

-- Supabase crea el esquema extensions y concede USAGE a los roles de la API
-- (PostgREST lo necesita para resolver tipos como citext).
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

-- Privilegios por defecto equivalentes a los de un proyecto Supabase.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
