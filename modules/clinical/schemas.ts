import { z } from "zod";
import type { RefractionMethod } from "@/lib/supabase/database.types";

// Valores ópticos: el formulario envía texto. Aquí solo se valida la forma
// (número con hasta dos decimales); los rangos clínicos los valida la base
// según la configuración del optómetra.
const DIOPTER_RE = /^[+\-\u2212]?\d{1,2}([.,]\d{1,2})?$/; // acepta el signo menos tipográfico (−)
const MM_RE = /^\d{1,2}([.,]\d)?$/;

export const diopter = z
  .string()
  .trim()
  .refine((v) => v === "" || DIOPTER_RE.test(v), "Número con hasta dos decimales, por ejemplo -1.25");
export const axis = z
  .string()
  .trim()
  .refine((v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 180), "Eje entero de 0 a 180");
export const millimeters = z
  .string()
  .trim()
  .refine((v) => v === "" || MM_RE.test(v), "Milímetros con hasta un decimal, por ejemplo 31.5");
const acuity = z.string().trim().max(20, "Máximo 20 caracteres");
const code = z.string().trim().max(12);
const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);

/** "−1,25" → "-1.25"; "" → null. */
export function num(value: string | undefined): string | null {
  const v = (value ?? "").trim().replace(",", ".").replace("\u2212", "-");
  return v === "" ? null : v;
}

export const EYES = ["OD", "OI"] as const;
export const VA_ROWS = [
  { eye: "OD", distance: "lejos", correction: "sin" },
  { eye: "OI", distance: "lejos", correction: "sin" },
  { eye: "AO", distance: "lejos", correction: "sin" },
  { eye: "OD", distance: "lejos", correction: "con" },
  { eye: "OI", distance: "lejos", correction: "con" },
  { eye: "AO", distance: "lejos", correction: "con" },
  { eye: "OD", distance: "cerca", correction: "sin" },
  { eye: "OI", distance: "cerca", correction: "sin" },
  { eye: "OD", distance: "cerca", correction: "con" },
  { eye: "OI", distance: "cerca", correction: "con" },
  { eye: "OD", distance: "lejos", correction: "estenopeico" },
  { eye: "OI", distance: "lejos", correction: "estenopeico" },
] as const;

export const METHODS: RefractionMethod[] = ["lensometria", "autorrefraccion", "retinoscopia", "subjetivo", "cicloplegia"];

const refractionRow = z.object({
  method: z.enum(["lensometria", "autorrefraccion", "retinoscopia", "subjetivo", "cicloplegia"]),
  eye: z.enum(EYES),
  sphere: diopter,
  cylinder: diopter,
  axis,
  addition: diopter,
  prism: diopter,
  prismBase: z.enum(["", "arriba", "abajo", "nasal", "temporal"]),
  visualAcuity: acuity,
});

export const encounterFormSchema = z.object({
  modalityCode: code,
  serviceGroupCode: code,
  environmentCode: code,
  admissionRouteCode: code,
  careCauseCode: code,
  dischargeConditionCode: code,
  referralProviderCode: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9]{10,12}$/.test(v), "Código REPS de 10 a 12 dígitos"),
  reasonForVisit: text(2000),
  currentIllness: text(4000),
  personalHistory: text(4000),
  ocularHistory: text(4000),
  medications: text(2000),
  assessment: text(4000),
  plan: text(4000),
  allergies: z
    .array(z.object({ typeCode: z.string().min(1, "Elige el tipo"), allergen: z.string().trim().min(1, "Escribe el alérgeno").max(120) }))
    .max(30),
  familyHistory: z
    .array(z.object({ cie10Code: z.string().min(1, "Elige el diagnóstico"), cie10Label: z.string(), relationshipCode: z.string().min(1, "Elige el parentesco") }))
    .max(30),
  riskFactors: z
    .array(z.object({ typeCode: z.string().min(1, "Elige el tipo"), name: z.string().trim().min(1, "Escribe el factor").max(120) }))
    .max(30),
  findings: z.record(z.string(), text(4000)),
  visualAcuity: z.array(z.object({ eye: z.string(), distance: z.string(), correction: z.string(), value: acuity })),
  refractions: z.array(refractionRow),
  diagnoses: z
    .array(z.object({ cie10Code: z.string().min(1, "Elige el diagnóstico"), cie10Label: z.string(), typeCode: z.string().min(1, "Elige el tipo de diagnóstico") }))
    .max(20),
  procedures: z
    .array(z.object({ cupsCode: z.string().min(1, "Elige el procedimiento"), cupsLabel: z.string(), mode: z.enum(["realizado", "ordenado"]), notes: text(300) }))
    .max(20),
});

