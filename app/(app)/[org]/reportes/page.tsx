import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDateTime } from "@/lib/format";
import { todayIn } from "@/lib/tz";
import { Forbidden } from "@/components/ui/forbidden";
import { Notice } from "@/components/ui/notice";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Table, Td } from "@/components/ui/table";
import { EXPORT_KINDS, periodSchema } from "@/modules/reports/schemas";

export const metadata: Metadata = { title: "Reportes" };

type Summary = {
  sales_count: number;
  gross: number;
  discounts: number;
  net: number;
  annulled_count: number;
  annulled_total: number;
  payments: number;
  reversals: number;
  by_method: { method: string; received: number; reversed: number }[];
};

const inputClass = "min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-3";

export default async function ReportesPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const { org: slug } = await params;
  const sp = await searchParams;
  const ctx = await getOrgContext(slug);
  const financial = can(ctx, "reports.financial");
  const exporter = can(ctx, "export.data");
  if (!financial && !exporter) return <Forbidden what="los reportes" />;

  const today = todayIn(ctx.org.timezone);
  const period = periodSchema.safeParse({ from: sp.desde ?? `${today.slice(0, 8)}01`, to: sp.hasta ?? today });
  const from = period.success ? period.data.from : `${today.slice(0, 8)}01`;
  const to = period.success ? period.data.to : today;

  const supabase = await createClient();
  const [summaryRes, sellers, products, exports] = financial
    ? await Promise.all([
        supabase.rpc("report_sales_summary", { p_org: ctx.org.id, p_from: from, p_to: to }),
        supabase.rpc("report_by_seller", { p_org: ctx.org.id, p_from: from, p_to: to }),
        supabase.rpc("report_by_product", { p_org: ctx.org.id, p_from: from, p_to: to }),
        can(ctx, "audit.read")
          ? supabase.from("export_jobs").select("id, kind, row_count, reason, created_by, created_at").eq("organization_id", ctx.org.id).order("created_at", { ascending: false }).limit(15)
          : Promise.resolve({ data: [] }),
      ])
    : [{ data: null }, { data: [] }, { data: [] }, { data: [] }];
  const s = summaryRes.data as Summary | null;
  const kinds = EXPORT_KINDS.filter((k) => can(ctx, k.permission));

  return (
    <>
      <PageHeader
        title="Reportes"
        description="Cifras calculadas en la base con las definiciones de docs/indicadores.md. Los periodos usan el calendario de la óptica."
      />
      <form className="mb-6 flex flex-wrap items-end gap-3" action={`/${slug}/reportes`}>
        <div className="grid gap-1">
          <label htmlFor="desde" className="text-sm font-medium text-tinta">Desde</label>
          <input id="desde" name="desde" type="date" defaultValue={from} className={inputClass} />
        </div>
        <div className="grid gap-1">
          <label htmlFor="hasta" className="text-sm font-medium text-tinta">Hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={to} className={inputClass} />
        </div>
        <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta">Consultar</button>
      </form>
      {!period.success && (sp.desde || sp.hasta) ? (
        <div className="mb-6"><Notice tone="aviso">{period.error.issues[0]?.message}. Se muestra el mes en curso.</Notice></div>
      ) : null}

      <div className="grid gap-6">
        {financial && s ? (
          <>
            <section aria-label="Resumen del periodo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { l: "Venta neta", v: formatCOP(s.net), d: `${s.sales_count} ventas · bruta ${formatCOP(s.gross)} − descuentos ${formatCOP(s.discounts)}` },
                { l: "Pagos recibidos", v: formatCOP(s.payments - s.reversals), d: `${formatCOP(s.payments)} cobrados − ${formatCOP(s.reversals)} revertidos` },
                { l: "Anulaciones", v: formatCOP(s.annulled_total), d: `${s.annulled_count} ventas anuladas en el periodo` },
                { l: "Descuentos", v: formatCOP(s.discounts), d: s.gross > 0 ? `${((s.discounts * 100) / s.gross).toFixed(1)} % de la venta bruta` : "—" },
              ].map((c) => (
                <div key={c.l} className="rounded-[var(--radius-panel)] border border-linea bg-white p-5">
                  <p className="text-sm text-texto-suave">{c.l}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-tinta">{c.v}</p>
                  <p className="mt-1 text-[13px] text-texto-suave">{c.d}</p>
                </div>
              ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Por medio de pago">
                {s.by_method.length ? (
                  <Table caption="Pagos por medio" headers={["Medio", "Recibido", "Revertido", "Neto"]} minWidth={400}>
                    {s.by_method.map((m) => (
                      <tr key={m.method}>
                        <Td>{m.method}</Td>
                        <Td numeric>{formatCOP(m.received)}</Td>
                        <Td numeric>{formatCOP(m.reversed)}</Td>
                        <Td numeric>{formatCOP(m.received - m.reversed)}</Td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <p className="text-sm text-texto-suave">Sin pagos en el periodo.</p>
                )}
              </Panel>
              <Panel title="Por vendedor">
                {sellers.data?.length ? (
                  <Table caption="Ventas por vendedor" headers={["Vendedor", "Ventas", "Neto"]} minWidth={400}>
                    {sellers.data.map((r) => (
                      <tr key={r.seller_id}>
                        <Td>{r.seller_name}</Td>
                        <Td numeric>{r.sales_count}</Td>
                        <Td numeric>{formatCOP(r.net ?? 0)}</Td>
                      </tr>
                    ))}
                  </Table>
                ) : (
                  <p className="text-sm text-texto-suave">Sin ventas en el periodo.</p>
                )}
              </Panel>
            </div>

            <Panel title="Por producto">
              {products.data?.length ? (
                <Table caption="Ventas por producto" headers={["Producto", "Cantidad", "Bruto", "Descuentos", "Neto"]}>
                  {products.data.map((r) => (
                    <tr key={r.product_id}>
                      <Td>
                        {r.name}
                        <span className="block text-[13px] text-texto-suave">{r.sku}</span>
                      </Td>
                      <Td numeric>{r.quantity}</Td>
                      <Td numeric>{formatCOP(r.gross ?? 0)}</Td>
                      <Td numeric>{formatCOP(r.discounts ?? 0)}</Td>
                      <Td numeric>{formatCOP(r.net ?? 0)}</Td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-sm text-texto-suave">Sin ventas en el periodo.</p>
              )}
            </Panel>
          </>
        ) : null}

        {exporter ? (
          <Panel
            title="Exportar a CSV"
            description="Cada exportación queda registrada con tu usuario, el motivo y el número de filas. Exporta solo lo necesario: los archivos salen del control de la aplicación."
          >
            {kinds.length ? (
              <form method="post" action={`/${slug}/exportar`} className="grid max-w-xl gap-4">
                <input type="hidden" name="from" value={from} />
                <input type="hidden" name="to" value={to} />
                <div className="grid gap-1.5">
                  <label htmlFor="kind" className="text-sm font-medium text-tinta">Qué exportar</label>
                  <select id="kind" name="kind" className={inputClass}>
                    {kinds.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                  <p className="text-[13px] text-texto-suave">Periodo: {from} a {to} (no aplica a pacientes ni existencias).</p>
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="reason" className="text-sm font-medium text-tinta">Motivo</label>
                  <input id="reason" name="reason" required minLength={10} maxLength={300} className={inputClass} placeholder="Por ejemplo: conciliación con el contador" />
                </div>
                <div>
                  <button type="submit" className="min-h-10 rounded-[var(--radius-control)] bg-turquesa px-4 text-sm font-semibold text-white hover:bg-turquesa-oscuro">Descargar CSV</button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-texto-suave">Tu rol no puede ver ningún conjunto exportable.</p>
            )}
          </Panel>
        ) : null}

        {exports.data?.length ? (
          <Panel title="Exportaciones recientes">
            <ul className="grid gap-1 text-sm">
              {exports.data.map((e) => (
                <li key={e.id}>
                  {formatDateTime(e.created_at, ctx.org.timezone)} · {e.kind} · {e.row_count} filas · {e.reason}
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}
      </div>
    </>
  );
}
