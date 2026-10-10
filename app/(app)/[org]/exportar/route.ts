import { NextResponse, type NextRequest } from "next/server";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { patientName } from "@/lib/clinical-labels";
import { addDays, utcToZoned, zonedToUtc } from "@/lib/tz";
import { dbErrorMessage } from "@/lib/errors";
import { EXPORT_KINDS, exportSchema } from "@/modules/reports/schemas";

const MAX_ROWS = 10_000;

function deny(status: number, message: string) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

/**
 * Exportación CSV. Se registra en export_jobs y en auditoría (usuario, tipo,
 * filas y motivo) ANTES de entregar el archivo; si el registro falla, no se entrega.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ org: string }> }) {
  // Protección CSRF: solo formularios enviados desde la propia aplicación.
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return deny(403, "Origen no permitido.");

  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const form = await request.formData();
  const parsed = exportSchema.safeParse(Object.fromEntries(form.entries()));
  if (!parsed.success) return deny(400, parsed.error.issues[0]?.message ?? "Datos no válidos.");
  const { kind, from, to, reason } = parsed.data;
  const kindInfo = EXPORT_KINDS.find((k) => k.value === kind)!;
  if (!can(ctx, "export.data") || !can(ctx, kindInfo.permission)) return deny(403, "Tu rol no permite esta exportación.");

  const tz = ctx.org.timezone;
  const t0 = zonedToUtc(from, "00:00", tz).toISOString();
  const t1 = zonedToUtc(addDays(to, 1), "00:00", tz).toISOString();
  const local = (iso: string) => {
    const z = utcToZoned(iso, tz);
    return `${z.date} ${z.time}`;
  };
  const supabase = await createClient();
  let headers: string[] = [];
  let rows: unknown[][] = [];

  if (kind === "ventas") {
    const { data, error } = await supabase
      .from("sales")
      .select("id, number, created_at, status, subtotal, discount_total, total, annulled_at, annul_reason")
      .eq("organization_id", ctx.org.id)
      .gte("created_at", t0)
      .lt("created_at", t1)
      .order("number")
      .limit(MAX_ROWS);
    if (error) return deny(500, dbErrorMessage(error));
    const ids = (data ?? []).map((s) => s.id);
    const { data: bal } = ids.length ? await supabase.from("sale_balances").select("sale_id, paid, balance").in("sale_id", ids) : { data: [] };
    const b = new Map((bal ?? []).map((x) => [x.sale_id, x]));
    headers = ["Número", "Fecha", "Estado", "Subtotal", "Descuentos", "Total", "Pagado", "Saldo", "Anulada el", "Motivo de anulación"];
    rows = (data ?? []).map((s) => [
      s.number, local(s.created_at), s.status, s.subtotal, s.discount_total, s.total,
      b.get(s.id)?.paid ?? 0, s.status === "confirmada" ? b.get(s.id)?.balance ?? 0 : 0,
      s.annulled_at ? local(s.annulled_at) : "", s.annul_reason ?? "",
    ]);
  } else if (kind === "pagos") {
    const [{ data, error }, { data: methods }] = await Promise.all([
      supabase
        .from("payments")
        .select("id, receipt_number, sale_id, created_at, payment_method_id, amount, reference")
        .eq("organization_id", ctx.org.id)
        .gte("created_at", t0)
        .lt("created_at", t1)
        .order("receipt_number")
        .limit(MAX_ROWS),
      supabase.from("payment_methods").select("id, name").eq("organization_id", ctx.org.id),
    ]);
    if (error) return deny(500, dbErrorMessage(error));
    const ids = (data ?? []).map((p) => p.id);
    const saleIds = [...new Set((data ?? []).map((p) => p.sale_id))];
    const [{ data: revs }, { data: sales }] = await Promise.all([
      ids.length ? supabase.from("payment_reversals").select("payment_id, created_at, reason").in("payment_id", ids) : Promise.resolve({ data: [] }),
      saleIds.length ? supabase.from("sales").select("id, number").in("id", saleIds) : Promise.resolve({ data: [] }),
    ]);
    const rev = new Map((revs ?? []).map((r) => [r.payment_id, r]));
    const sale = new Map((sales ?? []).map((s) => [s.id, s.number]));
    const method = new Map((methods ?? []).map((m) => [m.id, m.name]));
    headers = ["Recibo", "Venta", "Fecha", "Medio", "Valor", "Referencia", "Revertido el", "Motivo de reversión"];
    rows = (data ?? []).map((p) => [
      p.receipt_number, sale.get(p.sale_id) ?? "", local(p.created_at), method.get(p.payment_method_id) ?? "", p.amount, p.reference ?? "",
      rev.get(p.id) ? local(rev.get(p.id)!.created_at) : "", rev.get(p.id)?.reason ?? "",
    ]);
  } else if (kind === "citas") {
    const { data, error } = await supabase
      .from("appointments")
      .select("starts_at, ends_at, status, reason, patient_id, professional_id")
      .eq("organization_id", ctx.org.id)
      .gte("starts_at", t0)
      .lt("starts_at", t1)
      .order("starts_at")
      .limit(MAX_ROWS);
    if (error) return deny(500, dbErrorMessage(error));
    const pIds = [...new Set((data ?? []).map((a) => a.patient_id))];
    const [{ data: pats }, { data: profs }] = await Promise.all([
      pIds.length ? supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname, doc_type, doc_number, phone").in("id", pIds) : Promise.resolve({ data: [] }),
      supabase.from("professionals").select("id, full_name").eq("organization_id", ctx.org.id),
    ]);
    const pat = new Map((pats ?? []).map((p) => [p.id, p]));
    const prof = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    headers = ["Inicio", "Fin", "Estado", "Paciente", "Documento", "Teléfono", "Profesional", "Motivo"];
    rows = (data ?? []).map((a) => {
      const p = pat.get(a.patient_id);
      return [local(a.starts_at), local(a.ends_at), a.status, p ? patientName(p) : "", p ? `${p.doc_type} ${p.doc_number}` : "", p?.phone ?? "", prof.get(a.professional_id) ?? "", a.reason ?? ""];
    });
  } else if (kind === "pacientes") {
    // Solo identificación y contacto. Nada clínico: export.clinical no está asignado.
    const { data, error } = await supabase
      .from("patients")
      .select("doc_type, doc_number, first_name, second_name, first_surname, second_surname, birth_date, phone, email, address, created_at")
      .eq("organization_id", ctx.org.id)
      .order("first_surname")
      .limit(MAX_ROWS);
    if (error) return deny(500, dbErrorMessage(error));
    headers = ["Tipo doc.", "Número", "Nombre", "Fecha de nacimiento", "Teléfono", "Correo", "Dirección", "Registrado el"];
    rows = (data ?? []).map((p) => [p.doc_type, p.doc_number, patientName(p), p.birth_date ?? "", p.phone ?? "", p.email ?? "", p.address ?? "", local(p.created_at)]);
  } else {
    const [{ data: products, error }, { data: stock }, { data: locations }] = await Promise.all([
      supabase.from("products").select("id, sku, name, kind, stock_min, unit_price").eq("organization_id", ctx.org.id).eq("tracks_stock", true).order("name").limit(MAX_ROWS),
      supabase.from("inventory_stock").select("product_id, location_id, quantity").eq("organization_id", ctx.org.id),
      supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).order("name"),
    ]);
    if (error) return deny(500, dbErrorMessage(error));
    const q = new Map((stock ?? []).map((s) => [`${s.product_id}:${s.location_id}`, s.quantity]));
    headers = ["Código", "Producto", "Tipo", "Precio", "Mínimo", ...(locations ?? []).map((l) => l.name)];
    rows = (products ?? []).map((p) => [p.sku, p.name, p.kind, p.unit_price, p.stock_min, ...(locations ?? []).map((l) => q.get(`${p.id}:${l.id}`) ?? 0)]);
  }

  const { error: logError } = await supabase.rpc("log_export", {
    p_org: ctx.org.id,
    p_kind: kind,
    p_params: kind === "pacientes" || kind === "inventario" ? {} : { from, to },
    p_rows: rows.length,
    p_reason: reason,
  });
  if (logError) return deny(403, dbErrorMessage(logError));

  const name = `${slug}-${kind}-${kind === "pacientes" || kind === "inventario" ? utcToZoned(new Date(), tz).date : `${from}_${to}`}.csv`;
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
