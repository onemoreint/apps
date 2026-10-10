"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import type { Json } from "@/lib/supabase/database.types";
import {
  amendmentSchema,
  encounterFormSchema,
  prescriptionFormSchema,
  clinicalSettingsSchema,
  reasonSchema,
  toEncounterPayload,
  toPrescriptionPayload,
} from "@/modules/clinical/schemas";

const uuid = z.uuid();
const STALE = "40001";

function clinicalError(error: { code?: string; message?: string } | null): ActionResult<never> {
  if (error?.code === STALE) return { ok: false, error: error.message ?? "La información cambió. Recarga la página." };
  return { ok: false, error: dbErrorMessage(error) };
}

// -----------------------------------------------------------------------------
// Consulta
// -----------------------------------------------------------------------------
export async function startEncounter(
  slug: string,
  input: { patientId: string; locationId: string; appointmentId?: string | null },
): Promise<ActionResult> {
  const result = await withOrgPermission<{ id: string }>(slug, "clinical.write", async () => {
    if (!uuid.safeParse(input.patientId).success || !uuid.safeParse(input.locationId).success) {
      return { ok: false, error: "Elige el paciente y la sede." };
    }
    if (input.appointmentId && !uuid.safeParse(input.appointmentId).success) return { ok: false, error: "Cita no válida." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_encounter", {
      p_patient: input.patientId,
      p_location: input.locationId,
      p_appointment: input.appointmentId ?? null,
    });
    if (error || !data) return clinicalError(error);
    return { ok: true, data: { id: data } };
  });
  if (result.ok && result.data) redirect(`/${slug}/consultas/${result.data.id}`);
  return result.ok ? { ok: true } : result;
}

async function saveDraft(encounterId: string, version: number, input: unknown) {
  const parsed = encounterFormSchema.safeParse(input);
  if (!parsed.success) return { result: invalidInput(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_encounter_draft", {
    p_encounter: encounterId,
    p_version: version,
    p_payload: toEncounterPayload(parsed.data) as unknown as Json,
  });
  if (error || data === null) return { result: clinicalError(error) };
  return { version: data };
}

export async function saveEncounter(slug: string, encounterId: string, version: number, input: unknown): Promise<ActionResult<{ version: number }>> {
  return withOrgPermission<{ version: number }>(slug, "clinical.write", async () => {
    const saved = await saveDraft(encounterId, version, input);
    if (!("version" in saved) || saved.version === undefined) return saved.result!;
    return { ok: true, data: { version: saved.version }, message: "Borrador guardado." };
  });
}

export async function finalizeEncounter(slug: string, encounterId: string, version: number, input: unknown): Promise<ActionResult> {
  const result = await withOrgPermission(slug, "clinical.write", async () => {
    const saved = await saveDraft(encounterId, version, input);
    if (!("version" in saved) || saved.version === undefined) return saved.result!;
    const supabase = await createClient();
    const { error } = await supabase.rpc("finalize_encounter", { p_encounter: encounterId, p_version: saved.version });
    if (error) {
      // El borrador quedó guardado; se informa qué falta para finalizar.
      return { ok: false, error: `${dbErrorMessage(error)} Los cambios quedaron guardados como borrador.` };
    }
    return { ok: true };
  });
  revalidatePath(`/${slug}/consultas/${encounterId}`);
  if (result.ok) redirect(`/${slug}/consultas/${encounterId}`);
  return result;
}

export async function annulEncounterDraft(slug: string, encounterId: string, version: number, reason: string): Promise<ActionResult> {
  const result = await withOrgPermission(slug, "clinical.write", async () => {
    const r = reasonSchema.safeParse(reason);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Motivo no válido." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("annul_encounter_draft", { p_encounter: encounterId, p_version: version, p_reason: r.data });
    if (error) return clinicalError(error);
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath(`/${slug}/consultas/${encounterId}`);
    redirect(`/${slug}/consultas/${encounterId}`);
  }
  return result;
}

export async function addAmendment(slug: string, encounterId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "clinical.write", async () => {
    const parsed = amendmentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("add_encounter_amendment", {
      p_encounter: encounterId,
      p_reason: parsed.data.reason,
      p_content: parsed.data.content,
    });
    if (error) return clinicalError(error);
    revalidatePath(`/${slug}/consultas/${encounterId}`);
    return { ok: true, message: "Adenda registrada." };
  });
}

// -----------------------------------------------------------------------------
// Fórmula
// -----------------------------------------------------------------------------
type NewPrescription = { patientId: string; origin: "interna" | "externa"; encounterId?: string | null };

