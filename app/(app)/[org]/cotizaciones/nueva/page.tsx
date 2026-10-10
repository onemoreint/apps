import type { Metadata } from "next";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/notice";
import { DocumentEditor } from "@/components/commerce/document-editor";
import { PatientPicker } from "@/components/commerce/patient-picker";
import { loadEditorData } from "@/modules/commerce/queries";

export const metadata: Metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacionPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ paciente?: string; q?: string }>;
}) {
  const { org: slug } = await params;
  const { paciente, q = "" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "sales.manage")) return <Forbidden what="las cotizaciones" />;
  const patientId = paciente && z.uuid().safeParse(paciente).success ? paciente : null;
  const data = await loadEditorData(ctx, patientId);

  return (
    <>
      <PageHeader
        title="Nueva cotización"
        description="Una cotización no descuenta existencias. Si el descuento supera el límite, queda pendiente de aprobación; aprobada, se convierte en venta sin volver a digitarla."
      />
      <div className="grid gap-6">
        <Panel title="Paciente">
          <PatientPicker orgId={ctx.org.id} basePath={`/${slug}/cotizaciones/nueva`} q={q} selectedId={data.patient?.id ?? null} />
        </Panel>
        {data.products.length ? (
          <Panel title="Detalle">
            <DocumentEditor key={data.patient?.id ?? "sin-paciente"} slug={slug} mode="cotizacion" {...data} />
          </Panel>
        ) : (
          <Notice tone="aviso">No hay productos activos en el catálogo. Pide a un administrador que los registre en Productos.</Notice>
        )}
      </div>
    </>
  );
}
