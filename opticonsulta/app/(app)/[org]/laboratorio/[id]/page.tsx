import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatDiopter, patientName } from "@/lib/clinical-labels";
import { docNumber, LAB_KIND_LABEL } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Detail, Table, Td } from "@/components/ui/table";
import { CancelOrder, QualityForm, StatusForm } from "./order-forms";

export const metadata: Metadata = { title: "Orden de laboratorio" };

type Snapshot = {
  version?: number;
  lens_type?: string | null;
  pd_far?: string | number | null;
  pd_near?: string | number | null;
  cylinder_convention?: string | null;
  origin?: string;
  eyes?: { eye: string; sphere: number | null; cylinder: number | null; axis: number | null; addition: number | null; prism: number | null; prism_base: string | null; dnp: number | null; height: number | null }[];
};

export default async function OrdenPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "lab.read")) return <Forbidden what="el laboratorio" />;
  const supabase = await createClient();
  const { data: o } = await supabase.from("lab_orders").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!o) notFound();

  const [{ data: statuses }, { data: events }, { data: checks }, { data: lab }, { data: patient }, { data: sale }, { data: profiles }] = await Promise.all([
    supabase.from("lab_order_statuses").select("id, name, kind, position, is_active").eq("organization_id", ctx.org.id).order("position"),
    supabase.from("lab_order_events").select("*").eq("order_id", id).order("created_at"),
    supabase.from("quality_checks").select("*").eq("order_id", id).order("created_at"),
    supabase.from("laboratories").select("name, phone, email").eq("id", o.laboratory_id).maybeSingle(),
    supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname, doc_type, doc_number, phone").eq("id", o.patient_id).maybeSingle(),
    supabase.from("sales").select("id, number").eq("id", o.sale_id).maybeSingle(),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const statusById = new Map((statuses ?? []).map((s) => [s.id, s]));
  const current = statusById.get(o.status_id);
  const closed = ["entregado", "cancelado"].includes(current?.kind ?? "");
  const who = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  const rx = (o.rx_snapshot ?? {}) as Snapshot;
  const manualOptions = (statuses ?? [])
    .filter((s) => s.is_active && ["inicial", "proceso", "recibido"].includes(s.kind) && s.id !== o.status_id)
    .map((s) => ({ value: s.id, label: s.name }));

  return (
    <>
      <PageHeader
        title={`Orden ${docNumber("OL", o.number)}`}
        description={`${lab?.name ?? ""} · prometida para el ${formatDate(`${o.promised_date}T12:00:00Z`, ctx.org.timezone)}`}
        actions={<Badge tone={current?.kind === "calidad_aprobada" ? "exito" : closed ? "neutro" : "activo"}>{current?.name}</Badge>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Lo pedido" description={`Fórmula congelada (versión ${rx.version ?? "—"}, ${rx.origin === "externa" ? "externa transcrita" : "interna"}). No cambia aunque la fórmula del paciente se actualice.`}>
            <Table caption="Fórmula enviada" headers={["Ojo", "Esfera", "Cilindro", "Eje", "Adición", "Prisma", "DNP", "Altura"]} minWidth={600}>
              {(rx.eyes ?? []).map((e) => (
                <tr key={e.eye}>
                  <Td className="font-semibold">{e.eye}</Td>
                  <Td numeric>{formatDiopter(e.sphere)}</Td>
                  <Td numeric>{formatDiopter(e.cylinder)}</Td>
                  <Td numeric>{e.axis ?? "—"}</Td>
                  <Td numeric>{formatDiopter(e.addition)}</Td>
                  <Td numeric>{e.prism ? `${e.prism} ${e.prism_base ?? ""}` : "—"}</Td>
                  <Td numeric>{e.dnp ?? "—"}</Td>
                  <Td numeric>{e.height ?? "—"}</Td>
                </tr>
              ))}
            </Table>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <Detail label="Lentes">{o.lens_description}</Detail>
              <Detail label="Montura">{o.frame_description ?? "—"}</Detail>
              <Detail label="Tipo de lente">{rx.lens_type ?? "—"}</Detail>
              <Detail label="DP lejos / cerca">{`${rx.pd_far ?? "—"} / ${rx.pd_near ?? "—"}`}</Detail>
              {o.instructions ? <Detail label="Instrucciones">{o.instructions}</Detail> : null}
            </dl>
          </Panel>

          <Panel title="Historial" description="Los eventos no se editan ni se borran.">
            <ol className="grid gap-3 border-l-2 border-linea pl-4">
              {(events ?? []).map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="font-medium text-tinta">{statusById.get(e.status_id)?.name}</p>
                  <p className="text-texto-suave">
                    {formatDateTime(e.created_at, ctx.org.timezone)} · {e.created_by ? who.get(e.created_by) ?? "Usuario" : "Sistema"}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>

          {checks?.length ? (
            <Panel title="Controles de calidad">
              <ul className="grid gap-3 text-sm">
                {checks.map((c) => (
                  <li key={c.id}>
                    <Badge tone={c.result === "aprobado" ? "exito" : "error"}>{c.result === "aprobado" ? "Aprobado" : "Rechazado"}</Badge>{" "}
                    {formatDateTime(c.created_at, ctx.org.timezone)} · {who.get(c.checked_by) ?? "Usuario"}
                    {c.notes ? <span className="block text-texto-suave">{c.notes}</span> : null}
                    <ul className="mt-1 text-[13px] text-texto-suave">
                      {((c.checklist as { label?: string; ok?: boolean }[]) ?? []).map((i, n) => (
                        <li key={n}>{i.ok ? "✓" : "✗"} {i.label}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          <Panel title="Datos">
            <dl className="grid gap-3">
              <Detail label="Estado">{LAB_KIND_LABEL[current?.kind ?? ""]}</Detail>
              <Detail label="Paciente">
                {patient ? (
                  <>
                    {patientName(patient)}
                    <span className="block text-[13px] text-texto-suave">{patient.doc_type} {patient.doc_number}{patient.phone ? ` · ${patient.phone}` : ""}</span>
                  </>
                ) : "—"}
              </Detail>
              <Detail label="Venta">
                {sale ? <Link href={`/${slug}/ventas/${sale.id}`} className="text-turquesa underline-offset-4 hover:underline">{docNumber("V", sale.number)}</Link> : "—"}
              </Detail>
              <Detail label="Laboratorio">
                {lab?.name}
                {lab?.phone ? <span className="block text-[13px] text-texto-suave">{lab.phone}</span> : null}
              </Detail>
            </dl>
          </Panel>
          {!closed && can(ctx, "lab.manage") && manualOptions.length ? (
            <Panel title="Actualizar estado">
              <StatusForm slug={slug} orderId={id} options={manualOptions} />
            </Panel>
          ) : null}
          {current?.kind === "recibido" && can(ctx, "delivery.manage") ? (
            <Panel title="Control de calidad" description="Marca solo lo que verificaste. Para aprobar deben estar todas.">
              <QualityForm slug={slug} orderId={id} />
            </Panel>
          ) : null}
          {current?.kind === "calidad_aprobada" && sale ? (
            <Panel title="Entrega">
              <p className="text-sm">
                Lista para entregar. Registra la entrega en la <Link href={`/${slug}/ventas/${sale.id}`} className="text-turquesa underline">venta</Link>.
              </p>
            </Panel>
          ) : null}
          {!closed && can(ctx, "lab.manage") ? <CancelOrder slug={slug} orderId={id} /> : null}
        </aside>
      </div>
    </>
  );
}
