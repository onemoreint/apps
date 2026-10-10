// Fase D. Criterios de aceptación:
//   5. Una venta calcula correctamente sus totales.
//   6. Un abono reduce correctamente el saldo.
//   7. Una reversión mantiene la trazabilidad financiera.
//   8. Una venta actualiza el inventario una sola vez.
// Además: descuentos autorizados, caja, consecutivos y aislamiento.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepareTestDatabase } from "../../scripts/prepare-test-db.mjs";
import { asAdmin, closePool, createOrg, createUser, errorCode, inviteAndAccept, queryAs } from "./db";

let orgA: string, orgB: string, locA: string, locB: string;
let ownerA: string, adminA: string, cajeroA: string, asistA: string, ownerB: string;
let frame: string, lens: string, service: string;
let cash: string, card: string;

async function product(sku: string, name: string, kind: string, price: number, tracks: boolean) {
  const r = await queryAs<{ id: string }>(
    ownerA,
    `insert into public.products (organization_id, sku, name, kind, unit_price, tracks_stock, stock_min)
     values ($1, $2, $3, $4::public.product_kind, $5, $6, 1) returning id`,
    [orgA, sku, name, kind, price, tracks],
  );
  return r.rows[0]!.id;
}

const sale = (user: string, payload: object) =>
  queryAs<{ id: string }>(user, "select public.create_sale($1) as id", [JSON.stringify(payload)]).then((r) => r.rows[0]!.id);

const balance = async (saleId: string) =>
  (await asAdmin<{ total: string; paid: string; balance: string }>("select total, paid, balance from public.sale_balances where sale_id = $1", [saleId])).rows[0]!;

const stock = async (productId: string) =>
  Number((await asAdmin<{ quantity: number }>("select quantity from public.inventory_stock where product_id = $1 and location_id = $2", [productId, locA])).rows[0]?.quantity ?? 0);

const pay = (user: string, saleId: string, method: string, amount: number) =>
  queryAs<{ id: string }>(user, "select public.register_payment($1, $2, $3, null) as id", [saleId, method, amount]).then((r) => r.rows[0]!.id);

beforeAll(async () => {
  await prepareTestDatabase();
  ownerA = await createUser("owner@com-a.test");
  ownerB = await createUser("owner@com-b.test");
  orgA = await createOrg(ownerA, "comercial-a");
  orgB = await createOrg(ownerB, "comercial-b");
  locA = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [orgA])).rows[0]!.id;
  locB = (await asAdmin<{ id: string }>("select id from public.locations where organization_id = $1", [orgB])).rows[0]!.id;
  adminA = await inviteAndAccept(ownerA, orgA, "admin@com-a.test", "administrador");
  cajeroA = await inviteAndAccept(ownerA, orgA, "cajero@com-a.test", "cajero");
  asistA = await inviteAndAccept(ownerA, orgA, "asist@com-a.test", "asistente");

  frame = await product("MON-001", "Montura acetato negra", "montura", 250000, true);
  lens = await product("LEN-VAR", "Lentes según fórmula", "lente_oftalmico", 0, false);
  service = await product("SER-001", "Ajuste y montaje", "servicio", 80000, false);
  await queryAs(asistA, "select public.register_inventory_movement($1, $2, 'entrada', 5, 120000, 'Compra inicial')", [frame, locA]);

  const m = await asAdmin<{ id: string; kind: string; name: string }>("select id, kind, name from public.payment_methods where organization_id = $1", [orgA]);
  cash = m.rows.find((x) => x.kind === "efectivo")!.id;
  card = m.rows.find((x) => x.name === "Tarjeta débito")!.id;
  await queryAs(cajeroA, "select public.open_cash_session($1, 50000)", [locA]);
});

afterAll(async () => {
  await closePool();
});

