import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { roleLabel, ROLES } from "@/modules/memberships/schemas";
import { InviteForm } from "./invite-form";
import { MemberActions, RevokeInvitationButton } from "./member-actions";

export const metadata: Metadata = { title: "Equipo" };

export default async function UsuariosPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "users.manage")) return <Forbidden what="la gestión del equipo" />;

  const supabase = await createClient();
  const [{ data: memberships }, { data: invitations }] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, status, created_at")
      .eq("organization_id", ctx.org.id)
      .order("created_at"),
    supabase
      .from("invitations")
      .select("id, email, role, expires_at")
      .eq("organization_id", ctx.org.id)
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Un administrador no puede asignar ni retirar el rol propietario.
  const isOwner = ctx.role === "propietario";
  const assignableRoles = ROLES.filter((r) => isOwner || r.value !== "propietario").map((r) => ({ value: r.value, label: r.label }));

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Quién tiene acceso a esta óptica y con qué rol. Los cambios quedan en la auditoría."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title="Personas con acceso">
          <ul className="divide-y divide-linea">
            {(memberships ?? []).map((m) => {
              const p = profileById.get(m.user_id);
              const isSelf = m.user_id === ctx.userId;
              const canEdit = !isSelf && (isOwner || m.role !== "propietario");
              return (
                <li key={m.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-medium text-tinta">
                      {p?.full_name || p?.email || "Usuario"}
                      {isSelf ? <span className="font-normal text-texto-suave"> (tú)</span> : null}
                    </p>
                    <p className="text-sm text-texto-suave">
                      {p?.email} · {roleLabel(m.role)}
                      {m.status === "suspendida" ? <span className="font-medium text-error"> · Acceso suspendido</span> : null}
                    </p>
                  </div>
                  {canEdit ? (
                    <MemberActions
                      slug={slug}
                      membershipId={m.id}
                      name={p?.full_name || p?.email || "este usuario"}
                      role={m.role}
                      status={m.status}
                      roles={assignableRoles}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>

        <div className="grid content-start gap-6">
          <Panel
            title="Invitar a alguien"
            description="Genera un enlace personal. Entrégalo tú mismo: OptiConsulta todavía no envía correos."
          >
            <InviteForm slug={slug} roles={assignableRoles} />
          </Panel>

          {invitations?.length ? (
            <Panel title="Invitaciones pendientes">
              <ul className="grid gap-3">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-tinta">{inv.email}</p>
                      <p className="text-[13px] text-texto-suave">
                        {roleLabel(inv.role)} · vence el {formatDate(inv.expires_at, ctx.org.timezone)}
                      </p>
                    </div>
                    <RevokeInvitationButton slug={slug} invitationId={inv.id} />
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}
