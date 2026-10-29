/**
 * Genera public/demo/catalogo.json a partir de las migraciones y del seed, usando
 * PostgreSQL en memoria. Es el catálogo que usa la app en modo demostración
 * (sin Supabase configurado), idéntico al que devolvería el servidor.
 *
 *   node --experimental-strip-types scripts/build-demo-data.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createDb } from '../supabase/tests/harness.ts';

const db = await createDb();
const r = await db.query<{ c: unknown }>(`select public.dp_tienda_publica('dulce-pedido-demo') as c`);
const dir = join(import.meta.dirname, '..', 'public', 'demo');
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'catalogo.json'), JSON.stringify(r.rows[0]!.c, null, 2) + '\n');
console.log('public/demo/catalogo.json actualizado');
await db.close();
