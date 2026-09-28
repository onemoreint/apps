import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { companyMemberships, users, withTenant, type Database } from '@solarpro/db';
import { ROLE_PERMISSIONS, type Permission, type Role } from '@solarpro/shared';
import type { TokenVerifier } from './token.js';

export interface AuthContext {
  userId: string;
  email: string;
  isSuperAdmin: boolean;
  /** Empresa activa verificada (cabecera X-Company-Id). */
  companyId: string | null;
  role: Role | null;
  permissions: ReadonlySet<Permission>;
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Respuesta 401/403 homogénea que no revela si un recurso existe. */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Autenticación + resolución de empresa activa.
 *  1. Verifica el JWT (firma, expiración, emisor, audiencia).
 *  2. Carga el usuario interno; si no existe o está inactivo → 401.
 *  3. Si llega X-Company-Id, exige membresía activa (o SUPER_ADMIN) → si no, 403.
 */
export function authenticate(db: Database, verify: TokenVerifier) {
  return async (req: FastifyRequest): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'UNAUTHENTICATED', 'Se requiere autenticación.');

    let sub: string;
    try {
      sub = (await verify(header.slice(7))).sub;
    } catch {
      throw new HttpError(401, 'INVALID_TOKEN', 'Token inválido o expirado.');
    }

    const rawCompany = req.headers['x-company-id'];
    const requestedCompany = typeof rawCompany === 'string' && rawCompany.length > 0 ? rawCompany : null;
    if (requestedCompany && !UUID_RE.test(requestedCompany)) {
      throw new HttpError(400, 'INVALID_COMPANY_HEADER', 'X-Company-Id inválido.');
    }

    const resolved = await withTenant(db, { userId: sub, companyId: null }, async (tx) => {
      const [u] = await tx.select().from(users).where(eq(users.id, sub));
      if (!u || u.status !== 'ACTIVO') return null;
      let role: Role | null = null;
      if (requestedCompany) {
        const [m] = await tx
          .select()
          .from(companyMemberships)
          .where(and(eq(companyMemberships.userId, sub), eq(companyMemberships.companyId, requestedCompany)));
        if (m && m.status === 'ACTIVO') role = m.roleCode as Role;
      }
      return { u, role };
    });

    if (!resolved) throw new HttpError(401, 'USER_NOT_PROVISIONED', 'Usuario no habilitado en la plataforma.');
    const { u } = resolved;
    let { role } = resolved;

    if (requestedCompany && !role) {
      if (!u.isSuperAdmin) throw new HttpError(403, 'NOT_A_MEMBER', 'No tiene acceso a esta empresa.');
      role = 'SUPER_ADMIN';
    }
    if (!requestedCompany && u.isSuperAdmin) role = 'SUPER_ADMIN';

    req.auth = {
      userId: u.id,
      email: u.email,
      isSuperAdmin: u.isSuperAdmin,
      companyId: requestedCompany,
      role,
      permissions: new Set(role ? ROLE_PERMISSIONS[role] : []),
    };
  };
}

/** Exige un permiso. Los permisos de empresa requieren además una empresa activa. */
export function requirePermission(permission: Permission, opts: { companyRequired?: boolean } = {}) {
  const companyRequired = opts.companyRequired ?? !permission.startsWith('platform:');
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const a = req.auth;
    if (!a) throw new HttpError(401, 'UNAUTHENTICATED', 'Se requiere autenticación.');
    if (companyRequired && !a.companyId) {
      throw new HttpError(400, 'COMPANY_REQUIRED', 'Indique la empresa activa en la cabecera X-Company-Id.');
    }
    if (!a.permissions.has(permission)) {
      throw new HttpError(403, 'FORBIDDEN', 'No tiene permiso para esta acción.');
    }
  };
}

export function tenantOf(req: FastifyRequest) {
  const a = req.auth!;
  return { userId: a.userId, companyId: a.companyId, ip: req.ip };
}
