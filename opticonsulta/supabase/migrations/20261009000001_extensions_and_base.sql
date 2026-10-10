-- =============================================================================
-- OptiConsulta · Migración 0001 · Extensiones, esquemas y utilidades base
-- -----------------------------------------------------------------------------
-- Convenciones del proyecto (aplican a todas las migraciones):
--   * Toda tabla de negocio lleva organization_id NOT NULL y RLS activada en la
--     misma migración que la crea.
--   * Las funciones SECURITY DEFINER fijan search_path = '' y usan nombres
--     calificados; nunca confían en un organization_id sin comprobar membresía.
--   * Se revoca EXECUTE a PUBLIC en toda función y se concede solo a quien la
--     necesita. Se revocan privilegios de tabla por defecto a anon.
--   * Fechas en timestamptz (UTC). Importes en numeric, nunca en float.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto  with schema extensions;
create extension if not exists citext    with schema extensions;
create extension if not exists btree_gist with schema extensions;

-- Esquema privado: funciones auxiliares de autorización y tablas internas.
-- No se expone por la API de datos (PostgREST solo publica "public").
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Tipos enumerados estables
-- -----------------------------------------------------------------------------
create type public.membership_role as enum (
  'propietario', 'administrador', 'optometra', 'asistente', 'cajero'
);

create type public.membership_status as enum ('activa', 'suspendida');

-- -----------------------------------------------------------------------------
-- Trigger genérico para updated_at
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public;
