/** Verifica que el esquema Drizzle y la base de datos migrada no hayan divergido. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { getTableConfig, type PgTable } from 'drizzle-orm/pg-core';
import * as schema from '../src/schema.js';
import { createTestDatabase, type TestDatabase } from '../src/testing.js';

let tdb: TestDatabase;
let sql: postgres.Sql;

beforeAll(async () => {
  tdb = await createTestDatabase();
  sql = postgres(tdb.adminUrl, { max: 1, onnotice: () => {} });
}, 60_000);

afterAll(async () => {
  await sql?.end();
  await tdb?.drop();
});

describe('schema drift', () => {
  const tables = Object.values(schema).map((t) => getTableConfig(t as PgTable));

  it('cada tabla del esquema Drizzle existe con exactamente las mismas columnas', async () => {
    for (const t of tables) {
      const rows = await sql<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${t.name}`;
      const dbCols = rows.map((r) => r.column_name).sort();
      const drizzleCols = t.columns.map((c) => c.name).sort();
      expect({ table: t.name, cols: drizzleCols }).toEqual({ table: t.name, cols: dbCols });
    }
  });

  it('toda tabla de la base de datos está modelada en Drizzle', async () => {
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> 'schema_migrations'`;
    expect(rows.map((r) => r.table_name).sort()).toEqual(tables.map((t) => t.name).sort());
  });

  it('todas las tablas de negocio tienen RLS activo', async () => {
    const rows = await sql<{ relname: string }[]>`
      SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity AND c.relname <> 'schema_migrations'`;
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('las 30 entidades mínimas del §9 existen', async () => {
    const required = [
      'companies', 'users', 'roles', 'permissions', 'clients', 'projects', 'energy_diagnostics', 'energy_consumption',
      'equipment_loads', 'solar_scenarios', 'solar_panels', 'inverters', 'batteries', 'structures', 'cables',
      'protections', 'components', 'labor_items', 'costs', 'project_materials', 'budgets', 'budget_items', 'proposals',
      'proposal_versions', 'countries', 'currencies', 'tax_rules', 'regulatory_profiles', 'technical_rules', 'audit_logs',
    ];
    const names = tables.map((t) => t.name);
    for (const r of required) expect(names).toContain(r);
  });
});
