"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { emptyToNull } from "@/lib/text";
import { parsePesos } from "@/lib/commerce-labels";
import {
  cashMovementSchema,
  closeCashSchema,
  contactSchema,
  documentSchema,
  movementSchema,
  openCashSchema,
  paymentSchema,
  productSchema,
  productUpdateSchema,
  reasonSchema,
  toItemsPayload,
} from "@/modules/commerce/schemas";

const isUuid = (v: string) => z.uuid().safeParse(v).success;
const BAD_ID: ActionResult = { ok: false, error: "Registro no válido." };

function contactColumns(v: z.output<typeof contactSchema>) {
  return {
    name: v.name,
    nit: emptyToNull(v.nit),
    contact_name: emptyToNull(v.contactName),
    phone: emptyToNull(v.phone),
    email: emptyToNull(v.email),
  };
}

// ---------------------------------------------------------------- Catálogo

export async function createSupplier(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "catalog.manage", async (ctx) => {
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.from("suppliers").insert({ organization_id: ctx.org.id, ...contactColumns(parsed.data) });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/productos`);
    return { ok: true, message: "Proveedor registrado." };
  });
}

export async function createProduct(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "catalog.manage", async (ctx) => {
    const parsed = productSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.from("products").insert({
      organization_id: ctx.org.id,
      sku: v.sku.toUpperCase(),
      name: v.name,
      kind: v.kind,
      brand: emptyToNull(v.brand),
      unit_price: parsePesos(v.unitPrice) ?? 0,
      cost: v.cost === "" ? null : parsePesos(v.cost),
      tracks_stock: v.tracksStock,
      stock_min: Number(v.stockMin),
      supplier_id: emptyToNull(v.supplierId),
    });
    if (error?.code === "23505") return { ok: false, error: "Ya existe un producto con ese código.", fieldErrors: { sku: "Código repetido" } };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/productos`);
    return { ok: true, message: `${v.name} quedó en el catálogo.` };
  });
}

export async function updateProduct(slug: string, productId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "catalog.manage", async (ctx) => {
    if (!isUuid(productId)) return BAD_ID;
    const parsed = productUpdateSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update({
        name: v.name,
        brand: emptyToNull(v.brand),
        unit_price: parsePesos(v.unitPrice) ?? 0,
        cost: v.cost === "" ? null : parsePesos(v.cost),
        stock_min: Number(v.stockMin),
        supplier_id: emptyToNull(v.supplierId),
      })
      .eq("id", productId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Producto no encontrado." };
    revalidatePath(`/${slug}/productos`);
    return { ok: true, message: "Producto actualizado. Las ventas ya hechas conservan su precio." };
  });
}

export async function setProductActive(slug: string, productId: string, active: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "catalog.manage", async (ctx) => {
    if (!isUuid(productId)) return BAD_ID;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: active })
      .eq("id", productId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Producto no encontrado." };
    revalidatePath(`/${slug}/productos`);
    return { ok: true, message: active ? "Producto activado." : "Producto retirado de la venta." };
  });
}

// ---------------------------------------------------------------- Inventario

export async function registerMovement(slug: string, input: unknown): Promise<ActionResult> {
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const v = parsed.data;
  const permission = v.type === "entrada" ? "inventory.receive" : "inventory.adjust";
  return withOrgPermission(slug, permission, async () => {
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_inventory_movement", {
      p_product: v.productId,
      p_location: v.locationId,
      p_type: v.type,
      p_quantity: Number(v.quantity),
      p_unit_cost: v.unitCost === "" ? null : parsePesos(v.unitCost),
      p_reason: emptyToNull(v.reason),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/inventario`);
    return { ok: true, message: "Movimiento registrado." };
  });
}

// ---------------------------------------------------------------- Cotizaciones

export async function saveQuote(slug: string, quoteId: string | null, version: number | null, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "sales.manage", async () => {
    if (quoteId !== null && !isUuid(quoteId)) return BAD_ID;
    const parsed = documentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("save_quote", {
      p_quote: quoteId,
      p_version: version,
      p_payload: toItemsPayload(parsed.data),
    });
    if (error?.code === "40001") return { ok: false, error: "Otra persona modificó la cotización. Recarga la página." };
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/cotizaciones`);
    redirect(`/${slug}/cotizaciones/${data}`);
  });
}

export async function reviewQuoteDiscount(slug: string, quoteId: string, approve: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "discount.approve", async () => {
    if (!isUuid(quoteId)) return BAD_ID;
    const supabase = await createClient();
    const { error } = await supabase.rpc("review_quote_discount", { p_quote: quoteId, p_approve: approve });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/cotizaciones/${quoteId}`);
    return { ok: true, message: approve ? "Descuento aprobado." : "Descuento rechazado." };
  });
}

export async function annulQuote(slug: string, quoteId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "sales.manage", async () => {
    if (!isUuid(quoteId)) return BAD_ID;
    const parsed = reasonSchema.safeParse({ reason });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("annul_quote", { p_quote: quoteId, p_reason: parsed.data.reason });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/cotizaciones/${quoteId}`);
    return { ok: true, message: "Cotización anulada." };
  });
}

