import "server-only";
import { ForbiddenError, getOrgContext, requirePermission, type OrgContext } from "@/lib/authz";
import type { ActionResult } from "@/lib/errors";

/**
 * Envoltorio común de las Server Actions de una organización:
 * carga el contexto (membresía activa vía RLS), exige el permiso y convierte
 * la denegación en un resultado legible. La base de datos vuelve a verificar.
 */
export async function withOrgPermission<T>(
  slug: string,
  permission: string,
  fn: (ctx: OrgContext) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  const ctx = await getOrgContext(slug);
  try {
    requirePermission(ctx, permission);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { ok: false, error: "Tu rol no permite realizar esta acción." };
    }
    throw error;
  }
  return fn(ctx);
}
