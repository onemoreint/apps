import { METHODS, VA_ROWS, type EncounterFormValues } from "@/modules/clinical/schemas";
import type { Database, EncounterRow } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
export type TemplateSection = { key: string; label: string; required: boolean };

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

/** Convierte lo guardado en la base en valores del formulario (todo como texto). */
export function toFormValues(
  e: EncounterRow,
  va: Tables["encounter_visual_acuity"]["Row"][],
  rx: Tables["encounter_refractions"]["Row"][],
  dx: Tables["encounter_diagnoses"]["Row"][],
  px: Tables["encounter_procedures"]["Row"][],
  labels: Map<string, string>,
): EncounterFormValues {
  const template = (e.template_snapshot as TemplateSection[]) ?? [];
  const findings = (e.findings as Record<string, string>) ?? {};
  return {
    modalityCode: s(e.modality_code),
    serviceGroupCode: s(e.service_group_code),
    environmentCode: s(e.environment_code),
    admissionRouteCode: s(e.admission_route_code),
    careCauseCode: s(e.care_cause_code),
    dischargeConditionCode: s(e.discharge_condition_code),
    referralProviderCode: s(e.referral_provider_code),
    reasonForVisit: s(e.reason_for_visit),
    currentIllness: s(e.current_illness),
    personalHistory: s(e.personal_history),
    ocularHistory: s(e.ocular_history),
    medications: s(e.medications),
    assessment: s(e.assessment),
    plan: s(e.plan),
    allergies: ((e.allergies as { type_code: string; allergen: string }[]) ?? []).map((a) => ({ typeCode: a.type_code, allergen: a.allergen })),
    familyHistory: ((e.family_history as { cie10_code: string; relationship_code: string }[]) ?? []).map((f) => ({
      cie10Code: f.cie10_code,
      cie10Label: labels.get(`cie10:${f.cie10_code}`) ?? "",
      relationshipCode: f.relationship_code,
    })),
    riskFactors: ((e.risk_factors as { type_code: string; name: string }[]) ?? []).map((r) => ({ typeCode: r.type_code, name: r.name })),
    findings: Object.fromEntries(template.map((t) => [t.key, findings[t.key] ?? ""])),
    visualAcuity: VA_ROWS.map((row) => ({
      ...row,
      value: va.find((v) => v.eye === row.eye && v.distance === row.distance && v.correction === row.correction)?.value ?? "",
    })),
    refractions: METHODS.flatMap((method) =>
      (["OD", "OI"] as const).map((eye) => {
        const r = rx.find((x) => x.method === method && x.eye === eye);
        return {
          method,
          eye,
          sphere: s(r?.sphere),
          cylinder: s(r?.cylinder),
          axis: s(r?.axis),
          addition: s(r?.addition),
          prism: s(r?.prism),
          prismBase: (r?.prism_base ?? "") as "" | "arriba" | "abajo" | "nasal" | "temporal",
          visualAcuity: s(r?.visual_acuity),
        };
      }),
    ),
    diagnoses: dx.map((d) => ({ cie10Code: d.cie10_code, cie10Label: labels.get(`cie10:${d.cie10_code}`) ?? "", typeCode: d.diagnosis_type_code })),
    procedures: px.map((p) => ({ cupsCode: p.cups_code, cupsLabel: labels.get(`cups:${p.cups_code}`) ?? "", mode: p.mode, notes: s(p.notes) })),
  };
}
