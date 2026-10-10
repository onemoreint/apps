import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { todayIn } from "@/lib/tz";
import { PRIVACY_KIND, PRIVACY_STATUS } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Empty } from "@/components/ui/table";
import { RequestForm, RequestUpdate } from "./request-forms";

export const metadata: Metadata = { title: "Solicitudes de titulares" };

export default async function SolicitudesPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  const register = can(ctx, "privacy.register");
  const manage = can(ctx, "privacy.manage");
  if (!register && !manage) return <Forbidden what="las solicitudes de titulares" />;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("privacy_requests")
    .select("*")
    .eq("organization_id", ctx.org.id)
    .order("status")
    .order("due_date")
    .limit(200);
  const today = todayIn(ctx.org.timezone);

  return (
    <>
      <PageHeader
        title="Solicitudes de titulares"
        description="Consultas y reclamos sobre datos personales (Ley 1581 de 2012). El sistema calcula una fecha límite conservadora en días hábiles (10 para consultas, 15 para reclamos) sin descontar festivos; confirma los plazos con tu asesor jurídico."
      />
      <div className={`grid gap-6 ${register ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        <div>
          {requests?.length ? (
            <ul className="grid gap-4">
              {requests.map((r) => {
                const open = r.status !== "respondida";
                const late = open && r.due_date < today;
                return (
                  <li key={r.id} className="rounded-[var(--radius-panel)] border border-linea bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-tinta">
                          {PRIVACY_KIND[r.kind]} · {r.requester_name}
                          {r.requester_doc ? ` (${r.requester_doc})` : ""}
                        </p>
                        <p className="text-[13px] text-texto-suave">
                          Recibida el {formatDateTime(r.received_at, ctx.org.timezone)}
                          {r.requester_contact ? ` · ${r.requester_contact}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={!open ? "exito" : late ? "error" : "aviso"}>{PRIVACY_STATUS[r.status]}</Badge>
                        {open ? (
                          <p className={`mt-1 text-[13px] ${late ? "font-semibold text-error" : "text-texto-suave"}`}>
                            {late ? "Vencida: " : "Responder antes del "}
                            {formatDate(`${r.due_date}T12:00:00Z`, ctx.org.timezone)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{r.description}</p>
                    {r.response ? (
                      <p className="mt-2 text-sm text-texto-suave">
                        Respuesta{r.responded_at ? ` del ${formatDate(r.responded_at, ctx.org.timezone)}` : ""}: {r.response}
                      </p>
                    ) : null}
                    {open && manage ? <div className="mt-3"><RequestUpdate slug={slug} id={r.id} /></div> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No hay solicitudes registradas.</Empty>
          )}
        </div>
        {register ? (
          <Panel title="Registrar solicitud" description="Regístrala el mismo día en que llega, por cualquier canal.">
            <RequestForm slug={slug} />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
