import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { docNumber, WARRANTY_KIND, WARRANTY_STATUS } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Empty } from "@/components/ui/table";
import { WarrantyUpdate } from "./warranty-update";

export const metadata: Metadata = { title: "Garantías" };

export default async function GarantiasPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ ver?: string }>;
}) {
  const { org: slug } = await params;
  const { ver = "abiertas" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "warranty.read")) return <Forbidden what="las garantías" />;

  const supabase = await createClient();
  const { data: cases } = await supabase
    .from("warranties")
    .select("*")
    .eq("organization_id", ctx.org.id)
    .in("status", ver === "cerradas" ? ["resuelta", "rechazada"] : ["abierta", "en_proceso"])
    .order("created_at", { ascending: false })
    .limit(100);
  const ids = (cases ?? []).map((c) => c.id);
  const saleIds = [...new Set((cases ?? []).map((c) => c.sale_id))];
  const [{ data: events }, { data: sales }] = await Promise.all([
    ids.length ? supabase.from("warranty_events").select("*").in("warranty_id", ids).order("created_at") : Promise.resolve({ data: [] }),
    saleIds.length ? supabase.from("sales").select("id, number").in("id", saleIds) : Promise.resolve({ data: [] }),
  ]);
  const saleNumber = new Map((sales ?? []).map((s) => [s.id, s.number]));

  return (
    <>
      <PageHeader title="Garantías e incidencias" description="Los casos se abren desde la venta. Cada gestión queda registrada con fecha y responsable." />
      <nav aria-label="Filtro" className="mb-4 flex gap-4 text-sm">
        {[
          { v: "abiertas", l: "Abiertas" },
          { v: "cerradas", l: "Cerradas" },
        ].map((f) => (
          <Link key={f.v} href={`/${slug}/garantias?ver=${f.v}`} aria-current={ver === f.v ? "page" : undefined} className={ver === f.v ? "font-semibold text-tinta" : "text-turquesa underline-offset-4 hover:underline"}>
            {f.l}
          </Link>
        ))}
      </nav>
      {cases?.length ? (
        <ul className="grid gap-4">
          {cases.map((c) => (
            <li key={c.id} className="rounded-[var(--radius-panel)] border border-linea bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-tinta">
                    {WARRANTY_KIND[c.kind]} ·{" "}
                    <Link href={`/${slug}/ventas/${c.sale_id}`} className="text-turquesa underline-offset-4 hover:underline">
                      Venta {docNumber("V", saleNumber.get(c.sale_id) ?? 0)}
                    </Link>
                  </p>
                  <p className="text-[13px] text-texto-suave">Abierto el {formatDateTime(c.created_at, ctx.org.timezone)}</p>
                </div>
                <Badge tone={["resuelta", "rechazada"].includes(c.status) ? "neutro" : "aviso"}>{WARRANTY_STATUS[c.status]}</Badge>
              </div>
              <p className="mt-2 text-sm">{c.description}</p>
              <ol className="mt-3 grid gap-1 border-l-2 border-linea pl-3 text-[13px] text-texto-suave">
                {(events ?? [])
                  .filter((e) => e.warranty_id === c.id)
                  .map((e) => (
                    <li key={e.id}>
                      {formatDateTime(e.created_at, ctx.org.timezone)} · {WARRANTY_STATUS[e.status] ?? e.status}
                      {e.note ? ` · ${e.note}` : ""}
                    </li>
                  ))}
              </ol>
              {!["resuelta", "rechazada"].includes(c.status) && can(ctx, "warranty.manage") ? (
                <div className="mt-3">
                  <WarrantyUpdate slug={slug} id={c.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{ver === "cerradas" ? "No hay casos cerrados." : "No hay casos abiertos."}</Empty>
      )}
    </>
  );
}
