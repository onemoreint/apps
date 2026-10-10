// Fase F. Criterios de aceptación:
//  11. Los indicadores coinciden con las definiciones documentadas (docs/indicadores.md).
//  12. Toda exportación queda registrada con usuario, motivo y número de filas.
//  13. Las acciones sensibles generan eventos de auditoría.
// Además: indicadores según rol, solicitudes de titulares con plazos y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { asAdmin, closePool, createOrg, createUser, errorCode, inviteAndAccept, queryAs } from "./db";

let orgA: string, orgB: string, locA: string;
let ownerA: string, adminA: string, optoA: string, asistA: string, cajeroA: string, ownerB: string;
let service: string, cash: string, transfer: string, today: string;

const sale = (user: string, discount = 0) =>
  queryAs<{ id: string }>(user, "select public.create_sale($1) as id", [
    JSON.stringify({ location_id: locA, items: [{ product_id: service, quantity: 1, discount_amount: discount }] }),
  ]).then((r) => r.rows[0]!.id);

const pay = (user: string, saleId: string, method: string, amount: number) =>
  queryAs<{ id: string }>(user, "select public.register_payment($1, $2, $3, null) as id", [saleId, method, amount]).then((r) => r.rows[0]!.id);

const indicators = async (user: string, org = orgA) =>
  (await queryAs<{ v: Record<string, unknown> }>(user, "select public.dashboard_indicators($1) as v", [org])).rows[0]!.v;

const summary = async (user: string, org = orgA, from = today, to = today) =>
  (await queryAs<{ v: Record<string, unknown> }>(user, "select public.report_sales_summary($1, $2, $3) as v", [org, from, to])).rows[0]!.v;

beforeAll(async () => {
  await prepareTestDatabase();
  ownerA = await createUser("owner@rep-a.test");
  ownerB = await createUser("owner@rep-b.test");
  orgA = await createOrg(ownerA, "reportes-a");
  orgB = await createOrg(ownerB, "reportes-b");
  locA = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [orgA])).rows[0]!.id;
  adminA = await inviteAndAccept(ownerA, orgA, "admin@rep-a.test", "administrador");
  optoA = await inviteAndAccept(ownerA, orgA, "opto@rep-a.test", "optometra");
  asistA = await inviteAndAccept(ownerA, orgA, "asist@rep-a.test", "asistente");
  cajeroA = await inviteAndAccept(ownerA, orgA, "cajero@rep-a.test", "cajero");
  today = (await asAdmin<{ d: string }>("select private.org_today($1)::text as d", [orgA])).rows[0]!.d;

  service = (await queryAs<{ id: string }>(ownerA,
    "insert into public.products (organization_id, sku, name, kind, unit_price, tracks_stock) values ($1, 'SRV-1', 'Servicio de prueba', 'servicio', 100000, false) returning id",
    [orgA])).rows[0]!.id;
  cash = (await asAdmin<{ id: string }>("select id from public.payment_methods where organization_id = $1 and kind = 'efectivo'", [orgA])).rows[0]!.id;
  transfer = (await asAdmin<{ id: string }>("select id from public.payment_methods where organization_id = $1 and kind <> 'efectivo' order by name limit 1", [orgA])).rows[0]!.id;
  await queryAs(cajeroA, "select public.open_cash_session($1, 0)", [locA]);

  // Escenario conocido del día:
  //   venta 1: 100.000 − 5.000 de descuento, pagada completa (95.000)
  //   venta 2: 100.000, abono de 40.000 → saldo 60.000
  //   venta 3: 100.000, pago de 20.000 revertido y venta anulada
  const s1 = await sale(cajeroA, 5000);
  await pay(cajeroA, s1, cash, 95000);
  const s2 = await sale(cajeroA);
  await pay(cajeroA, s2, cash, 40000);
  const s3 = await sale(cajeroA);
  const p3 = await pay(cajeroA, s3, transfer, 20000);
  await queryAs(adminA, "select public.reverse_payment($1, 'Cobro duplicado')", [p3]);
  await queryAs(adminA, "select public.annul_sale($1, 'Cliente desistió de la compra')", [s3]);
});

afterAll(async () => {
  await closePool();
});

