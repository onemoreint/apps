// Prepara una base PostgreSQL DESECHABLE para las pruebas de integración:
// la borra, la recrea, aplica el shim de Supabase y todas las migraciones en orden.
// Uso: TEST_DATABASE_URL=postgres://... node scripts/prepare-test-db.mjs
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = new URL(
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_test",
);
const dbName = url.pathname.replace(/^\//, "");

if (!/_test$/.test(dbName)) {
  // Salvaguarda: nunca borrar una base cuyo nombre no termine en _test.
  console.error(`Se rechaza preparar "${dbName}": el nombre debe terminar en _test.`);
  process.exit(1);
}

export function prepareTestDatabase() {
  return prepareDatabase(url.toString());
}

/** Igual que prepareTestDatabase, para otra base desechable (nombre terminado en _test). */
export async function prepareDatabase(target) {
  const url = new URL(target);
  const dbName = url.pathname.replace(/^\//, "");
  if (!/_test$/.test(dbName)) throw new Error(`Se rechaza preparar "${dbName}": el nombre debe terminar en _test.`);
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`drop database if exists "${dbName}" with (force)`);
  await admin.query(`create database "${dbName}"`);
  await admin.end();

  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(readFileSync(path.join(root, "supabase/tests/supabase-shim.sql"), "utf8"));
    const dir = path.join(root, "supabase/migrations");
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      try {
        await client.query(readFileSync(path.join(dir, file), "utf8"));
      } catch (error) {
        throw new Error(`Falló la migración ${file}: ${error.message}`);
      }
    }
    return files;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareTestDatabase()
    .then((files) => console.log(`Base ${dbName} lista: ${files.length} migraciones aplicadas.`))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
