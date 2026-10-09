// Revisión automática de seguridad del esquema. Falla si una migración nueva
// crea una tabla sin RLS, concede acceso a anon o expone una función insegura.
// Se ejecuta en CI antes de aprobar cualquier migración (sección 5.11 de la Fase A).
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { asAdmin, closePool } from "./db";

beforeAll(async () => {
  await prepareTestDatabase();
});

afterAll(async () => {
  await closePool();
});

// Funciones que anon puede ejecutar a propósito (flujo de inicio de sesión).
const ANON_ALLOWED_FUNCTIONS = new Set(["login_guard", "record_login_failure"]);

describe("endurecimiento del esquema", () => {
  it("todas las tablas de public tienen RLS activada", async () => {
    const res = await asAdmin<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' and not rowsecurity",
    );
    expect(res.rows.map((r) => r.tablename)).toEqual([]);
  });

  it("anon no tiene ningún privilegio sobre tablas de public", async () => {
    const res = await asAdmin<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
        where grantee = 'anon' and table_schema = 'public'`,
    );
    expect(res.rows).toEqual([]);
  });

  it("authenticated no puede insertar ni borrar en tablas gestionadas por RPC", async () => {
    const res = await asAdmin<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
        where grantee = 'authenticated' and table_schema = 'public'
          and privilege_type in ('INSERT', 'DELETE', 'TRUNCATE')
          and table_name in ('organizations','memberships','role_permissions','audit_logs','invitations','permissions','org_settings')`,
    );
    expect(res.rows).toEqual([]);
  });

  it("toda función SECURITY DEFINER fija search_path", async () => {
    const res = await asAdmin<{ fn: string }>(
      `select n.nspname || '.' || p.proname as fn
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where p.prosecdef
          and n.nspname in ('public', 'private')
          and not exists (
            select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
          )`,
    );
    expect(res.rows.map((r) => r.fn)).toEqual([]);
  });

  it("anon solo puede ejecutar las funciones del flujo de acceso", async () => {
    const res = await asAdmin<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private')
          and has_function_privilege('anon', p.oid, 'execute')`,
    );
    const exposed = res.rows.map((r) => r.proname).filter((name) => !ANON_ALLOWED_FUNCTIONS.has(name));
    expect(exposed).toEqual([]);
  });

  it("las tablas internas del esquema private no son accesibles por authenticated", async () => {
    const res = await asAdmin<{ table_name: string }>(
      `select table_name from information_schema.role_table_grants
        where grantee in ('anon', 'authenticated') and table_schema = 'private'`,
    );
    expect(res.rows).toEqual([]);
  });

  it("toda tabla con organization_id tiene índice que empieza por esa columna", async () => {
    const res = await asAdmin<{ table_name: string }>(
      `select c.table_name
         from information_schema.columns c
        where c.table_schema = 'public' and c.column_name = 'organization_id'
          and not exists (
            select 1 from pg_index i
              join pg_class t on t.oid = i.indrelid
              join pg_namespace ns on ns.oid = t.relnamespace
              join pg_attribute a on a.attrelid = t.oid and a.attnum = i.indkey[0]
             where ns.nspname = 'public' and t.relname = c.table_name and a.attname = 'organization_id'
          )`,
    );
    expect(res.rows.map((r) => r.table_name)).toEqual([]);
  });
});
