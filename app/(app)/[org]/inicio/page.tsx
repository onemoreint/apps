import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { roleLabel } from "@/modules/memberships/schemas";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();

  const [locations, members, permissions] = await Promise.all([
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("is_active", true),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("status", "activa"),
    supabase.from("permissions").select("code, area, description").order("area"),
  ]);

  const mine = (permissions.data ?? []).filter((p) => ctx.permissions.has(p.code));
  const byArea = new Map<string, string[]>();
  for (const p of mine) byArea.set(p.area, [...(byArea.get(p.area) ?? []), p.description]);

  const teamSize = members.count ?? 0;
  const setupSteps = [
    can(ctx, "users.manage") && {
      done: teamSize > 1,
      label: "Invita a tu equipo",
      detail: teamSize > 1 ? `${teamSize} personas con acceso` : "Solo tú tienes acceso por ahora",
      href: `/${slug}/usuarios`,
    },
    can(ctx, "settings.manage") && {
      done: Boolean(ctx.org.nit),
      label: "Completa los datos legales",
      detail: ctx.org.nit ? `NIT ${ctx.org.nit}` : "Falta el NIT para los recibos internos",
      href: `/${slug}/configuracion`,
    },
  ].filter(Boolean) as { done: boolean; label: string; detail: string; href: string }[];

  return (
    <>
      <PageHeader
        title={ctx.org.trade_name}
        description={`Entraste como ${roleLabel(ctx.role).toLowerCase()}. ${locations.count ?? 0} ${
          locations.count === 1 ? "sede activa" : "sedes activas"
        } y ${teamSize} ${teamSize === 1 ? "persona" : "personas"} en el equipo.`}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {setupSteps.length ? (
          <Panel title="Puesta en marcha" description="Lo que falta para empezar a operar con tu equipo.">
            <ul className="grid gap-3">
              {setupSteps.map((step) => (
                <li key={step.label} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className={`mt-1 inline-block size-3 shrink-0 rounded-full border-2 ${
                      step.done ? "border-exito bg-exito" : "border-linea bg-white"
                    }`}
                  />
                  <div>
                    <Link href={step.href} className="font-medium text-turquesa underline-offset-4 hover:underline">
                      {step.label}
                    </Link>
                    <p className="text-sm text-texto-suave">
                      <span className="sr-only">{step.done ? "Completado. " : "Pendiente. "}</span>
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel title="Lo que puedes hacer" description="Permisos de tu rol en esta óptica.">
          {byArea.size ? (
            <dl className="grid gap-3">
              {[...byArea.entries()].map(([area, items]) => (
                <div key={area}>
                  <dt className="text-sm font-semibold text-tinta">{area}</dt>
                  <dd className="text-sm text-texto-suave">{items.join(". ")}.</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-texto-suave">Tu rol no tiene permisos asignados. Pide al propietario que los revise.</p>
          )}
        </Panel>
      </div>

      <p className="mt-8 max-w-prose text-sm text-texto-suave">
        Agenda, pacientes, consultas, ventas y laboratorio se habilitarán en las próximas fases del piloto.
      </p>
    </>
  );
}
