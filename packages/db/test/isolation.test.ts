/**
 * Pruebas de aislamiento multiempresa a nivel de BASE DE DATOS (§4, §32, §49).
 * Se conectan con el rol de la API (solarpro_app, sujeto a RLS) contra PostgreSQL real.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { createFixtureCompany, createSuperAdmin, createTestDatabase, type TestDatabase } from '../src/testing.js';

let tdb: TestDatabase;
let app: postgres.Sql;
let A: Awaited<ReturnType<typeof createFixtureCompany>>;
let B: Awaited<ReturnType<typeof createFixtureCompany>>;
let root: string;

/** Ejecuta como un usuario/empresa concretos, exactamente como lo hará la API. */
async function as<T>(userId: string, companyId: string | null, fn: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return (await app.begin(async (tx) => {
    await tx`SELECT set_config('app.user_id', ${userId}, true), set_config('app.company_id', ${companyId ?? ''}, true)`;
    return fn(tx);
  })) as T;
}

beforeAll(async () => {
  tdb = await createTestDatabase();
  A = await createFixtureCompany(tdb.adminUrl, { country: 'CO', legalName: 'Solar A SAS', taxId: '900000001', roles: ['ADMIN_EMPRESA', 'INGENIERO', 'VENDEDOR', 'CONSULTA'] });
  B = await createFixtureCompany(tdb.adminUrl, { country: 'VE', legalName: 'Solar B CA', taxId: 'J-00000002-0', roles: ['ADMIN_EMPRESA'] });
  root = await createSuperAdmin(tdb.adminUrl);
  app = postgres(tdb.appUrl, { max: 2, onnotice: () => {} });
}, 60_000);

afterAll(async () => {
  await app?.end();
  await tdb?.drop();
});

describe('rol de aplicación', () => {
  it('no es superusuario ni puede saltarse RLS', async () => {
    const [r] = await app`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(r).toEqual({ rolsuper: false, rolbypassrls: false });
  });
  it('sin contexto no ve datos de negocio', async () => {
    expect(await app`SELECT * FROM companies`).toHaveLength(0);
    expect(await app`SELECT * FROM countries`).toHaveLength(0);
  });
});

describe('aislamiento entre empresas', () => {
  let clientA: string;

  it('un usuario crea y ve clientes de su empresa', async () => {
    const [c] = await as(A.users.VENDEDOR!, A.companyId, (tx) =>
      tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'Cliente A', 'RESIDENCIAL') RETURNING id`,
    );
    clientA = c!.id;
    const rows = await as(A.users.CONSULTA!, A.companyId, (tx) => tx`SELECT id FROM clients`);
    expect(rows.map((r) => r.id)).toEqual([clientA]);
  });

  it('la empresa B no ve los clientes de A', async () => {
    const rows = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) => tx`SELECT * FROM clients`);
    expect(rows).toHaveLength(0);
    const byId = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) => tx`SELECT * FROM clients WHERE id = ${clientA}`);
    expect(byId).toHaveLength(0);
  });

  it('suplantar la empresa en la sesión no da acceso (se verifica la membresía)', async () => {
    const rows = await as(B.users.ADMIN_EMPRESA!, A.companyId, (tx) => tx`SELECT * FROM clients`);
    expect(rows).toHaveLength(0);
  });

  it('no se puede insertar datos en otra empresa', async () => {
    await expect(
      as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) =>
        tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'Intruso', 'OTRO')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('no se puede modificar ni borrar datos de otra empresa (0 filas afectadas)', async () => {
    const upd = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) => tx`UPDATE clients SET name = 'hack' WHERE id = ${clientA}`);
    expect(upd.count).toBe(0);
    const del = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) => tx`DELETE FROM clients WHERE id = ${clientA}`);
    expect(del.count).toBe(0);
  });

  it('un proyecto no puede referenciar un cliente de otra empresa (FK compuesta)', async () => {
    const [cb] = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) =>
      tx`INSERT INTO clients (company_id, name, client_type) VALUES (${B.companyId}, 'Cliente B', 'COMERCIAL') RETURNING id`,
    );
    await expect(
      as(A.users.INGENIERO!, A.companyId, (tx) =>
        tx`INSERT INTO projects (company_id, client_id, name, country_code) VALUES (${A.companyId}, ${cb!.id}, 'P', 'CO')`,
      ),
    ).rejects.toThrow(/foreign key/);
  });

  it('SUPER_ADMIN puede operar dentro de una empresa de forma explícita', async () => {
    const rows = await as(root, A.companyId, (tx) => tx`SELECT id FROM clients`);
    expect(rows.map((r) => r.id)).toContain(clientA);
  });
});

