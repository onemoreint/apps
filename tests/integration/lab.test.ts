// Fase E. Criterios de aceptación:
//   9. Una orden conserva su historial de estados.
//  10. Un pedido entregado puede identificarse sin borrar sus eventos previos.
// Además: fórmula congelada, control de calidad, entrega con saldo, garantías,
// anulación de ventas y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { asAdmin, closePool, createOrg, createUser, errorCode, inviteAndAccept, queryAs } from "./db";

let orgA: string, orgB: string, locA: string;
let ownerA: string, adminA: string, optoA: string, asistA: string, cajeroA: string, ownerB: string;
let patient: string, rx: string, lab: string, frame: string, lensSvc: string, cash: string;

const statusId = async (org: string, kind: string) =>
  (await asAdmin<{ id: string }>("select id from public.lab_order_statuses where organization_id = $1 and kind = $2 order by position limit 1", [org, kind])).rows[0]!.id;

const orderKind = async (order: string) =>
  (await asAdmin<{ kind: string }>("select s.kind from public.lab_orders o join public.lab_order_statuses s on s.id = o.status_id where o.id = $1", [order])).rows[0]!.kind;

async function newSale(withPatient = true) {
  const r = await queryAs<{ id: string }>(asistA, "select public.create_sale($1) as id", [
    JSON.stringify({
      location_id: locA,
      patient_id: withPatient ? patient : null,
      prescription_id: withPatient ? rx : null,
      items: [
        { product_id: frame, quantity: 1 },
        { product_id: lensSvc, quantity: 1, unit_price: 300000 },
      ],
    }),
  ]);
  return r.rows[0]!.id;
}

const createOrder = (user: string, sale: string, extra: object = {}) =>
  queryAs<{ id: string }>(user, "select public.create_lab_order($1) as id", [
    JSON.stringify({
      sale_id: sale,
      laboratory_id: lab,
      promised_date: "2099-01-15",
      lens_description: "Monofocal antirreflejo 1.56",
      frame_description: "Montura acetato negra",
      ...extra,
    }),
  ]).then((r) => r.rows[0]!.id);

beforeAll(async () => {
  await prepareTestDatabase();
  ownerA = await createUser("owner@lab-a.test");
  ownerB = await createUser("owner@lab-b.test");
  orgA = await createOrg(ownerA, "laboratorio-a");
  orgB = await createOrg(ownerB, "laboratorio-b");
  locA = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [orgA])).rows[0]!.id;
  adminA = await inviteAndAccept(ownerA, orgA, "admin@lab-a.test", "administrador");
  optoA = await inviteAndAccept(ownerA, orgA, "opto@lab-a.test", "optometra");
  asistA = await inviteAndAccept(ownerA, orgA, "asist@lab-a.test", "asistente");
  cajeroA = await inviteAndAccept(ownerA, orgA, "cajero@lab-a.test", "cajero");

  const mem = (await asAdmin<{ id: string }>("select id from public.memberships where organization_id = $1 and user_id = $2", [orgA, optoA])).rows[0]!.id;
  await queryAs(ownerA, "insert into public.professionals (organization_id, membership_id, full_name, doc_type, doc_number) values ($1, $2, 'Laura Gómez', 'CC', '1001')", [orgA, mem]);
  await queryAs(ownerA, "insert into public.consent_texts (organization_id, kind, title, body) values ($1, 'tratamiento_datos', 'Autorización', 'Texto de prueba de autorización de datos personales.')", [orgA]);
  patient = (await queryAs<{ id: string }>(asistA, "insert into public.patients (organization_id, doc_type, doc_number, first_name, first_surname) values ($1, 'CC', '90000001', 'Marta', 'Ríos') returning id", [orgA])).rows[0]!.id;
  const text = (await asAdmin<{ id: string }>("select id from public.consent_texts where organization_id = $1", [orgA])).rows[0]!.id;
  await queryAs(asistA, "insert into public.consents (organization_id, patient_id, consent_text_id, decision, channel) values ($1, $2, $3, 'otorgado', 'firma_presencial')", [orgA, patient, text]);

  rx = (await queryAs<{ id: string }>(optoA, "select public.save_prescription_draft(null, null, $1) as id", [
    JSON.stringify({ patient_id: patient, origin: "interna", lens_type: "monofocal", eyes: [{ eye: "OD", sphere: "-2.00" }, { eye: "OI", sphere: "-1.75" }] }),
  ])).rows[0]!.id;
  await queryAs(optoA, "select public.validate_prescription($1, 1)", [rx]);

  lab = (await queryAs<{ id: string }>(asistA, "insert into public.laboratories (organization_id, name) values ($1, 'Laboratorio Óptico Central') returning id", [orgA])).rows[0]!.id;
  frame = (await queryAs<{ id: string }>(ownerA, "insert into public.products (organization_id, sku, name, kind, unit_price) values ($1, 'MON-1', 'Montura', 'montura', 200000) returning id", [orgA])).rows[0]!.id;
  lensSvc = (await queryAs<{ id: string }>(ownerA, "insert into public.products (organization_id, sku, name, kind, unit_price, tracks_stock) values ($1, 'LEN-1', 'Lentes según fórmula', 'lente_oftalmico', 0, false) returning id", [orgA])).rows[0]!.id;
  await queryAs(asistA, "select public.register_inventory_movement($1, $2, 'entrada', 10, null, 'Compra')", [frame, locA]);
  cash = (await asAdmin<{ id: string }>("select id from public.payment_methods where organization_id = $1 and kind = 'efectivo'", [orgA])).rows[0]!.id;
  await queryAs(cajeroA, "select public.open_cash_session($1, 0)", [locA]);
});

