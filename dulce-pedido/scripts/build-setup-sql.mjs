#!/usr/bin/env node
/**
 * Une todas las migraciones (y opcionalmente la tienda de demostración) en un solo
 * archivo supabase/setup.sql para pegarlo en el editor SQL de un proyecto nuevo.
 *
 *   npm run db:setup            → migraciones + tienda demo
 *   npm run db:setup -- --sin-demo
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(import.meta.dirname, '..', 'supabase');
const partes = readdirSync(join(raiz, 'migrations'))
  .sort()
  .map((f) => `-- >>> ${f}\n${readFileSync(join(raiz, 'migrations', f), 'utf8')}`);
if (!process.argv.includes('--sin-demo')) partes.push(`-- >>> seed.sql\n${readFileSync(join(raiz, 'seed.sql'), 'utf8')}`);
const encabezado = `-- DULCE PEDIDO — instalación completa. Generado por scripts/build-setup-sql.mjs; no editar a mano.\n-- Pegar en Supabase → SQL Editor → Run, en un proyecto donde aún no existan las tablas dp_*.\n\n`;
writeFileSync(join(raiz, 'setup.sql'), encabezado + partes.join('\n\n'));
console.log('supabase/setup.sql generado');
