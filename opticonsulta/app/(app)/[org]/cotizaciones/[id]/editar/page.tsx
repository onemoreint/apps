import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { docNumber } from "@/lib/commerce-labels";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { DocumentEditor } from "@/components/commerce/document-editor";
import { loadEditorData } from "@/modules/commerce/queries";

export const metadata: Metadata = { title: "Editar cotización" };

export default async function EditarCotizacionPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "sales.manage")) return <Forbidden what="la edición de cotizaciones" />;
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!q || q.status !== "abierta") notFound();
  const [{ data: items }, data] = await Promise.all([
    supabase.from("quote_items").select("product_id, quantity, unit_price, discount_amount").eq("quote_id", id).order("position"),
    loadEditorData(ctx, q.patient_id),
  ]);

  return (
    <>
      <PageHeader
        title={`Editar ${docNumber("C", q.number)}`}
        description="Al guardar se recalculan precios con el catálogo actual y, si el descuento supera el límite, vuelve a requerir aprobación."
      />
      <Panel title="Detalle">
        <DocumentEditor
          slug={slug}
          mode="cotizacion"
          {...data}
          quote={{ id: q.id, version: q.version }}
          initial={{
            locationId: q.location_id,
            patientId: q.patient_id ?? "",
            prescriptionId: q.prescription_id ?? "",
            notes: q.notes ?? "",
            validUntil: q.valid_until,
            lines: (items ?? []).map((i) => ({
              productId: i.product_id,
              quantity: String(i.quantity),
              unitPrice: String(i.unit_price),
              discount: i.discount_amount > 0 ? String(i.discount_amount) : "",
            })),
          }}
        />
      </Panel>
    </>
  );
}
