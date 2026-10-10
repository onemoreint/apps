"use server";

import { requireUserId } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { SEARCHABLE_CATALOGS, type SearchableCatalog } from "@/modules/catalogs/queries";

export type CodeHit = { code: string; label: string };

/** Busca en un catálogo grande por código (prefijo) o por nombre. */
export async function searchRefCodes(catalog: SearchableCatalog, q: string): Promise<CodeHit[]> {
  await requireUserId();
  if (!SEARCHABLE_CATALOGS.includes(catalog)) return [];
  // Solo letras, números, espacios, punto y guion: el texto va dentro de un
  // filtro or() de PostgREST, donde comas, paréntesis o comillas tienen sentido.
  // Tampoco quedan comodines de LIKE (% _ \\).
  const term = q.replace(/[^\p{L}\p{N} .\-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (term.length < 2) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("ref_codes")
    .select("code, label")
    .eq("catalog", catalog)
    .eq("is_active", true)
    .or(`code.ilike."${term.toUpperCase()}%",label.ilike."%${term}%"`)
    .order("code")
    .limit(20);
  return data ?? [];
}
