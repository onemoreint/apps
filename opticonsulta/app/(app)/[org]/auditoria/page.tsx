import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { describeAudit, formatDateTime } from "@/lib/format";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Auditoría" };

const PAGE_SIZE = 100;

export default async function AuditoriaPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "audit.read")) return <Forbidden what="la auditoría" />;

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, entity, metadata, created_at")
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const actorIds = [...new Set((logs ?? []).map((l) => l.actor_id).filter((id): id is string => Boolean(id)))];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds)
    : { data: [] };
  const actorName = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "Usuario"]));

  return (
    <>
      <PageHeader
        title="Auditoría"
        description={`Últimos ${PAGE_SIZE} eventos. El registro no se puede editar ni borrar. Horas en ${ctx.org.timezone}.`}
      />
      {logs?.length ? (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-linea bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Registro de auditoría de {ctx.org.trade_name}</caption>
            <thead className="border-b border-linea bg-fondo text-tinta">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Fecha y hora</th>
                <th scope="col" className="px-4 py-3 font-semibold">Persona</th>
                <th scope="col" className="px-4 py-3 font-semibold">Acción</th>
                <th scope="col" className="px-4 py-3 font-semibold">Campos cambiados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {logs.map((log) => {
                const changed = (log.metadata as { changed?: string[] } | null)?.changed;
                return (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-texto-suave">{formatDateTime(log.created_at, ctx.org.timezone)}</td>
                    <td className="px-4 py-3">{log.actor_id ? actorName.get(log.actor_id) ?? "Usuario retirado" : "Sistema"}</td>
                    <td className="px-4 py-3">{describeAudit(log.action, log.entity)}</td>
                    <td className="px-4 py-3 text-texto-suave">{changed?.join(", ") ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-texto-suave">Aún no hay eventos registrados.</p>
      )}
    </>
  );
}
