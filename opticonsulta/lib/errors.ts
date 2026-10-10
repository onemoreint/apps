import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Códigos que nuestras funciones SQL lanzan con mensajes en español y seguros
// para mostrar al usuario (ver migraciones 0003 y 0005).
const SAFE_CODES = new Set(["42501", "23514", "54000", "P0002", "28000", "22023"]);

type DbError = { code?: string; message?: string } | null | undefined;

/** Traduce un error de Supabase/PostgreSQL a un mensaje útil y sin detalles internos. */
export function dbErrorMessage(error: DbError): string {
  if (!error) return "No se pudo completar la operación. Inténtalo de nuevo.";
  const { code = "", message = "" } = error;

  if (code === "23505") {
    if (message.includes("organizations_slug_key")) return "Esa dirección ya está en uso. Elige otra.";
    if (message.includes("ya pertenece")) return message;
    return "Ya existe un registro con esos datos.";
  }
  const isInternal = /row-level security|permission denied|violates|relation|column/i.test(message);
  if (SAFE_CODES.has(code) && message && !isInternal) return message;
  if (code === "42501") return "No tienes permiso para realizar esta acción.";
  if (code === "23514" || code === "22023" || code === "23502") return "Algún dato no cumple las reglas. Revisa el formulario.";
  return "No se pudo completar la operación. Inténtalo de nuevo.";
}

/** Convierte un error de Zod en errores por campo (primer mensaje de cada campo). */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}

export function invalidInput(error: z.ZodError): ActionResult<never> {
  return { ok: false, error: "Revisa los campos marcados.", fieldErrors: zodFieldErrors(error) };
}