afterAll(async () => {
  await closePool();
});

describe("órdenes de laboratorio", () => {
  it("cada óptica recibe los estados del sistema y puede agregar intermedios", async () => {
    const r = await asAdmin<{ kind: string }>("select kind from public.lab_order_statuses where organization_id = $1 order by position", [orgB]);
    expect(r.rows.map((x) => x.kind)).toEqual(["inicial", "proceso", "proceso", "recibido", "calidad_aprobada", "calidad_rechazada", "entregado", "cancelado"]);
    await queryAs(ownerA, "insert into public.lab_order_statuses (organization_id, name, kind, position) values ($1, 'En biselado', 'proceso', 35)", [orgA]);
    expect(await errorCode(queryAs(ownerA, "insert into public.lab_order_statuses (organization_id, name, kind) values ($1, 'Entregada 2', 'entregado')", [orgA]))).toBe("42501");
    const inicial = await statusId(orgA, "inicial");
    expect(await errorCode(queryAs(ownerA, "update public.lab_order_statuses set is_active = false where id = $1", [inicial]))).toBe("42501");
    await queryAs(ownerA, "update public.lab_order_statuses set name = 'Por enviar' where id = $1", [inicial]);
  });

  it("congela la fórmula: una versión nueva no altera lo pedido", async () => {
    const sale = await newSale();
    const order = await createOrder(asistA, sale);
    const v2 = (await queryAs<{ id: string }>(optoA, "select public.new_prescription_version($1, 'Ajuste OD') as id", [rx])).rows[0]!.id;
    await queryAs(optoA, "select public.save_prescription_draft($1, 1, $2)", [v2, JSON.stringify({ lens_type: "monofocal", eyes: [{ eye: "OD", sphere: "-2.25" }, { eye: "OI", sphere: "-1.75" }] })]);
    await queryAs(optoA, "select public.validate_prescription($1, 2)", [v2]);
    const snap = await asAdmin<{ rx_snapshot: { version: number; eyes: { eye: string; sphere: string }[] } }>("select rx_snapshot from public.lab_orders where id = $1", [order]);
    expect(snap.rows[0]!.rx_snapshot.version).toBe(1);
    expect(snap.rows[0]!.rx_snapshot.eyes.find((e) => e.eye === "OD")!.sphere).toBe(-2);
    expect(await errorCode(asAdmin("update public.lab_orders set lens_description = 'otro' where id = $1", [order]))).toBe("42501");
    rx = v2; // las siguientes órdenes usan la versión vigente
  });

  it("exige fórmula vigente del paciente de la venta", async () => {
    const noPatient = await newSale(false);
    expect(await errorCode(createOrder(asistA, noPatient))).toBe("22023");
    const old = (await asAdmin<{ id: string }>("select id from public.prescriptions where status = 'reemplazada' limit 1")).rows[0]!.id;
    const sale = await newSale();
    expect(await errorCode(createOrder(asistA, sale, { prescription_id: old }))).toBe("22023");
  });
});

