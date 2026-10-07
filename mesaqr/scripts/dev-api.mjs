#!/usr/bin/env node
/**
 * API local para probar el MENÚ PÚBLICO sin crear un proyecto en Supabase.
 * Ejecuta las migraciones y el seed reales sobre Postgres en memoria (PGlite)
 * y responde como PostgREST en /rest/v1/rpc/get_menu y /rest/v1/rpc/create_order.
 *
 * Uso:  npm run dev:api   (y en otra terminal: npm run dev)
 * .env.local:  VITE_SUPABASE_URL=http://127.0.0.1:54321  VITE_SUPABASE_ANON_KEY=dev
 *
 * No incluye Auth: el panel admin necesita un proyecto Supabase real.
 */
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase');
const PORT = Number(process.env.PORT ?? 54321);

const db = new PGlite();
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
`);
const migrations = join(root, 'migrations');
for (const f of readdirSync(migrations).sort()) {
  if (f.includes('storage')) continue; // Storage no existe en local
  await db.exec(readFileSync(join(migrations, f), 'utf8'));
}
await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
if (process.env.WHATSAPP) await db.query('update public.businesses set whatsapp = $1', [process.env.WHATSAPP]);

const RPC = {
  get_menu: { sql: 'select public.get_menu($1) as r', args: (b) => [b.p_token] },
  create_order: { sql: 'select public.create_order($1, $2::jsonb, $3) as r', args: (b) => [b.p_token, JSON.stringify(b.p_items), b.p_notes ?? null] },
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  const fn = /^\/rest\/v1\/rpc\/(\w+)$/.exec(req.url ?? '')?.[1];
  const rpc = fn && RPC[fn];
  if (req.method !== 'POST' || !rpc) return res.writeHead(404, cors).end();
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const parsed = JSON.parse(body || '{}');
    const out = await db.transaction(async (tx) => {
      await tx.exec('set local role anon');
      return (await tx.query(rpc.sql, rpc.args(parsed))).rows[0].r;
    });
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }).end(JSON.stringify(out));
  } catch (e) {
    res
      .writeHead(400, { ...cors, 'Content-Type': 'application/json' })
      .end(JSON.stringify({ code: e.code ?? 'P0001', message: e.message, details: e.detail ?? null, hint: null }));
  }
}).listen(PORT, '127.0.0.1', async () => {
  const { rows } = await db.query('select number, qr_token from public.dining_tables order by number');
  console.log(`API local lista en http://127.0.0.1:${PORT}`);
  console.log('Mesas demo (abre en el navegador):');
  for (const t of rows) console.log(`  Mesa ${String(t.number).padStart(2)}: http://localhost:5173/menu?mesa=${t.qr_token}`);
});
