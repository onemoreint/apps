import postgres from 'postgres';
import { randomBytes, randomUUID } from 'node:crypto';
import { migrate } from './migrate.js';
import { seed } from './seed.js';

/**
 * Utilidad de pruebas: crea una base de datos efímera, aplica migraciones y seed,
 * y habilita el rol de aplicación con una contraseña aleatoria.
 * Las pruebas de aislamiento corren contra PostgreSQL REAL, no contra mocks.
 */
export interface TestDatabase {
  adminUrl: string;
  appUrl: string;
  drop: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const serverAdmin = process.env.TEST_DATABASE_ADMIN_URL ?? 'postgres://postgres:postgres@localhost:5432/postgres';
  const name = `solarpro_test_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const root = postgres(serverAdmin, { max: 1, onnotice: () => {} });
  await root.unsafe(`CREATE DATABASE ${name}`);

  const base = new URL(serverAdmin);
  const adminUrl = new URL(base);
  adminUrl.pathname = `/${name}`;

  await migrate(adminUrl.toString(), () => {});
  await seed(adminUrl.toString(), () => {});

  const password = randomBytes(16).toString('hex');
  // El rol es global al servidor; se reutiliza entre bases de prueba.
  await root.unsafe(`ALTER ROLE solarpro_app LOGIN PASSWORD '${password}'`);

  const appUrl = new URL(adminUrl);
  appUrl.username = 'solarpro_app';
  appUrl.password = password;

  return {
    adminUrl: adminUrl.toString(),
    appUrl: appUrl.toString(),
    drop: async () => {
      await root.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await root.end();
    },
  };
}

/** Crea empresa + usuarios con roles directamente como administrador (fixtures de prueba). */
export async function createFixtureCompany(
  adminUrl: string,
  opts: { country: 'CO' | 'VE'; legalName: string; taxId: string; roles: Array<'ADMIN_EMPRESA' | 'INGENIERO' | 'VENDEDOR' | 'CONSULTA'> },
): Promise<{ companyId: string; users: Record<string, string> }> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    const [c] = await sql<{ id: string }[]>`
      INSERT INTO companies (country_code, legal_name, tax_id) VALUES (${opts.country}, ${opts.legalName}, ${opts.taxId}) RETURNING id`;
    // Misma regla que la API: la configuración inicial se copia de los valores del país.
    await sql`INSERT INTO company_settings (company_id, currency_code, local_currency_code, fx_rate_source, fx_surcharge_per_unit)
              SELECT ${c!.id}, default_currency_code, local_currency_code, fx_rate_source, default_fx_surcharge
              FROM countries WHERE code = ${opts.country}`;
    const users: Record<string, string> = {};
    for (const role of opts.roles) {
      const id = randomUUID();
      await sql`INSERT INTO users (id, email) VALUES (${id}, ${`${role.toLowerCase()}.${id.slice(0, 8)}@test.local`})`;
      await sql`INSERT INTO company_memberships (company_id, user_id, role_code) VALUES (${c!.id}, ${id}, ${role})`;
      users[role] = id;
    }
    return { companyId: c!.id, users };
  } finally {
    await sql.end();
  }
}

export async function createSuperAdmin(adminUrl: string): Promise<string> {
  const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    const id = randomUUID();
    await sql`INSERT INTO users (id, email, is_super_admin) VALUES (${id}, ${`root.${id.slice(0, 8)}@test.local`}, true)`;
    return id;
  } finally {
    await sql.end();
  }
}
