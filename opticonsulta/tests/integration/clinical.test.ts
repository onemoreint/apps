// Fase C. Criterios de aceptación:
//   2. Un cajero no puede consultar notas clínicas.
//   3. Un profesional autorizado puede registrar una consulta y una fórmula.
//   4. Una fórmula finalizada conserva su historial y autoría.
// Además: inmutabilidad, consentimiento previo, rangos configurables, agenda y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { asAdmin, closePool, createOrg, createUser, errorCode, getPool, inviteAndAccept, queryAs } from "./db";

let orgA: string, orgB: string, locA: string;
let ownerA: string, optoA: string, opto2A: string, cajeroA: string, asistA: string;
let ownerB: string, optoB: string;
let profOpto: string, profOpto2: string;
let patient: string;

async function membershipId(org: string, user: string) {
  const r = await asAdmin<{ id: string }>("select id from public.memberships where organization_id = $1 and user_id = $2", [org, user]);
  return r.rows[0]!.id;
}

async function createProfessional(owner: string, org: string, user: string, name: string, doc: string) {
  const r = await queryAs<{ id: string }>(
    owner,
    `insert into public.professionals (organization_id, membership_id, full_name, doc_type, doc_number, professional_card)
     values ($1, $2, $3, 'CC', $4, 'TP-' || $4) returning id`,
    [org, await membershipId(org, user), name, doc],
  );
  return r.rows[0]!.id;
}

async function createPatient(user: string, org: string, doc: string, first = "José", surname = "Pérez") {
  const r = await queryAs<{ id: string }>(
    user,
    `insert into public.patients (organization_id, doc_type, doc_number, first_name, first_surname, birth_date, sex_code)
     values ($1, 'CC', $2, $3, $4, '1985-04-12', 'H') returning id`,
    [org, doc, first, surname],
  );
  return r.rows[0]!.id;
}

async function grantConsent(user: string, org: string, patientId: string) {
  const text = await asAdmin<{ id: string }>(
    "select id from public.consent_texts where organization_id = $1 and kind = 'tratamiento_datos' and is_active",
    [org],
  );
  const r = await queryAs<{ id: string }>(
    user,
    `insert into public.consents (organization_id, patient_id, consent_text_id, decision, channel)
     values ($1, $2, $3, 'otorgado', 'firma_presencial') returning id`,
    [org, patientId, text.rows[0]!.id],
  );
  return r.rows[0]!.id;
}

async function startEncounter(user: string, patientId: string, appointment: string | null = null) {
  const r = await queryAs<{ id: string }>(user, "select public.start_encounter($1, $2, $3) as id", [patientId, locA, appointment]);
  return r.rows[0]!.id;
}

async function encounterVersion(id: string) {
  const r = await asAdmin<{ version: number }>("select version from public.clinical_encounters where id = $1", [id]);
  return r.rows[0]!.version;
}

const fullPayload = {
  modality_code: "01",
  service_group_code: "01",
  environment_code: "05",
  reason_for_visit: "Visión borrosa de lejos",
  allergies: [{ type_code: "01", allergen: "Penicilina" }],
  family_history: [{ cie10_code: "H521", relationship_code: "01" }],
  findings: { biomicroscopia: "Sin hallazgos", examen_externo: "" },
  visual_acuity: [
    { eye: "OD", distance: "lejos", correction: "sin", value: "20/80" },
    { eye: "OI", distance: "lejos", correction: "sin", value: "20/60" },
  ],
  refractions: [
    { method: "subjetivo", eye: "OD", sphere: "-1.50", cylinder: "-0.75", axis: "180", visual_acuity: "20/20" },
    { method: "subjetivo", eye: "OI", sphere: "-1.25", cylinder: null, axis: null, visual_acuity: "20/20" },
  ],
  diagnoses: [{ cie10_code: "H521", kind: "principal", diagnosis_type_code: "02" }],
  procedures: [{ cups_code: "TEST01", mode: "realizado" }],
  plan: "Corrección óptica",
};