describe('roles a nivel de base de datos', () => {
  it('CONSULTA no puede escribir', async () => {
    await expect(
      as(A.users.CONSULTA!, A.companyId, (tx) =>
        tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'x', 'OTRO')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it('solo administradores modifican la configuración comercial', async () => {
    const byEngineer = await as(A.users.INGENIERO!, A.companyId, (tx) =>
      tx`UPDATE company_settings SET default_margin = 0.5 WHERE company_id = ${A.companyId}`,
    );
    expect(byEngineer.count).toBe(0);
    const byAdmin = await as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) =>
      tx`UPDATE company_settings SET default_margin = 0.25 WHERE company_id = ${A.companyId}`,
    );
    expect(byAdmin.count).toBe(1);
  });

  it('solo SUPER_ADMIN crea empresas y edita el catálogo global', async () => {
    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) =>
        tx`INSERT INTO companies (country_code, legal_name, tax_id) VALUES ('CO', 'Nueva', '1')`,
      ),
    ).rejects.toThrow(/row-level security/);
    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) =>
        tx`INSERT INTO components (company_id, product_type, category, model) VALUES (NULL, 'PANEL', 'PANELES', 'global')`,
      ),
    ).rejects.toThrow(/row-level security/);
    const [g] = await as(root, null, (tx) =>
      tx`INSERT INTO components (company_id, product_type, category, model) VALUES (NULL, 'PANEL', 'PANELES', 'global-ok') RETURNING id`,
    );
    // El catálogo global es visible para cualquier empresa.
    const seen = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) => tx`SELECT id FROM components WHERE id = ${g!.id}`);
    expect(seen).toHaveLength(1);
  });

  it('un usuario no puede auto-promoverse a SUPER_ADMIN', async () => {
    await expect(
      as(A.users.VENDEDOR!, A.companyId, (tx) => tx`UPDATE users SET is_super_admin = true WHERE id = ${A.users.VENDEDOR!}`),
    ).rejects.toThrow(/row-level security/);
  });
});

describe('países y normativa', () => {
  it('Colombia y Venezuela existen con identificación y perfil normativo independientes', async () => {
    const rows = await as(A.users.CONSULTA!, A.companyId, (tx) => tx`
      SELECT c.code, c.tax_id_label, p.id AS profile_id, v.status
      FROM countries c JOIN regulatory_profiles p ON p.country_code = c.code
      JOIN regulatory_versions v ON v.profile_id = p.id ORDER BY c.code`);
    expect(rows.map((r) => [r.code, r.tax_id_label, r.status])).toEqual([
      ['CO', 'NIT', 'BORRADOR'],
      ['VE', 'RIF', 'BORRADOR'],
    ]);
    expect(rows[0]!.profile_id).not.toBe(rows[1]!.profile_id);
  });

  it('no se cargaron reglas técnicas ni tasas inventadas', async () => {
    const [r] = await as(root, null, (tx) => tx`
      SELECT (SELECT count(*) FROM technical_rules)::int AS rules, (SELECT count(*) FROM tax_rules)::int AS taxes`);
    expect(r).toEqual({ rules: 0, taxes: 0 });
  });

  it('toda regla técnica exige fuente', async () => {
    const [v] = await as(root, null, (tx) => tx`SELECT id FROM regulatory_versions LIMIT 1`);
    await expect(
      as(root, null, (tx) => tx`INSERT INTO technical_rules (regulatory_version_id, code, name, rule_type, severity)
                                 VALUES (${v!.id}, 'X', 'X', 'DCAC_RATIO', 'WARNING')`),
    ).rejects.toThrow(/source_reference/);
  });
});

