import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { RANGE_FIELDS, type ClinicalSettingsInput } from "@/modules/clinical/schemas";
import { ClinicalSettingsForm } from "./clinical-settings-form";

export const metadata: Metadata = { title: "Ajustes clínicos" };

type Range = { min?: number; max?: number; step?: number };

export default async function AjustesClinicosPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "clinical.configure")) return <Forbidden what="los ajustes clínicos" />;

  const supabase = await createClient();
  const { data: s } = await supabase.from("org_settings").select("*").eq("organization_id", ctx.org.id).single();
  const ranges = (s?.clinical_ranges ?? {}) as Record<string, Range>;
  const str = (v: number | undefined) => (v === undefined ? "" : String(v));

  const defaults: ClinicalSettingsInput = {
    avNotation: s?.av_notation ?? "",
    cylinderConvention: s?.cylinder_convention ?? "",
    requirePrincipal: s?.require_principal_diagnosis ?? true,
    template: ((s?.encounter_template ?? []) as { key: string; label: string; required: boolean }[]).map((t) => ({ ...t })),
    ranges: Object.fromEntries(
      RANGE_FIELDS.map((f) => [f, { min: str(ranges[f]?.min), max: str(ranges[f]?.max), step: str(ranges[f]?.step) }]),
    ) as ClinicalSettingsInput["ranges"],
  };

  return (
    <>
      <PageHeader
        title="Ajustes clínicos"
        description="Los define el optómetra responsable. OptiConsulta no trae rangos clínicos por defecto: sin configurarlos, solo se validan las reglas de notación (por ejemplo, que un cilindro tenga eje)."
      />
      <ClinicalSettingsForm slug={slug} defaults={defaults} />
    </>
  );
}
