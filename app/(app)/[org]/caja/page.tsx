import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Table, Td } from "@/components/ui/table";
import { CashMovementForm, CloseCashForm, OpenCashForm } from "./cash-forms";

export const metadata: Metadata = { title: "Caja" };

export default async function CajaPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ cerrar?: string }>;
}) {
  const { org: slug } = await params;
  const { cerrar } = await searchParams;
  const ctx = await getOrgContext(slug);
  const operate = can(ctx, "cash.operate");
  const readAll = can(ctx, "cash.read_all");
  if (!operate && !readAll) return <Forbidden what="la caja" />;

  const supabase = await createClient();
  const [{ data: sessions }, { data: locations }, { data: profiles }] = await Promise.all([
    supabase.from("cash_sessions").select("*").eq("organization_id", ctx.org.id).order("opened_at", { ascending: false }).limit(30),
    supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const who = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  const locationName = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const mine = (sessions ?? []).find((s) => s.status === "abierta" && s.opened_by === ctx.userId);

  // Un administrador puede cerrar la caja que otra persona dejó abierta.
  const other = readAll ? (sessions ?? []).find((s) => s.id === cerrar && s.status === "abierta" && s.opened_by !== ctx.userId) : undefined;
  const otherExpected = other ? ((await supabase.rpc("cash_session_expected", { p_session: other.id })).data ?? []) : [];

  let expected: { payment_method_id: string | null; method_name: string | null; expected: number | null }[] = [];
  let movements: { id: string; kind: string; amount: number; reason: string; created_at: string }[] = [];
  if (mine) {
    const [exp, mov] = await Promise.all([
      supabase.rpc("cash_session_expected", { p_session: mine.id }),
      supabase.from("cash_movements").select("id, kind, amount, reason, created_at").eq("session_id", mine.id).order("created_at"),
    ]);
    expected = exp.data ?? [];
    movements = mov.data ?? [];
  }
  const closedIds = (sessions ?? []).filter((s) => s.status === "cerrada").map((s) => s.id);
  const { data: counts } = closedIds.length
    ? await supabase.from("cash_session_counts").select("session_id, expected, counted, difference").in("session_id", closedIds)
    : { data: [] };
  const diff = new Map<string, number>();
  for (const c of counts ?? []) diff.set(c.session_id, (diff.get(c.session_id) ?? 0) + c.difference);

  return (
    <>
      <PageHeader
        title="Caja"
        description="Cada persona cobra en su propia caja. Al cerrar se registra lo contado por medio de pago y la diferencia con lo esperado."
      />
      <div className="grid gap-6">
        {operate ? (
          mine ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel
                title={`Tu caja en ${locationName.get(mine.location_id) ?? "la sede"}`}
                description={`Abierta el ${formatDateTime(mine.opened_at, ctx.org.timezone)} con base de ${formatCOP(mine.opening_amount)}.`}
              >
                <h3 className="mb-2 text-sm font-semibold text-tinta">Movimientos de efectivo</h3>
                {movements.length ? (
                  <ul className="mb-5 grid gap-1 text-sm">
                    {movements.map((m) => (
                      <li key={m.id} className="flex justify-between gap-2">
                        <span>{m.kind === "ingreso" ? "Entrada" : "Salida"} · {m.reason}</span>
                        <span className="tabular-nums">{m.kind === "ingreso" ? "+" : "−"}{formatCOP(m.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mb-5 text-sm text-texto-suave">Sin movimientos.</p>
                )}
                <CashMovementForm slug={slug} sessionId={mine.id} />
              </Panel>
              <Panel
                title="Cerrar caja"
                description={readAll ? "Cuenta el dinero y los comprobantes por medio de pago." : "Cuenta el dinero y los comprobantes. El sistema compara con lo esperado al cerrar."}
              >
                <CloseCashForm
                  slug={slug}
                  sessionId={mine.id}
                  methods={expected
                    .filter((e): e is typeof e & { payment_method_id: string } => Boolean(e.payment_method_id))
                    .map((e) => ({ id: e.payment_method_id, name: e.method_name ?? "", expected: readAll ? e.expected ?? 0 : null }))}
                />
              </Panel>
            </div>
          ) : (
            <Panel title="Abrir caja" description="Necesitas una caja abierta en la sede para registrar pagos.">
              <OpenCashForm slug={slug} locations={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))} />
            </Panel>
          )
        ) : null}

        {other ? (
          <Panel title={`Cerrar la caja de ${who.get(other.opened_by) ?? "otra persona"}`} description="Registra lo contado en presencia de la persona responsable, si es posible.">
            <CloseCashForm
              slug={slug}
              sessionId={other.id}
              methods={otherExpected
                .filter((e): e is typeof e & { payment_method_id: string } => Boolean(e.payment_method_id))
                .map((e) => ({ id: e.payment_method_id, name: e.method_name ?? "", expected: e.expected ?? 0 }))}
            />
          </Panel>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold">{readAll ? "Cajas recientes del equipo" : "Tus cajas recientes"}</h2>
          <Table caption="Cajas" headers={["Apertura", "Sede", "Responsable", "Estado", "Diferencia al cierre"]} minWidth={680}>
            {(sessions ?? []).map((s) => {
              const d = diff.get(s.id);
              return (
                <tr key={s.id}>
                  <Td>{formatDateTime(s.opened_at, ctx.org.timezone)}</Td>
                  <Td>{locationName.get(s.location_id) ?? "—"}</Td>
                  <Td>{who.get(s.opened_by) ?? "—"}</Td>
                  <Td>
                    <Badge tone={s.status === "abierta" ? "activo" : "neutro"}>{s.status === "abierta" ? "Abierta" : "Cerrada"}</Badge>
                    {readAll && s.status === "abierta" && s.opened_by !== ctx.userId ? (
                      <Link href={`/${slug}/caja?cerrar=${s.id}`} className="ml-2 text-[13px] text-turquesa underline-offset-4 hover:underline">Cerrar</Link>
                    ) : null}
                    {s.close_notes ? <span className="block text-[13px] text-texto-suave">{s.close_notes}</span> : null}
                  </Td>
                  <Td numeric className={d && d !== 0 ? "font-semibold text-aviso" : ""}>
                    {s.status === "cerrada" && d !== undefined ? `${d > 0 ? "+" : ""}${formatCOP(d)}` : "—"}
                  </Td>
                </tr>
              );
            })}
          </Table>
        </section>
      </div>
    </>
  );
}
