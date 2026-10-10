import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CodeOption = { code: string; label: string; provisional: boolean };

// Catálogos pequeños que se cargan completos en los formularios.
export const SMALL_CATALOGS = [
  "tipo_documento", "sexo_biologico", "identidad_genero", "etnia", "categoria_discapacidad", "pais",
  "zona_territorial", "modalidad", "grupo_servicio", "entorno_atencion", "via_ingreso", "causa_atencion",
  "tipo_diagnostico", "tipo_alergia", "parentesco", "tipo_factor_riesgo", "condicion_destino",
] as const;

// Catálogos grandes: se consultan con búsqueda.
export const SEARCHABLE_CATALOGS = ["cie10", "cups", "municipio", "ocupacion", "eapb"] as const;
export type SearchableCatalog = (typeof SEARCHABLE_CATALOGS)[number];

export async function getCatalogOptions(catalogs: readonly string[]): Promise<Record<string, CodeOption[]>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ref_codes")
    .select("catalog, code, label, is_provisional")
    .in("catalog", [...catalogs])
    .eq("is_active", true)
    .order("code");
  const out: Record<string, CodeOption[]> = Object.fromEntries(catalogs.map((c) => [c, []]));
  for (const row of data ?? []) {
    out[row.catalog]?.push({ code: row.code, label: row.label, provisional: row.is_provisional });
  }
  return out;
}

/** Nombres de códigos concretos (para mostrar los ya guardados). */
export async function getCodeLabels(pairs: { catalog: string; code: string | null | undefined }[]): Promise<Map<string, string>> {
  const wanted = pairs.filter((p): p is { catalog: string; code: string } => Boolean(p.code));
  const map = new Map<string, string>();
  if (!wanted.length) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("ref_codes")
    .select("catalog, code, label")
    .in("catalog", [...new Set(wanted.map((p) => p.catalog))])
    .in("code", [...new Set(wanted.map((p) => p.code))]);
  for (const row of data ?? []) map.set(`${row.catalog}:${row.code}`, row.label);
  return map;
}

export async function countProvisionalCatalogs(): Promise<{ catalog: string; count: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ref_codes").select("catalog").eq("is_provisional", true).eq("is_active", true);
  const counts = new Map<string, number>();
  for (const row of data ?? []) counts.set(row.catalog, (counts.get(row.catalog) ?? 0) + 1);
  return [...counts.entries()].map(([catalog, count]) => ({ catalog, count }));
}

export async function countCatalog(catalog: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("ref_codes")
    .select("code", { count: "exact", head: true })
    .eq("catalog", catalog)
    .eq("is_active", true);
  return count ?? 0;
}
