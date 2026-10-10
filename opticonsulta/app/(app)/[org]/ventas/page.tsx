import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatCOP, formatDateTime } from "@/lib/format";
import { patientName } from "@/lib/clinical-labels";
import { docNumber, SALE_STATUS } from "@/lib/commerce-labels";
import { Badge } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Empty, LinkButton, Table, Td } from "@/components/ui/table";

export const metadata: Metadata = { title: "Ventas" };

const FILTERS = [
  { value: "", label: "Todas" },
  { value: "saldo", label: "Con saldo" },
  { value: "anulada", label: "Anuladas" },
];

export default async function VentasPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ filtro?: string; numero?: string }>;
}) {
  const { org: slug } = await params;
  const { filtro = "", numero = "" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "sales.read")) return <Forbidden what="las ventas" />;

  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select("id, number, created_at, patient_id, total, status")
    .eq("organization_id", ctx.org.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const n = Number(numero.replace(/\D/g, ""));
  if (n > 0) query = query.eq("number", n);
  if (filtro === "anulada") query = query.eq("status", "anulada");
  const { data: sales } = await query;

  const ids = (sales ?? []).map((s) => s.id);
  const patientIds = [...new Set((sales ?? []).map((s) => s.patient_id).filter((x): x is string => Boolean(x)))];
  const [{ data: balances }, { data: patients }] = await Promise.all([
    ids.length ? supabase.from("sale_balances").select("sale_id, balance").in("sale_id", ids) : Promise.resolve({ data: [] }),
    patientIds.length
      ? supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname").in("id", patientIds)
      : Promise.resolve({ data: [] }),
  ]);
  const balance = new Map((balances ?? []).map((b) => [b.sale_id, b.balance ?? 0]));
  const patient = new Map((patients ?? []).map((p) => [p.id, patientName(p)]));
  const rows = (sales ?? []).filter((s) => filtro !== "saldo" || (s.status === "confirmada" && (balance.get(s.id) ?? 0) > 0));

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Cada venta confirmada descuenta inventario. Los pagos generan recibos internos de caja; no son factura electrónica."
        actions={can(ctx, "sales.manage") ? <LinkButton href={`/${slug}/ventas/nueva`}>Nueva venta</LinkButton> : null}
      />
      <form className="mb-6 flex flex-wrap items-end gap-3" action={`/${slug}/ventas`}>
        <div className="grid gap-1">
          <label htmlFor="numero" className="text-sm font-medium text-tinta">Número</label>
          <input id="numero" name="numero" defaultValue={numero} inputMode="numeric" className="min-h-10 w-36 rounded-[var(--radius-control)] border border-linea bg-white px-3" />
        </div>
        <div className="grid gap-1">
          <label htmlFor="filtro" className="text-sm font-medium text-tinta">Mostrar</label>
          <select id="filtro" name="filtro" defaultValue={filtro} className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-3">
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta">Filtrar</button>
      </form>
      {rows.length ? (
        <Table caption="Ventas" headers={["Venta", "Fecha", "Paciente", "Total", "Saldo", "Estado"]} minWidth={720}>
          {rows.map((s) => {
            const b = balance.get(s.id) ?? 0;
            return (
              <tr key={s.id}>
                <Td>
                  <Link href={`/${slug}/ventas/${s.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">
                    {docNumber("V", s.number)}
                  </Link>
                </Td>
                <Td>{formatDateTime(s.created_at, ctx.org.timezone)}</Td>
                <Td>{s.patient_id ? patient.get(s.patient_id) : <span className="text-texto-suave">Sin paciente</span>}</Td>
                <Td numeric>{formatCOP(s.total)}</Td>
                <Td numeric className={s.status === "confirmada" && b > 0 ? "font-semibold text-aviso" : ""}>
                  {s.status === "confirmada" ? formatCOP(b) : "—"}
                </Td>
                <Td>
                  <Badge tone={s.status === "anulada" ? "error" : b > 0 ? "aviso" : "exito"}>
                    {s.status === "anulada" ? SALE_STATUS.anulada : b > 0 ? "Con saldo" : "Pagada"}
                  </Badge>
                </Td>
              </tr>
            );
          })}
        </Table>
      ) : (
        <Empty>No hay ventas con ese filtro.</Empty>
      )}
    </>
  );
}
