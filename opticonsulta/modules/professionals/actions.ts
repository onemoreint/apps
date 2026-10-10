"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { emptyToNull } from "@/lib/text";
import { professionalSchema, verifySchema } from "@/modules/professionals/schemas";

export async function createProfessional(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "professionals.manage", async (ctx) => {
    const parsed = professionalSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const membershipId = emptyToNull(v.membershipId);
    if (membershipId && !z.uuid().safeParse(membershipId).success) return { ok: false, error: "Usuario no válido." };

    const supabase = await createClient();
    const { error } = await supabase.from("professionals").insert({
      organization_id: ctx.org.id,
      membership_id: membershipId,
      full_name: v.fullName,
      doc_type: v.docType,
      doc_number: v.docNumber.toUpperCase(),
      profession: v.profession,
      professional_card: emptyToNull(v.professionalCard),
    });
    if (error?.code === "23505") {
      return {
        ok: false,
        error: error.message.includes("membership")
          ? "Ese usuario ya está vinculado a otro profesional."
          : "Ya existe un profesional con ese documento.",
      };
    }
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/profesionales`);
    return { ok: true, message: `${v.fullName} quedó registrado. Su tarjeta profesional aún no está verificada.` };
  });
}

export async function verifyProfessional(slug: string, professionalId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "professionals.manage", async () => {
    const parsed = verifySchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("verify_professional", { p_professional: professionalId, p_note: parsed.data.note });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/profesionales`);
    return { ok: true, message: "Verificación registrada." };
  });
}

export async function setProfessionalActive(slug: string, professionalId: string, active: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "professionals.manage", async (ctx) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("professionals")
      .update({ is_active: active })
      .eq("id", professionalId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Profesional no encontrado." };
    revalidatePath(`/${slug}/profesionales`);
    return { ok: true, message: active ? "Profesional activado." : "Profesional desactivado." };
  });
}
