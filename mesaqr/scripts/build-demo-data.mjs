#!/usr/bin/env node
/**
 * Genera public/demo-data/menu.json para el MODO DEMOSTRACIÓN (sin Supabase):
 * ejecuta las migraciones y el seed reales en Postgres en memoria y guarda el
 * resultado de get_menu. Los tokens de mesa son fijos ("mesa07demo") para que
 * los QR impresos de la demo no cambien entre compilaciones.
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
await db.exec(`update public.dining_tables set qr_token = 'mesa' || lpad(number::text, 2, '0') || 'demo'`);
if (process.env.DEMO_WHATSAPP) await db.query('update public.businesses set whatsapp = $1', [process.env.DEMO_WHATSAPP]);
if (process.env.DEMO_RATE) await db.query('update public.businesses set exchange_rate = $1', [Number(process.env.DEMO_RATE)]);

const tables = (await db.query('select qr_token as token, number, label from public.dining_tables where active order by number')).rows;
const { menu } = (await db.query('select public.get_menu($1) as menu', [tables[0].token])).rows[0];
delete menu.table;

mkdirSync(join(root, 'public/demo-data'), { recursive: true });
writeFileSync(join(root, 'public/demo-data/menu.json'), JSON.stringify({ menu, tables }));
console.log(`demo-data/menu.json: ${menu.products.length} productos, ${tables.length} mesas, WhatsApp ${menu.business.whatsapp}`);
