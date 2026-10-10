import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { todayIn } from "@/lib/tz";
import { DISCOUNT_STATUS, docNumber, QUOTE_STATUS } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Detail, LinkButton, Table, Td } from "@/components/ui/table";
import { QuoteActions } from "./quote-actions";

export const metadata: Metadata = { title: "Cotización" };

export default async function CotizacionPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotes").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!q) notFound();
  const [{ data: items }, { data: sale }, patientRes] = await Promise.all([
    supabase.from("quote_items").select("*").eq("quote_id", id).order("position"),
    supabase.from("sales").select("id, number").eq("quote_id", id).maybeSingle(),
    q.patient_id
      ? supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname").eq("id", q.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const open = q.status === "abierta";
  const expired = q.valid_until < todayIn(ctx.org.timezone);
  const discountOk = ["no_requiere", "aprobado"].includes(q.discount_status);

  return (
    <>
      <PageHeader
        title={`Cotización ${docNumber("C", q.number)}`}
        description={`Creada el ${formatDateTime(q.created_at, ctx.org.timezone)} · válida hasta ${formatDate(`${q.valid_until}T12:00:00Z`, ctx.org.timezone)}`}
        actions={open && can(ctx, "sales.manage") ? <LinkButton href={`/${slug}/cotizaciones/${id}/editar`} variant="secundario">Editar</LinkButton> : null}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="grid min-w-0 content-start gap-6">
          <Table caption="Ítems" headers={["Producto", "Cant.", "Precio", "Descuento", "Total"]}>
            {(items ?? []).map((it) => (
              <tr key={it.id}>
                <Td>{it.description}</Td>
                <Td numeric>{it.quantity}</Td>
                <Td numeric>{formatCOP(it.unit_price)}</Td>
                <Td numeric>{it.discount_amount > 0 ? `− ${formatCOP(it.discount_amount)}` : "—"}</Td>
                <Td numeric>{formatCOP(it.line_total)}</Td>
              </tr>
            ))}
          </Table>
          {open ? (
            <Panel title="Acciones">
              {expired ? <div className="mb-3"><Notice tone="aviso">La cotización venció. Edítala para actualizar precios y fecha antes de vender.</Notice></div> : null}
              {q.discount_status === "pendiente" && !can(ctx, "discount.approve") ? (
                <div className="mb-3"><Notice tone="info">El descuento espera aprobación de un administrador.</Notice></div>
              ) : null}
              <QuoteActions
                slug={slug}
                quoteId={id}
                canReview={q.discount_status === "pendiente" && can(ctx, "discount.approve")}
                canConvert={!expired && discountOk && can(ctx, "sales.manage")}
                canAnnul={can(ctx, "sales.manage")}
              />
            </Panel>
          ) : null}
        </div>
        <Panel title="Resumen">
          <dl className="grid gap-3">
            <Detail label="Estado">
              <Badge tone={open ? "activo" : q.status === "anulada" ? "error" : "exito"}>{QUOTE_STATUS[q.status]}</Badge>
            </Detail>
            <Detail label="Descuento">{DISCOUNT_STATUS[q.discount_status]}</Detail>
            <Detail label="Paciente">
              {patientRes.data ? (
                <Link href={`/${slug}/pacientes/${patientRes.data.id}`} className="text-turquesa underline-offset-4 hover:underline">{patientName(patientRes.data)}</Link>
              ) : (
                "Sin paciente"
              )}
            </Detail>
            <Detail label="Subtotal">{formatCOP(q.subtotal)}</Detail>
            <Detail label="Descuentos">{formatCOP(q.discount_total)}</Detail>
            <Detail label="Total"><span className="text-lg font-semibold">{formatCOP(q.total)}</span></Detail>
            {q.notes ? <Detail label="Notas">{q.notes}</Detail> : null}
            {q.annul_reason ? <Detail label="Motivo de anulación">{q.annul_reason}</Detail> : null}
            {sale ? (
              <Detail label="Venta">
                <Link href={`/${slug}/ventas/${sale.id}`} className="text-turquesa underline-offset-4 hover:underline">{docNumber("V", sale.number)}</Link>
              </Detail>
            ) : null}
          </dl>
        </Panel>
      </div>
    </>
  );
}
