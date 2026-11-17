-- SOLO PARA PRUEBAS LOCALES: imita lo mínimo de Supabase (roles, auth.users, auth.uid()
-- y privilegios por defecto) para ejecutar las migraciones en un PostgreSQL vacío.
-- No se aplica en Supabase real.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Igual que Supabase: privilegios amplios por defecto; RLS es quien restringe.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
