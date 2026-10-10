import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { LAB_KIND_LABEL } from "@/lib/commerce-labels";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { createLaboratory } from "@/modules/lab/actions";
import { SupplierForm } from "../../productos/product-forms";
import { LabActiveToggle, NewStatusForm, StatusRow } from "./settings-forms";

export const metadata: Metadata = { title: "Laboratorios y estados" };

export default async function LabAjustesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const manageLabs = can(ctx, "lab.manage");
  const manageStatuses = can(ctx, "settings.manage");
  if (!manageLabs && !manageStatuses) return <Forbidden what="los ajustes de laboratorio" />;

  const supabase = await createClient();
  const [{ data: labs }, { data: statuses }] = await Promise.all([
    supabase.from("laboratories").select("*").eq("organization_id", ctx.org.id).order("name"),
    supabase.from("lab_order_statuses").select("*").eq("organization_id", ctx.org.id).order("position"),
  ]);

  return (
    <>
      <PageHeader title="Laboratorios y estados" description="Los estados del sistema pueden renombrarse pero no eliminarse: de ellos dependen el control de calidad y la entrega." />
      <div className="grid gap-6 xl:grid-cols-2">
        {manageLabs ? (
          <Panel title="Laboratorios">
            {labs?.length ? (
              <ul className="mb-6 divide-y divide-linea">
                {labs.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium text-tinta">{l.name}</span>
                      {!l.is_active ? <span className="text-texto-suave"> · inactivo</span> : null}
                      <span className="block text-[13px] text-texto-suave">{[l.nit && `NIT ${l.nit}`, l.contact_name, l.phone, l.email].filter(Boolean).join(" · ")}</span>
                    </span>
                    <LabActiveToggle slug={slug} id={l.id} active={l.is_active} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-6 text-sm text-texto-suave">Aún no hay laboratorios.</p>
            )}
            <SupplierForm slug={slug} onSubmitAction={createLaboratory} submitLabel="Registrar laboratorio" />
          </Panel>
        ) : null}
        {manageStatuses ? (
          <Panel title="Estados de las órdenes" description="El orden define cómo se listan.">
            <ul className="mb-6 grid gap-4">
              {(statuses ?? []).map((s) => (
                <li key={s.id} className="grid gap-1">
                  <p className="text-[13px] text-texto-suave">
                    {LAB_KIND_LABEL[s.kind]}
                    {s.kind !== "proceso" ? " · del sistema" : ""}
                    {!s.is_active ? " · inactivo" : ""}
                  </p>
                  <StatusRow slug={slug} id={s.id} name={s.name} position={s.position} isProcess={s.kind === "proceso"} active={s.is_active} />
                </li>
              ))}
            </ul>
            <NewStatusForm slug={slug} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
