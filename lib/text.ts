// Igual que private.fold() en la base: minúsculas, sin tildes, espacios simples.
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapa comodines de LIKE para buscar el texto tal cual lo escribió el usuario. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Palabras de búsqueda normalizadas (máximo 5, de al menos 2 caracteres). */
export function searchTerms(q: string): string[] {
  return fold(q)
    .split(" ")
    .filter((w) => w.length >= 2)
    .slice(0, 5);
}

/** "" → null, para columnas opcionales. */
export const emptyToNull = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

/**
 * Palabras seguras para un filtro or() de PostgREST: solo letras, números,
 * punto y guion (sin comas, paréntesis, comillas ni comodines de LIKE).
 */
export function filterTerms(q: string): string[] {
  return q
    .replace(/[^\p{L}\p{N} .\-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 5)
    .map((w) => w.slice(0, 40));
}
