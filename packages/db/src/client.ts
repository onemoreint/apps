import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from './schema.js';

export type Database = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/** Contexto de seguridad que la API fija en cada transacción. */
export interface TenantContext {
  userId: string;
  /** Empresa activa. null solo para operaciones de plataforma (SUPER_ADMIN) o de perfil propio. */
  companyId: string | null;
  ip?: string | null;
}

export function createDb(url: string, opts: { max?: number } = {}) {
  const client = postgres(url, { max: opts.max ?? 10, onnotice: () => {} });
  const db = drizzle(client, { schema });
  return { db, client, close: () => client.end() };
}

/**
 * Ejecuta `fn` dentro de una transacción con el contexto de seguridad aplicado.
 * `set_config(..., true)` limita los valores a la transacción: nunca se filtran a otra
 * petición que reutilice la conexión del pool. Las políticas RLS los verifican contra
 * `company_memberships`, así que un company_id ajeno simplemente no ve nada.
 */
export async function withTenant<T>(db: Database, ctx: TenantContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      SELECT set_config('app.user_id', ${ctx.userId}, true),
             set_config('app.company_id', ${ctx.companyId ?? ''}, true),
             set_config('app.ip', ${ctx.ip ?? ''}, true)`);
    return fn(tx);
  });
}

/** Registra un evento de auditoría no ligado a una fila (LOGIN, EXPORT, GENERATE_PDF…). */
export async function logEvent(
  tx: Tx,
  action: 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'GENERATE_PDF' | 'APPROVE' | 'REJECT',
  entity: string,
  entityId: string | null,
  payload?: unknown,
): Promise<void> {
  await tx.execute(
    sql`SELECT app.log_event(${action}, ${entity}, ${entityId}, ${payload === undefined ? null : JSON.stringify(payload)}::jsonb)`,
  );
}