export type EncounterFormValues = z.input<typeof encounterFormSchema>;

/** Convierte el formulario en el contenido que espera save_encounter_draft(). */
export function toEncounterPayload(v: z.output<typeof encounterFormSchema>) {
  const n = (s: string) => (s.trim() === "" ? null : s.trim());
  return {
    modality_code: n(v.modalityCode),
    service_group_code: n(v.serviceGroupCode),
    environment_code: n(v.environmentCode),
    admission_route_code: n(v.admissionRouteCode),
    care_cause_code: n(v.careCauseCode),
    discharge_condition_code: n(v.dischargeConditionCode),
    referral_provider_code: n(v.referralProviderCode),
    reason_for_visit: n(v.reasonForVisit),
    current_illness: n(v.currentIllness),
    personal_history: n(v.personalHistory),
    ocular_history: n(v.ocularHistory),
    medications: n(v.medications),
    assessment: n(v.assessment),
    plan: n(v.plan),
    allergies: v.allergies.map((a) => ({ type_code: a.typeCode, allergen: a.allergen.trim() })),
    family_history: v.familyHistory.map((f) => ({ cie10_code: f.cie10Code, relationship_code: f.relationshipCode })),
    risk_factors: v.riskFactors.map((r) => ({ type_code: r.typeCode, name: r.name.trim() })),
    findings: Object.fromEntries(Object.entries(v.findings).filter(([, t]) => t.trim() !== "").map(([k, t]) => [k, t.trim()])),
    visual_acuity: v.visualAcuity.filter((r) => r.value.trim() !== "").map((r) => ({ ...r, value: r.value.trim() })),
    refractions: v.refractions.map((r) => ({
      method: r.method,
      eye: r.eye,
      sphere: num(r.sphere),
      cylinder: num(r.cylinder),
      axis: num(r.axis),
      addition: num(r.addition),
      prism: num(r.prism),
      prism_base: r.prismBase || null,
      visual_acuity: n(r.visualAcuity),
    })),
    // El primer diagnóstico es el principal; los demás, relacionados.
    diagnoses: v.diagnoses.map((d, i) => ({
      cie10_code: d.cie10Code,
      kind: i === 0 ? "principal" : "relacionado",
      diagnosis_type_code: d.typeCode,
    })),
    procedures: v.procedures.map((p) => ({ cups_code: p.cupsCode, mode: p.mode, notes: n(p.notes) })),
  };
}

export const amendmentSchema = z.object({
  reason: z.string().trim().min(5, "Explica el motivo (mínimo 5 caracteres)").max(300),
  content: z.string().trim().min(1, "Escribe el contenido de la adenda").max(4000),
});
export type AmendmentInput = z.input<typeof amendmentSchema>;

// -----------------------------------------------------------------------------
// Fórmula
// -----------------------------------------------------------------------------
const rxEye = z.object({
  sphere: diopter,
  cylinder: diopter,
  axis,
  addition: diopter,
  prism: diopter,
  prismBase: z.enum(["", "arriba", "abajo", "nasal", "temporal"]),
  dnp: millimeters,
  height: millimeters,
  visualAcuity: acuity,
});

