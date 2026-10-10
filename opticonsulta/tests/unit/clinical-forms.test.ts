import { describe, expect, it } from "vitest";
import {
  encounterFormSchema,
  prescriptionFormSchema,
  toEncounterPayload,
  toPrescriptionPayload,
  METHODS,
  VA_ROWS,
  type EncounterFormValues,
  type PrescriptionFormValues,
} from "@/modules/clinical/schemas";
import { patientSchema, toPatientColumns } from "@/modules/patients/schemas";
import { appointmentSchema } from "@/modules/agenda/schemas";

const emptyRx = { sphere: "", cylinder: "", axis: "", addition: "", prism: "", prismBase: "" as const, visualAcuity: "" };

function encounter(overrides: Partial<EncounterFormValues> = {}): EncounterFormValues {
  return {
    modalityCode: "", serviceGroupCode: "", environmentCode: "", admissionRouteCode: "", careCauseCode: "",
    dischargeConditionCode: "", referralProviderCode: "", reasonForVisit: "", currentIllness: "", personalHistory: "",
    ocularHistory: "", medications: "", assessment: "", plan: "", allergies: [], familyHistory: [], riskFactors: [],
    findings: { biomicroscopia: "" },
    visualAcuity: VA_ROWS.map((r) => ({ ...r, value: "" })),
    refractions: METHODS.flatMap((method) => (["OD", "OI"] as const).map((eye) => ({ method, eye, ...emptyRx }))),
    diagnoses: [],
    procedures: [],
    ...overrides,
  };
}

describe("formulario de consulta", () => {
  it("no envía valores vacíos ni inventa datos", () => {
    const payload = toEncounterPayload(encounterFormSchema.parse(encounter()));
    expect(payload.visual_acuity).toEqual([]);
    expect(payload.findings).toEqual({});
    expect(payload.reason_for_visit).toBeNull();
    expect(payload.refractions.every((r) => r.sphere === null && r.cylinder === null && r.axis === null)).toBe(true);
  });

  it("normaliza coma decimal y signo, y el primer diagnóstico es el principal", () => {
    const values = encounter({
      refractions: [{ method: "subjetivo", eye: "OD", ...emptyRx, sphere: "-1,25", cylinder: "−0.50", axis: "90" }],
      diagnoses: [
        { cie10Code: "A1", cie10Label: "", typeCode: "02" },
        { cie10Code: "B2", cie10Label: "", typeCode: "01" },
      ],
    });
    const payload = toEncounterPayload(encounterFormSchema.parse(values));
    expect(payload.refractions[0]).toMatchObject({ sphere: "-1.25", cylinder: "-0.50", axis: "90" });
    expect(payload.diagnoses.map((d) => d.kind)).toEqual(["principal", "relacionado"]);
  });

  it("rechaza formatos ópticos imposibles", () => {
    const bad = encounter({ refractions: [{ method: "subjetivo", eye: "OD", ...emptyRx, sphere: "abc", axis: "200" }] });
    const r = encounterFormSchema.safeParse(bad);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toEqual(["refractions.0.sphere", "refractions.0.axis"]);
  });
});

describe("formulario de fórmula", () => {
  const eye = { sphere: "", cylinder: "", axis: "", addition: "", prism: "", prismBase: "" as const, dnp: "", height: "", visualAcuity: "" };
  const base: PrescriptionFormValues = {
    lensType: "monofocal", usage: "", pdFar: "", pdNear: "", observations: "", od: { ...eye }, oi: { ...eye },
    externalIssuerName: "", externalIssuerCard: "", externalIssuedOn: "", cylinderConvention: "",
  };

  it("exige eje con cilindro y base con prisma", () => {
    const r = prescriptionFormSchema.safeParse({ ...base, od: { ...eye, sphere: "-1", cylinder: "-0.5" }, oi: { ...eye, prism: "1" } });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toEqual(["od.axis", "oi.prismBase"]);
  });

  it("solo envía los ojos con datos", () => {
    const payload = toPrescriptionPayload(prescriptionFormSchema.parse({ ...base, od: { ...eye, sphere: "+2,00" } }));
    expect(payload.eyes).toEqual([
      { eye: "OD", sphere: "+2.00", cylinder: null, axis: null, addition: null, prism: null, prism_base: null, dnp: null, height: null, visual_acuity: null },
    ]);
  });
});

describe("paciente y cita", () => {
  it("convierte opcionales vacíos en null y normaliza el documento", () => {
    const parsed = patientSchema.parse({
      docType: "CC", docNumber: "ab12345", firstName: "Ana", secondName: "", firstSurname: "Ruiz", secondSurname: "",
      birthDate: "", sexCode: "", genderIdentityCode: "", nationalityCode: "", ethnicityCode: "", ethnicCommunity: "",
      disabilityCode: "", occupationCode: "", residenceCountryCode: "", residenceMunicipalityCode: "05380",
      residenceZoneCode: "", payerCode: "", payerName: "", phone: "", email: "ANA@CORREO.CO", address: "",
      guardianName: "", guardianDoc: "", guardianRelationship: "",
    });
    const cols = toPatientColumns(parsed);
    expect(cols).toMatchObject({ doc_number: "AB12345", second_name: null, birth_date: null, email: "ana@correo.co", residence_municipality_code: "05380" });
  });

  it("rechaza fechas de nacimiento futuras y municipios mal formados", () => {
    const r = patientSchema.safeParse({
      docType: "CC", docNumber: "123456", firstName: "A", secondName: "", firstSurname: "B", secondSurname: "",
      birthDate: "2999-01-01", sexCode: "", genderIdentityCode: "", nationalityCode: "", ethnicityCode: "", ethnicCommunity: "",
      disabilityCode: "", occupationCode: "", residenceCountryCode: "", residenceMunicipalityCode: "5380",
      residenceZoneCode: "", payerCode: "", payerName: "", phone: "", email: "", address: "", guardianName: "", guardianDoc: "", guardianRelationship: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0]).sort()).toEqual(["birthDate", "residenceMunicipalityCode"]);
  });

  it("la cita exige paciente elegido y hora en formato 24 h", () => {
    const r = appointmentSchema.safeParse({ patientId: "", professionalId: crypto.randomUUID(), locationId: crypto.randomUUID(), date: "2026-11-02", time: "9:30", duration: "30", reason: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path[0])).toEqual(["patientId", "time"]);
  });
});
