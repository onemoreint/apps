#!/usr/bin/env node
/**
 * Genera public/demo-data/menu.json para el MODO DEMOSTRACIÓN (sin Supabase):
 * ejecuta las migraciones y el seed reales en Postgres en memoria y guarda el
 * resultado de get_public_menu (el menú del enlace único).
 *
 *   DEMO_WHATSAPP=+58412XXXXXXX node scripts/build-demo-data.mjs
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
`);
for (const f of readdirSync(join(root, 'supabase/migrations')).sort()) {
  if (!f.includes('storage')) await db.exec(readFileSync(join(root, 'supabase/migrations', f), 'utf8'));
}
await db.exec(readFileSync(join(root, 'supabase/seed.sql'), 'utf8'));
if (process.env.DEMO_WHATSAPP) await db.query('update public.businesses set whatsapp = $1', [process.env.DEMO_WHATSAPP]);
if (process.env.DEMO_RATE) await db.query('update public.businesses set exchange_rate = $1', [Number(process.env.DEMO_RATE)]);

const slug = process.env.VITE_BUSINESS_SLUG || 'lorenz-express';
const { menu } = (await db.query('select public.get_public_menu($1) as menu', [slug])).rows[0];

mkdirSync(join(root, 'public/demo-data'), { recursive: true });
writeFileSync(join(root, 'public/demo-data/menu.json'), JSON.stringify(menu));
console.log(`demo-data/menu.json: ${menu.products.length} productos, WhatsApp ${menu.business.whatsapp}`);
