// Respaldo lógico y restauración verificada de OptiConsulta (criterio 14).
//
// Respaldo: pg_dump de SOLO DATOS de los esquemas public y private más las
// cuentas (auth.users y auth.identities si existe), con un manifiesto que
// guarda el número de filas por tabla, las comprobaciones de integridad y la
// huella SHA-256 del archivo.
//
// Restauración: sobre una base con las MISMAS migraciones ya aplicadas y sin
// datos de negocio. Se ejecuta en una sola transacción con los disparadores en
// modo réplica (para no re-aplicar movimientos de inventario ni auditoría) y al
// final se comparan filas e integridad con el manifiesto. Si algo no coincide,
// se informa el fallo; la transacción ya confirmada no se deshace sola, por eso
// se restaura en una base nueva y se cambia la conexión solo tras verificar.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import pg from "pg";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTH_TABLES = ["auth.users", "auth.identities"];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

/** Huella de las migraciones: la base destino debe tener exactamente estas. */
export function migrationsFingerprint() {
  const dir = path.join(root, "supabase/migrations");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ file: f, sha256: sha256(readFileSync(path.join(dir, f))) }));
}

async function withClient(url, fn) {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function authTables(client) {
  const r = await client.query(
    "select format('%I.%I', table_schema, table_name) as t from information_schema.tables where table_schema = 'auth' and table_name = any($1)",
    [AUTH_TABLES.map((t) => t.split(".")[1])],
  );
  return r.rows.map((x) => x.t).sort();
}

/** Filas por tabla de public, private y las tablas de cuentas. */
export async function tableCounts(client) {
  const r = await client.query(
    `select format('%I.%I', table_schema, table_name) as t from information_schema.tables
      where table_type = 'BASE TABLE' and table_schema in ('public', 'private') order by 1`,
  );
  const tables = [...r.rows.map((x) => x.t), ...(await authTables(client))];
  const counts = {};
  for (const t of tables) counts[t] = Number((await client.query(`select count(*)::bigint as n from ${t}`)).rows[0].n);
  return counts;
}

/**
 * Comprobaciones de integridad. Todas deben ser 0:
 *  - consultas finalizadas cuyo contenido ya no coincide con su huella SHA-256;
 *  - fórmulas validadas o reemplazadas cuyo contenido no coincide con su huella;
 *  - existencias que no cuadran con la suma de movimientos de inventario.
 */
export async function integrityChecks(client) {
  const q = async (sql) => Number((await client.query(sql)).rows[0].n);
  return {
    encounters_hash_mismatch: await q(
      `select count(*) as n from public.clinical_encounters
        where status = 'finalizada' and content_hash is distinct from private.sha256_json(private.encounter_document(id))`,
    ),
    prescriptions_hash_mismatch: await q(
      `select count(*) as n from public.prescriptions
        where status in ('validada', 'reemplazada') and content_hash is distinct from private.sha256_json(private.prescription_document(id))`,
    ),
    stock_mismatch: await q(
      `select count(*) as n from public.inventory_stock s
        where s.quantity <> coalesce((
          select sum(case when m.movement_type in ('entrada', 'devolucion_venta', 'ajuste_positivo') then m.quantity else -m.quantity end)
            from public.inventory_movements m where m.product_id = s.product_id and m.location_id = s.location_id), 0)`,
    ),
  };
}

export async function backupDatabase(sourceUrl, outDir) {
  mkdirSync(outDir, { recursive: true });
  const { counts, integrity, otherAuth } = await withClient(sourceUrl, async (c) => {
    const keep = await authTables(c);
    const all = await c.query("select format('%I.%I', table_schema, table_name) as t from information_schema.tables where table_schema = 'auth' and table_type = 'BASE TABLE'");
    return {
      counts: await tableCounts(c),
      integrity: await integrityChecks(c),
      // Del esquema auth solo se respaldan las cuentas; sesiones y tokens no.
      otherAuth: all.rows.map((r) => r.t).filter((t) => !keep.includes(t)),
    };
  });
  const bad = Object.entries(integrity).filter(([, n]) => n > 0);
  if (bad.length) throw new Error(`La base de origen no pasa la verificación de integridad: ${JSON.stringify(Object.fromEntries(bad))}`);

  const dumpFile = path.join(outDir, "datos.dump");
  await run("pg_dump", [
    "--format=custom", "--data-only", "--no-owner", "--no-privileges",
    "--schema=public", "--schema=private", "--schema=auth", ...otherAuth.flatMap((t) => ["--exclude-table", t]),
    "--file", dumpFile, "--dbname", sourceUrl,
  ], { maxBuffer: 64 * 1024 * 1024 });

  const manifest = {
    app: "OptiConsulta",
    created_at: new Date().toISOString(),
    pg_dump: (await run("pg_dump", ["--version"])).stdout.trim(),
    migrations: migrationsFingerprint(),
    counts,
    integrity,
    dump: { file: "datos.dump", sha256: sha256(readFileSync(dumpFile)) },
  };
  writeFileSync(path.join(outDir, "manifiesto.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

export async function restoreDatabase(targetUrl, backupDir) {
  const manifest = JSON.parse(readFileSync(path.join(backupDir, "manifiesto.json"), "utf8"));
  const dumpFile = path.join(backupDir, manifest.dump.file);
  if (sha256(readFileSync(dumpFile)) !== manifest.dump.sha256) {
    throw new Error("El archivo de respaldo está dañado o fue modificado (la huella SHA-256 no coincide).");
  }
  const current = migrationsFingerprint();
  if (JSON.stringify(current) !== JSON.stringify(manifest.migrations)) {
    throw new Error("Las migraciones de esta versión no son las del respaldo. Restaura con la versión de la aplicación que lo generó.");
  }

  const tables = await withClient(targetUrl, async (c) => {
    const orgs = Number((await c.query("select count(*) as n from public.organizations")).rows[0].n);
    const auth = await authTables(c);
    const users = Number((await c.query("select count(*) as n from auth.users")).rows[0].n);
    if (orgs > 0 || users > 0) throw new Error("La base destino ya tiene datos. Restaura en una base nueva con las migraciones aplicadas.");
    const missing = Object.keys(manifest.counts).filter((t) => t.startsWith("auth.") && !auth.includes(t));
    if (missing.length) throw new Error(`Faltan tablas de cuentas en el destino: ${missing.join(", ")}`);
    return Object.keys(manifest.counts).filter((t) => !t.startsWith("auth."));
  });

  // Los datos sembrados por las migraciones (permisos, catálogos) vienen en el respaldo.
  // El SQL intermedio contiene datos personales: va a una carpeta temporal privada y se borra.
  const tmp = mkdtempSync(path.join(tmpdir(), "opticonsulta-restore-"));
  const sqlFile = path.join(tmp, "datos.sql");
  try {
    await run("pg_restore", ["--data-only", "--no-owner", "--no-privileges", "--file", sqlFile, dumpFile], { maxBuffer: 64 * 1024 * 1024 });
    await run("psql", [
      "--no-psqlrc", "--quiet", "--single-transaction", "--set", "ON_ERROR_STOP=1",
      "--command", "set session_replication_role = replica",
      "--command", `truncate ${tables.join(", ")} cascade`,
      "--file", sqlFile,
      "--dbname", targetUrl,
    ], { maxBuffer: 64 * 1024 * 1024 });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  return withClient(targetUrl, async (c) => {
    const counts = await tableCounts(c);
    const integrity = await integrityChecks(c);
    const countDiffs = Object.keys(manifest.counts)
      .filter((t) => counts[t] !== manifest.counts[t])
      .map((t) => ({ table: t, expected: manifest.counts[t], actual: counts[t] ?? null }));
    const integrityFailures = Object.entries(integrity).filter(([, n]) => n > 0).map(([check, n]) => ({ check, n }));
    return { ok: countDiffs.length === 0 && integrityFailures.length === 0, countDiffs, integrityFailures, counts, integrity };
  });
}
