import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDate, formatDateTime } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { todayIn } from "@/lib/tz";
import {
  docNumber,
  LAB_KIND_LABEL,
  WARRANTY_KIND,
  WARRANTY_STATUS,
} from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Detail, LinkButton, Table, Td } from "@/components/ui/table";
import { Disclosure } from "@/components/ui/disclosure";
import {
  AnnulSale,
  DeliveryForm,
  LabOrderForm,
  PaymentActions,
  PaymentForm,
  WarrantyForm,
} from "./sale-forms";

export const metadata: Metadata = { title: "Venta" };

export default async function VentaPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: slug, id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const ctx = await getOrgContext(slug);
  const supabase = await createClient();
  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .eq("organization_id", ctx.org.id)
    .maybeSingle();
  if (!sale) notFound();

  const [
    items,
    payments,
    methods,
    balanceRow,
    location,
    seller,
    patient,
    orders,
    statuses,
    labs,
    deliveries,
    warranties,
    session,
  ] = await Promise.all([
    supabase.from("sale_items").select("*").eq("sale_id", id).order("position"),
    supabase.from("payments").select("*").eq("sale_id", id).order("created_at"),
    supabase
      .from("payment_methods")
      .select("id, name, is_active")
      .eq("organization_id", ctx.org.id)
      .order("name"),
    supabase
      .from("sale_balances")
      .select("paid, balance")
      .eq("sale_id", id)
      .maybeSingle(),
    supabase
      .from("locations")
      .select("name")
      .eq("id", sale.location_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", sale.seller_id)
      .maybeSingle(),
    sale.patient_id
      ? supabase
          .from("patients")
          .select(
            "id, first_name, second_name, first_surname, second_surname, doc_type, doc_number",
          )
          .eq("id", sale.patient_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    can(ctx, "lab.read")
      ? supabase
          .from("lab_orders")
          .select("id, number, status_id, promised_date, laboratory_id")
          .eq("sale_id", id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    supabase
      .from("lab_order_statuses")
      .select("id, name, kind")
      .eq("organization_id", ctx.org.id),
    can(ctx, "lab.manage")
      ? supabase
          .from("laboratories")
          .select("id, name")
          .eq("organization_id", ctx.org.id)
          .eq("is_active", true)
          .order("name")
      : Promise.resolve({ data: [] }),
    supabase
      .from("deliveries")
      .select("*")
      .eq("sale_id", id)
      .order("created_at"),
    can(ctx, "warranty.read")
      ? supabase
          .from("warranties")
          .select("*")
          .eq("sale_id", id)
          .order("created_at")
      : Promise.resolve({ data: [] }),
    supabase
      .from("cash_sessions")
      .select("id")
      .eq("organization_id", ctx.org.id)
      .eq("opened_by", ctx.userId)
      .eq("location_id", sale.location_id)
      .eq("status", "abierta")
      .maybeSingle(),
  ]);

  const paymentIdList = (payments.data ?? []).map((p) => p.id);
  const [reversals, requests] = paymentIdList.length
    ? await Promise.all([
        supabase
          .from("payment_reversals")
          .select("payment_id, reason, created_at")
          .in("payment_id", paymentIdList),
        supabase
          .from("payment_reversal_requests")
          .select("id, payment_id, reason, status")
          .in("payment_id", paymentIdList),
      ])
    : [{ data: [] }, { data: [] }];
  const reversed = new Map(
    (reversals.data ?? []).map((r) => [r.payment_id, r]),
  );
  const methodName = new Map((methods.data ?? []).map((m) => [m.id, m.name]));
  const statusById = new Map((statuses.data ?? []).map((s) => [s.id, s]));
  const balance = balanceRow.data?.balance ?? sale.total;
  const paid = balanceRow.data?.paid ?? 0;
  const confirmed = sale.status === "confirmada";
  const pendingRequest = new Map(
    (requests.data ?? [])
      .filter((r) => r.status === "pendiente")
      .map((r) => [r.payment_id, r]),
  );
  const orderLabel = (o: { number: number; status_id: string }) =>
    `${docNumber("OL", o.number)} · ${statusById.get(o.status_id)?.name ?? ""}`;
  const readyOrders = (orders.data ?? []).filter(
    (o) => statusById.get(o.status_id)?.kind === "calidad_aprobada",
  );
  const activeOrders = (orders.data ?? []).filter(
    (o) =>
      !["entregado", "cancelado"].includes(
        statusById.get(o.status_id)?.kind ?? "",
      ),
  );
  const anyReceipt = (payments.data ?? []).length > 0;

  return (
    <>
      <PageHeader
        title={`Venta ${docNumber("V", sale.number)}`}
        description={`${formatDateTime(sale.created_at, ctx.org.timezone)} · ${location.data?.name ?? ""} · vendió ${seller.data?.full_name || seller.data?.email || "—"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {anyReceipt ? (
              <LinkButton
                href={`/${slug}/ventas/${id}/recibo`}
                variant="secundario"
              >
                Recibo interno
              </LinkButton>
            ) : null}
            {confirmed && can(ctx, "payments.reverse") ? (
              <AnnulSale slug={slug} saleId={id} />
            ) : null}
          </div>
        }
      />
      {!confirmed ? (
        <div className="mb-6">
          <Notice tone="error">
            Venta anulada el{" "}
            {sale.annulled_at
              ? formatDateTime(sale.annulled_at, ctx.org.timezone)
              : ""}
            . Motivo: {sale.annul_reason}
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid min-w-0 content-start gap-6">
          <Table
            caption="Productos de la venta"
            headers={["Producto", "Cant.", "Precio", "Descuento", "Total"]}
          >
            {(items.data ?? []).map((it) => (
              <tr key={it.id}>
                <Td>{it.description}</Td>
                <Td numeric>{it.quantity}</Td>
                <Td numeric>{formatCOP(it.unit_price)}</Td>
                <Td numeric>
                  {it.discount_amount > 0
                    ? `− ${formatCOP(it.discount_amount)}`
                    : "—"}
                </Td>
                <Td numeric>{formatCOP(it.line_total)}</Td>
              </tr>
            ))}
          </Table>

          <Panel
            title="Pagos"
            description="Un pago no se borra ni se edita: si hubo un error se revierte y queda el registro de ambos."
          >
            {(payments.data ?? []).length ? (
              <ul className="divide-y divide-linea">
                {(payments.data ?? []).map((p) => {
                  const rev = reversed.get(p.id);
                  const req = pendingRequest.get(p.id);
                  return (
                    <li key={p.id} className="grid gap-1 py-3 first:pt-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>
                          <span className="font-medium text-tinta">
                            {docNumber("RC", p.receipt_number)}
                          </span>{" "}
                          · {methodName.get(p.payment_method_id)}
                          {p.reference ? ` · ref. ${p.reference}` : ""} ·{" "}
                          {formatDateTime(p.created_at, ctx.org.timezone)}
                        </span>
                        <span
                          className={`tabular-nums font-medium ${rev ? "text-texto-suave line-through" : ""}`}
                        >
                          {formatCOP(p.amount)}
                        </span>
                      </div>
                      <Link
                        href={`/${slug}/ventas/${id}/recibo?pago=${p.id}`}
                        className="w-fit text-[13px] text-turquesa underline-offset-4 hover:underline"
                      >
                        Imprimir recibo {docNumber("RC", p.receipt_number)}
                      </Link>
                      {rev ? (
                        <p className="text-[13px] text-error">
                          Revertido: {rev.reason}
                        </p>
                      ) : null}
                      {req ? (
                        <p className="text-[13px] text-aviso">
                          Reversión solicitada: {req.reason}
                        </p>
                      ) : null}
                      {!rev && confirmed ? (
                        <PaymentActions
                          slug={slug}
                          saleId={id}
                          paymentId={p.id}
                          canReverse={can(ctx, "payments.reverse")}
                          canRequest={can(ctx, "payments.reverse_request")}
                          pendingRequestId={req?.id ?? null}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-texto-suave">Sin pagos registrados.</p>
            )}
            {confirmed && balance <= 0 && anyReceipt ? (
              <div className="mt-4">
                <Notice tone="exito">Venta pagada por completo.</Notice>
              </div>
            ) : null}
            {confirmed && balance > 0 && can(ctx, "payments.register") ? (
              <div className="mt-5 border-t border-linea pt-5">
                {session.data ? (
                  <PaymentForm
                    slug={slug}
                    saleId={id}
                    balance={balance}
                    methods={(methods.data ?? [])
                      .filter((m) => m.is_active)
                      .map((m) => ({ value: m.id, label: m.name }))}
                  />
                ) : (
                  <Notice tone="info">
                    Para cobrar, abre tu caja en esta sede.{" "}
                    <Link
                      href={`/${slug}/caja`}
                      className="font-semibold underline"
                    >
                      Ir a caja
                    </Link>
                  </Notice>
                )}
              </div>
            ) : null}
          </Panel>

          {can(ctx, "lab.read") ? (
            <Panel title="Laboratorio">
              {(orders.data ?? []).length ? (
                <ul className="mb-4 grid gap-2">
                  {(orders.data ?? []).map((o) => (
                    <li
                      key={o.id}
                      className="flex flex-wrap justify-between gap-2"
                    >
                      <Link
                        href={`/${slug}/laboratorio/${o.id}`}
                        className="font-medium text-turquesa underline-offset-4 hover:underline"
                      >
                        {docNumber("OL", o.number)}
                      </Link>
                      <span className="text-sm">
                        {
                          LAB_KIND_LABEL[
                            statusById.get(o.status_id)?.kind ?? ""
                          ]
                        }{" "}
                        · {statusById.get(o.status_id)?.name} · prometida{" "}
                        {formatDate(
                          `${o.promised_date}T12:00:00Z`,
                          ctx.org.timezone,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {confirmed && can(ctx, "lab.manage") ? (
                sale.patient_id && sale.prescription_id ? (
                  (labs.data ?? []).length ? (
                    <Disclosure
                      summary="Crear orden de laboratorio"
                      open={!(orders.data ?? []).length}
                    >
                      <LabOrderForm
                        slug={slug}
                        saleId={id}
                        minDate={todayIn(ctx.org.timezone)}
                        laboratories={(labs.data ?? []).map((l) => ({
                          value: l.id,
                          label: l.name,
                        }))}
                        defaults={{
                          lens: (items.data ?? [])
                            .filter((i) => /lente/i.test(i.description))
                            .map((i) => i.description)
                            .join("; "),
                          frame: "",
                        }}
                      />
                    </Disclosure>
                  ) : (
                    <p className="text-sm text-texto-suave">
                      Registra un laboratorio en{" "}
                      <Link
                        href={`/${slug}/laboratorio/ajustes`}
                        className="underline"
                      >
                        Laboratorio › Ajustes
                      </Link>
                      .
                    </p>
                  )
                ) : (
                  <p className="text-sm text-texto-suave">
                    Para pedir lentes, la venta debe tener paciente y fórmula
                    vigente.
                  </p>
                )
              ) : null}
            </Panel>
          ) : null}

          <Panel title="Entregas">
            {(deliveries.data ?? []).length ? (
              <ul className="mb-4 grid gap-2 text-sm">
                {(deliveries.data ?? []).map((d) => (
                  <li key={d.id}>
                    {formatDateTime(d.created_at, ctx.org.timezone)} · recibió{" "}
                    {d.received_by_name}
                    {d.received_by_doc ? ` (${d.received_by_doc})` : ""}
                    {d.balance_at_delivery > 0 ? (
                      <span className="text-aviso">
                        {" "}
                        · entregada con saldo de{" "}
                        {formatCOP(d.balance_at_delivery)}, autorizada
                      </span>
                    ) : null}
                    {d.notes ? (
                      <span className="block text-texto-suave">{d.notes}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-sm text-texto-suave">Sin entregas.</p>
            )}
            {confirmed && can(ctx, "delivery.handover") ? (
              <Disclosure
                summary="Registrar entrega"
                open={
                  readyOrders.length > 0 ||
                  (!(orders.data ?? []).length &&
                    !(deliveries.data ?? []).length)
                }
              >
                <DeliveryForm
                  slug={slug}
                  saleId={id}
                  balance={balance}
                  canAuthorizeBalance={can(ctx, "discount.approve")}
                  orders={readyOrders.map((o) => ({
                    value: o.id,
                    label: orderLabel(o),
                  }))}
                />
              </Disclosure>
            ) : null}
          </Panel>

          {can(ctx, "warranty.read") ? (
            <Panel title="Garantías e incidencias">
              {(warranties.data ?? []).length ? (
                <ul className="mb-4 grid gap-2 text-sm">
                  {(warranties.data ?? []).map((w) => (
                    <li key={w.id}>
                      <Badge
                        tone={
                          ["resuelta", "rechazada"].includes(w.status)
                            ? "neutro"
                            : "aviso"
                        }
                      >
                        {WARRANTY_STATUS[w.status]}
                      </Badge>{" "}
                      {WARRANTY_KIND[w.kind]} · {w.description}
                    </li>
                  ))}
                </ul>
              ) : null}
              {can(ctx, "warranty.manage") ? (
                <Disclosure summary="Abrir garantía o incidencia">
                  <WarrantyForm
                    slug={slug}
                    saleId={id}
                    orders={(orders.data ?? []).map((o) => ({
                      value: o.id,
                      label: orderLabel(o),
                    }))}
                  />
                </Disclosure>
              ) : null}
            </Panel>
          ) : null}
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          <Panel title="Resumen">
            <dl className="grid gap-3">
              <Detail label="Paciente">
                {patient.data ? (
                  <Link
                    href={`/${slug}/pacientes/${patient.data.id}`}
                    className="text-turquesa underline-offset-4 hover:underline"
                  >
                    {patientName(patient.data)}
                  </Link>
                ) : (
                  "Sin paciente"
                )}
              </Detail>
              {sale.prescription_id ? (
                <Detail label="Fórmula">
                  <Link
                    href={`/${slug}/formulas/${sale.prescription_id}`}
                    className="text-turquesa underline-offset-4 hover:underline"
                  >
                    Ver fórmula
                  </Link>
                </Detail>
              ) : null}
              <Detail label="Subtotal">{formatCOP(sale.subtotal)}</Detail>
              <Detail label="Descuentos">
                {formatCOP(sale.discount_total)}
              </Detail>
              <Detail label="Total">
                <span className="text-lg font-semibold">
                  {formatCOP(sale.total)}
                </span>
              </Detail>
              <Detail label="Pagado">{formatCOP(paid)}</Detail>
              <Detail label="Saldo">
                <span
                  className={
                    balance > 0 && confirmed ? "font-semibold text-aviso" : ""
                  }
                >
                  {formatCOP(confirmed ? balance : 0)}
                </span>
              </Detail>
              {sale.notes ? <Detail label="Notas">{sale.notes}</Detail> : null}
              {activeOrders.length && confirmed ? (
                <Detail label="Órdenes activas">{activeOrders.length}</Detail>
              ) : null}
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}