describe("criterio 5: totales de la venta", () => {
  it("calcula líneas, subtotal, descuento y total con precios del catálogo", async () => {
    const id = await sale(cajeroA, {
      location_id: locA,
      items: [
        { product_id: frame, quantity: 2, unit_price: 1, discount_amount: 20000 }, // el precio enviado se ignora
        { product_id: service, quantity: 1 },
      ],
    });
    const s = await asAdmin<{ subtotal: string; discount_total: string; total: string }>("select subtotal, discount_total, total from public.sales where id = $1", [id]);
    expect(s.rows[0]).toEqual({ subtotal: "580000.00", discount_total: "20000.00", total: "560000.00" });
    const items = await asAdmin<{ unit_price: string; line_total: string }>("select unit_price, line_total from public.sale_items where sale_id = $1 order by position", [id]);
    expect(items.rows).toEqual([
      { unit_price: "250000.00", line_total: "480000.00" },
      { unit_price: "80000.00", line_total: "80000.00" },
    ]);
  });

  it("un producto de precio variable exige el precio en la línea", async () => {
    expect(await errorCode(sale(cajeroA, { location_id: locA, items: [{ product_id: lens, quantity: 1 }] }))).toBe("22023");
    const id = await sale(cajeroA, { location_id: locA, items: [{ product_id: lens, quantity: 1, unit_price: 380000.4 }] });
    expect((await balance(id)).total).toBe("380000.40");
  });

  it("rechaza descuentos mayores que la línea", async () => {
    expect(await errorCode(sale(cajeroA, { location_id: locA, items: [{ product_id: service, quantity: 1, discount_amount: 90000 }] }))).toBe("22023");
  });

  it("numera las ventas de forma consecutiva por óptica", async () => {
    const r = await asAdmin<{ number: string }>("select number from public.sales where organization_id = $1 order by number", [orgA]);
    expect(r.rows.map((x) => Number(x.number))).toEqual([1, 2]);
  });
});

describe("criterio 6: abonos y saldo", () => {
  it("cada abono reduce el saldo y no se puede pagar de más", async () => {
    const id = await sale(cajeroA, { location_id: locA, items: [{ product_id: service, quantity: 1 }] });
    await pay(cajeroA, id, cash, 30000);
    expect(await balance(id)).toEqual({ total: "80000.00", paid: "30000.00", balance: "50000.00" });
    expect(await errorCode(pay(cajeroA, id, card, 50001))).toBe("22023");
    await pay(cajeroA, id, card, 50000);
    expect((await balance(id)).balance).toBe("0.00");
  });

  it("sin caja abierta no se registran pagos", async () => {
    const id = await sale(asistA, { location_id: locA, items: [{ product_id: service, quantity: 1 }] });
    expect(await errorCode(pay(asistA, id, cash, 1000))).toBe("22023");
  });

  it("cada pago tiene un número de recibo único y consecutivo", async () => {
    const r = await asAdmin<{ receipt_number: string }>("select receipt_number from public.payments where organization_id = $1 order by receipt_number", [orgA]);
    expect(r.rows.map((x) => Number(x.receipt_number))).toEqual([1, 2]);
  });
});

describe("criterio 7: reversión con trazabilidad", () => {
  let saleId: string;
  let paymentId: string;

  beforeAll(async () => {
    saleId = await sale(cajeroA, { location_id: locA, items: [{ product_id: service, quantity: 1 }] });
    paymentId = await pay(cajeroA, saleId, cash, 80000);
  });

  it("el cajero solo puede solicitarla; quien tiene permiso la ejecuta", async () => {
    expect(await errorCode(queryAs(cajeroA, "select public.reverse_payment($1, 'Error de digitación')", [paymentId]))).toBe("42501");
    await queryAs(cajeroA, "select public.request_payment_reversal($1, 'Se cobró dos veces')", [paymentId]);
    // Revertir efectivo exige caja abierta de quien devuelve el dinero.
    expect(await errorCode(queryAs(adminA, "select public.reverse_payment($1, 'Cobro duplicado')", [paymentId]))).toBe("22023");
    await queryAs(adminA, "select public.open_cash_session($1, 0)", [locA]);
    await queryAs(adminA, "select public.reverse_payment($1, 'Cobro duplicado')", [paymentId]);
  });

  it("el saldo vuelve, el pago original se conserva y la solicitud queda aprobada", async () => {
    expect((await balance(saleId)).balance).toBe("80000.00");
    expect((await asAdmin("select 1 from public.payments where id = $1", [paymentId])).rowCount).toBe(1);
    const rev = await asAdmin<{ reversed_by: string; reason: string }>("select reversed_by, reason from public.payment_reversals where payment_id = $1", [paymentId]);
    expect(rev.rows[0]).toEqual({ reversed_by: adminA, reason: "Cobro duplicado" });
    const req = await asAdmin<{ status: string; resolved_by: string }>("select status, resolved_by from public.payment_reversal_requests where payment_id = $1", [paymentId]);
    expect(req.rows[0]).toEqual({ status: "aprobada", resolved_by: adminA });
  });

  it("no se revierte dos veces y nada se edita ni se borra", async () => {
    expect(await errorCode(queryAs(adminA, "select public.reverse_payment($1, 'Otra vez')", [paymentId]))).toBe("22023");
    expect(await errorCode(asAdmin("update public.payments set amount = 1 where id = $1", [paymentId]))).toBe("42501");
    expect(await errorCode(asAdmin("delete from public.payment_reversals where payment_id = $1", [paymentId]))).toBe("42501");
    expect(await errorCode(asAdmin("update public.sales set total = 0 where id = $1", [saleId]))).toBe("42501");
  });

  it("la auditoría registra pago y reversión", async () => {
    const r = await asAdmin<{ action: string }>("select action from public.audit_logs where entity_id = $1 order by id", [paymentId]);
    expect(r.rows.map((x) => x.action)).toEqual(["payment.register", "payment.reversal_request", "payment.reverse"]);
  });
});

