/**
 * Postgres real en memoria (PGlite) con lo mínimo de Supabase simulado
 * (roles anon/authenticated, auth.users, auth.uid(), storage) para probar
 * migraciones, RLS y funciones sin depender de un proyecto en la nube.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(),
    bucket_id text, name text);
  alter table storage.objects enable row level security;
`;

export async function createDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = join(root, 'migrations');
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
  return db;
}

type Role = 'anon' | 'authenticated';

/** Ejecuta una consulta como lo haría Supabase para ese rol/usuario. */
export async function as<T = Record<string, unknown>>(
  db: PGlite,
  role: Role,
  sql: string,
  params: unknown[] = [],
  userId?: string,
): Promise<T[]> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    await tx.exec(`set local role ${role}`);
    const res = await tx.query<T>(sql, params);
    return res.rows;
  });
}

export async function errorOf(p: Promise<unknown>): Promise<{ message: string; detail?: string }> {
  try {
    await p;
  } catch (e) {
    const err = e as { message: string; detail?: string };
    return { message: err.message, detail: err.detail };
  }
  throw new Error('Se esperaba un error');
}