async function saveDraft(user: string, id: string, payload: object = fullPayload) {
  return queryAs(user, "select public.save_encounter_draft($1, $2, $3)", [id, await encounterVersion(id), JSON.stringify(payload)]);
}

async function finalize(user: string, id: string) {
  return queryAs(user, "select public.finalize_encounter($1, $2)", [id, await encounterVersion(id)]);
}

async function rxDraftVersion(id: string) {
  const r = await asAdmin<{ draft_version: number }>("select draft_version from public.prescriptions where id = $1", [id]);
  return r.rows[0]!.draft_version;
}

const rxPayload = (extra: object = {}) => ({
  lens_type: "monofocal",
  pd_far: "63",
  eyes: [
    { eye: "OD", sphere: "-1.50", cylinder: "-0.75", axis: "180" },
    { eye: "OI", sphere: "-1.25" },
  ],
  ...extra,
});

beforeAll(async () => {
  await prepareTestDatabase();
  // Códigos de prueba (en producción vienen de la importación SISPRO).
  await asAdmin(`insert into public.ref_codes (catalog, code, label, source) values
    ('cie10', 'H521', 'Miopía (código de prueba)', 'test'),
    ('cie10', 'H522', 'Astigmatismo (código de prueba)', 'test'),
    ('cups', 'TEST01', 'Procedimiento de prueba', 'test')`);

  ownerA = await createUser("owner@a.test");
  ownerB = await createUser("owner@b.test");
  orgA = await createOrg(ownerA, "optica-clinica-a");
  orgB = await createOrg(ownerB, "optica-clinica-b");
  locA = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [orgA])).rows[0]!.id;

  optoA = await inviteAndAccept(ownerA, orgA, "opto@a.test", "optometra");
  opto2A = await inviteAndAccept(ownerA, orgA, "opto2@a.test", "optometra");
  cajeroA = await inviteAndAccept(ownerA, orgA, "cajero@a.test", "cajero");
  asistA = await inviteAndAccept(ownerA, orgA, "asist@a.test", "asistente");
  optoB = await inviteAndAccept(ownerB, orgB, "opto@b.test", "optometra");

  profOpto = await createProfessional(ownerA, orgA, optoA, "Laura Gómez", "1001");
  profOpto2 = await createProfessional(ownerA, orgA, opto2A, "Andrés Ruiz", "1002");
  await createProfessional(ownerB, orgB, optoB, "Marta Díaz", "2001");

  for (const [owner, org] of [[ownerA, orgA], [ownerB, orgB]] as const) {
    await queryAs(
      owner,
      `insert into public.consent_texts (organization_id, kind, title, body)
       values ($1, 'tratamiento_datos', 'Autorización de datos', 'Texto de prueba para autorización de tratamiento de datos personales.')`,
      [org],
    );
  }

  patient = await createPatient(asistA, orgA, "80000001");
  await grantConsent(asistA, orgA, patient);
});

afterAll(async () => {
  await closePool();
});