describe("criterio 11: indicadores y reportes", () => {
  it("el resumen de ventas cumple las definiciones", async () => {
    const v = await summary(ownerA);
    expect(v).toMatchObject({
      sales_count: 2,
      gross: 200000,
      discounts: 5000,
      net: 195000,
      annulled_count: 1,
      annulled_total: 100000,
      payments: 155000,
      reversals: 20000,
    });
    expect(Number(v.gross) - Number(v.discounts)).toBe(Number(v.net));
    const byMethod = v.by_method as { method: string; received: number; reversed: number }[];
    expect(byMethod.reduce((a, m) => a + Number(m.received), 0)).toBe(155000);
    expect(byMethod.reduce((a, m) => a + Number(m.reversed), 0)).toBe(20000);
  });

  it("el inicio muestra las mismas cifras que el reporte", async () => {
    const d = await indicators(ownerA);
    expect(d).toMatchObject({
      sales_gross_month: 200000,
      sales_discounts_month: 5000,
      sales_net_month: 195000,
      sales_annulled_month: 100000,
      payments_month: 135000,
      receivables: 60000,
      receivables_count: 1,
    });
  });

  it("reportes por vendedor y por producto cuadran con el total", async () => {
    const seller = await queryAs<{ net: string; sales_count: string }>(adminA, "select * from public.report_by_seller($1, $2, $2)", [orgA, today]);
    expect(seller.rows).toHaveLength(1);
    expect(Number(seller.rows[0]!.net)).toBe(195000);
    const prod = await queryAs<{ quantity: string; net: string }>(adminA, "select * from public.report_by_product($1, $2, $2)", [orgA, today]);
    expect(prod.rows.map((r) => [Number(r.quantity), Number(r.net)])).toEqual([[2, 195000]]);
  });

  it("solo quien tiene reports.financial ve reportes y periodos válidos", async () => {
    for (const u of [cajeroA, asistA, optoA]) {
      expect(await errorCode(summary(u))).toBe("42501");
    }
    expect(await errorCode(summary(ownerA, orgA, today, "2000-01-01"))).toBe("22023");
    expect(await errorCode(summary(ownerA, orgA, "2024-01-01", "2026-01-01"))).toBe("22023");
  });

  it("cada rol recibe solo los indicadores que puede ver", async () => {
    const financial = ["sales_net_month", "payments_month", "receivables"];
    const clinical = ["encounters_open", "encounters_finalized_today"];
    const caj = await indicators(cajeroA);
    for (const k of [...financial, ...clinical]) expect(caj).not.toHaveProperty(k);
    expect(caj).toHaveProperty("appointments_today");
    expect(caj).toHaveProperty("lab_in_process");

    const opto = await indicators(optoA);
    for (const k of financial) expect(opto).not.toHaveProperty(k);
    for (const k of clinical) expect(opto).toHaveProperty(k);

    const owner = await indicators(ownerA);
    for (const k of clinical) expect(owner).not.toHaveProperty(k); // el propietario no es profesional clínico
    for (const k of financial) expect(owner).toHaveProperty(k);
  });
});

describe("criterio 12: exportaciones registradas", () => {
  it("niega la exportación sin permiso o sin motivo suficiente", async () => {
    const call = (u: string, kind: string, reason: string) =>
      queryAs(u, "select public.log_export($1, $2, '{}'::jsonb, 3, $3)", [orgA, kind, reason]);
    expect(await errorCode(call(cajeroA, "ventas", "Conciliación mensual"))).toBe("42501");
    expect(await errorCode(call(asistA, "pacientes", "Revisión de datos de contacto"))).toBe("42501");
    expect(await errorCode(call(adminA, "ventas", "corto"))).toBe("22023");
    // Un tipo desconocido cae en export.clinical, que ningún rol tiene asignado.
    expect(await errorCode(call(adminA, "historias", "Copia de historias clínicas"))).toBe("42501");
  });

  it("registra usuario, tipo, filas y motivo, e inmutable", async () => {
    const id = (await queryAs<{ id: string }>(adminA, "select public.log_export($1, 'pacientes', $2, 42, $3) as id", [
      orgA, JSON.stringify({ q: "todos" }), "Actualización de base de contactos",
    ])).rows[0]!.id;
    const job = await asAdmin("select kind, row_count, reason, created_by from public.export_jobs where id = $1", [id]);
    expect(job.rows[0]).toEqual({ kind: "pacientes", row_count: 42, reason: "Actualización de base de contactos", created_by: adminA });
    const audit = await asAdmin("select actor_id, metadata from public.audit_logs where action = 'export.pacientes' and entity_id = $1", [id]);
    expect(audit.rows[0]).toEqual({ actor_id: adminA, metadata: { rows: 42 } });
    expect(await errorCode(asAdmin("delete from public.export_jobs where id = $1", [id]))).not.toBeNull();
    // El cajero no ve el registro de exportaciones (requiere audit.read); otra óptica tampoco.
    expect((await queryAs(cajeroA, "select id from public.export_jobs")).rows).toEqual([]);
    expect((await queryAs(ownerB, "select id from public.export_jobs")).rows).toEqual([]);
    expect((await queryAs(ownerA, "select id from public.export_jobs")).rows).toHaveLength(1);
  });
});

