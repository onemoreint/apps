// Genera lib/supabase/database.generated.ts a partir de la base de pruebas ya
// migrada, para las tablas, vistas y funciones creadas desde la migración 0010.
// Insert/Update reflejan los privilegios por columna de `authenticated`: una
// tabla que solo se escribe por RPC queda con `Insert: never`.
// Uso: npm run db:test:prepare && node scripts/gen-db-types.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIRST = "20261010000010";
const url = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_test";

const dir = path.join(root, "supabase/migrations");
const sql = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && f >= FIRST)
  .sort()
  .map((f) => readFileSync(path.join(dir, f), "utf8"))
  .join("\n");
const tables = [...sql.matchAll(/create table public\.(\w+)/g)].map((m) => m[1]);
const views = [...sql.matchAll(/create (?:or replace )?view public\.(\w+)/g)].map((m) => m[1]);
const functions = [...new Set([...sql.matchAll(/create or replace function public\.(\w+)/g)].map((m) => m[1]))];

const client = new pg.Client({ connectionString: url });
await client.connect();

const enums = new Map();
for (const r of (await client.query(
  `select t.typname, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
     from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname`,
)).rows) enums.set(r.typname, r.labels);

const scalar = (udt) => {
  const base = udt.replace(/^_/, "");
  const arr = udt.startsWith("_");
  let t;
  if (enums.has(base)) t = enums.get(base).map((l) => JSON.stringify(l)).join(" | ");
  else if (["int2", "int4", "int8", "numeric", "float4", "float8"].includes(base)) t = "number";
  else if (base === "bool") t = "boolean";
  else if (["json", "jsonb"].includes(base)) t = "Json";
  else t = "string";
  return arr ? `(${t})[]` : t;
};

const out = [];
out.push("// ARCHIVO GENERADO por scripts/gen-db-types.mjs. No editar a mano.");
out.push('import type { Json } from "./database.types";\n');
out.push("export type GeneratedTables = {");
for (const table of tables) {
  const cols = (await client.query(
    `select c.column_name, c.udt_name, c.is_nullable = 'YES' as nullable, c.column_default is not null or c.is_identity = 'YES' as has_default,
            has_column_privilege('authenticated', format('public.%I', c.table_name), c.column_name, 'INSERT') as can_insert,
            has_column_privilege('authenticated', format('public.%I', c.table_name), c.column_name, 'UPDATE') as can_update
       from information_schema.columns c
      where c.table_schema = 'public' and c.table_name = $1 order by c.ordinal_position`,
    [table],
  )).rows;
  out.push(`  ${table}: {`);
  out.push("    Row: {");
  for (const c of cols) out.push(`      ${c.column_name}: ${scalar(c.udt_name)}${c.nullable ? " | null" : ""};`);
  out.push("    };");
  const ins = cols.filter((c) => c.can_insert);
  if (ins.length) {
    out.push("    Insert: {");
    for (const c of ins) out.push(`      ${c.column_name}${c.nullable || c.has_default ? "?" : ""}: ${scalar(c.udt_name)}${c.nullable ? " | null" : ""};`);
    out.push("    };");
  } else out.push("    Insert: never;");
  const upd = cols.filter((c) => c.can_update);
  if (upd.length) {
    out.push("    Update: {");
    for (const c of upd) out.push(`      ${c.column_name}?: ${scalar(c.udt_name)}${c.nullable ? " | null" : ""};`);
    out.push("    };");
  } else out.push("    Update: never;");
  out.push("    Relationships: [];");
  out.push("  };");
}
out.push("};\n");

out.push("export type GeneratedViews = {");
for (const view of views) {
  const cols = (await client.query(
    "select column_name, udt_name from information_schema.columns where table_schema = 'public' and table_name = $1 order by ordinal_position",
    [view],
  )).rows;
  out.push(`  ${view}: {`);
  out.push("    Row: {");
  for (const c of cols) out.push(`      ${c.column_name}: ${scalar(c.udt_name)} | null;`);
  out.push("    };");
  out.push("    Relationships: [];");
  out.push("  };");
}
out.push("};\n");

out.push("export type GeneratedFunctions = {");
for (const fn of functions) {
  const r = (await client.query(
    `select p.proargnames, p.proargmodes::text[] as proargmodes, p.pronargdefaults, p.proretset,
            array(select t.typname::text from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) with ordinality a(oid, i)
                    join pg_type t on t.oid = a.oid order by a.i) as argtypes,
            rt.typname::text as rettype
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_type rt on rt.oid = p.prorettype
      where n.nspname = 'public' and p.proname = $1 and has_function_privilege('authenticated', p.oid, 'execute')`,
    [fn],
  )).rows[0];
  if (!r) continue; // no expuesta (por ejemplo, funciones de trigger)
  const names = r.proargnames ?? [];
  const modes = r.proargmodes ?? names.map(() => "i");
  const inputs = names.map((n, i) => ({ n, t: r.argtypes[i], m: modes[i] })).filter((a) => a.m === "i");
  const outputs = names.map((n, i) => ({ n, t: r.argtypes[i], m: modes[i] })).filter((a) => a.m === "t" || a.m === "o");
  const firstOptional = inputs.length - (r.pronargdefaults ?? 0);
  const args = inputs.length
    ? `{ ${inputs.map((a, i) => `${a.n}${i >= firstOptional ? "?" : ""}: ${scalar(a.t)} | null`).join("; ")} }`
    : "Record<string, never>";
  let ret;
  if (outputs.length) ret = `{ ${outputs.map((a) => `${a.n}: ${scalar(a.t)} | null`).join("; ")} }[]`;
  else if (r.rettype === "void") ret = "undefined";
  else ret = scalar(r.rettype) + (r.proretset ? "[]" : "");
  out.push(`  ${fn}: { Args: ${args}; Returns: ${ret} };`);
}
out.push("};\n");

out.push("export type GeneratedEnums = {");
for (const [name, labels] of enums) out.push(`  ${name}: ${labels.map((l) => JSON.stringify(l)).join(" | ")};`);
out.push("};");

await client.end();
writeFileSync(path.join(root, "lib/supabase/database.generated.ts"), out.join("\n") + "\n");
console.log(`Tipos generados: ${tables.length} tablas, ${views.length} vistas, ${functions.length} funciones.`);