describe('auditoría y versionado', () => {
  it('los cambios quedan auditados con usuario, empresa y valores antes/después', async () => {
    const [c] = await as(A.users.VENDEDOR!, A.companyId, (tx) =>
      tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'Auditado', 'RURAL') RETURNING id`,
    );
    await as(A.users.VENDEDOR!, A.companyId, (tx) => tx`UPDATE clients SET name = 'Auditado 2' WHERE id = ${c!.id}`);
    const logs = await as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) =>
      tx`SELECT action, user_id, company_id, old_value->>'name' AS old, new_value->>'name' AS new
         FROM audit_logs WHERE entity = 'clients' AND entity_id = ${c!.id} ORDER BY id`,
    );
    expect(logs.map((l) => [l.action, l.old, l.new])).toEqual([
      ['CREATE', null, 'Auditado'],
      ['UPDATE', 'Auditado', 'Auditado 2'],
    ]);
    expect(logs[0]!.user_id).toBe(A.users.VENDEDOR);
    expect(logs[0]!.company_id).toBe(A.companyId);
  });

  it('la auditoría no se puede alterar y otras empresas no la ven', async () => {
    await expect(as(root, A.companyId, (tx) => tx`DELETE FROM audit_logs`)).rejects.toThrow(/permission denied/);
    const other = await as(B.users.ADMIN_EMPRESA!, B.companyId, (tx) =>
      tx`SELECT * FROM audit_logs WHERE company_id = ${A.companyId}`,
    );
    expect(other).toHaveLength(0);
    const seller = await as(A.users.VENDEDOR!, A.companyId, (tx) => tx`SELECT * FROM audit_logs`);
    expect(seller).toHaveLength(0); // solo administradores leen auditoría
  });

  it('row_version aumenta en cada cambio (base para sincronización offline)', async () => {
    const [c] = await as(A.users.VENDEDOR!, A.companyId, (tx) =>
      tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'v', 'OTRO') RETURNING id, row_version`,
    );
    expect(c!.row_version).toBe(1);
    const [u] = await as(A.users.VENDEDOR!, A.companyId, (tx) =>
      tx`UPDATE clients SET name = 'v2' WHERE id = ${c!.id} RETURNING row_version`,
    );
    expect(u!.row_version).toBe(2);
  });

  it('un presupuesto emitido y sus versiones de propuesta no cambian en silencio', async () => {
    const { budgetId, proposalId } = await as(A.users.ADMIN_EMPRESA!, A.companyId, async (tx) => {
      const [cl] = await tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'P', 'OTRO') RETURNING id`;
      const [p] = await tx`INSERT INTO projects (company_id, client_id, name, country_code) VALUES (${A.companyId}, ${cl!.id}, 'Proy', 'CO') RETURNING id`;
      const [b] = await tx`INSERT INTO budgets (company_id, project_id, number, currency_code, margin, margin_mode, cost_total, final_price)
                           VALUES (${A.companyId}, ${p!.id}, 1, 'COP', 0.3, 'MARKUP', 100, 130) RETURNING id`;
      await tx`INSERT INTO budget_items (company_id, budget_id, category, description, quantity, unit, unit_cost, total_cost)
               VALUES (${A.companyId}, ${b!.id}, 'MATERIALES', 'x', 1, 'und', 100, 100)`;
      await tx`UPDATE budgets SET status = 'EMITIDO', issued_at = now() WHERE id = ${b!.id}`;
      const [pr] = await tx`INSERT INTO proposals (company_id, project_id, title) VALUES (${A.companyId}, ${p!.id}, 'Prop') RETURNING id`;
      await tx`INSERT INTO proposal_versions (company_id, proposal_id, version_number, budget_id, snapshot, is_preliminary, created_by)
               VALUES (${A.companyId}, ${pr!.id}, 1, ${b!.id}, '{}'::jsonb, true, ${A.users.ADMIN_EMPRESA!})`;
      return { budgetId: b!.id as string, proposalId: pr!.id as string };
    });

    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) => tx`UPDATE budgets SET margin = 0.5 WHERE id = ${budgetId}`),
    ).rejects.toThrow(/ya fue emitido/);
    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) => tx`UPDATE budget_items SET unit_cost = 1 WHERE budget_id = ${budgetId}`),
    ).rejects.toThrow(/presupuesto emitido/);
    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) =>
        tx`UPDATE proposal_versions SET snapshot = '{"x":1}' WHERE proposal_id = ${proposalId}`,
      ),
    ).rejects.toThrow(/permission denied|inmutable/);
    // Anular sí está permitido
    const ok = await as(A.users.ADMIN_EMPRESA!, A.companyId, (tx) => tx`UPDATE budgets SET status = 'ANULADO' WHERE id = ${budgetId}`);
    expect(ok.count).toBe(1);
  });

  it('un producto usado en un proyecto no se puede borrar físicamente', async () => {
    await expect(
      as(A.users.ADMIN_EMPRESA!, A.companyId, async (tx) => {
        const [comp] = await tx`INSERT INTO components (company_id, product_type, category, model) VALUES (${A.companyId}, 'PANEL', 'PANELES', 'Fixture 550') RETURNING id`;
        const [cl] = await tx`INSERT INTO clients (company_id, name, client_type) VALUES (${A.companyId}, 'M', 'OTRO') RETURNING id`;
        const [p] = await tx`INSERT INTO projects (company_id, client_id, name, country_code) VALUES (${A.companyId}, ${cl!.id}, 'P', 'CO') RETURNING id`;
        const [s] = await tx`INSERT INTO solar_scenarios (company_id, project_id, code, label, coverage) VALUES (${A.companyId}, ${p!.id}, 'A', 'A', 0.5) RETURNING id`;
        await tx`INSERT INTO project_materials (company_id, scenario_id, category, component_id, component_snapshot, quantity, unit)
                 VALUES (${A.companyId}, ${s!.id}, 'PANELES', ${comp!.id}, '{"model":"Fixture 550"}', 6, 'und')`;
        await tx`DELETE FROM components WHERE id = ${comp!.id}`;
      }),
    ).rejects.toThrow(/foreign key/);
  });
});
