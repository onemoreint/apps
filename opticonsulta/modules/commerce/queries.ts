import "server-only";
import { can, type OrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { patientName } from "@/lib/clinical-labels";
import { formatDate } from "@/lib/format";
import type { EditorProduct } from "@/components/commerce/document-editor";

/** Datos que necesita el editor de cotizaciones y ventas. */
export async function loadEditorData(ctx: OrgContext, patientId: string | null) {
  const supabase = await createClient();
  const [{ data: products }, { data: locations }, { data: stock }, { data: settings }, patientRes, rxRes] = await Promise.all([
    supabase.from("products").select("id, sku, name, unit_price, tracks_stock").eq("organization_id", ctx.org.id).eq("is_active", true).order("name"),
    supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).eq("is_active", true).order("name"),
    supabase.from("inventory_stock").select("product_id, location_id, quantity").eq("organization_id", ctx.org.id),
    supabase.from("org_settings").select("discount_threshold_pct").eq("organization_id", ctx.org.id).maybeSingle(),
    patientId
      ? supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname, doc_type, doc_number").eq("id", patientId).eq("organization_id", ctx.org.id).maybeSingle()
      : Promise.resolve({ data: null }),
    patientId
      ? supabase
          .from("prescriptions")
          .select("id, version, origin, lens_type, validated_at")
          .eq("patient_id", patientId)
          .eq("organization_id", ctx.org.id)
          .eq("status", "validada")
          .order("validated_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; version: number; origin: string; lens_type: string | null; validated_at: string | null }[] }),
  ]);

  const stockMap = new Map<string, Record<string, number>>();
  for (const s of stock ?? []) {
    const rec = stockMap.get(s.product_id) ?? {};
    rec[s.location_id] = s.quantity;
    stockMap.set(s.product_id, rec);
  }
  const editorProducts: EditorProduct[] = (products ?? []).map((p) => ({
    id: p.id,
    label: `${p.name} (${p.sku})`,
    unitPrice: p.unit_price,
    tracksStock: p.tracks_stock,
    stock: stockMap.get(p.id) ?? {},
  }));
  const patient = patientRes.data
    ? { id: patientRes.data.id, name: `${patientName(patientRes.data)} · ${patientRes.data.doc_type} ${patientRes.data.doc_number}` }
    : null;
  const prescriptions = (rxRes.data ?? []).map((r) => ({
    value: r.id,
    label: `Fórmula ${r.origin === "externa" ? "externa" : "interna"} v${r.version}${r.lens_type ? ` · ${r.lens_type}` : ""}${
      r.validated_at ? ` · ${formatDate(r.validated_at, ctx.org.timezone)}` : ""
    }`,
  }));

  return {
    products: editorProducts,
    locations: (locations ?? []).map((l) => ({ value: l.id, label: l.name })),
    patient,
    prescriptions,
    discountThreshold: settings?.discount_threshold_pct ?? 10,
    canApproveDiscount: can(ctx, "discount.approve"),
  };
}
