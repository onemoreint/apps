import { z } from "zod";
import { isValidDate } from "@/lib/tz";
import { emptyToNull } from "@/lib/text";
import type { PatientWritable } from "@/lib/supabase/database.types";

const opt = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`);
const optCode = z.string().trim().max(12);
const DOC_RE = /^[A-Za-z0-9]{3,20}$/;
const PHONE_RE = /^[0-9+() -]{7,20}$/;

// Todos los campos llegan como texto desde el formulario; el servidor convierte.
export const patientSchema = z
  .object({
    docType: z.string().trim().min(1, "Elige el tipo de documento"),
    docNumber: z.string().trim().regex(DOC_RE, "Escribe el número sin puntos ni espacios (3 a 20 caracteres)"),
    firstName: z.string().trim().min(1, "Escribe el primer nombre").max(60),
    secondName: opt(60),
    firstSurname: z.string().trim().min(1, "Escribe el primer apellido").max(60),
    secondSurname: opt(60),
    birthDate: z
      .string()
      .trim()
      .refine((v) => v === "" || isValidDate(v), "Escribe una fecha válida"),
    sexCode: optCode,
    genderIdentityCode: optCode,
    nationalityCode: optCode,
    ethnicityCode: optCode,
    ethnicCommunity: opt(120),
    disabilityCode: optCode,
    occupationCode: optCode,
    residenceCountryCode: optCode,
    residenceMunicipalityCode: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[0-9]{5}$/.test(v), "El código DIVIPOLA del municipio tiene 5 dígitos"),
    residenceZoneCode: optCode,
    payerCode: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[A-Za-z0-9]{3,12}$/.test(v), "Código de 3 a 12 letras o números"),
    payerName: opt(160),
    phone: z.string().trim().refine((v) => v === "" || PHONE_RE.test(v), "Escribe un teléfono de 7 a 20 dígitos"),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || z.email().safeParse(v).success, "Escribe un correo válido"),
    address: opt(200),
    guardianName: opt(120),
    guardianDoc: z.string().trim().refine((v) => v === "" || DOC_RE.test(v), "Documento sin puntos ni espacios"),
    guardianRelationship: opt(60),
  })
  .refine((v) => !v.birthDate || v.birthDate <= new Date().toISOString().slice(0, 10), {
    path: ["birthDate"],
    message: "La fecha de nacimiento no puede ser futura",
  });

export type PatientInput = z.input<typeof patientSchema>;

export function toPatientColumns(v: z.output<typeof patientSchema>): PatientWritable {
  return {
    doc_type: v.docType,
    doc_number: v.docNumber.toUpperCase(),
    first_name: v.firstName,
    second_name: emptyToNull(v.secondName),
    first_surname: v.firstSurname,
    second_surname: emptyToNull(v.secondSurname),
    birth_date: emptyToNull(v.birthDate),
    sex_code: emptyToNull(v.sexCode),
    gender_identity_code: emptyToNull(v.genderIdentityCode),
    nationality_code: emptyToNull(v.nationalityCode),
    ethnicity_code: emptyToNull(v.ethnicityCode),
    ethnic_community: emptyToNull(v.ethnicCommunity),
    disability_code: emptyToNull(v.disabilityCode),
    occupation_code: emptyToNull(v.occupationCode),
    residence_country_code: emptyToNull(v.residenceCountryCode),
    residence_municipality_code: emptyToNull(v.residenceMunicipalityCode),
    residence_zone_code: emptyToNull(v.residenceZoneCode),
    payer_code: emptyToNull(v.payerCode)?.toUpperCase() ?? null,
    payer_name: emptyToNull(v.payerName),
    phone: emptyToNull(v.phone),
    email: emptyToNull(v.email)?.toLowerCase() ?? null,
    address: emptyToNull(v.address),
    guardian_name: emptyToNull(v.guardianName),
    guardian_doc: emptyToNull(v.guardianDoc),
    guardian_relationship: emptyToNull(v.guardianRelationship),
  };
}

export function fromPatientRow(p: PatientWritable): PatientInput {
  const s = (v: string | null | undefined) => v ?? "";
  return {
    docType: p.doc_type,
    docNumber: p.doc_number,
    firstName: p.first_name,
    secondName: s(p.second_name),
    firstSurname: p.first_surname,
    secondSurname: s(p.second_surname),
    birthDate: s(p.birth_date),
    sexCode: s(p.sex_code),
    genderIdentityCode: s(p.gender_identity_code),
    nationalityCode: s(p.nationality_code),
    ethnicityCode: s(p.ethnicity_code),
    ethnicCommunity: s(p.ethnic_community),
    disabilityCode: s(p.disability_code),
    occupationCode: s(p.occupation_code),
    residenceCountryCode: s(p.residence_country_code),
    residenceMunicipalityCode: s(p.residence_municipality_code),
    residenceZoneCode: s(p.residence_zone_code),
    payerCode: s(p.payer_code),
    payerName: s(p.payer_name),
    phone: s(p.phone),
    email: s(p.email),
    address: s(p.address),
    guardianName: s(p.guardian_name),
    guardianDoc: s(p.guardian_doc),
    guardianRelationship: s(p.guardian_relationship),
  };
}

export const consentSchema = z.object({
  consentTextId: z.uuid({ message: "Elige el texto de autorización" }),
  decision: z.enum(["otorgado", "negado"], { message: "Indica si el titular autoriza o no" }),
  channel: z.enum(["firma_presencial", "documento_escaneado", "firma_electronica"], { message: "Indica cómo quedó la constancia" }),
  signedByGuardian: z.boolean(),
});

export type ConsentInput = z.input<typeof consentSchema>;

export const CONSENT_CHANNELS = [
  { value: "firma_presencial", label: "Firma presencial en papel" },
  { value: "documento_escaneado", label: "Documento firmado y escaneado" },
  { value: "firma_electronica", label: "Firma electrónica" },
] as const;
