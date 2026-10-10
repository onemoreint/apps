// Utilidades para pruebas de base de datos: ejecutan consultas con el rol
// "authenticated" (o "anon") y los claims JWT de un usuario, igual que PostgREST.
import pg from "pg";
import { randomUUID } from "node:crypto";

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/opticonsulta_test";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = null;
}

/** Consulta como superusuario (solo para preparar datos y verificar). */
export async function asAdmin<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(sql, params);
}

/** Crea un usuario en auth.users (correo confirmado por defecto). */
export async function createUser(
  email: string,
  opts: { confirmed?: boolean; fullName?: string } = {},
): Promise<string> {
  const id = randomUUID();
  await asAdmin(
    `insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
     values ($1, $2, $3, $4)`,
    [id, email, opts.confirmed === false ? null : new Date(), { full_name: opts.fullName ?? email }],
  );
  return id;
}

type Runner = <T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params?: unknown[],
) => Promise<pg.QueryResult<T>>;

async function withRole<T>(
  role: "authenticated" | "anon",
  userId: string | null,
  fn: (q: Runner) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    const claims = userId ? { sub: userId, role } : { role };
    await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const q: Runner = (sql, params = []) => client.query(sql, params);
    const result = await fn(q);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** Ejecuta como usuario autenticado. Confirma la transacción si no hay error. */
export function asUser<T>(userId: string, fn: (q: Runner) => Promise<T>): Promise<T> {
  return withRole("authenticated", userId, fn);
}

/** Ejecuta como visitante anónimo (sin sesión). */
export function asAnon<T>(fn: (q: Runner) => Promise<T>): Promise<T> {
  return withRole("anon", null, fn);
}

/** Atajo: una sola consulta como usuario. */
export function queryAs<T extends pg.QueryResultRow = pg.QueryResultRow>(
  userId: string,
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return asUser(userId, (q) => q<T>(sql, params));
}

/** Devuelve el código SQLSTATE del error lanzado, o null si no hubo error. */
export async function errorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? "unknown";
  }
}

export async function createOrg(ownerId: string, slug: string, name = slug): Promise<string> {
  const res = await queryAs<{ id: string }>(
    ownerId,
    "select public.create_organization($1, $2, null, null, 'America/Bogota', 'Sede principal', 'Medellín') as id",
    [name, slug],
  );
  return res.rows[0]!.id;
}

export async function inviteAndAccept(
  inviterId: string,
  orgId: string,
  email: string,
  role: string,
): Promise<string> {
  const userId = await createUser(email);
  const token = await queryAs<{ token: string }>(
    inviterId,
    "select public.invite_member($1, $2, $3::public.membership_role) as token",
    [orgId, email, role],
  );
  await queryAs(userId, "select public.accept_invitation($1)", [token.rows[0]!.token]);
  return userId;
}
