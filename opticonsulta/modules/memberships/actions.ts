"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/authz";
import { serverEnv } from "@/lib/env";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { inviteSchema, memberRoleSchema, memberStatusSchema, roleSchema } from "@/modules/memberships/schemas";

/**
 * Crea una invitación y devuelve el enlace UNA sola vez. El MVP no envía
 * correos: quien invita copia el enlace y lo entrega por su canal habitual.
 */
export async function inviteMember(slug: string, input: unknown): Promise<ActionResult<{ link: string }>> {
  return withOrgPermission<{ link: string }>(slug, "users.manage", async (ctx) => {
    const parsed = inviteSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);

    const supabase = await createClient();
    const { data: token, error } = await supabase.rpc("invite_member", {
      p_org: ctx.org.id,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
    });
    if (error || !token) return { ok: false, error: dbErrorMessage(error) };

    revalidatePath(`/${slug}/usuarios`);
    return {
      ok: true,
      data: { link: `${serverEnv().APP_BASE_URL}/invitacion/${token}` },
      message: `Invitación creada para ${parsed.data.email}. Vence en 7 días.`,
    };
  });
}

export async function revokeInvitation(slug: string, invitationId: string): Promise<ActionResult> {
  return withOrgPermission(slug, "users.manage", async () => {
    if (!z.uuid().safeParse(invitationId).success) return { ok: false, error: "Invitación no válida." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_invitation", { p_invitation: invitationId });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/usuarios`);
    return { ok: true, message: "Invitación anulada." };
  });
}

export async function changeMemberRole(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "users.manage", async () => {
    const parsed = memberRoleSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_member_role", {
      p_membership: parsed.data.membershipId,
      p_role: parsed.data.role,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/usuarios`);
    return { ok: true, message: "Rol actualizado." };
  });
}

export async function changeMemberStatus(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "users.manage", async () => {
    const parsed = memberStatusSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_member_status", {
      p_membership: parsed.data.membershipId,
      p_status: parsed.data.status,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/usuarios`);
    return { ok: true, message: parsed.data.status === "suspendida" ? "Acceso suspendido." : "Acceso reactivado." };
  });
}

export async function acceptInvitation(token: string): Promise<ActionResult> {
  await requireUserId();
  if (!/^[0-9a-f]{64}$/.test(token)) return { ok: false, error: "El enlace de invitación no es válido." };

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error || !orgId) return { ok: false, error: dbErrorMessage(error) };

  const { data: org } = await supabase.from("organizations").select("slug").eq("id", orgId).single();
  redirect(org ? `/${org.slug}/inicio` : "/");
}

export async function setRolePermission(slug: string, role: string, permission: string, granted: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "roles.manage", async (ctx) => {
    const parsedRole = roleSchema.safeParse(role);
    if (!parsedRole.success || parsedRole.data === "propietario") return { ok: false, error: "Rol no válido." };
    if (!/^[a-z_]+\.[a-z_]+$/.test(permission)) return { ok: false, error: "Permiso no válido." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_role_permission", {
      p_org: ctx.org.id,
      p_role: parsedRole.data,
      p_perm: permission,
      p_granted: granted,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/roles`);
    return { ok: true };
  });
}
