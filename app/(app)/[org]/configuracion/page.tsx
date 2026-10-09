import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { OrganizationForm, SettingsForm } from "./settings-forms";
import { LocationForm, LocationToggle } from "./location-forms";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "settings.manage")) return <Forbidden what="la configuración" />;

  const supabase = await createClient();
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
              cylinderConvention: settings?.cylinder_convention ?? "",
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
                </div>
                <LocationToggle slug={slug} locationId={loc.id} active={loc.is_active} name={loc.name} />
              </li>
            ))}
          </ul>
          <h3 className="mb-3 text-base font-semibold">Agregar sede</h3>
          <LocationForm slug={slug} />
        </Panel>

        <Panel title="Rangos clínicos" description="Validaciones de esfera, cilindro, eje, adición, prisma y distancia pupilar.">
          <p className="text-sm text-texto-suave">
            Se configuran en la fase de consultas, con los valores que apruebe el optómetra asesor. Mientras tanto, el
            sistema no aplica rangos clínicos por defecto.
          </p>
        </Panel>
      </div>
    </>
  );
}