export async function savePrescription(
  slug: string,
  target: { id: string; draftVersion: number } | NewPrescription,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const origin = "origin" in target ? target.origin : null;
  const permission = origin === "externa" ? "prescription.external" : origin === "interna" ? "prescription.write" : "prescription.read";
  const result = await withOrgPermission<{ id: string }>(slug, permission, async () => {
    const parsed = prescriptionFormSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const payload = toPrescriptionPayload(parsed.data);

    if ("origin" in target && target.origin === "externa" && !payload.external_issuer_name) {
      return { ok: false, error: "Escribe quién emitió la fórmula externa.", fieldErrors: { externalIssuerName: "Requerido" } };
    }

    const supabase = await createClient();
    const { data, error } =
      "id" in target
        ? await supabase.rpc("save_prescription_draft", {
            p_prescription: target.id,
            p_draft_version: target.draftVersion,
            p_payload: payload as unknown as Json,
          })
        : await supabase.rpc("save_prescription_draft", {
            p_prescription: null,
            p_draft_version: null,
            p_payload: {
              ...payload,
              patient_id: target.patientId,
              origin: target.origin,
              encounter_id: target.encounterId ?? null,
            } as unknown as Json,
          });
    if (error || !data) return clinicalError(error);
    return { ok: true, data: { id: data }, message: "Borrador de fórmula guardado." };
  });
  if (result.ok && result.data && !("id" in target)) redirect(`/${slug}/formulas/${result.data.id}`);
  if (result.ok && "id" in target) revalidatePath(`/${slug}/formulas/${target.id}`);
  return result;
}

export async function validatePrescription(slug: string, id: string, draftVersion: number, input: unknown): Promise<ActionResult> {
  const saved = await savePrescription(slug, { id, draftVersion }, input);
  if (!saved.ok) return saved;
  const result = await withOrgPermission(slug, "prescription.read", async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("validate_prescription", { p_prescription: id, p_draft_version: draftVersion + 1 });
    if (error) return { ok: false, error: `${dbErrorMessage(error)} Los cambios quedaron guardados como borrador.` };
    return { ok: true };
  });
  revalidatePath(`/${slug}/formulas/${id}`);
  if (result.ok) redirect(`/${slug}/formulas/${id}`);
  return result;
}

export async function newPrescriptionVersion(slug: string, id: string, reason: string): Promise<ActionResult> {
  const result = await withOrgPermission<{ id: string }>(slug, "prescription.read", async () => {
    const r = reasonSchema.safeParse(reason);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Motivo no válido." };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("new_prescription_version", { p_prescription: id, p_reason: r.data });
    if (error || !data) return clinicalError(error);
    return { ok: true, data: { id: data } };
  });
  if (result.ok && result.data) redirect(`/${slug}/formulas/${result.data.id}`);
  return result.ok ? { ok: true } : result;
}

export async function annulPrescription(slug: string, id: string, reason: string): Promise<ActionResult> {
  const result = await withOrgPermission(slug, "prescription.read", async () => {
    const r = reasonSchema.safeParse(reason);
    if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "Motivo no válido." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("annul_prescription", { p_prescription: id, p_reason: r.data });
    if (error) return clinicalError(error);
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath(`/${slug}/formulas/${id}`);
    redirect(`/${slug}/formulas/${id}`);
  }
  return result;
}

// -----------------------------------------------------------------------------
// Configuración clínica
// -----------------------------------------------------------------------------
export async function updateClinicalSettings(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "clinical.configure", async (ctx) => {
    const parsed = clinicalSettingsSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const keys = v.template.map((t) => t.key);
    if (new Set(keys).size !== keys.length) return { ok: false, error: "Hay secciones con la misma clave." };

    const ranges: Record<string, Record<string, number>> = {};
    for (const [field, r] of Object.entries(v.ranges)) {
      const entry: Record<string, number> = {};
      for (const k of ["min", "max", "step"] as const) {
        if (r[k] !== "") entry[k] = Number(r[k].replace(",", "."));
      }
      if (Object.keys(entry).length) ranges[field] = entry;
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_clinical_settings", {
      p_org: ctx.org.id,
      p_av_notation: v.avNotation || null,
      p_cylinder_convention: v.cylinderConvention || null,
      p_require_principal: v.requirePrincipal,
      p_template: v.template as unknown as Json,
      p_ranges: ranges as unknown as Json,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/configuracion/clinica`);
    return { ok: true, message: "Configuración guardada. Notación y rangos aplican desde ya; la plantilla, a las consultas que se inicien desde ahora." };
  });
}
