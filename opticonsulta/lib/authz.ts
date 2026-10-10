import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database, MembershipRole } from "@/lib/supabase/database.types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type OrgContext = {
  org: Organization;
  role: MembershipRole;
  userId: string;
  permissions: ReadonlySet<string>;
};

export class ForbiddenError extends Error {
  constructor(public readonly permission: string) {
    super(`Permiso denegado: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/** Usuario autenticado verificado (firma del JWT) o null. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");
  return userId;
}

/**
 * Carga la organización por su dirección (slug) y los permisos del usuario.
 * RLS garantiza que solo se encuentra si el usuario es miembro activo; si no,
 * responde 404 para no revelar que la organización existe.
 */
export const getOrgContext = cache(async (slug: string): Promise<OrgContext> => {
  const userId = await requireUserId();
  const supabase = await createClient();

  const { data: org } = await supabase.from("organizations").select("*").eq("slug", slug).maybeSingle();
  if (!org) notFound();

  const [{ data: membership }, { data: perms }] = await Promise.all([
    supabase
      .from("memberships")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", userId)
      .eq("status", "activa")
      .maybeSingle(),
    supabase.rpc("my_permissions", { p_org: org.id }),
  ]);
  if (!membership) notFound();

  return {
    org,
    role: membership.role,
    userId,
    permissions: new Set(perms ?? []),
  };
});

export function can(ctx: OrgContext, permission: string): boolean {
  return ctx.permissions.has(permission);
}

/**
 * Verificación en servidor antes de llamar a la base de datos. La base vuelve
 * a verificar en RLS y en cada RPC: doble control con la misma fuente.
 */
export function requirePermission(ctx: OrgContext, permission: string): void {
  if (!can(ctx, permission)) throw new ForbiddenError(permission);
}
