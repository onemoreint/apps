"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { consentTextSchema } from "@/modules/privacy/schemas";


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
