import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { todayIn } from "@/lib/tz";
import { docNumber, LAB_KIND_LABEL } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Empty, LinkButton, Table, Td } from "@/components/ui/table";

export const metadata: Metadata = { title: "Laboratorio" };

const OPEN_KINDS = ["inicial", "proceso", "recibido", "calidad_rechazada", "calidad_aprobada"];

export default async function LaboratorioPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { org: slug } = await params;
  const { ver = "activas" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "lab.read")) return <Forbidden what="el laboratorio" />;

  const supabase = await createClient();
  const [{ data: statuses }, { data: labs }] = await Promise.all([
    supabase.from("lab_order_statuses").select("id, name, kind, position").eq("organization_id", ctx.org.id).order("position"),
    supabase.from("laboratories").select("id, name").eq("organization_id", ctx.org.id),
  ]);
  const statusById = new Map((statuses ?? []).map((s) => [s.id, s]));
  const wanted = (statuses ?? []).filter((s) => (ver === "cerradas" ? !OPEN_KINDS.includes(s.kind) : OPEN_KINDS.includes(s.kind))).map((s) => s.id);
  const { data: orders } = wanted.length
    ? await supabase
        .from("lab_orders")
        .select("id, number, sale_id, patient_id, laboratory_id, status_id, promised_date, lens_description")
        .eq("organization_id", ctx.org.id)
        .in("status_id", wanted)
        .order("promised_date")
        .limit(200)
    : { data: [] };
  const patientIds = [...new Set((orders ?? []).map((o) => o.patient_id))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname, phone").in("id", patientIds)
    : { data: [] };
  const patient = new Map((patients ?? []).map((p) => [p.id, p]));
  const labName = new Map((labs ?? []).map((l) => [l.id, l.name]));
  const today = todayIn(ctx.org.timezone);

  return (
    <>
      <PageHeader
        title="Laboratorio"
        description="Órdenes de lentes por estado. Cada cambio queda en el historial de la orden; las órdenes se crean desde la venta."
        actions={
          can(ctx, "lab.manage") || can(ctx, "settings.manage") ? (
            <LinkButton href={`/${slug}/laboratorio/ajustes`} variant="secundario">Laboratorios y estados</LinkButton>
          ) : null
        }
      />
      <nav aria-label="Filtro de órdenes" className="mb-4 flex gap-4 text-sm">
        {[
          { v: "activas", l: "En curso" },
          { v: "cerradas", l: "Entregadas y canceladas" },
        ].map((f) => (
          <Link key={f.v} href={`/${slug}/laboratorio?ver=${f.v}`} aria-current={ver === f.v ? "page" : undefined} className={ver === f.v ? "font-semibold text-tinta" : "text-turquesa underline-offset-4 hover:underline"}>
            {f.l}
          </Link>
        ))}
      </nav>
      {orders?.length ? (
        <Table caption="Órdenes de laboratorio" headers={["Orden", "Paciente", "Laboratorio", "Estado", "Prometida"]} minWidth={760}>
          {orders.map((o) => {
            const st = statusById.get(o.status_id);
            const late = ["inicial", "proceso"].includes(st?.kind ?? "") && o.promised_date < today;
            const p = patient.get(o.patient_id);
            return (
              <tr key={o.id}>
                <Td>
                  <Link href={`/${slug}/laboratorio/${o.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">{docNumber("OL", o.number)}</Link>
                  <span className="block text-[13px] text-texto-suave">{o.lens_description}</span>
                </Td>
                <Td>
                  {p ? patientName(p) : "—"}
                  {p?.phone ? <span className="block text-[13px] text-texto-suave">{p.phone}</span> : null}
                </Td>
                <Td>{labName.get(o.laboratory_id)}</Td>
                <Td>
                  <Badge tone={st?.kind === "calidad_aprobada" ? "exito" : st?.kind === "calidad_rechazada" || st?.kind === "cancelado" ? "error" : "activo"}>{st?.name}</Badge>
                  <span className="block text-[12px] text-texto-suave">{LAB_KIND_LABEL[st?.kind ?? ""]}</span>
                </Td>
                <Td className={late ? "font-semibold text-error" : ""}>
                  {formatDate(`${o.promised_date}T12:00:00Z`, ctx.org.timezone)}
                  {late ? <span className="block text-[12px]">Atrasada</span> : null}
                </Td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty>{ver === "cerradas" ? "No hay órdenes cerradas." : "No hay órdenes en curso. Se crean desde una venta con fórmula vigente."}</Empty>
      )}
    </>
  );
}
