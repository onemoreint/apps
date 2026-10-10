import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { roleLabel } from "@/modules/memberships/schemas";
import { formatCOP } from "@/lib/format";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();

  const [indicatorsRes, locations, members, permissions, professionals, consentTexts] = await Promise.all([
    supabase.rpc("dashboard_indicators", { p_org: ctx.org.id }),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("is_active", true),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("status", "activa"),
    supabase.from("permissions").select("code, area, description").order("area"),
    supabase.from("professionals").select("id, membership_id", { count: "exact" }).eq("organization_id", ctx.org.id).eq("is_active", true),
    supabase.from("consent_texts").select("id", { count: "exact", head: true }).eq("organization_id", ctx.org.id).eq("kind", "tratamiento_datos").eq("is_active", true),
  ]);
  const ind = (indicatorsRes.data ?? {}) as Record<string, number | string | undefined>;
  const n = (k: string) => Number(ind[k] ?? 0);
  // Solo aparecen los indicadores que la base devolvió para este rol.
  const cards = [
    "appointments_today" in ind && { label: "Citas de hoy", value: String(n("appointments_today")), detail: `${n("appointments_pending_today")} por atender`, href: `/${slug}/agenda` },
    "encounters_open" in ind && { label: "Consultas en borrador", value: String(n("encounters_open")), detail: `${n("encounters_finalized_today")} finalizadas hoy`, href: `/${slug}/pacientes` },
    "sales_net_month" in ind && { label: "Venta neta del mes", value: formatCOP(n("sales_net_month")), detail: `Pagos netos ${formatCOP(n("payments_month"))}`, href: `/${slug}/reportes` },
    "receivables" in ind && { label: "Saldo por cobrar", value: formatCOP(n("receivables")), detail: n("receivables_count") === 1 ? "1 venta con saldo" : `${n("receivables_count")} ventas con saldo`, href: `/${slug}/ventas?filtro=saldo` },
    "lab_in_process" in ind && {
      label: "Órdenes de laboratorio",
      value: String(n("lab_in_process")),
      detail: `${n("lab_ready")} para entregar · ${n("lab_delayed")} ${n("lab_delayed") === 1 ? "atrasada" : "atrasadas"}`,
      href: `/${slug}/laboratorio`,
      warn: n("lab_delayed") > 0,
    },
    "low_stock" in ind && { label: "Productos bajo mínimo", value: String(n("low_stock")), detail: "Existencias en o bajo el mínimo", href: `/${slug}/inventario?bajo=1`, warn: n("low_stock") > 0 },
    "warranties_open" in ind && { label: "Garantías abiertas", value: String(n("warranties_open")), detail: "Casos sin cerrar", href: `/${slug}/garantias` },
  ].filter(Boolean) as { label: string; value: string; detail: string; href: string; warn?: boolean }[];

  const linkedProfessionals = (professionals.data ?? []).filter((p) => p.membership_id).length;

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
    can(ctx, "privacy.manage") && {
      done: (consentTexts.count ?? 0) > 0,
      label: "Publica el texto de autorización de datos",
      detail: (consentTexts.count ?? 0) > 0 ? "Texto vigente publicado" : "Sin él no se pueden iniciar consultas",
      href: `/${slug}/privacidad`,
    },
    can(ctx, "professionals.manage") && {
      done: linkedProfessionals > 0,
      label: "Registra a los profesionales que atienden",
      detail: linkedProfessionals > 0 ? `${linkedProfessionals} vinculados a su usuario` : "Nadie puede firmar consultas todavía",
      href: `/${slug}/profesionales`,
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

      {cards.length ? (
        <section aria-label="Indicadores" className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.label} href={c.href} className="rounded-[var(--radius-panel)] border border-linea bg-white p-5 hover:border-turquesa">
              <p className="text-sm text-texto-suave">{c.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${c.warn ? "text-aviso" : "text-tinta"}`}>{c.value}</p>
              <p className="mt-1 text-[13px] text-texto-suave">{c.detail}</p>
            </Link>
          ))}
        </section>
      ) : null}

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

    </>
  );
}
