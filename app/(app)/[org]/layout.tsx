import Link from "next/link";
import { getOrgContext, can } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/modules/auth/actions";
import { roleLabel } from "@/modules/memberships/schemas";
import { NavLinks, type NavItem } from "./nav-links";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("id", ctx.userId).single();

  // Solo módulos que el rol puede usar. La base vuelve a verificar cada acción.
  const canAny = (...perms: string[]) => perms.some((p) => can(ctx, p));
  const items: NavItem[] = [
    { href: `/${slug}/inicio`, label: "Inicio" },
    ...(canAny("agenda.read") ? [{ href: `/${slug}/agenda`, label: "Agenda" }] : []),
    ...(canAny("patients.read") ? [{ href: `/${slug}/pacientes`, label: "Pacientes" }] : []),
    ...(canAny("sales.read") ? [{ href: `/${slug}/ventas`, label: "Ventas" }, { href: `/${slug}/cotizaciones`, label: "Cotizaciones" }] : []),
    ...(canAny("cash.operate", "cash.read_all") ? [{ href: `/${slug}/caja`, label: "Caja" }] : []),
    ...(canAny("lab.read") ? [{ href: `/${slug}/laboratorio`, label: "Laboratorio" }] : []),
    ...(canAny("warranty.read") ? [{ href: `/${slug}/garantias`, label: "Garantías" }] : []),
    ...(canAny("inventory.read") ? [{ href: `/${slug}/inventario`, label: "Inventario" }] : []),
    ...(canAny("inventory.read", "catalog.manage") ? [{ href: `/${slug}/productos`, label: "Productos" }] : []),
    ...(canAny("reports.financial", "export.data") ? [{ href: `/${slug}/reportes`, label: "Reportes" }] : []),
    ...(canAny("privacy.register", "privacy.manage") ? [{ href: `/${slug}/solicitudes`, label: "Solicitudes de titulares" }] : []),
    ...(canAny("professionals.manage") ? [{ href: `/${slug}/profesionales`, label: "Profesionales" }] : []),
    ...(canAny("users.manage") ? [{ href: `/${slug}/usuarios`, label: "Equipo" }] : []),
    ...(canAny("roles.manage") ? [{ href: `/${slug}/roles`, label: "Roles y permisos" }] : []),
    ...(canAny("privacy.manage") ? [{ href: `/${slug}/privacidad`, label: "Privacidad" }] : []),
    ...(canAny("clinical.configure") ? [{ href: `/${slug}/ajustes-clinicos`, label: "Ajustes clínicos" }] : []),
    ...(canAny("settings.manage") ? [{ href: `/${slug}/configuracion`, label: "Configuración" }] : []),
    ...(canAny("audit.read") ? [{ href: `/${slug}/auditoria`, label: "Auditoría" }] : []),
  ];

  const userName = profile?.full_name || profile?.email || "Tu cuenta";

  const account = (
    <div className="grid gap-2 border-t border-white/15 pt-4 text-sm">
      <div>
        <p className="font-medium text-white">{userName}</p>
        <p className="text-white/65">{roleLabel(ctx.role)}</p>
      </div>
      <form action={signOut}>
        <button type="submit" className="text-white/80 underline-offset-4 hover:text-white hover:underline">
          Cerrar sesión
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr] print:block">
      {/* Escritorio: barra lateral */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto bg-tinta px-4 py-6 md:flex print:hidden">
        <div className="grid gap-6">
          <div className="px-2">
            <Link href={`/${slug}/inicio`} className="block text-base font-semibold text-white">
              {ctx.org.trade_name}
            </Link>
            <p className="text-xs text-white/60">OptiConsulta{ctx.org.is_demo ? " · demostración" : ""}</p>
          </div>
          <NavLinks items={items} />
        </div>
        <div className="px-2">{account}</div>
      </aside>

      {/* Móvil: barra superior con menú desplegable sin JavaScript */}
      <header className="bg-tinta md:hidden print:hidden">
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-white">
            <span className="font-semibold">{ctx.org.trade_name}</span>
            <span className="text-sm text-white/80 group-open:hidden">Menú</span>
            <span className="hidden text-sm text-white/80 group-open:inline">Cerrar</span>
          </summary>
          <div className="grid gap-4 px-4 pb-4">
            <NavLinks items={items} />
            {account}
          </div>
        </details>
      </header>

      <main className="min-w-0 px-5 py-6 md:px-10 md:py-10 print:p-0">
        {ctx.org.is_demo ? (
          <p className="mb-6 rounded-[var(--radius-control)] bg-aviso-fondo px-3 py-2 text-sm text-aviso print:hidden">
            Organización de demostración: contiene solo datos ficticios.
          </p>
        ) : null}
        {children}
      </main>
    </div>
  );
}
