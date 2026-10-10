import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { escapeLike, searchTerms } from "@/lib/text";
import { patientName } from "@/lib/clinical-labels";

/**
 * Selector de paciente sin JavaScript: busca con un formulario GET y elige con
 * un enlace que agrega ?paciente= a la página actual.
 */
export async function PatientPicker({ orgId, basePath, q, selectedId }: { orgId: string; basePath: string; q: string; selectedId: string | null }) {
  const terms = searchTerms(q);
  let results: { id: string; first_name: string; second_name: string | null; first_surname: string; second_surname: string | null; doc_type: string; doc_number: string }[] = [];
  if (terms.length) {
    const supabase = await createClient();
    let query = supabase
      .from("patients")
      .select("id, first_name, second_name, first_surname, second_surname, doc_type, doc_number")
      .eq("organization_id", orgId);
    for (const term of terms) query = query.ilike("search_text", `%${escapeLike(term)}%`);
    results = (await query.order("first_surname").limit(8)).data ?? [];
  }

  return (
    <div className="grid gap-3">
      <form role="search" action={basePath} className="flex max-w-xl gap-2">
        <label htmlFor="buscar-paciente" className="sr-only">Buscar paciente</label>
        <input
          id="buscar-paciente"
          name="q"
          defaultValue={q}
          placeholder="Paciente: nombre o documento (opcional)"
          className="min-h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-linea bg-white px-3 text-[15px]"
        />
        <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta">
          Buscar
        </button>
      </form>
      {terms.length ? (
        results.length ? (
          <ul className="grid gap-1 text-sm">
            {results.map((p) => (
              <li key={p.id}>
                <Link
                  href={`${basePath}?paciente=${p.id}`}
                  aria-current={p.id === selectedId ? "true" : undefined}
                  className="text-turquesa underline-offset-4 hover:underline"
                >
                  {patientName(p)} · {p.doc_type} {p.doc_number}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-texto-suave">Ningún paciente coincide.</p>
        )
      ) : null}
      {selectedId ? (
        <Link href={basePath} className="text-sm text-texto-suave underline-offset-4 hover:underline">
          Quitar paciente
        </Link>
      ) : null}
    </div>
  );
}
