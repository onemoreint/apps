"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { z } from "zod";
import { emptyToNull } from "@/lib/text";
import { consentTextSchema, privacyRequestSchema, privacyUpdateSchema } from "@/modules/privacy/schemas";


export async function publishConsentText(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "privacy.manage", async (ctx) => {
    const parsed = consentTextSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.from("consent_texts").insert({ organization_id: ctx.org.id, ...parsed.data });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/privacidad`);
    return { ok: true, message: "Texto publicado. Las autorizaciones nuevas usarán esta versión; las anteriores conservan la suya." };
  });
}

export async function registerPrivacyRequest(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "privacy.register", async (ctx) => {
    const parsed = privacyRequestSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_privacy_request", {
      p_org: ctx.org.id,
      p_payload: {
        requester_name: v.requesterName,
        requester_doc: emptyToNull(v.requesterDoc),
        requester_contact: emptyToNull(v.requesterContact),
        kind: v.kind,
        description: v.description,
        patient_id: emptyToNull(v.patientId),
      },
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/solicitudes`);
    return { ok: true, message: "Solicitud registrada con su fecha límite de respuesta." };
  });
}

export async function updatePrivacyRequest(slug: string, requestId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "privacy.manage", async () => {
    if (!z.uuid().safeParse(requestId).success) return { ok: false, error: "Solicitud no válida." };
    const parsed = privacyUpdateSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_privacy_request", {
      p_request: requestId,
      p_status: parsed.data.status,
      p_response: emptyToNull(parsed.data.response),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/solicitudes`);
    return { ok: true, message: parsed.data.status === "respondida" ? "Respuesta registrada." : "Solicitud en trámite." };
  });
}
