// Importa una tabla de referencia oficial (SISPRO, CIE-10, CUPS…) a public.ref_codes.
//
// Uso:
//   DATABASE_URL=postgres://... node scripts/import-ref-codes.mjs \
//     --catalog cie10 --file CIE10.csv --source "SISPRO CIE10 descargada 2026-10-09" \
//     [--delimiter ";"] [--code-column 0] [--label-column 1] [--no-header] [--dry-run]
//
// DATABASE_URL es la conexión directa del proyecto (rol postgres). Es una tarea
// administrativa: no se ejecuta desde la aplicación.
// Los códigos del catálogo que no vienen en el archivo se DESACTIVAN (no se borran:
// pueden estar referenciados en registros clínicos existentes).
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import pg from "pg";
import { parseCsv, toRefCodes } from "./ref-codes-csv.mjs";

const CATALOGS = new Set([
  "tipo_documento", "sexo_biologico", "identidad_genero", "etnia", "categoria_discapacidad", "pais",
  "municipio", "zona_territorial", "ocupacion", "eapb", "via_ingreso", "causa_atencion",
  "condicion_destino", "cie10", "cups",
]);

const { values } = parseArgs({
  options: {
    catalog: { type: "string" },
    file: { type: "string" },
    source: { type: "string" },
    delimiter: { type: "string", default: ";" },
    "code-column": { type: "string", default: "0" },
    "label-column": { type: "string", default: "1" },
    "no-header": { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
  },
});

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!values.catalog || !CATALOGS.has(values.catalog)) {
  fail(`--catalog debe ser uno de: ${[...CATALOGS].join(", ")}. Los catálogos de la Res. 866 ya vienen en las migraciones.`);
}
if (!values.file) fail("Falta --file con la ruta del CSV oficial.");
if (!values.source || values.source.length < 8) fail('Falta --source describiendo el origen y la fecha, por ejemplo "SISPRO CIE10 2026-10-09".');

const rows = parseCsv(readFileSync(values.file, "utf8"), values.delimiter);
const { codes, rejected } = toRefCodes(rows, {
  codeColumn: Number(values["code-column"]),
  labelColumn: Number(values["label-column"]),
  header: !values["no-header"],
});

console.log(`${values.catalog}: ${codes.length} códigos válidos, ${rejected.length} filas rechazadas.`);
for (const r of rejected.slice(0, 20)) console.log(`  línea ${r.line}: ${r.reason}`);
if (rejected.length > 20) console.log(`  … y ${rejected.length - 20} más`);
if (codes.length === 0) fail("No hay códigos para importar. Revisa el separador y las columnas.");
if (values["dry-run"]) process.exit(0);

if (!process.env.DATABASE_URL) fail("Falta DATABASE_URL (conexión directa a la base, rol postgres).");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query(
    `insert into public.ref_codes (catalog, code, label, source, is_provisional, is_active, updated_at)
     select $1, x.code, x.label, $2, false, true, now()
       from jsonb_to_recordset($3::jsonb) as x(code text, label text)
     on conflict (catalog, code) do update
       set label = excluded.label, source = excluded.source, is_provisional = false,
           is_active = true, updated_at = now()`,
    [values.catalog, values.source, JSON.stringify(codes)],
  );
  const off = await client.query(
    `update public.ref_codes set is_active = false, updated_at = now()
      where catalog = $1 and is_active and not (code = any($2::text[]))`,
    [values.catalog, codes.map((c) => c.code)],
  );
  await client.query("commit");
  console.log(`Importados ${codes.length}; desactivados ${off.rowCount} que no venían en el archivo.`);
} catch (error) {
  await client.query("rollback");
  fail(`Importación revertida: ${error.message}`);
} finally {
  await client.end();
}
