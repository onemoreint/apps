import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

/**
 * Aplica en orden los archivos migrations/NNNN_*.sql que aún no se hayan aplicado.
 * Cada migración corre en su propia transacción. Usa la conexión ADMINISTRATIVA.
 */
export async function migrate(adminUrl: string, log: (m: string) => void = console.log): Promise<string[]> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
    const done: string[] = [];
    for (const f of files) {
      if (applied.has(f)) continue;
      const body = await readFile(join(MIGRATIONS_DIR, f), 'utf8');
      await sql.begin(async (tx) => {
        await tx.unsafe(body);
        await tx`INSERT INTO schema_migrations(name) VALUES (${f})`;
      });
      log(`✔ migración aplicada: ${f}`);
      done.push(f);
    }
    if (done.length === 0) log('Sin migraciones pendientes.');
    return done;
  } finally {
    await sql.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) {
    console.error('Falta DATABASE_ADMIN_URL');
    process.exit(1);
  }
  migrate(url).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
