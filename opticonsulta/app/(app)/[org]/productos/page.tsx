import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { filterTerms } from "@/lib/text";
import { formatCOP } from "@/lib/format";
import { productKindLabel } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { Empty, Table, Td } from "@/components/ui/table";
import { ProductForm, ProductRowActions, SupplierForm } from "./product-forms";

export const metadata: Metadata = { title: "Productos" };

export default async function ProductosPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ q?: string; inactivos?: string }>;
}) {
  const { org: slug } = await params;
  const { q = "", inactivos } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "inventory.read") && !can(ctx, "catalog.manage")) return <Forbidden what="el catálogo" />;
  const manage = can(ctx, "catalog.manage");

  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("id, sku, name, kind, brand, unit_price, cost, tracks_stock, stock_min, supplier_id, is_active")
    .eq("organization_id", ctx.org.id);
  if (!inactivos) query = query.eq("is_active", true);
  for (const term of filterTerms(q)) query = query.or(`name.ilike."%${term}%",sku.ilike."%${term}%",brand.ilike."%${term}%"`);
  const [{ data: products }, { data: suppliers }, { data: stock }] = await Promise.all([
    query.order("name").limit(200),
    supabase.from("suppliers").select("id, name, is_active").eq("organization_id", ctx.org.id).order("name"),
    supabase.from("inventory_stock").select("product_id, quantity").eq("organization_id", ctx.org.id),
  ]);
  const totals = new Map<string, number>();
  for (const s of stock ?? []) totals.set(s.product_id, (totals.get(s.product_id) ?? 0) + s.quantity);
  const supplierName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const supplierOptions = (suppliers ?? []).filter((s) => s.is_active).map((s) => ({ value: s.id, label: s.name }));

  return (
    <>
      <PageHeader
        title="Productos"
        description="Monturas, lentes, accesorios y servicios. El precio del catálogo es el que usan las ventas; los cambios no alteran ventas ya hechas."
      />
      <form role="search" className="mb-6 flex max-w-xl flex-wrap gap-2" action={`/${slug}/productos`}>
        <label htmlFor="q" className="sr-only">Buscar por nombre o código</label>
        <input id="q" name="q" defaultValue={q} placeholder="Nombre o código" className="min-h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-linea bg-white px-3 text-[15px]" />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="inactivos" value="1" defaultChecked={Boolean(inactivos)} className="size-4" /> Incluir retirados
        </label>
        <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta">Buscar</button>
      </form>

      <div className={`grid gap-6 ${manage ? "xl:grid-cols-[1fr_420px]" : ""}`}>
        <div className="min-w-0">
          {products?.length ? (
            <Table caption="Productos" headers={["Producto", "Tipo", "Precio", "Existencias", ""]} minWidth={720}>
              {products.map((p) => {
                const qty = totals.get(p.id) ?? 0;
                return (
                  <tr key={p.id}>
                    <Td>
                      <p className="font-medium text-tinta">{p.name}</p>
                      <p className="text-[13px] text-texto-suave">
                        {p.sku}
                        {p.brand ? ` · ${p.brand}` : ""}
                        {p.supplier_id ? ` · ${supplierName.get(p.supplier_id) ?? ""}` : ""}
                      </p>
                      {!p.is_active ? <Badge>Retirado</Badge> : null}
                    </Td>
                    <Td>{productKindLabel(p.kind)}</Td>
                    <Td numeric>{p.unit_price > 0 ? formatCOP(p.unit_price) : <span className="text-texto-suave">Variable</span>}</Td>
                    <Td numeric>
                      {p.tracks_stock ? (
                        <span className={qty <= p.stock_min ? "font-semibold text-aviso" : ""}>
                          {qty}
                          {qty <= p.stock_min ? <span className="sr-only"> (bajo el mínimo de {p.stock_min})</span> : null}
                        </span>
                      ) : (
                        <span className="text-texto-suave">No aplica</span>
                      )}
                    </Td>
                    <Td>
                      {manage ? (
                        <ProductRowActions
                          slug={slug}
                          id={p.id}
                          active={p.is_active}
                          suppliers={supplierOptions}
                          initial={{
                            name: p.name,
                            brand: p.brand ?? "",
                            unitPrice: String(p.unit_price),
                            cost: p.cost === null ? "" : String(p.cost),
                            stockMin: String(p.stock_min),
                            supplierId: p.supplier_id ?? "",
                          }}
                        />
                      ) : null}
                    </Td>
                  </tr>
                );
              })}
            </Table>
          ) : (
            <Empty>{q ? "Ningún producto coincide con la búsqueda." : "El catálogo está vacío."}</Empty>
          )}
        </div>
        {manage ? (
          <div className="grid min-w-0 content-start gap-6">
            <Panel title="Nuevo producto">
              <ProductForm slug={slug} suppliers={supplierOptions} />
            </Panel>
            <Panel title="Proveedores" description={suppliers?.length ? suppliers.map((s) => s.name).join(", ") : "Aún no hay proveedores."}>
              <SupplierForm slug={slug} />
            </Panel>
          </div>
        ) : null}
      </div>
    </>
  );
}