describe("criterios 9 y 10: historial y entrega", () => {
  let sale: string;
  let order: string;

  beforeAll(async () => {
    sale = await newSale();
    order = await createOrder(asistA, sale);
  });

  it("los estados de sistema solo cambian por su acción propia", async () => {
    const recibido = await statusId(orgA, "recibido");
    const entregado = await statusId(orgA, "entregado");
    // No se puede hacer control de calidad antes de recibir.
    expect(await errorCode(queryAs(optoA, "select public.record_quality_check($1, 'aprobado', '[]', null)", [order]))).toBe("22023");
    expect(await errorCode(queryAs(asistA, "select public.change_lab_order_status($1, $2, null)", [order, entregado]))).toBe("22023");
    const enviada = (await asAdmin<{ id: string }>("select id from public.lab_order_statuses where organization_id = $1 and name = 'Enviada al laboratorio'", [orgA])).rows[0]!.id;
    await queryAs(asistA, "select public.change_lab_order_status($1, $2, 'Guía 4521')", [order, enviada]);
    await queryAs(asistA, "select public.change_lab_order_status($1, $2, null)", [order, recibido]);
    expect(await errorCode(queryAs(cajeroA, "select public.change_lab_order_status($1, $2, null)", [order, recibido]))).toBe("42501");
  });

  it("un rechazo de calidad devuelve la orden a proceso y queda registrado", async () => {
    expect(await errorCode(queryAs(optoA, "select public.record_quality_check($1, 'rechazado', '[]', '')", [order]))).toBe("22023");
    await queryAs(optoA, "select public.record_quality_check($1, 'rechazado', $2, 'Eje OD desviado 8°')", [order, JSON.stringify([{ item: "Eje OD", ok: false }])]);
    expect(await orderKind(order)).toBe("calidad_rechazada");
    const enviada = (await asAdmin<{ id: string }>("select id from public.lab_order_statuses where organization_id = $1 and name = 'Enviada al laboratorio'", [orgA])).rows[0]!.id;
    await queryAs(asistA, "select public.change_lab_order_status($1, $2, 'Reenvío por eje')", [order, enviada]);
    await queryAs(asistA, "select public.change_lab_order_status($1, $2, null)", [order, await statusId(orgA, "recibido")]);
    await queryAs(optoA, "select public.record_quality_check($1, 'aprobado', $2, null)", [order, JSON.stringify([{ item: "Eje OD", ok: true }])]);
    expect(await orderKind(order)).toBe("calidad_aprobada");
  });

  it("no entrega con saldo salvo autorización de un administrador", async () => {
    expect(await errorCode(queryAs(asistA, "select public.register_delivery($1, $2, 'Marta Ríos', '90000001', null, true)", [sale, order]))).toBe("23514");
    await queryAs(cajeroA, "select public.register_payment($1, $2, 500000, null)", [sale, cash]);
    await queryAs(asistA, "select public.register_delivery($1, $2, 'Marta Ríos', '90000001', 'Se explicó el uso', false)", [sale, order]);
    expect(await orderKind(order)).toBe("entregado");
  });

  it("el pedido entregado conserva todo su historial en orden, con autor", async () => {
    const ev = await asAdmin<{ kind: string; created_by: string }>(
      "select s.kind, e.created_by from public.lab_order_events e join public.lab_order_statuses s on s.id = e.status_id where e.order_id = $1 order by e.created_at",
      [order],
    );
    expect(ev.rows.map((e) => e.kind)).toEqual([
      "inicial", "proceso", "recibido", "calidad_rechazada", "proceso", "recibido", "calidad_aprobada", "entregado",
    ]);
    expect(ev.rows.every((e) => e.created_by)).toBe(true);
    expect(await errorCode(asAdmin("delete from public.lab_order_events where order_id = $1", [order]))).toBe("42501");
    const d = await asAdmin<{ balance_at_delivery: string; received_by_name: string }>("select balance_at_delivery, received_by_name from public.deliveries where lab_order_id = $1", [order]);
    expect(d.rows[0]).toEqual({ balance_at_delivery: "0.00", received_by_name: "Marta Ríos" });
  });

  it("una orden entregada ya no cambia ni se entrega dos veces", async () => {
    expect(await errorCode(queryAs(asistA, "select public.change_lab_order_status($1, $2, null)", [order, await statusId(orgA, "recibido")]))).toBe("22023");
    expect(await errorCode(queryAs(asistA, "select public.cancel_lab_order($1, 'Por error')", [order]))).toBe("22023");
    expect(await errorCode(queryAs(asistA, "select public.register_delivery($1, $2, 'Otra persona', null, null, false)", [sale, order]))).toBe("22023");
  });

  it("el administrador puede autorizar una entrega con saldo, que queda registrada", async () => {
    const s2 = await newSale();
    const o2 = await createOrder(asistA, s2);
    await queryAs(asistA, "select public.change_lab_order_status($1, $2, null)", [o2, await statusId(orgA, "recibido")]);
    await queryAs(optoA, "select public.record_quality_check($1, 'aprobado', '[]', null)", [o2]);
    await queryAs(adminA, "select public.register_delivery($1, $2, 'Marta Ríos', null, 'Paga el saldo el viernes', true)", [s2, o2]);
    const d = await asAdmin<{ balance_at_delivery: string; balance_authorized_by: string }>("select balance_at_delivery, balance_authorized_by from public.deliveries where lab_order_id = $1", [o2]);
    expect(d.rows[0]).toEqual({ balance_at_delivery: "500000.00", balance_authorized_by: adminA });
  });
});

