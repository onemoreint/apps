import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, searchTerms } from "@/lib/text";
import { ageFrom, patientName } from "@/lib/clinical-labels";
import { todayIn } from "@/lib/tz";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Pacientes" };

const PAGE = 50;

export default async function PacientesPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { org: slug } = await params;
  const { q = "" } = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "patients.read")) return <Forbidden what="los pacientes" />;

  const supabase = await createClient();
  const terms = searchTerms(q);
  let query = supabase
    .from("patients")
    .select("id, doc_type, doc_number, first_name, second_name, first_surname, second_surname, birth_date, phone", { count: "exact" })
    .eq("organization_id", ctx.org.id);
  for (const term of terms) query = query.ilike("search_text", `%${escapeLike(term)}%`);
  const { data: patients, count } = await query.order("first_surname").order("first_name").limit(PAGE);
  const today = todayIn(ctx.org.timezone);

  return (
    <>
      <PageHeader
        title="Pacientes"
        description={terms.length ? `${count ?? 0} resultados para «${q}».` : `${count ?? 0} pacientes registrados.`}
        actions={
          can(ctx, "patients.write") ? (
            <Link
              href={`/${slug}/pacientes/nuevo`}
              className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] bg-turquesa px-4 text-sm font-semibold text-white hover:bg-turquesa-oscuro"
            >
              Registrar paciente
            </Link>
          ) : null
        }
      />

      <form role="search" className="mb-6 flex max-w-xl gap-2" action={`/${slug}/pacientes`}>
        <label htmlFor="q" className="sr-only">
          Buscar por nombre o documento
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Nombre, apellido o número de documento"
          className="min-h-10 flex-1 rounded-[var(--radius-control)] border border-linea bg-white px-3 text-[15px]"
        />
        <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta hover:border-tinta-suave">
          Buscar
        </button>
      </form>

      {patients?.length ? (
        <div className="overflow-x-auto rounded-[var(--radius-panel)] border border-linea bg-white">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Pacientes</caption>
            <thead className="border-b border-linea bg-fondo text-tinta">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Paciente</th>
                <th scope="col" className="px-4 py-3 font-semibold">Documento</th>
                <th scope="col" className="px-4 py-3 font-semibold">Edad</th>
                <th scope="col" className="px-4 py-3 font-semibold">Teléfono</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {patients.map((p) => {
                const age = ageFrom(p.birth_date, today);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <Link href={`/${slug}/pacientes/${p.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">
                        {patientName(p)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-texto-suave">
                      {p.doc_type} {p.doc_number}
                    </td>
                    <td className="px-4 py-3 text-texto-suave">{age === null ? "—" : `${age} años`}</td>
                    <td className="px-4 py-3 text-texto-suave">{p.phone ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {(count ?? 0) > PAGE ? (
            <p className="border-t border-linea px-4 py-3 text-sm text-texto-suave">
              Se muestran los primeros {PAGE}. Escribe más datos en la búsqueda para encontrar a un paciente.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="max-w-prose rounded-[var(--radius-panel)] border border-dashed border-linea bg-white p-6">
          <p className="font-medium text-tinta">{terms.length ? "Ningún paciente coincide con la búsqueda." : "Aún no hay pacientes registrados."}</p>
          <p className="mt-1 text-sm text-texto-suave">
            {terms.length
              ? "Revisa el número de documento o busca solo por el primer apellido."
              : can(ctx, "patients.write")
                ? "Registra al primero con «Registrar paciente»."
                : "Quien tenga permiso de registro puede crearlos."}
          </p>
        </div>
      )}
    </>
  );
}
