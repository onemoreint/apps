import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { OrgContext } from "@/lib/authz";

/** Profesional activo vinculado al usuario de la sesión en la organización, o null. */
export const getMyProfessional = cache(async (ctx: OrgContext) => {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", ctx.org.id)
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (!membership) return null;
  const { data } = await supabase
    .from("professionals")
    .select("id, full_name, profession, is_active")
    .eq("membership_id", membership.id)
    .eq("is_active", true)
    .maybeSingle();
  return data;
});