describe("garantías", () => {
  it("abre, gestiona y cierra un caso con su historial", async () => {
    const sale = (await asAdmin<{ id: string }>("select id from public.sales where organization_id = $1 order by number limit 1", [orgA])).rows[0]!.id;
    const w = (await queryAs<{ id: string }>(asistA, "select public.open_warranty($1, null, 'garantia', 'Tornillo de la bisagra flojo') as id", [sale])).rows[0]!.id;
    expect(await errorCode(queryAs(cajeroA, "select public.update_warranty($1, 'resuelta', 'Se cambió el tornillo')", [w]))).toBe("42501");
    await queryAs(asistA, "select public.update_warranty($1, 'en_proceso', 'Enviada al proveedor')", [w]);
    await queryAs(asistA, "select public.update_warranty($1, 'resuelta', 'Proveedor reemplazó la bisagra')", [w]);
    const ev = await asAdmin<{ status: string }>("select status from public.warranty_events where warranty_id = $1 order by created_at", [w]);
    expect(ev.rows.map((e) => e.status)).toEqual(["abierta", "en_proceso", "resuelta"]);
    expect(await errorCode(queryAs(asistA, "select public.update_warranty($1, 'en_proceso', 'Reabrir caso')", [w]))).toBe("22023");
  });
});

describe("anulación de ventas", () => {
  it("exige revertir pagos y cancelar órdenes; devuelve el inventario una vez", async () => {
    const sale = await newSale();
    const order = await createOrder(asistA, sale);
    const payment = (await queryAs<{ id: string }>(cajeroA, "select public.register_payment($1, $2, 100000, null) as id", [sale, cash])).rows[0]!.id;
    const stockBefore = Number((await asAdmin<{ quantity: number }>("select quantity from public.inventory_stock where product_id = $1", [frame])).rows[0]!.quantity);

    expect(await errorCode(queryAs(asistA, "select public.annul_sale($1, 'Cliente desiste')", [sale]))).toBe("42501");
    expect(await errorCode(queryAs(adminA, "select public.annul_sale($1, 'Cliente desiste')", [sale]))).toBe("23514");
    await queryAs(adminA, "select public.open_cash_session($1, 0)", [locA]);
    await queryAs(adminA, "select public.reverse_payment($1, 'Cliente desiste de la compra')", [payment]);
    expect(await errorCode(queryAs(adminA, "select public.annul_sale($1, 'Cliente desiste')", [sale]))).toBe("23514");
    await queryAs(asistA, "select public.cancel_lab_order($1, 'Cliente desiste de la compra')", [order]);
    await queryAs(adminA, "select public.annul_sale($1, 'Cliente desiste')", [sale]);

    const after = Number((await asAdmin<{ quantity: number }>("select quantity from public.inventory_stock where product_id = $1", [frame])).rows[0]!.quantity);
    expect(after).toBe(stockBefore + 1);
    expect((await asAdmin<{ status: string }>("select status from public.sales where id = $1", [sale])).rows[0]!.status).toBe("anulada");
    expect(await errorCode(queryAs(adminA, "select public.annul_sale($1, 'Otra vez')", [sale]))).toBe("22023");
    expect(await errorCode(queryAs(cajeroA, "select public.register_payment($1, $2, 1000, null)", [sale, cash]))).toBe("22023");
  });
});

describe("aislamiento", () => {
  it("B no ve órdenes, eventos, entregas ni garantías de A, ni puede operar sobre ellas", async () => {
    for (const table of ["lab_orders", "lab_order_events", "quality_checks", "deliveries", "warranties", "laboratories"]) {
      const r = await queryAs(ownerB, `select 1 from public.${table} where organization_id = $1`, [orgA]);
      expect(r.rowCount, table).toBe(0);
    }
    const order = (await asAdmin<{ id: string }>("select id from public.lab_orders where organization_id = $1 limit 1", [orgA])).rows[0]!.id;
    expect(await errorCode(queryAs(ownerB, "select public.cancel_lab_order($1, 'Intrusión')", [order]))).toBe("42501");
  });
});