// ---------------------------------------------------------------- Ventas

export async function createSale(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "sales.manage", async () => {
    const parsed = documentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", { p_payload: toItemsPayload(parsed.data) });
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas`);
    redirect(`/${slug}/ventas/${data}`);
  });
}

export async function saleFromQuote(slug: string, quoteId: string): Promise<ActionResult> {
  return withOrgPermission(slug, "sales.manage", async () => {
    if (!isUuid(quoteId)) return BAD_ID;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_sale", { p_payload: { quote_id: quoteId } });
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas`);
    redirect(`/${slug}/ventas/${data}`);
  });
}

export async function registerPayment(slug: string, saleId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "payments.register", async () => {
    if (!isUuid(saleId)) return BAD_ID;
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_payment", {
      p_sale: saleId,
      p_method: v.methodId,
      p_amount: parsePesos(v.amount),
      p_reference: emptyToNull(v.reference),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    return { ok: true, message: "Pago registrado. Puedes imprimir el recibo interno." };
  });
}

export async function requestReversal(slug: string, saleId: string, paymentId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "payments.reverse_request", async () => {
    if (!isUuid(paymentId) || !isUuid(saleId)) return BAD_ID;
    const parsed = reasonSchema.safeParse({ reason });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("request_payment_reversal", { p_payment: paymentId, p_reason: parsed.data.reason });
    if (error?.code === "23505") return { ok: false, error: "Ya hay una solicitud pendiente para ese pago." };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    return { ok: true, message: "Solicitud enviada a un administrador." };
  });
}

export async function reversePayment(slug: string, saleId: string, paymentId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "payments.reverse", async () => {
    if (!isUuid(paymentId) || !isUuid(saleId)) return BAD_ID;
    const parsed = reasonSchema.safeParse({ reason });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("reverse_payment", { p_payment: paymentId, p_reason: parsed.data.reason });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    return { ok: true, message: "Pago revertido. El pago original se conserva con su reversión." };
  });
}

export async function rejectReversal(slug: string, saleId: string, requestId: string, note: string): Promise<ActionResult> {
  return withOrgPermission(slug, "payments.reverse", async () => {
    if (!isUuid(requestId) || !isUuid(saleId)) return BAD_ID;
    const parsed = reasonSchema.safeParse({ reason: note });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("reject_reversal_request", { p_request: requestId, p_note: parsed.data.reason });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    return { ok: true, message: "Solicitud rechazada." };
  });
}

export async function annulSale(slug: string, saleId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "payments.reverse", async () => {
    if (!isUuid(saleId)) return BAD_ID;
    const parsed = reasonSchema.safeParse({ reason });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("annul_sale", { p_sale: saleId, p_reason: parsed.data.reason });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    return { ok: true, message: "Venta anulada. El inventario se devolvió." };
  });
}

// ---------------------------------------------------------------- Caja

export async function openCash(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "cash.operate", async () => {
    const parsed = openCashSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("open_cash_session", {
      p_location: parsed.data.locationId,
      p_opening: parsePesos(parsed.data.opening),
    });
    if (error?.code === "23505") return { ok: false, error: "Ya tienes una caja abierta." };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/caja`);
    return { ok: true, message: "Caja abierta." };
  });
}

export async function addCashMovement(slug: string, sessionId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "cash.operate", async () => {
    if (!isUuid(sessionId)) return BAD_ID;
    const parsed = cashMovementSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("add_cash_movement", {
      p_session: sessionId,
      p_kind: parsed.data.kind,
      p_amount: parsePesos(parsed.data.amount),
      p_reason: parsed.data.reason,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/caja`);
    return { ok: true, message: "Movimiento registrado." };
  });
}

export async function closeCash(slug: string, sessionId: string, input: unknown): Promise<ActionResult> {
  // Quién puede cerrar (quien abrió, o cash.read_all) lo decide además la base.
  return withOrgPermission(slug, "cash.operate", async () => {
    if (!isUuid(sessionId)) return BAD_ID;
    const parsed = closeCashSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("close_cash_session", {
      p_session: sessionId,
      p_counts: parsed.data.counts.map((c) => ({ payment_method_id: c.methodId, counted: parsePesos(c.counted) })),
      p_notes: parsed.data.notes,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/caja`);
    return { ok: true, message: "Caja cerrada. El arqueo quedó registrado." };
  });
}