export const prescriptionFormSchema = z
  .object({
    lensType: z.enum(["", "monofocal", "bifocal", "progresivo", "ocupacional", "otro"]),
    usage: text(200),
    pdFar: millimeters,
    pdNear: millimeters,
    observations: text(1000),
    od: rxEye,
    oi: rxEye,
    externalIssuerName: text(160),
    externalIssuerCard: text(40),
    externalIssuedOn: z.string().trim(),
    cylinderConvention: z.enum(["", "negativo", "positivo"]),
  })
  .superRefine((v, ctx) => {
    for (const eye of ["od", "oi"] as const) {
      const e = v[eye];
      const cyl = num(e.cylinder);
      if (cyl && Number(cyl) !== 0 && !e.axis) ctx.addIssue({ code: "custom", path: [eye, "axis"], message: "Un cilindro requiere eje" });
      if (e.axis && (!cyl || Number(cyl) === 0)) ctx.addIssue({ code: "custom", path: [eye, "cylinder"], message: "Hay eje sin cilindro" });
      const prism = num(e.prism);
      if (prism && Number(prism) !== 0 && !e.prismBase) ctx.addIssue({ code: "custom", path: [eye, "prismBase"], message: "Indica la base del prisma" });
    }
  });

export type PrescriptionFormValues = z.input<typeof prescriptionFormSchema>;

const hasEyeData = (e: z.output<typeof rxEye>) =>
  [e.sphere, e.cylinder, e.axis, e.addition, e.prism, e.dnp, e.height, e.visualAcuity].some((x) => x.trim() !== "");

export function toPrescriptionPayload(v: z.output<typeof prescriptionFormSchema>) {
  const n = (s: string) => (s.trim() === "" ? null : s.trim());
  const eye = (name: "OD" | "OI", e: z.output<typeof rxEye>) => ({
    eye: name,
    sphere: num(e.sphere),
    cylinder: num(e.cylinder),
    axis: num(e.axis),
    addition: num(e.addition),
    prism: num(e.prism),
    prism_base: e.prismBase || null,
    dnp: num(e.dnp),
    height: num(e.height),
    visual_acuity: n(e.visualAcuity),
  });
  return {
    lens_type: v.lensType || null,
    usage: n(v.usage),
    pd_far: num(v.pdFar),
    pd_near: num(v.pdNear),
    observations: n(v.observations),
    eyes: [
      ...(hasEyeData(v.od) ? [eye("OD", v.od)] : []),
      ...(hasEyeData(v.oi) ? [eye("OI", v.oi)] : []),
    ],
    external_issuer_name: n(v.externalIssuerName),
    external_issuer_card: n(v.externalIssuerCard),
    external_issued_on: n(v.externalIssuedOn),
    cylinder_convention: v.cylinderConvention || null,
  };
}

export const reasonSchema = z.string().trim().min(5, "Explica el motivo (mínimo 5 caracteres)").max(300);

// -----------------------------------------------------------------------------
// Configuración clínica
// -----------------------------------------------------------------------------
export const RANGE_FIELDS = ["sphere", "cylinder", "axis", "addition", "prism", "dnp", "height", "pd"] as const;
export const RANGE_LABELS: Record<(typeof RANGE_FIELDS)[number], string> = {
  sphere: "Esfera (D)",
  cylinder: "Cilindro (D)",
  axis: "Eje (°)",
  addition: "Adición (D)",
  prism: "Prisma (Δ)",
  dnp: "DNP por ojo (mm)",
  height: "Altura de montaje (mm)",
  pd: "Distancia pupilar total (mm)",
};
const numberOrEmpty = z.string().trim().refine((v) => v === "" || /^-?\d{1,3}([.,]\d{1,2})?$/.test(v), "Número no válido");

export const clinicalSettingsSchema = z.object({
  avNotation: z.enum(["", "snellen_pies", "snellen_metros", "decimal", "logmar"]),
  cylinderConvention: z.enum(["", "negativo", "positivo"]),
  requirePrincipal: z.boolean(),
  template: z
    .array(
      z.object({
        key: z.string().regex(/^[a-z][a-z0-9_]{1,39}$/, "Clave en minúsculas sin espacios, por ejemplo biomicroscopia"),
        label: z.string().trim().min(2, "Nombre de 2 a 60 caracteres").max(60),
        required: z.boolean(),
      }),
    )
    .max(30),
  ranges: z.record(z.enum(RANGE_FIELDS), z.object({ min: numberOrEmpty, max: numberOrEmpty, step: numberOrEmpty })),
});

export type ClinicalSettingsInput = z.input<typeof clinicalSettingsSchema>;