describe("criterio 8: inventario una sola vez", () => {
  it("la venta descuenta las existencias una vez y deja el movimiento enlazado", async () => {
    const before = await stock(frame);
    const id = await sale(cajeroA, { location_id: locA, items: [{ product_id: frame, quantity: 1 }] });
    expect(await stock(frame)).toBe(before - 1);
    const mv = await asAdmin<{ id: string; sale_item_id: string }>(
      "select m.id, m.sale_item_id from public.inventory_movements m join public.sale_items si on si.id = m.sale_item_id where si.sale_id = $1",
      [id],
    );
    expect(mv.rowCount).toBe(1);
    // Un segundo descuento del mismo ítem lo rechaza la base.
    const dup = await errorCode(
      asAdmin(
        `insert into public.inventory_movements (organization_id, location_id, product_id, movement_type, quantity, sale_item_id)
         values ($1, $2, $3, 'salida_venta', 1, $4)`,
        [orgA, locA, frame, mv.rows[0]!.sale_item_id],
      ),
    );
    expect(dup).toBe("23505");
    expect(await stock(frame)).toBe(before - 1);
  });

  it("no permite vender más de lo que hay ni tocar productos sin existencias", async () => {
    const available = await stock(frame);
    expect(await errorCode(sale(cajeroA, { location_id: locA, items: [{ product_id: frame, quantity: available + 1 }] }))).toBe("23514");
    expect(await stock(frame)).toBe(available);
    const before = (await asAdmin("select 1 from public.inventory_movements where product_id = $1", [service])).rowCount;
    await sale(cajeroA, { location_id: locA, items: [{ product_id: service, quantity: 3 }] });
    expect((await asAdmin("select 1 from public.inventory_movements where product_id = $1", [service])).rowCount).toBe(before);
  });

  it("los ajustes exigen permiso y motivo; los movimientos no se editan", async () => {
    expect(await errorCode(queryAs(cajeroA, "select public.register_inventory_movement($1, $2, 'ajuste_negativo', 1, null, 'Montura rota')", [frame, locA]))).toBe("42501");
    expect(await errorCode(queryAs(adminA, "select public.register_inventory_movement($1, $2, 'ajuste_negativo', 1, null, '')", [frame, locA]))).toBe("22023");
    await queryAs(adminA, "select public.register_inventory_movement($1, $2, 'ajuste_negativo', 1, null, 'Montura rota en vitrina')", [frame, locA]);
    expect(await errorCode(asAdmin("update public.inventory_movements set quantity = 99 where product_id = $1", [frame]))).toBe("42501");
    expect(await errorCode(queryAs(adminA, "select public.register_inventory_movement($1, $2, 'salida_venta', 1, null, 'x')", [frame, locA]))).toBe("42501");
  });
});

describe("descuentos autorizados", () => {
  it("un descuento sobre el umbral sin permiso exige cotización aprobada", async () => {
    const items = [{ product_id: service, quantity: 1, discount_amount: 12000 }]; // 15 % > 10 %
    expect(await errorCode(sale(asistA, { location_id: locA, items }))).toBe("42501");

    const q = await queryAs<{ id: string }>(asistA, "select public.save_quote(null, null, $1) as id", [JSON.stringify({ location_id: locA, items })]);
    const quote = q.rows[0]!.id;
    const st = await asAdmin<{ discount_status: string; total: string }>("select discount_status, total from public.quotes where id = $1", [quote]);
    expect(st.rows[0]).toEqual({ discount_status: "pendiente", total: "68000.00" });
    expect(await errorCode(sale(asistA, { quote_id: quote }))).toBe("42501");
    expect(await errorCode(queryAs(asistA, "select public.review_quote_discount($1, true)", [quote]))).toBe("42501");

    await queryAs(adminA, "select public.review_quote_discount($1, true)", [quote]);
    const saleId = await sale(asistA, { quote_id: quote });
    const s = await asAdmin<{ total: string; discount_approved_by: string; quote_id: string }>("select total, discount_approved_by, quote_id from public.sales where id = $1", [saleId]);
    expect(s.rows[0]).toEqual({ total: "68000.00", discount_approved_by: adminA, quote_id: quote });
    expect((await asAdmin<{ status: string }>("select status from public.quotes where id = $1", [quote])).rows[0]!.status).toBe("convertida");
    expect(await errorCode(sale(asistA, { quote_id: quote }))).toBe("22023");
  });

  it("un descuento dentro del umbral no requiere aprobación", async () => {
    await sale(asistA, { location_id: locA, items: [{ product_id: service, quantity: 1, discount_amount: 8000 }] });
  });
});

