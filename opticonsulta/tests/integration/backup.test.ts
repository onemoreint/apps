// Criterio 14: un respaldo se restaura en una base nueva y se verifica que
// conserva todas las filas y la integridad de historias, fórmulas e inventario.
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareDatabase, prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { backupDatabase, integrityChecks, restoreDatabase } from "../../scripts/backup-lib.mjs";
import { asAdmin, closePool, createOrg, createUser, inviteAndAccept, queryAs, TEST_DATABASE_URL } from "./db";

const restoreUrl = (() => {
  const u = new URL(TEST_DATABASE_URL);
  u.pathname = "/opticonsulta_restore_test";
  return u.toString();
})();
let dir: string;
let encounter: string;

beforeAll(async () => {
  await prepareTestDatabase();
  await asAdmin(`insert into public.ref_codes (catalog, code, label, source) values
    ('cie10', 'H521', 'Miopía (código de prueba)', 'test'), ('cups', 'TEST01', 'Procedimiento de prueba', 'test')`);
  const owner = await createUser("owner@respaldo.test");
  const org = await createOrg(owner, "respaldo");
  const loc = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [org])).rows[0]!.id;
  const opto = await inviteAndAccept(owner, org, "opto@respaldo.test", "optometra");
  const caja = await inviteAndAccept(owner, org, "caja@respaldo.test", "cajero");
  const mem = (await asAdmin<{ id: string }>("select id from public.memberships where user_id = $1", [opto])).rows[0]!.id;
  await queryAs(owner, "insert into public.professionals (organization_id, membership_id, full_name, doc_type, doc_number) values ($1, $2, 'Profesional Ficticia', 'CC', '9999')", [org, mem]);
  await queryAs(owner, "insert into public.consent_texts (organization_id, kind, title, body) values ($1, 'tratamiento_datos', 'Autorización', 'Texto ficticio de autorización de datos personales.')", [org]);
  const patient = (await queryAs<{ id: string }>(owner, "insert into public.patients (organization_id, doc_type, doc_number, first_name, first_surname, birth_date, sex_code) values ($1, 'CC', '99990001', 'Paciente', 'Ficticio', '1990-01-01', 'H') returning id", [org])).rows[0]!.id;
  const text = (await asAdmin<{ id: string }>("select id from public.consent_texts where organization_id = $1", [org])).rows[0]!.id;
  await queryAs(owner, "insert into public.consents (organization_id, patient_id, consent_text_id, decision, channel) values ($1, $2, $3, 'otorgado', 'firma_presencial')", [org, patient, text]);

  encounter = (await queryAs<{ id: string }>(opto, "select public.start_encounter($1, $2, null) as id", [patient, loc])).rows[0]!.id;
  await queryAs(opto, "select public.save_encounter_draft($1, 1, $2)", [encounter, JSON.stringify({
    modality_code: "01", service_group_code: "01", environment_code: "05", reason_for_visit: "Control (ficticio)",
    refractions: [{ method: "subjetivo", eye: "OD", sphere: "-1.00" }],
    diagnoses: [{ cie10_code: "H521", kind: "principal", diagnosis_type_code: "02" }],
    procedures: [{ cups_code: "TEST01", mode: "realizado" }],
  })]);
  const v = (await asAdmin<{ version: number }>("select version from public.clinical_encounters where id = $1", [encounter])).rows[0]!.version;
  await queryAs(opto, "select public.finalize_encounter($1, $2)", [encounter, v]);
  const rx = (await queryAs<{ id: string }>(opto, "select public.save_prescription_draft(null, null, $1) as id", [JSON.stringify({ patient_id: patient, origin: "interna", lens_type: "monofocal", eyes: [{ eye: "OD", sphere: "-1.00" }, { eye: "OI", sphere: "-0.75" }] })])).rows[0]!.id;
  await queryAs(opto, "select public.validate_prescription($1, 1)", [rx]);

  const frame = (await queryAs<{ id: string }>(owner, "insert into public.products (organization_id, sku, name, kind, unit_price) values ($1, 'MON-1', 'Montura', 'montura', 100000) returning id", [org])).rows[0]!.id;
  await queryAs(owner, "select public.register_inventory_movement($1, $2, 'entrada', 5, null, 'Compra')", [frame, loc]);
  await queryAs(caja, "select public.open_cash_session($1, 0)", [loc]);
  const sale = (await queryAs<{ id: string }>(caja, "select public.create_sale($1) as id", [JSON.stringify({ location_id: loc, patient_id: patient, prescription_id: rx, items: [{ product_id: frame, quantity: 2 }] })])).rows[0]!.id;
  const cash = (await asAdmin<{ id: string }>("select id from public.payment_methods where organization_id = $1 and kind = 'efectivo'", [org])).rows[0]!.id;
  await queryAs(caja, "select public.register_payment($1, $2, 50000, null)", [sale, cash]);

  dir = mkdtempSync(path.join(tmpdir(), "opticonsulta-respaldo-"));
});

afterAll(async () => {
  await closePool();
  rmSync(dir, { recursive: true, force: true });
});

describe("criterio 14: respaldo y restauración verificados", () => {
  it("respalda con manifiesto de filas, integridad y huella", async () => {
    const m = await backupDatabase(TEST_DATABASE_URL, dir);
    expect(m.integrity).toEqual({ encounters_hash_mismatch: 0, prescriptions_hash_mismatch: 0, stock_mismatch: 0 });
    expect(m.counts["public.clinical_encounters"]).toBe(1);
    expect(m.counts["public.payments"]).toBe(1);
    expect(m.counts["auth.users"]).toBe(3);
    expect(m.counts["public.audit_logs"]).toBeGreaterThan(5);
    expect(m.dump.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("restaura en una base nueva con las mismas filas e integridad", async () => {
    await prepareDatabase(restoreUrl);
    const r = await restoreDatabase(restoreUrl, dir);
    expect(r.countDiffs).toEqual([]);
    expect(r.integrityFailures).toEqual([]);
    expect(r.ok).toBe(true);

    const client = new pg.Client({ connectionString: restoreUrl });
    await client.connect();
    try {
      // Las existencias no se duplicaron: los disparadores no se re-ejecutaron.
      const stock = await client.query("select quantity from public.inventory_stock");
      expect(stock.rows.map((x) => x.quantity)).toEqual([3]);
      // Las tablas siguen protegidas después de restaurar.
      await expect(client.query("update public.audit_logs set action = 'x'")).rejects.toThrow();
      // Una alteración del contenido clínico restaurado se detecta.
      await client.query("set session_replication_role = replica");
      await client.query("update public.encounter_refractions set sphere = -3 where encounter_id = $1", [encounter]);
      await client.query("set session_replication_role = origin");
      expect((await integrityChecks(client)).encounters_hash_mismatch).toBe(1);
    } finally {
      await client.end();
    }
  });

  it("rechaza restaurar sobre una base con datos o un respaldo alterado", async () => {
    await expect(restoreDatabase(restoreUrl, dir)).rejects.toThrow(/ya tiene datos/);
    const manifestPath = path.join(dir, "manifiesto.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    writeFileSync(manifestPath, JSON.stringify({ ...manifest, dump: { ...manifest.dump, sha256: "0".repeat(64) } }));
    await prepareDatabase(restoreUrl);
    await expect(restoreDatabase(restoreUrl, dir)).rejects.toThrow(/dañado o fue modificado/);
  });
});
