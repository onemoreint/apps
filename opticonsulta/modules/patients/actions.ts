"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext, can } from "@/lib/authz";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { escapeLike, searchTerms } from "@/lib/text";
import { patientName } from "@/lib/clinical-labels";
import { consentSchema, patientSchema, toPatientColumns } from "@/modules/patients/schemas";

function duplicateDoc(error: { code?: string; message?: string } | null) {
  return error?.code === "23505" && error.message?.includes("doc_type");
}

export async function createPatient(slug: string, input: unknown): Promise<ActionResult> {
  const result = await withOrgPermission<{ id: string }>(slug, "patients.write", async (ctx) => {
    const parsed = patientSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .insert({ organization_id: ctx.org.id, ...toPatientColumns(parsed.data) })
      .select("id")
      .single();
    if (duplicateDoc(error)) {
      return { ok: false, error: "Ya existe un paciente con ese documento.", fieldErrors: { docNumber: "Documento ya registrado" } };
    }
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    return { ok: true, data: { id: data.id } };
  });
  if (result.ok && result.data) redirect(`/${slug}/pacientes/${result.data.id}`);
  return result.ok ? { ok: true } : result;
}

export async function updatePatient(slug: string, patientId: string, version: number, input: unknown): Promise<ActionResult> {
  const result = await withOrgPermission(slug, "patients.write", async (ctx) => {
    const parsed = patientSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("patients")
      .update({ ...toPatientColumns(parsed.data), version })
      .eq("id", patientId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error?.code === "40001") return { ok: false, error: error.message };
    if (duplicateDoc(error)) {
      return { ok: false, error: "Ya existe otro paciente con ese documento.", fieldErrors: { docNumber: "Documento ya registrado" } };
    }
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Paciente no encontrado." };
    return { ok: true };
  });
  if (result.ok) {
    revalidatePath(`/${slug}/pacientes/${patientId}`);
    redirect(`/${slug}/pacientes/${patientId}`);
  }
  return result;
}

export type PatientHit = { id: string; name: string; doc: string };

/** Búsqueda para selectores (agenda). Respeta RLS: requiere patients.read. */
export async function searchPatients(slug: string, q: string): Promise<PatientHit[]> {
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "patients.read")) return [];
  const terms = searchTerms(q);
  if (!terms.length) return [];

  const supabase = await createClient();
  let query = supabase
    .from("patients")
    .select("id, doc_type, doc_number, first_name, second_name, first_surname, second_surname")
    .eq("organization_id", ctx.org.id);
  for (const term of terms) query = query.ilike("search_text", `%${escapeLike(term)}%`);
  const { data } = await query.order("first_surname").limit(10);
  return (data ?? []).map((p) => ({ id: p.id, name: patientName(p), doc: `${p.doc_type} ${p.doc_number}` }));
}

export async function recordConsent(slug: string, patientId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "patients.write", async (ctx) => {
    const parsed = consentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    if (!z.uuid().safeParse(patientId).success) return { ok: false, error: "Paciente no válido." };

    const supabase = await createClient();
    const { error } = await supabase.from("consents").insert({
      organization_id: ctx.org.id,
      patient_id: patientId,
      consent_text_id: parsed.data.consentTextId,
      decision: parsed.data.decision,
      channel: parsed.data.channel,
      signed_by_guardian: parsed.data.signedByGuardian,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/pacientes/${patientId}`);
    return { ok: true, message: parsed.data.decision === "otorgado" ? "Autorización registrada." : "Negativa registrada." };
  });
}

export async function revokeConsent(slug: string, patientId: string, consentId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "patients.write", async () => {
    if (reason.trim().length < 5) return { ok: false, error: "Escribe el motivo de la revocación (mínimo 5 caracteres)." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("revoke_consent", { p_consent: consentId, p_reason: reason.trim() });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/pacientes/${patientId}`);
    return { ok: true, message: "Autorización revocada." };
  });
}