describe("caja", () => {
  it("una persona solo tiene una caja abierta", async () => {
    expect(await errorCode(queryAs(cajeroA, "select public.open_cash_session($1, 0)", [locA]))).toBe("23505");
  });

  it("el cierre calcula lo esperado por medio de pago y guarda la diferencia", async () => {
    const session = (await asAdmin<{ id: string }>("select id from public.cash_sessions where opened_by = $1 and status = 'abierta'", [cajeroA])).rows[0]!.id;
    await queryAs(cajeroA, "select public.add_cash_movement($1, 'egreso', 10000, 'Compra de papelería')", [session]);
    const expected = await queryAs<{ method_kind: string; method_name: string; expected: string }>(
      cajeroA,
      "select method_kind, method_name, expected from public.cash_session_expected($1)",
      [session],
    );
    const efectivo = expected.rows.find((r) => r.method_kind === "efectivo")!;
    // base 50.000 + efectivo 30.000 + 80.000 (pago luego revertido por otra caja) − egreso 10.000
    expect(efectivo.expected).toBe("150000.00");
    const debit = expected.rows.find((r) => r.method_name === "Tarjeta débito")!;
    expect(debit.expected).toBe("50000.00");

    // Conteo: falta $1.000 en efectivo; el datáfono cuadra; los demás medios en cero.
    const methods = await asAdmin<{ id: string; name: string }>("select id, name from public.payment_methods where organization_id = $1", [orgA]);
    const counts = methods.rows.map((m) => ({
      payment_method_id: m.id,
      counted: m.id === cash ? 149000 : m.name === "Tarjeta débito" ? 50000 : 0,
    }));
    await queryAs(cajeroA, "select public.close_cash_session($1, $2, 'Faltan 1.000 en efectivo')", [session, JSON.stringify(counts)]);

    const diff = await asAdmin<{ expected: string; counted: string; difference: string }>(
      "select expected, counted, difference from public.cash_session_counts where session_id = $1 and payment_method_id = $2",
      [session, cash],
    );
    expect(diff.rows[0]).toEqual({ expected: "150000.00", counted: "149000.00", difference: "-1000.00" });
    expect(await errorCode(asAdmin("update public.cash_sessions set opening_amount = 0 where id = $1", [session]))).toBe("42501");
  });

  it("el cajero solo ve sus cajas; el administrador ve todas", async () => {
    const mine = await queryAs<{ opened_by: string }>(cajeroA, "select opened_by from public.cash_sessions");
    expect(new Set(mine.rows.map((r) => r.opened_by))).toEqual(new Set([cajeroA]));
    const all = await queryAs<{ opened_by: string }>(adminA, "select distinct opened_by from public.cash_sessions");
    expect(all.rowCount).toBe(2);
  });
});

describe("aislamiento comercial", () => {
  it("B no ve productos, ventas, pagos, cajas ni existencias de A", async () => {
    for (const table of ["products", "sales", "sale_items", "payments", "payment_reversals", "cash_sessions", "inventory_stock", "inventory_movements", "quotes", "sale_balances"]) {
      const r = await queryAs(ownerB, `select 1 from public.${table} where organization_id = $1`, [orgA]);
      expect(r.rowCount, table).toBe(0);
    }
  });

  it("B no puede vender productos de A ni cobrar ventas de A", async () => {
    expect(await errorCode(sale(ownerB, { location_id: locB, items: [{ product_id: frame, quantity: 1 }] }))).toBe("22023");
    const aSale = (await asAdmin<{ id: string }>("select id from public.sales where organization_id = $1 limit 1", [orgA])).rows[0]!.id;
    await queryAs(ownerB, "select public.open_cash_session($1, 0)", [locB]);
    const bCash = (await asAdmin<{ id: string }>("select id from public.payment_methods where organization_id = $1 and kind = 'efectivo'", [orgB])).rows[0]!.id;
    expect(await errorCode(pay(ownerB, aSale, bCash, 1000))).toBe("42501");
    expect(await errorCode(sale(ownerB, { location_id: locA, items: [{ product_id: frame, quantity: 1 }] }))).toBe("42501");
  });

  it("el cajero no edita el catálogo", async () => {
    const r = await queryAs(cajeroA, "update public.products set unit_price = 1 where id = $1", [frame]);
    expect(r.rowCount).toBe(0);
  });
});