describe("criterio 13: auditoría de acciones sensibles", () => {
  it("reversiones y anulaciones quedan auditadas con su autor", async () => {
    const r = await asAdmin<{ action: string; actor_id: string }>(
      "select action, actor_id from public.audit_logs where organization_id = $1 and actor_id = $2 order by id", [orgA, adminA]);
    const actions = r.rows.map((x) => x.action);
    expect(actions).toContain("payment.reverse");
    expect(actions).toContain("sale.annul");
    const cajero = await asAdmin<{ action: string }>(
      "select distinct action from public.audit_logs where organization_id = $1 and actor_id = $2", [orgA, cajeroA]);
    expect(cajero.rows.map((x) => x.action)).toEqual(expect.arrayContaining(["cash.open", "payment.register", "sale.create"]));
  });
});

describe("solicitudes de titulares de datos", () => {
  let req: string;

  it("calcula días hábiles sin contar sábados ni domingos", async () => {
    const r = await asAdmin<{ a: string; b: string }>(
      "select private.add_business_days('2026-10-09', 10)::text as a, private.add_business_days('2026-10-10', 1)::text as b");
    expect(r.rows[0]).toEqual({ a: "2026-10-23", b: "2026-10-12" });
  });

  it("la asistente registra y el plazo depende del tipo", async () => {
    const reg = (kind: string) =>
      queryAs<{ id: string }>(asistA, "select public.register_privacy_request($1, $2) as id", [orgA, JSON.stringify({
        requester_name: "Titular de Prueba", requester_doc: "cc1234", kind, description: "Solicita conocer los datos registrados.",
      })]).then((r) => r.rows[0]!.id);
    req = await reg("consulta");
    const claim = await reg("supresion");
    const due = await asAdmin<{ id: string; due: string; expected: string; requester_doc: string }>(
      `select id, due_date::text as due, private.add_business_days(private.org_today(organization_id),
              case kind when 'consulta' then 10 else 15 end)::text as expected, requester_doc
         from public.privacy_requests where id = any($1)`, [[req, claim]]);
    for (const row of due.rows) expect(row.due).toBe(row.expected);
    expect(due.rows[0]!.requester_doc).toBe("CC1234");
    expect(await errorCode(queryAs(cajeroA, "select public.register_privacy_request($1, $2)", [orgA, JSON.stringify({
      requester_name: "Otra", kind: "consulta", description: "Descripción suficiente.",
    })]))).toBe("42501");
  });

  it("solo privacy.manage responde, con respuesta registrada y sin reabrir", async () => {
    expect(await errorCode(queryAs(asistA, "select public.update_privacy_request($1, 'en_tramite', null)", [req]))).toBe("42501");
    expect(await errorCode(queryAs(adminA, "select public.update_privacy_request($1, 'respondida', 'ok')", [req]))).toBe("22023");
    expect(await errorCode(queryAs(adminA, "select public.update_privacy_request($1, 'recibida', null)", [req]))).toBe("22023");
    await queryAs(adminA, "select public.update_privacy_request($1, 'en_tramite', null)", [req]);
    await queryAs(adminA, "select public.update_privacy_request($1, 'respondida', $2)", [req, "Se envió copia de los datos por correo."]);
    const r = await asAdmin("select status, responded_by from public.privacy_requests where id = $1", [req]);
    expect(r.rows[0]).toEqual({ status: "respondida", responded_by: adminA });
    expect(await errorCode(queryAs(adminA, "select public.update_privacy_request($1, 'en_tramite', null)", [req]))).toBe("22023");
    const audit = await asAdmin<{ n: string }>("select count(*) as n from public.audit_logs where entity_id = $1", [req]);
    expect(Number(audit.rows[0]!.n)).toBeGreaterThanOrEqual(3);
  });

  it("no puede modificarse directamente ni verse desde otra óptica", async () => {
    expect(await errorCode(queryAs(adminA, "update public.privacy_requests set status = 'recibida' where id = $1", [req]))).toBe("42501");
    expect((await queryAs(cajeroA, "select id from public.privacy_requests")).rows).toEqual([]);
    expect((await queryAs(ownerB, "select id from public.privacy_requests")).rows).toEqual([]);
    expect(await errorCode(queryAs(ownerB, "select public.update_privacy_request($1, 'en_tramite', null)", [req]))).toBe("42501");
  });
});

describe("aislamiento", () => {
  it("otra óptica no obtiene indicadores ni reportes ajenos", async () => {
    expect(await errorCode(indicators(ownerB, orgA))).toBe("42501");
    expect(await errorCode(summary(ownerB, orgA))).toBe("42501");
    expect(await errorCode(queryAs(ownerB, "select public.log_export($1, 'ventas', '{}'::jsonb, 1, 'Intento de exportación ajena')", [orgA]))).toBe("42501");
    const own = await summary(ownerB, orgB);
    expect(own).toMatchObject({ sales_count: 0, gross: 0, payments: 0 });
  });
});
