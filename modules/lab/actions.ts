"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withOrgPermission } from "@/lib/org-action";
import { dbErrorMessage, invalidInput, type ActionResult } from "@/lib/errors";
import { emptyToNull } from "@/lib/text";
import { contactSchema } from "@/modules/commerce/schemas";
import {
  deliverySchema,
  labOrderSchema,
  QC_ITEMS,
  qualitySchema,
  reasonOnly,
  statusChangeSchema,
  statusNameSchema,
  warrantySchema,
  warrantyUpdateSchema,
} from "@/modules/lab/schemas";

const isUuid = (v: string) => z.uuid().safeParse(v).success;
const BAD_ID: ActionResult = { ok: false, error: "Registro no válido." };

export async function createLaboratory(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "lab.manage", async (ctx) => {
    const parsed = contactSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.from("laboratories").insert({
      organization_id: ctx.org.id,
      name: v.name,
      nit: emptyToNull(v.nit),
      contact_name: emptyToNull(v.contactName),
      phone: emptyToNull(v.phone),
      email: emptyToNull(v.email),
    });
    if (error?.code === "23505") return { ok: false, error: "Ya existe un laboratorio con ese nombre." };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/laboratorio/ajustes`);
    return { ok: true, message: "Laboratorio registrado." };
  });
}

export async function setLaboratoryActive(slug: string, labId: string, active: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "lab.manage", async (ctx) => {
    if (!isUuid(labId)) return BAD_ID;
    const supabase = await createClient();
    const { data, error } = await supabase.from("laboratories").update({ is_active: active }).eq("id", labId).eq("organization_id", ctx.org.id).select("id");
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Laboratorio no encontrado." };
    revalidatePath(`/${slug}/laboratorio/ajustes`);
    return { ok: true };
  });
}

export async function createLabStatus(slug: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    const parsed = statusNameSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.from("lab_order_statuses").insert({
      organization_id: ctx.org.id,
      name: parsed.data.name,
      kind: "proceso",
      position: Number(parsed.data.position),
    });
    if (error?.code === "23505") return { ok: false, error: "Ya existe un estado con ese nombre." };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/laboratorio/ajustes`);
    return { ok: true, message: "Estado agregado." };
  });
}

export async function updateLabStatus(slug: string, statusId: string, input: unknown, active?: boolean): Promise<ActionResult> {
  return withOrgPermission(slug, "settings.manage", async (ctx) => {
    if (!isUuid(statusId)) return BAD_ID;
    const parsed = statusNameSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("lab_order_statuses")
      .update({ name: parsed.data.name, position: Number(parsed.data.position), ...(active === undefined ? {} : { is_active: active }) })
      .eq("id", statusId)
      .eq("organization_id", ctx.org.id)
      .select("id");
    if (error?.code === "23505") return { ok: false, error: "Ya existe un estado con ese nombre." };
    if (error) return { ok: false, error: dbErrorMessage(error) };
    if (!data?.length) return { ok: false, error: "Estado no encontrado." };
    revalidatePath(`/${slug}/laboratorio/ajustes`);
    return { ok: true, message: "Estado actualizado." };
  });
}

export async function createLabOrder(slug: string, saleId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "lab.manage", async () => {
    if (!isUuid(saleId)) return BAD_ID;
    const parsed = labOrderSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_lab_order", {
      p_payload: {
        sale_id: saleId,
        laboratory_id: v.laboratoryId,
        promised_date: v.promisedDate,
        lens_description: v.lensDescription,
        frame_description: emptyToNull(v.frameDescription),
        instructions: emptyToNull(v.instructions),
      },
    });
    if (error || !data) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    redirect(`/${slug}/laboratorio/${data}`);
  });
}

export async function changeLabStatus(slug: string, orderId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "lab.manage", async () => {
    if (!isUuid(orderId)) return BAD_ID;
    const parsed = statusChangeSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("change_lab_order_status", {
      p_order: orderId,
      p_status: parsed.data.statusId,
      p_note: emptyToNull(parsed.data.note),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/laboratorio/${orderId}`);
    revalidatePath(`/${slug}/laboratorio`);
    return { ok: true, message: "Estado actualizado. El historial conserva el anterior." };
  });
}

export async function cancelLabOrder(slug: string, orderId: string, reason: string): Promise<ActionResult> {
  return withOrgPermission(slug, "lab.manage", async () => {
    if (!isUuid(orderId)) return BAD_ID;
    const parsed = reasonOnly.safeParse({ reason });
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_lab_order", { p_order: orderId, p_reason: parsed.data.reason });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/laboratorio/${orderId}`);
    return { ok: true, message: "Orden cancelada." };
  });
}

export async function recordQualityCheck(slug: string, orderId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "delivery.manage", async () => {
    if (!isUuid(orderId)) return BAD_ID;
    const parsed = qualitySchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_quality_check", {
      p_order: orderId,
      p_result: v.result,
      // Se guarda exactamente lo que la persona marcó, con el texto mostrado.
      p_checklist: QC_ITEMS.map((i) => ({ item: i.key, label: i.label, ok: Boolean(v.checks[i.key]) })),
      p_notes: emptyToNull(v.notes),
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/laboratorio/${orderId}`);
    return { ok: true, message: v.result === "aprobado" ? "Control aprobado: la orden quedó lista para entregar." : "Control rechazado y registrado." };
  });
}

export async function registerDelivery(slug: string, saleId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "delivery.handover", async () => {
    if (!isUuid(saleId)) return BAD_ID;
    const parsed = deliverySchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("register_delivery", {
      p_sale: saleId,
      p_order: emptyToNull(v.orderId),
      p_name: v.receivedByName,
      p_doc: emptyToNull(v.receivedByDoc),
      p_notes: emptyToNull(v.notes),
      p_allow_balance: v.allowBalance,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    if (v.orderId) revalidatePath(`/${slug}/laboratorio/${v.orderId}`);
    return { ok: true, message: "Entrega registrada." };
  });
}

export async function openWarranty(slug: string, saleId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "warranty.manage", async () => {
    if (!isUuid(saleId)) return BAD_ID;
    const parsed = warrantySchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const v = parsed.data;
    const supabase = await createClient();
    const { error } = await supabase.rpc("open_warranty", {
      p_sale: saleId,
      p_order: emptyToNull(v.orderId),
      p_kind: v.kind,
      p_description: v.description,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/ventas/${saleId}`);
    revalidatePath(`/${slug}/garantias`);
    return { ok: true, message: "Caso abierto." };
  });
}

export async function updateWarranty(slug: string, warrantyId: string, input: unknown): Promise<ActionResult> {
  return withOrgPermission(slug, "warranty.manage", async () => {
    if (!isUuid(warrantyId)) return BAD_ID;
    const parsed = warrantyUpdateSchema.safeParse(input);
    if (!parsed.success) return invalidInput(parsed.error);
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_warranty", {
      p_warranty: warrantyId,
      p_status: parsed.data.status,
      p_note: parsed.data.note,
    });
    if (error) return { ok: false, error: dbErrorMessage(error) };
    revalidatePath(`/${slug}/garantias`);
    return { ok: true, message: "Caso actualizado." };
  });
}
