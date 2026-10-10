import type { Metadata } from "next";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
import { DocumentEditor } from "@/components/commerce/document-editor";
import { PatientPicker } from "@/components/commerce/patient-picker";
import { loadEditorData } from "@/modules/commerce/queries";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NuevaVentaPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ paciente?: string; q?: string }>;
}) {
  const { org: slug } = await params;
  const { paciente, q = "" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "sales.manage")) return <Forbidden what="el registro de ventas" />;
  const patientId = paciente && z.uuid().safeParse(paciente).success ? paciente : null;
  const data = await loadEditorData(ctx, patientId);

  return (
    <>
      <PageHeader
        title="Nueva venta"
        description="Para lentes formulados, elige primero el paciente: así la venta queda ligada a su fórmula vigente y se puede pedir al laboratorio."
      />
      <div className="grid gap-6">
        <Panel title="Paciente">
          <PatientPicker orgId={ctx.org.id} basePath={`/${slug}/ventas/nueva`} q={q} selectedId={data.patient?.id ?? null} />
        </Panel>
        {data.products.length ? (
          <Panel title="Detalle">
            <DocumentEditor key={data.patient?.id ?? "sin-paciente"} slug={slug} mode="venta" {...data} />
          </Panel>
        ) : (
          <Notice tone="aviso">No hay productos activos en el catálogo. Pide a un administrador que los registre en Productos.</Notice>
        )}
      </div>
    </>
  );
}
