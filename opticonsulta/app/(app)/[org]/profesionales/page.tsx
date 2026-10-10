import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { getCatalogOptions } from "@/modules/catalogs/queries";
import { roleLabel } from "@/modules/memberships/schemas";
import { PROFESSIONS } from "@/modules/professionals/schemas";
import { ProfessionalForm, ProfessionalActions } from "./professional-forms";

export const metadata: Metadata = { title: "Profesionales" };

export default async function ProfesionalesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "professionals.manage")) return <Forbidden what="la gestión de profesionales" />;

  const supabase = await createClient();
  const [{ data: professionals }, { data: memberships }, catalogs] = await Promise.all([
    supabase.from("professionals").select("*").eq("organization_id", ctx.org.id).order("full_name"),
    supabase.from("memberships").select("id, user_id, role, status").eq("organization_id", ctx.org.id).eq("status", "activa"),
    getCatalogOptions(["tipo_documento"]),
  ]);
  const userIds = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds) : { data: [] };
  const profile = new Map((profiles ?? []).map((p) => [p.id, p]));
  const linked = new Set((professionals ?? []).map((p) => p.membership_id).filter(Boolean));
  const memberById = new Map((memberships ?? []).map((m) => [m.id, m]));

  const linkable = (memberships ?? [])
    .filter((m) => !linked.has(m.id))
    .map((m) => {
      const p = profile.get(m.user_id);
      return { value: m.id, label: `${p?.full_name || p?.email || "Usuario"} · ${roleLabel(m.role)}` };
    });

  return (
    <>
      <PageHeader
        title="Profesionales"
        description="Quienes firman consultas y fórmulas. La tarjeta profesional solo aparece en documentos impresos después de que alguien registre su verificación (por ejemplo, en ReTHUS)."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Panel title="Registrados">
          {professionals?.length ? (
            <ul className="divide-y divide-linea">
              {professionals.map((p) => {
                const m = p.membership_id ? memberById.get(p.membership_id) : null;
                const user = m ? profile.get(m.user_id) : null;
                return (
                  <li key={p.id} className="grid gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-tinta">
                          {p.full_name}
                          {!p.is_active ? <span className="font-normal text-texto-suave"> · inactivo</span> : null}
                        </p>
                        <p className="text-sm text-texto-suave">
                          {PROFESSIONS.find((x) => x.value === p.profession)?.label} · {p.doc_type} {p.doc_number}
                          {p.professional_card ? ` · TP ${p.professional_card}` : " · sin tarjeta registrada"}
                        </p>
                        <p className="text-[13px] text-texto-suave">
                          {user ? `Usuario: ${user.full_name || user.email}` : "Sin usuario vinculado: no puede atender en el sistema"}
                        </p>
                      </div>
                      {p.verified_at ? <Badge tone="exito">Verificado</Badge> : <Badge tone="aviso">Sin verificar</Badge>}
                    </div>
                    {p.verified_at ? (
                      <p className="text-[13px] text-texto-suave">
                        Verificado el {formatDate(p.verified_at, ctx.org.timezone)}: {p.verification_note}
                      </p>
                    ) : null}
                    <ProfessionalActions slug={slug} id={p.id} active={p.is_active} canVerify={!p.verified_at && Boolean(p.professional_card)} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-texto-suave">Aún no hay profesionales. Registra al menos uno para poder iniciar consultas.</p>
          )}
        </Panel>
        <Panel title="Registrar profesional" description="Vincúlalo a su usuario para que pueda atender y firmar.">
          <ProfessionalForm slug={slug} docTypes={(catalogs.tipo_documento ?? []).map((o) => ({ value: o.code, label: o.label }))} members={linkable} />
        </Panel>
      </div>
    </>
  );
}
