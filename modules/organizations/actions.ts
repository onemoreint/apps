"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/authz";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import {
  locationSchema,
  onboardingSchema,
  repsSchema,
  organizationUpdateSchema,
  settingsSchema,
} from "@/modules/organizations/schemas";

export async function createOrganization(input: unknown): Promise<ActionResult> {
  await requireUserId();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_organization", {
    p_trade_name: v.tradeName,
    p_slug: v.slug,
    p_legal_name: v.legalName,
    p_nit: v.nit,
    p_timezone: v.timezone,
    p_location_name: v.locationName,
    p_location_city: v.locationCity,
  });
  if (error) {
    const message = dbErrorMessage(error);
    return error.code === "23505"
      ? { ok: false, error: message, fieldErrors: { slug: message } }
      : { ok: false, error: message };
  }
  redirect(`/${v.slug}/inicio`);
}

export async function updateOrganization(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = organizationUpdateSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organizations")
      .update({ trade_name: v.tradeName, legal_name: v.legalName, nit: v.nit, timezone: v.timezone })
      .eq("id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "No tienes permiso para realizar esta acción." };

    revalidatePath(`/${slug}`, "layout");
    return { ok: true, message: "Datos de la óptica guardados." };
  });
}

export async function updateSettings(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("org_settings")
      .update({
        discount_threshold_pct: Number(v.discountThresholdPct),
        receipt_footer: v.receiptFooter,
      })
      .eq("organization_id", ctx.org.id)
      .select("organization_id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "No tienes permiso para realizar esta acción." };

    revalidatePath(`/${slug}/configuracion`);
    return { ok: true, message: "Parámetros guardados." };
  });
}

export async function addLocation(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = locationSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);

    const supabase = await createClient();
    const { repsCode, ...rest } = parsed.data;
    const { error } = await supabase.from("locations").insert({ organization_id: ctx.org.id, ...rest, reps_code: repsCode });
    if (error) return { ok: false, error: dbErrorMessage(error) };

    revalidatePath(`/${slug}/configuracion`);
    return { ok: true, message: `Sede «${parsed.data.name}» agregada.` };
  });
}

const locationActiveSchema = z.object({ locationId: z.uuid(), active: z.boolean() });

export async function setLocationActive(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = locationActiveSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("locations")
      .update({ is_active: parsed.data.active })
      .eq("id", parsed.data.locationId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Sede no encontrada." };

    revalidatePath(`/${slug}/configuracion`);
    return { ok: true, message: parsed.data.active ? "Sede activada." : "Sede desactivada." };
  });
}

const locationRepsSchema = z.object({ locationId: z.uuid(), repsCode: repsSchema });

export async function setLocationReps(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = locationRepsSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("locations")
      .update({ reps_code: parsed.data.repsCode })
      .eq("id", parsed.data.locationId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Sede no encontrada." };
    revalidatePath(`/${slug}/configuracion`);
    return { ok: true, message: "Código REPS guardado." };
  });
}