describe("criterio 3: el optómetra registra consulta y fórmula", () => {
  it("inicia, guarda y finaliza una consulta con sello de integridad", async () => {
    const id = await startEncounter(optoA, patient);
    await saveDraft(optoA, id);
    await finalize(optoA, id);

    const e = await asAdmin<{ status: string; content_hash: string; professional_id: string; ended_at: string | null }>(
      "select status, content_hash, professional_id, ended_at from public.clinical_encounters where id = $1",
      [id],
    );
    expect(e.rows[0]).toMatchObject({ status: "finalizada", professional_id: profOpto });
    expect(e.rows[0]!.content_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(e.rows[0]!.ended_at).not.toBeNull();

    const children = await queryAs<{ va: string; rx: string; dx: string; px: string }>(
      optoA,
      `select (select count(*) from public.encounter_visual_acuity where encounter_id = $1) as va,
              (select count(*) from public.encounter_refractions where encounter_id = $1) as rx,
              (select count(*) from public.encounter_diagnoses where encounter_id = $1) as dx,
              (select count(*) from public.encounter_procedures where encounter_id = $1) as px`,
      [id],
    );
    expect(children.rows[0]).toEqual({ va: "2", rx: "2", dx: "1", px: "1" });

    const ok = await queryAs<{ ok: boolean }>(optoA, "select public.verify_encounter_integrity($1) as ok", [id]);
    expect(ok.rows[0]!.ok).toBe(true);
  });

  it("los hallazgos vacíos no se guardan y no se autocompleta ningún valor", async () => {
    const id = await startEncounter(optoA, patient);
    await saveDraft(optoA, id);
    const r = await asAdmin<{ findings: Record<string, string> }>("select findings from public.clinical_encounters where id = $1", [id]);
    expect(r.rows[0]!.findings).toEqual({ biomicroscopia: "Sin hallazgos" });
    const oi = await asAdmin<{ cylinder: string | null; axis: number | null }>(
      "select cylinder, axis from public.encounter_refractions where encounter_id = $1 and eye = 'OI'",
      [id],
    );
    expect(oi.rows[0]).toEqual({ cylinder: null, axis: null });
  });

  it("no finaliza sin los datos mínimos y dice cuáles faltan", async () => {
    const id = await startEncounter(optoA, patient);
    try {
      await finalize(optoA, id);
      expect.unreachable();
    } catch (error) {
      const e = error as { code: string; message: string };
      expect(e.code).toBe("23514");
      expect(e.message).toContain("modalidad");
      expect(e.message).toContain("motivo de consulta");
      expect(e.message).toContain("diagnóstico principal");
    }
  });

  it("crea y valida una fórmula desde su consulta", async () => {
    const enc = await startEncounter(optoA, patient);
    const r = await queryAs<{ id: string }>(optoA, "select public.save_prescription_draft(null, null, $1) as id", [
      JSON.stringify(rxPayload({ patient_id: patient, origin: "interna", encounter_id: enc })),
    ]);
    const rx = r.rows[0]!.id;
    await queryAs(optoA, "select public.validate_prescription($1, $2)", [rx, await rxDraftVersion(rx)]);
    const p = await asAdmin<{ status: string; professional_id: string; author_snapshot: { full_name: string; professional_card: string | null } }>(
      "select status, professional_id, author_snapshot from public.prescriptions where id = $1",
      [rx],
    );
    expect(p.rows[0]!.status).toBe("validada");
    expect(p.rows[0]!.professional_id).toBe(profOpto);
    expect(p.rows[0]!.author_snapshot.full_name).toBe("Laura Gómez");
    // La tarjeta no se incluye porque nadie la verificó.
    expect(p.rows[0]!.author_snapshot.professional_card).toBeNull();
  });
});

describe("criterio 2: el cajero no accede a la historia clínica", () => {
  it("no ve consultas, refracciones, diagnósticos ni adendas", async () => {
    for (const table of ["clinical_encounters", "encounter_refractions", "encounter_diagnoses", "encounter_visual_acuity", "encounter_amendments"]) {
      const r = await queryAs(cajeroA, `select 1 from public.${table}`);
      expect(r.rowCount, table).toBe(0);
    }
  });

  it("sí ve los valores de las fórmulas validadas para vender", async () => {
    const r = await queryAs(cajeroA, "select 1 from public.prescription_eyes");
    expect(r.rowCount).toBeGreaterThan(0);
  });

  it("no puede iniciar consultas ni crear fórmulas internas", async () => {
    expect(await errorCode(startEncounter(cajeroA, patient))).toBe("42501");
    expect(
      await errorCode(queryAs(cajeroA, "select public.save_prescription_draft(null, null, $1)", [
        JSON.stringify(rxPayload({ patient_id: patient, origin: "interna" })),
      ])),
    ).toBe("42501");
  });

  it("la propietaria tampoco lee la historia clínica por defecto", async () => {
    const r = await queryAs(ownerA, "select 1 from public.clinical_encounters");
    expect(r.rowCount).toBe(0);
  });
});

describe("autoría e inmutabilidad de la consulta", () => {
  let finalized: string;

  beforeAll(async () => {
    finalized = await startEncounter(optoA, patient);
    await saveDraft(optoA, finalized);
    await finalize(optoA, finalized);
  });

  it("otro optómetra no puede editar el borrador ajeno", async () => {
    const draft = await startEncounter(optoA, patient);
    expect(await errorCode(saveDraft(opto2A, draft))).toBe("42501");
  });

  it("una versión desactualizada se rechaza (concurrencia)", async () => {
    const draft = await startEncounter(optoA, patient);
    await saveDraft(optoA, draft);
    expect(
      await errorCode(queryAs(optoA, "select public.save_encounter_draft($1, 1, $2)", [draft, JSON.stringify(fullPayload)])),
    ).toBe("40001");
  });

  it("una consulta finalizada no se modifica, ni siquiera como superusuario", async () => {
    expect(await errorCode(saveDraft(optoA, finalized))).toBe("42501");
    expect(await errorCode(asAdmin("update public.clinical_encounters set plan = 'cambiado' where id = $1", [finalized]))).toBe("42501");
    expect(await errorCode(asAdmin("delete from public.encounter_diagnoses where encounter_id = $1", [finalized]))).toBe("42501");
    expect(await errorCode(asAdmin("update public.encounter_refractions set sphere = 0 where encounter_id = $1", [finalized]))).toBe("42501");
    expect(await errorCode(asAdmin("delete from public.clinical_encounters where id = $1", [finalized]))).toBe("42501");
  });

  it("las correcciones son adendas con su propio autor, también inmutables", async () => {
    const r = await queryAs<{ id: string }>(opto2A, "select public.add_encounter_amendment($1, $2, $3) as id", [
      finalized,
      "Corrección de antecedente",
      "El paciente aclara que usa lentes desde 2019.",
    ]);
    const a = await asAdmin<{ professional_id: string }>("select professional_id from public.encounter_amendments where id = $1", [r.rows[0]!.id]);
    expect(a.rows[0]!.professional_id).toBe(profOpto2);
    expect(await errorCode(asAdmin("update public.encounter_amendments set content = 'x' where id = $1", [r.rows[0]!.id]))).toBe("42501");
  });

  it("el sello de integridad detecta una alteración directa", async () => {
    // Simula una alteración por fuera de la aplicación desactivando los triggers.
    const client = await getPool().connect();
    try {
      await client.query("set session_replication_role = replica");
      await client.query("update public.clinical_encounters set plan = 'alterado' where id = $1", [finalized]);
    } finally {
      await client.query("set session_replication_role = origin");
      client.release();
    }
    const ok = await queryAs<{ ok: boolean }>(optoA, "select public.verify_encounter_integrity($1) as ok", [finalized]);
    expect(ok.rows[0]!.ok).toBe(false);
  });
});

describe("criterio 4: la fórmula conserva historial y autoría", () => {
  let v1: string;
  let v2: string;

  beforeAll(async () => {
    const r = await queryAs<{ id: string }>(optoA, "select public.save_prescription_draft(null, null, $1) as id", [
      JSON.stringify(rxPayload({ patient_id: patient, origin: "interna" })),
    ]);
    v1 = r.rows[0]!.id;
    await queryAs(optoA, "select public.validate_prescription($1, $2)", [v1, await rxDraftVersion(v1)]);
  });

  it("una versión nueva queda a nombre de quien corrige y reemplaza a la anterior al validarse", async () => {
    const r = await queryAs<{ id: string }>(opto2A, "select public.new_prescription_version($1, $2) as id", [v1, "Ajuste de cilindro OD"]);
    v2 = r.rows[0]!.id;
    await queryAs(opto2A, "select public.save_prescription_draft($1, $2, $3)", [
      v2,
      await rxDraftVersion(v2),
      JSON.stringify(rxPayload({ eyes: [{ eye: "OD", sphere: "-1.50", cylinder: "-1.00", axis: "175" }, { eye: "OI", sphere: "-1.25" }] })),
    ]);
    await queryAs(opto2A, "select public.validate_prescription($1, $2)", [v2, await rxDraftVersion(v2)]);

    const series = await asAdmin<{ id: string; version: number; status: string; professional_id: string; supersedes_id: string | null }>(
      "select id, version, status, professional_id, supersedes_id from public.prescriptions where series_id = $1 order by version",
      [v1],
    );
    expect(series.rows).toEqual([
      { id: v1, version: 1, status: "reemplazada", professional_id: profOpto, supersedes_id: null },
      { id: v2, version: 2, status: "validada", professional_id: profOpto2, supersedes_id: v1 },
    ]);
  });

  it("la versión anterior conserva sus valores originales y su sello", async () => {
    const eye = await asAdmin<{ cylinder: string; axis: number }>(
      "select cylinder, axis from public.prescription_eyes where prescription_id = $1 and eye = 'OD'",
      [v1],
    );
    expect(eye.rows[0]).toEqual({ cylinder: "-0.75", axis: 180 });
    const hash = await asAdmin<{ same: boolean }>(
      `select content_hash = encode(extensions.digest(private.prescription_document(id)::text, 'sha256'), 'hex') as same
         from public.prescriptions where id = $1`,
      [v1],
    );
    expect(hash.rows[0]!.same).toBe(true);
  });

  it("una fórmula validada o reemplazada no se modifica ni se borra", async () => {
    expect(await errorCode(asAdmin("update public.prescription_eyes set sphere = 0 where prescription_id = $1", [v1]))).toBe("42501");
    expect(await errorCode(asAdmin("update public.prescriptions set usage = 'x' where id = $1", [v2]))).toBe("42501");
    expect(await errorCode(asAdmin("update public.prescriptions set status = 'validada' where id = $1", [v1]))).toBe("42501");
    expect(await errorCode(asAdmin("delete from public.prescriptions where id = $1", [v2]))).toBe("42501");
  });

  it("solo hay un borrador abierto por serie", async () => {
    await queryAs(optoA, "select public.new_prescription_version($1, $2)", [v2, "Segunda corrección"]);
    expect(await errorCode(queryAs(optoA, "select public.new_prescription_version($1, $2)", [v2, "Tercera corrección"]))).toBe("23505");
  });

  it("la tarjeta profesional se imprime solo después de verificarla", async () => {
    await queryAs(ownerA, "select public.verify_professional($1, $2)", [profOpto, "Consulta ReTHUS 2026-10-09"]);
    const r = await queryAs<{ id: string }>(optoA, "select public.save_prescription_draft(null, null, $1) as id", [
      JSON.stringify(rxPayload({ patient_id: patient, origin: "interna" })),
    ]);
    await queryAs(optoA, "select public.validate_prescription($1, $2)", [r.rows[0]!.id, await rxDraftVersion(r.rows[0]!.id)]);
    const p = await asAdmin<{ author_snapshot: { professional_card: string; credential_verified: boolean } }>(
      "select author_snapshot from public.prescriptions where id = $1",
      [r.rows[0]!.id],
    );
    expect(p.rows[0]!.author_snapshot).toMatchObject({ professional_card: "TP-1001", credential_verified: true });

    // Cambiar la tarjeta invalida la verificación.
    await queryAs(ownerA, "update public.professionals set professional_card = 'TP-9999' where id = $1", [profOpto]);
    const v = await asAdmin<{ verified_at: string | null }>("select verified_at from public.professionals where id = $1", [profOpto]);
    expect(v.rows[0]!.verified_at).toBeNull();
  });
});

describe("fórmula externa", () => {
  it("registra la procedencia sin atribuirla a un profesional de la óptica", async () => {
    const r = await queryAs<{ id: string }>(asistA, "select public.save_prescription_draft(null, null, $1) as id", [
      JSON.stringify(rxPayload({ patient_id: patient, origin: "externa", external_issuer_name: "Clínica Oftalmológica Externa", external_issued_on: "2026-09-30" })),
    ]);
    const id = r.rows[0]!.id;
    // Otro usuario con permiso no puede confirmar la transcripción ajena.
    expect(await errorCode(queryAs(optoA, "select public.validate_prescription($1, $2)", [id, await rxDraftVersion(id)]))).toBe("42501");
    await queryAs(asistA, "select public.validate_prescription($1, $2)", [id, await rxDraftVersion(id)]);
    const p = await asAdmin<{ professional_id: string | null; transcribed_by: string; author_snapshot: { external_issuer_name: string } }>(
      "select professional_id, transcribed_by, author_snapshot from public.prescriptions where id = $1",
      [id],
    );
    expect(p.rows[0]!.professional_id).toBeNull();
    expect(p.rows[0]!.transcribed_by).toBe(asistA);
    expect(p.rows[0]!.author_snapshot.external_issuer_name).toBe("Clínica Oftalmológica Externa");
  });

  it("la estructura impide una fórmula externa con profesional interno", async () => {
    const code = await errorCode(
      asAdmin(
        `insert into public.prescriptions (organization_id, patient_id, origin, professional_id, external_issuer_name, series_id)
         values ($1, $2, 'externa', $3, 'Otro', gen_random_uuid())`,
        [orgA, patient, profOpto],
      ),
    );
    expect(code).toBe("23514");
  });
});

describe("validaciones clínicas configurables", () => {
  it("aplica reglas de notación sin necesidad de configuración", async () => {
    const id = await startEncounter(optoA, patient);
    const bad = { ...fullPayload, refractions: [{ method: "subjetivo", eye: "OD", sphere: "-1.00", cylinder: "-0.50" }] };
    expect(await errorCode(saveDraft(optoA, id, bad))).toBe("22023");
    const axisOnly = { ...fullPayload, refractions: [{ method: "subjetivo", eye: "OD", sphere: "-1.00", axis: "90" }] };
    expect(await errorCode(saveDraft(optoA, id, axisOnly))).toBe("22023");
  });

  it("solo quien tiene clinical.configure define rangos, y se aplican", async () => {
    const args = [orgA, "snellen_pies", "negativo", true, JSON.stringify([{ key: "biomicroscopia", label: "Biomicroscopía", required: true }]), JSON.stringify({ sphere: { min: -20, max: 20, step: 0.25 } })];
    const sql = "select public.update_clinical_settings($1, $2, $3, $4, $5, $6)";
    expect(await errorCode(queryAs(ownerA, sql, args))).toBe("42501");
    await queryAs(optoA, sql, args);

    const id = await startEncounter(optoA, patient);
    const offStep = { ...fullPayload, refractions: [{ method: "subjetivo", eye: "OD", sphere: "-1.13" }] };
    expect(await errorCode(saveDraft(optoA, id, offStep))).toBe("22023");
    const badAcuity = { ...fullPayload, visual_acuity: [{ eye: "OD", distance: "lejos", correction: "sin", value: "1.0" }] };
    expect(await errorCode(saveDraft(optoA, id, badAcuity))).toBe("22023");
    const lowVision = { ...fullPayload, visual_acuity: [{ eye: "OD", distance: "lejos", correction: "sin", value: "CD 1m" }] };
    await saveDraft(optoA, id, lowVision);

    // La sección marcada como obligatoria bloquea la finalización si está vacía.
    await saveDraft(optoA, id, { ...fullPayload, findings: {} });
    expect(await errorCode(finalize(optoA, id))).toBe("23514");
  });

  it("rechaza códigos que no están en los catálogos", async () => {
    const id = await startEncounter(optoA, patient);
    const badDx = { ...fullPayload, diagnoses: [{ cie10_code: "ZZZ99", kind: "principal", diagnosis_type_code: "02" }] };
    expect(await errorCode(saveDraft(optoA, id, badDx))).toBe("22023");
    const badModality = { ...fullPayload, modality_code: "99" };
    expect(await errorCode(saveDraft(optoA, id, badModality))).toBe("22023");
  });
});

describe("consentimiento previo", () => {
  it("sin autorización vigente no se inicia consulta ni se crea fórmula", async () => {
    const other = await createPatient(asistA, orgA, "80000002", "Ana", "López");
    expect(await errorCode(startEncounter(optoA, other))).toBe("23514");
    expect(
      await errorCode(queryAs(asistA, "select public.save_prescription_draft(null, null, $1)", [
        JSON.stringify(rxPayload({ patient_id: other, origin: "externa", external_issuer_name: "Externo" })),
      ])),
    ).toBe("23514");

    const consent = await grantConsent(asistA, orgA, other);
    await startEncounter(optoA, other);

    await queryAs(asistA, "select public.revoke_consent($1, $2)", [consent, "Solicitud del titular"]);
    expect(await errorCode(startEncounter(optoA, other))).toBe("23514");
  });

  it("un consentimiento y un texto publicado no se modifican", async () => {
    const c = await asAdmin<{ id: string }>("select id from public.consents where patient_id = $1 limit 1", [patient]);
    expect(await errorCode(asAdmin("update public.consents set decision = 'negado' where id = $1", [c.rows[0]!.id]))).toBe("42501");
    const t = await asAdmin<{ id: string }>("select id from public.consent_texts where organization_id = $1 limit 1", [orgA]);
    expect(await errorCode(asAdmin("update public.consent_texts set body = 'cambiado en secreto, texto largo' where id = $1", [t.rows[0]!.id]))).toBe("42501");
  });

  it("publicar un texto nuevo crea la versión siguiente y desactiva la anterior", async () => {
    await queryAs(
      ownerA,
      `insert into public.consent_texts (organization_id, kind, title, body)
       values ($1, 'tratamiento_datos', 'Autorización v2', 'Texto actualizado por el asesor jurídico de la óptica.')`,
      [orgA],
    );
    const r = await asAdmin<{ version: number; is_active: boolean }>(
      "select version, is_active from public.consent_texts where organization_id = $1 and kind = 'tratamiento_datos' order by version",
      [orgA],
    );
    expect(r.rows).toEqual([
      { version: 1, is_active: false },
      { version: 2, is_active: true },
    ]);
  });
});

describe("pacientes", () => {
  it("valida el tipo de documento contra el catálogo e impide duplicados", async () => {
    expect(
      await errorCode(
        queryAs(asistA, "insert into public.patients (organization_id, doc_type, doc_number, first_name, first_surname) values ($1, 'XX', '123456', 'A', 'B')", [orgA]),
      ),
    ).toBe("22023");
    expect(await errorCode(createPatient(asistA, orgA, "80000001"))).toBe("23505");
  });

  it("detecta ediciones concurrentes de la ficha", async () => {
    await queryAs(asistA, "update public.patients set phone = '3001234567', version = 1 where id = $1", [patient]);
    expect(await errorCode(queryAs(asistA, "update public.patients set phone = '3007654321', version = 1 where id = $1", [patient]))).toBe("40001");
  });

  it("la búsqueda ignora tildes y mayúsculas", async () => {
    const r = await queryAs<{ id: string }>(asistA, "select id from public.patients where search_text like '%' || private.fold($1) || '%'", ["JOSE perez"]);
    expect(r.rows.map((x) => x.id)).toContain(patient);
  });

  it("el cajero ve pacientes pero no puede editarlos", async () => {
    expect((await queryAs(cajeroA, "select 1 from public.patients where id = $1", [patient])).rowCount).toBe(1);
    const upd = await queryAs(cajeroA, "update public.patients set phone = '3000000000' where id = $1", [patient]);
    expect(upd.rowCount).toBe(0);
  });
});

describe("agenda", () => {
  const at = (h: number, m = 0) => `2026-11-02T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00-05:00`;
  const insert = (user: string, prof: string, start: string, end: string) =>
    queryAs<{ id: string }>(
      user,
      `insert into public.appointments (organization_id, location_id, patient_id, professional_id, starts_at, ends_at)
       values ($1, $2, $3, $4, $5, $6) returning id`,
      [orgA, locA, patient, prof, start, end],
    );

  it("impide citas que se cruzan para el mismo profesional", async () => {
    await insert(asistA, profOpto, at(9), at(9, 30));
    expect(await errorCode(insert(asistA, profOpto, at(9, 15), at(9, 45)))).toBe("23P01");
    await insert(asistA, profOpto2, at(9, 15), at(9, 45));
    await insert(asistA, profOpto, at(9, 30), at(10));
  });

  it("cancelar exige motivo y libera el horario", async () => {
    const r = await insert(asistA, profOpto, at(11), at(11, 30));
    const id = r.rows[0]!.id;
    expect(await errorCode(queryAs(asistA, "update public.appointments set status = 'cancelada' where id = $1", [id]))).toBe("23514");
    await queryAs(asistA, "update public.appointments set status = 'cancelada', cancel_reason = 'Paciente reprograma' where id = $1", [id]);
    await insert(asistA, profOpto, at(11), at(11, 30));
  });

  it("solo iniciar la consulta marca la cita como atendida", async () => {
    const r = await insert(asistA, profOpto, at(14), at(14, 30));
    const id = r.rows[0]!.id;
    expect(await errorCode(queryAs(asistA, "update public.appointments set status = 'atendida' where id = $1", [id]))).toBe("42501");
    expect(await errorCode(startEncounter(opto2A, patient, id))).toBe("42501");
    await startEncounter(optoA, patient, id);
    const s = await asAdmin<{ status: string }>("select status from public.appointments where id = $1", [id]);
    expect(s.rows[0]!.status).toBe("atendida");
    expect(await errorCode(queryAs(asistA, "update public.appointments set reason = 'x' where id = $1", [id]))).toBe("42501");
  });

  it("el cajero ve la agenda pero no agenda citas", async () => {
    expect((await queryAs(cajeroA, "select 1 from public.appointments")).rowCount).toBeGreaterThan(0);
    expect(await errorCode(insert(cajeroA, profOpto, at(16), at(16, 30)))).toBe("42501");
  });
});

describe("aislamiento clínico entre ópticas", () => {
  it("B no ve pacientes, consultas, fórmulas ni citas de A", async () => {
    for (const table of ["patients", "clinical_encounters", "prescriptions", "prescription_eyes", "appointments", "consents", "professionals"]) {
      const r = await queryAs(optoB, `select 1 from public.${table} where organization_id = $1`, [orgA]);
      expect(r.rowCount, table).toBe(0);
      const owner = await queryAs(ownerB, `select 1 from public.${table} where organization_id = $1`, [orgA]);
      expect(owner.rowCount, table).toBe(0);
    }
  });

  it("B no puede iniciar consultas ni fórmulas sobre pacientes de A", async () => {
    expect(await errorCode(startEncounter(optoB, patient))).toBe("42501");
    expect(
      await errorCode(queryAs(optoB, "select public.save_prescription_draft(null, null, $1)", [
        JSON.stringify(rxPayload({ patient_id: patient, origin: "interna" })),
      ])),
    ).toBe("42501");
  });

  it("una cita no puede apuntar a un profesional de otra óptica", async () => {
    const profB = await asAdmin<{ id: string }>("select id from public.professionals where organization_id = $1", [orgB]);
    expect(
      await errorCode(
        queryAs(
          asistA,
          `insert into public.appointments (organization_id, location_id, patient_id, professional_id, starts_at, ends_at)
           values ($1, $2, $3, $4, now() + interval '30 days', now() + interval '30 days 30 minutes')`,
          [orgA, locA, patient, profB.rows[0]!.id],
        ),
      ),
    ).toBe("23503");
  });
});
