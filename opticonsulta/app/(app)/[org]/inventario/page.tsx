import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { MOVEMENT_LABELS } from "@/lib/commerce-labels";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Empty, Table, Td } from "@/components/ui/table";
import { MovementForm } from "./movement-form";

export const metadata: Metadata = { title: "Inventario" };

export default async function InventarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ bajo?: string }>;
}) {
  const { org: slug } = await params;
  const { bajo } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "inventory.read")) return <Forbidden what="el inventario" />;

  const supabase = await createClient();
  const [{ data: products }, { data: locations }, { data: stock }, { data: movements }] = await Promise.all([
    supabase.from("products").select("id, sku, name, stock_min").eq("organization_id", ctx.org.id).eq("tracks_stock", true).eq("is_active", true).order("name"),
    supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).eq("is_active", true).order("name"),
    supabase.from("inventory_stock").select("product_id, location_id, quantity").eq("organization_id", ctx.org.id),
    supabase
      .from("inventory_movements")
      .select("id, product_id, location_id, movement_type, quantity, reason, created_at")
      .eq("organization_id", ctx.org.id)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const qty = new Map<string, number>();
  for (const s of stock ?? []) qty.set(`${s.product_id}:${s.location_id}`, s.quantity);
  const total = (pid: string) => (locations ?? []).reduce((a, l) => a + (qty.get(`${pid}:${l.id}`) ?? 0), 0);
  const rows = (products ?? []).filter((p) => !bajo || total(p.id) <= p.stock_min);
  const productName = new Map((products ?? []).map((p) => [p.id, p.name]));
  const locationName = new Map((locations ?? []).map((l) => [l.id, l.name]));

  const types = [
    ...(can(ctx, "inventory.receive") ? [{ value: "entrada", label: "Entrada de mercancía" }] : []),
    ...(can(ctx, "inventory.adjust")
      ? [
          { value: "ajuste_positivo", label: "Ajuste positivo (conteo)" },
          { value: "ajuste_negativo", label: "Ajuste negativo (pérdida, daño)" },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Inventario"
        description="Existencias por sede. Las ventas descuentan solas; las anulaciones devuelven. Nada se borra: cada cambio queda como movimiento."
        actions={
          <Link href={bajo ? `/${slug}/inventario` : `/${slug}/inventario?bajo=1`} className="text-sm font-semibold text-turquesa underline-offset-4 hover:underline">
            {bajo ? "Ver todo" : "Ver solo bajo mínimo"}
          </Link>
        }
      />
      <div className={`grid gap-6 ${types.length ? "xl:grid-cols-[1fr_400px]" : ""}`}>
        <div className="grid min-w-0 content-start gap-6">
          {rows.length ? (
            <Table caption="Existencias" headers={["Producto", ...(locations ?? []).map((l) => l.name), "Total", "Mínimo"]}>
              {rows.map((p) => {
                const t = total(p.id);
                return (
                  <tr key={p.id}>
                    <Td>
                      <span className="font-medium text-tinta">{p.name}</span>
                      <span className="block text-[13px] text-texto-suave">{p.sku}</span>
                    </Td>
                    {(locations ?? []).map((l) => (
                      <Td key={l.id} numeric>{qty.get(`${p.id}:${l.id}`) ?? 0}</Td>
                    ))}
                    <Td numeric className={t <= p.stock_min ? "font-semibold text-aviso" : ""}>{t}</Td>
                    <Td numeric>{p.stock_min}</Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty>{bajo ? "Ningún producto está bajo su mínimo." : "No hay productos con control de existencias."}</Empty>
          )}

          <Panel title="Últimos movimientos">
            {movements?.length ? (
              <ul className="divide-y divide-linea text-sm">
                {movements.map((m) => (
                  <li key={m.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      <span className="font-medium text-tinta">{MOVEMENT_LABELS[m.movement_type]}</span> · {productName.get(m.product_id) ?? "Producto retirado"} ·{" "}
                      {locationName.get(m.location_id) ?? ""}
                      {m.reason ? <span className="block text-[13px] text-texto-suave">{m.reason}</span> : null}
                    </span>
                    <span className="tabular-nums">
                      {["salida_venta", "ajuste_negativo"].includes(m.movement_type) ? "−" : "+"}
                      {m.quantity} · <span className="text-texto-suave">{formatDateTime(m.created_at, ctx.org.timezone)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-texto-suave">Sin movimientos todavía.</p>
            )}
          </Panel>
        </div>
        {types.length ? (
          <Panel title="Registrar movimiento">
            <MovementForm
              slug={slug}
              types={types}
              products={(products ?? []).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
              locations={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
            />
          </Panel>
        ) : null}
      </div>
    </>
  );
}
