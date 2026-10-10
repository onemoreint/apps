// Verificación de datos para el Resumen Digital de Atención (RDA) de consulta
// externa, según los elementos de dato que lista el anexo técnico de la
// Res. 1888 de 2025 (numeración de la Res. 866 de 2021).
//
// Esto NO genera ni envía el RDA: solo indica qué datos faltan en OptiConsulta
// para poder construirlo cuando se implemente la integración. La obligatoriedad
// exacta de cada elemento la define la guía de implementación del Ministerio.

export type RdaInput = {
  location: { reps_code: string | null };
  patient: {
    doc_type: string | null;
    doc_number: string | null;
    first_name: string | null;
    first_surname: string | null;
    birth_date: string | null;
    sex_code: string | null;
    nationality_code: string | null;
    residence_country_code: string | null;
    residence_municipality_code: string | null;
    residence_zone_code: string | null;
    payer_code: string | null;
    ethnicity_code: string | null;
    disability_code: string | null;
    occupation_code: string | null;
  };
  encounter: {
    started_at: string | null;
    ended_at: string | null;
    modality_code: string | null;
    service_group_code: string | null;
    environment_code: string | null;
    admission_route_code: string | null;
    care_cause_code: string | null;
    discharge_condition_code: string | null;
  };
  diagnoses: { kind: "principal" | "relacionado"; diagnosis_type_code: string | null }[];
  professional: { doc_type: string | null; doc_number: string | null } | null;
};

export type RdaGap = { element: string; label: string; where: "sede" | "paciente" | "consulta" | "profesional" };

const has = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

export function rdaGaps(input: RdaInput): { missing: RdaGap[]; recommended: RdaGap[] } {
  const missing: RdaGap[] = [];
  const recommended: RdaGap[] = [];
  const need = (ok: boolean, gap: RdaGap) => {
    if (!ok) missing.push(gap);
  };
  const want = (ok: boolean, gap: RdaGap) => {
    if (!ok) recommended.push(gap);
  };
  const { patient: p, encounter: e } = input;

  need(has(input.location.reps_code), { element: "16", label: "Código de habilitación REPS de la sede", where: "sede" });

  need(has(p.doc_type) && has(p.doc_number), { element: "2.1–2.2", label: "Tipo y número de documento", where: "paciente" });
  need(has(p.first_name) && has(p.first_surname), { element: "3.1–3.3", label: "Primer nombre y primer apellido", where: "paciente" });
  need(has(p.birth_date), { element: "4", label: "Fecha de nacimiento", where: "paciente" });
  need(has(p.nationality_code), { element: "1.1", label: "Nacionalidad", where: "paciente" });
  need(has(p.sex_code), { element: "5", label: "Sexo biológico", where: "paciente" });
  need(has(p.residence_country_code), { element: "11.1", label: "País de residencia", where: "paciente" });
  need(has(p.residence_municipality_code), { element: "12.1", label: "Municipio de residencia", where: "paciente" });
  need(has(p.residence_zone_code), { element: "14", label: "Zona territorial de residencia", where: "paciente" });
  want(has(p.payer_code), { element: "15.1", label: "Entidad responsable del plan de beneficios (EAPB)", where: "paciente" });
  want(has(p.ethnicity_code), { element: "13.1", label: "Etnia", where: "paciente" });
  want(has(p.disability_code), { element: "10", label: "Categoría de discapacidad", where: "paciente" });
  want(has(p.occupation_code), { element: "7.1", label: "Ocupación", where: "paciente" });

  need(has(e.started_at) && has(e.ended_at), { element: "17 y 43", label: "Fecha y hora de inicio y fin de la atención", where: "consulta" });
  need(has(e.modality_code), { element: "18.1", label: "Modalidad de la atención", where: "consulta" });
  need(has(e.service_group_code), { element: "18.2", label: "Grupo de servicios", where: "consulta" });
  need(has(e.environment_code), { element: "19", label: "Entorno de la atención", where: "consulta" });
  need(has(e.admission_route_code), { element: "20", label: "Vía de ingreso", where: "consulta" });
  need(has(e.care_cause_code), { element: "21", label: "Causa que motiva la atención", where: "consulta" });
  const principal = input.diagnoses.find((d) => d.kind === "principal");
  need(Boolean(principal), { element: "37.1", label: "Diagnóstico principal CIE-10", where: "consulta" });
  need(Boolean(principal && has(principal.diagnosis_type_code)), { element: "37.3", label: "Tipo de diagnóstico principal", where: "consulta" });
  need(has(e.discharge_condition_code), { element: "41", label: "Condición y destino del usuario", where: "consulta" });

  need(Boolean(input.professional && has(input.professional.doc_type) && has(input.professional.doc_number)), {
    element: "49.1–49.2",
    label: "Documento del profesional que atendió",
    where: "profesional",
  });

  return { missing, recommended };
}
