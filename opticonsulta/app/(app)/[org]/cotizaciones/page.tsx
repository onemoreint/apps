import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDate } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { DISCOUNT_STATUS, docNumber, QUOTE_STATUS } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Empty, LinkButton, Table, Td } from "@/components/ui/table";

export const metadata: Metadata = { title: "Cotizaciones" };

export default async function CotizacionesPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ pendientes?: string }>;
}) {
  const { org: slug } = await params;
  const { pendientes } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "sales.read")) return <Forbidden what="las cotizaciones" />;

  const supabase = await createClient();
  let query = supabase
    .from("quotes")
    .select("id, number, created_at, valid_until, patient_id, total, status, discount_status")
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (pendientes) query = query.eq("status", "abierta").eq("discount_status", "pendiente");
  const { data: quotes } = await query;
  const patientIds = [...new Set((quotes ?? []).map((q) => q.patient_id).filter((x): x is string => Boolean(x)))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname").in("id", patientIds)
    : { data: [] };
  const patient = new Map((patients ?? []).map((p) => [p.id, patientName(p)]));

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        description="Las cotizaciones no mueven inventario ni caja. Un descuento sobre el límite necesita aprobación antes de convertirse en venta."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href={pendientes ? `/${slug}/cotizaciones` : `/${slug}/cotizaciones?pendientes=1`} className="text-sm font-semibold text-turquesa underline-offset-4 hover:underline">
              {pendientes ? "Ver todas" : "Descuentos por aprobar"}
            </Link>
            {can(ctx, "sales.manage") ? <LinkButton href={`/${slug}/cotizaciones/nueva`}>Nueva cotización</LinkButton> : null}
          </div>
        }
      />
      {quotes?.length ? (
        <Table caption="Cotizaciones" headers={["Cotización", "Fecha", "Paciente", "Total", "Estado"]} minWidth={720}>
          {quotes.map((q) => (
            <tr key={q.id}>
              <Td>
                <Link href={`/${slug}/cotizaciones/${q.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">
                  {docNumber("C", q.number)}
                </Link>
                <span className="block text-[13px] text-texto-suave">Válida hasta {formatDate(`${q.valid_until}T12:00:00Z`, ctx.org.timezone)}</span>
              </Td>
              <Td>{formatDate(q.created_at, ctx.org.timezone)}</Td>
              <Td>{q.patient_id ? patient.get(q.patient_id) : <span className="text-texto-suave">Sin paciente</span>}</Td>
              <Td numeric>{formatCOP(q.total)}</Td>
              <Td>
                <div className="flex flex-wrap gap-1">
                  <Badge tone={q.status === "abierta" ? "activo" : q.status === "anulada" ? "error" : "exito"}>{QUOTE_STATUS[q.status]}</Badge>
                  {q.status === "abierta" && q.discount_status !== "no_requiere" ? (
                    <Badge tone={q.discount_status === "aprobado" ? "exito" : q.discount_status === "pendiente" ? "aviso" : "error"}>
                      {DISCOUNT_STATUS[q.discount_status]}
                    </Badge>
                  ) : null}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      ) : (
        <Empty>{pendientes ? "No hay descuentos pendientes de aprobación." : "Aún no hay cotizaciones."}</Empty>
      )}
    </>
  );
}
