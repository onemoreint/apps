import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDateTime } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { docNumber } from "@/lib/commerce-labels";
import { PrintButton } from "@/components/ui/print-button";

export const metadata: Metadata = { title: "Recibo interno" };

/**
 * Comprobante interno de venta y pagos. NO es una factura electrónica de venta:
 * OptiConsulta no emite facturación electrónica DIAN.
 */
export default async function ReciboPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string; id: string }>;
  searchParams: Promise<{ pago?: string }>;
}) {
  const { org: slug, id } = await params;
  const { pago } = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();
  const { data: sale } = await supabase.from("sales").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!sale) notFound();

  const [{ data: items }, { data: payments }, { data: methods }, { data: location }, { data: settings }, { data: balance }, patientRes] = await Promise.all([
    supabase.from("sale_items").select("*").eq("sale_id", id).order("position"),
    supabase.from("payments").select("*").eq("sale_id", id).order("created_at"),
    supabase.from("payment_methods").select("id, name").eq("organization_id", ctx.org.id),
    supabase.from("locations").select("*").eq("id", sale.location_id).maybeSingle(),
    supabase.from("org_settings").select("receipt_footer").eq("organization_id", ctx.org.id).maybeSingle(),
    supabase.from("sale_balances").select("paid, balance").eq("sale_id", id).maybeSingle(),
    sale.patient_id
      ? supabase.from("patients").select("first_name, second_name, first_surname, second_surname, doc_type, doc_number").eq("id", sale.patient_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const ids = (payments ?? []).map((p) => p.id);
  const { data: reversals } = ids.length ? await supabase.from("payment_reversals").select("payment_id").in("payment_id", ids) : { data: [] };
  const reversed = new Set((reversals ?? []).map((r) => r.payment_id));
  const methodName = new Map((methods ?? []).map((m) => [m.id, m.name]));
  const focus = (payments ?? []).find((p) => p.id === pago);
  const tz = ctx.org.timezone;

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${slug}/ventas/${id}`} className="text-sm text-turquesa underline-offset-4 hover:underline">
          Volver a la venta
        </Link>
        <PrintButton />
      </div>

      <article className="grid gap-5 rounded-[var(--radius-panel)] border border-linea bg-white p-8 text-sm print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-linea pb-4">
          <div>
            <p className="text-xl font-semibold text-tinta">{ctx.org.trade_name}</p>
            {ctx.org.legal_name ? <p>{ctx.org.legal_name}</p> : null}
            {ctx.org.nit ? <p>NIT {ctx.org.nit}</p> : null}
          </div>
          {location ? (
            <div className="text-right">
              <p>{location.name}</p>
              <p>{[location.address, location.city].filter(Boolean).join(", ")}</p>
              {location.phone ? <p>Tel. {location.phone}</p> : null}
            </div>
          ) : null}
        </header>

        <div>
          <h1 className="text-lg font-semibold">
            {focus ? `Recibo interno de caja ${docNumber("RC", focus.receipt_number)}` : `Comprobante interno de venta ${docNumber("V", sale.number)}`}
          </h1>
          <p className="font-semibold text-error">Documento interno. No es una factura electrónica de venta.</p>
          <p className="text-texto-suave">
            Venta {docNumber("V", sale.number)} del {formatDateTime(sale.created_at, tz)}
            {sale.status === "anulada" ? " · ANULADA" : ""}
          </p>
          {patientRes.data ? (
            <p>
              Cliente: {patientName(patientRes.data)} · {patientRes.data.doc_type} {patientRes.data.doc_number}
            </p>
          ) : null}
        </div>

        <table className="w-full">
          <thead className="border-b border-linea text-left">
            <tr>
              <th className="py-1">Descripción</th>
              <th className="py-1 text-right">Cant.</th>
              <th className="py-1 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((it) => (
              <tr key={it.id}>
                <td className="py-1">
                  {it.description}
                  {it.discount_amount > 0 ? <span className="text-texto-suave"> (desc. {formatCOP(it.discount_amount)})</span> : null}
                </td>
                <td className="py-1 text-right tabular-nums">{it.quantity}</td>
                <td className="py-1 text-right tabular-nums">{formatCOP(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid w-64 gap-1">
          <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatCOP(sale.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Descuentos</dt><dd className="tabular-nums">{formatCOP(sale.discount_total)}</dd></div>
          <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatCOP(sale.total)}</dd></div>
        </dl>

        <div>
          <h2 className="mb-1 font-semibold">Pagos</h2>
          <ul className="grid gap-1">
            {(payments ?? []).map((p) => (
              <li key={p.id} className={`flex justify-between ${p.id === focus?.id ? "font-semibold" : ""}`}>
                <span>
                  {docNumber("RC", p.receipt_number)} · {formatDateTime(p.created_at, tz)} · {methodName.get(p.payment_method_id)}
                  {reversed.has(p.id) ? " · REVERTIDO" : ""}
                </span>
                <span className="tabular-nums">{formatCOP(p.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex justify-between border-t border-linea pt-1">
            <span>Pagado / saldo</span>
            <span className="tabular-nums">
              {formatCOP(balance?.paid ?? 0)} / {formatCOP(sale.status === "confirmada" ? balance?.balance ?? sale.total : 0)}
            </span>
          </p>
        </div>

        {settings?.receipt_footer ? <p className="border-t border-linea pt-3">{settings.receipt_footer}</p> : null}
        <p className="text-[12px] text-texto-suave">
          Este comprobante registra una operación interna de la óptica. Si requieres factura electrónica, solicítala a la óptica, que la expide por su propio
          sistema de facturación.
        </p>
      </article>
    </div>
  );
}
