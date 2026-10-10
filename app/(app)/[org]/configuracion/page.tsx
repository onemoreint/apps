import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { countCatalog, countProvisionalCatalogs } from "@/modules/catalogs/queries";
import { OrganizationForm, SettingsForm } from "./settings-forms";
import { LocationForm, LocationRepsForm, LocationToggle } from "./location-forms";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "settings.manage")) return <Forbidden what="la configuración" />;

  const supabase = await createClient();
  const catalogList = [
    ["cie10", "CIE-10 (diagnósticos)"],
    ["cups", "CUPS (procedimientos)"],
    ["tipo_documento", "Tipos de documento"],
    ["sexo_biologico", "Sexo biológico"],
    ["pais", "Países"],
    ["municipio", "Municipios (DIVIPOLA)"],
    ["via_ingreso", "Vía de ingreso"],
    ["causa_atencion", "Causa de la atención"],
    ["condicion_destino", "Condición y destino"],
  ] as const;
  const [counts, provisional] = await Promise.all([
    Promise.all(catalogList.map(([c]) => countCatalog(c))),
    countProvisionalCatalogs(),
  ]);
  const catalogStatus = catalogList.map(([catalog, label], i) => ({
    catalog,
    label,
    count: counts[i] ?? 0,
    provisional: provisional.some((p) => p.catalog === catalog),
  }));
  const [{ data: settings }, { data: locations }] = await Promise.all([
    supabase.from("org_settings").select("*").eq("organization_id", ctx.org.id).single(),
    supabase.from("locations").select("*").eq("organization_id", ctx.org.id).order("created_at"),
  ]);

  return (
    <>
      <PageHeader title="Configuración" description={`Dirección web: /${ctx.org.slug} (no se puede cambiar).`} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Datos de la óptica" description="Aparecen en los recibos internos y documentos imprimibles.">
          <OrganizationForm
            slug={slug}
            defaults={{
              tradeName: ctx.org.trade_name,
              legalName: ctx.org.legal_name ?? "",
              nit: ctx.org.nit ?? "",
              timezone: ctx.org.timezone,
            }}
          />
        </Panel>

        <Panel title="Parámetros de operación">
          <SettingsForm
            slug={slug}
            defaults={{
              discountThresholdPct: String(settings?.discount_threshold_pct ?? "10"),
              receiptFooter: settings?.receipt_footer ?? "",
            }}
          />
        </Panel>

        <Panel title="Sedes" description="Una sede inactiva conserva su historial pero no admite operaciones nuevas.">
          <ul className="mb-6 divide-y divide-linea">
            {(locations ?? []).map((loc) => (
              <li key={loc.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0">
                <div>
                  <p className="font-medium text-tinta">
                    {loc.name}
                    {!loc.is_active ? <span className="font-normal text-texto-suave"> · inactiva</span> : null}
                  </p>
                  <p className="text-sm text-texto-suave">
                    {[loc.address, loc.city, loc.phone].filter(Boolean).join(" · ") || "Sin dirección registrada"}
                  </p>
                  <LocationRepsForm slug={slug} locationId={loc.id} repsCode={loc.reps_code} />
                </div>
                <LocationToggle slug={slug} locationId={loc.id} active={loc.is_active} name={loc.name} />
              </li>
            ))}
          </ul>
          <h3 className="mb-3 text-base font-semibold">Agregar sede</h3>
          <LocationForm slug={slug} />
        </Panel>

        <Panel
          title="Catálogos de referencia"
          description="Tablas oficiales que usan pacientes y consultas. Las carga el administrador técnico con el importador (docs/catalogos.md)."
        >
          <ul className="grid gap-1.5 text-sm">
            {catalogStatus.map((c) => (
              <li key={c.catalog} className="flex items-center justify-between gap-2">
                <span>{c.label}</span>
                {c.count === 0 ? (
                  <span className="font-medium text-aviso">Sin importar</span>
                ) : c.provisional ? (
                  <span className="font-medium text-aviso">{c.count} provisionales</span>
                ) : (
                  <span className="text-texto-suave">{c.count} códigos</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] text-texto-suave">
            Los rangos clínicos y la plantilla de consulta se configuran en «Ajustes clínicos» (rol optómetra).
          </p>
        </Panel>
      </div>
    </>
  );
}
