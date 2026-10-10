import type { AppointmentStatus, AvNotation, EncounterStatus, PrescriptionStatus, RefractionMethod } from "@/lib/supabase/database.types";

export const REFRACTION_METHODS: { value: RefractionMethod; label: string }[] = [
  { value: "lensometria", label: "Lensometría (lentes actuales)" },
  { value: "autorrefraccion", label: "Autorrefracción" },
  { value: "retinoscopia", label: "Retinoscopía" },
  { value: "subjetivo", label: "Subjetivo" },
  { value: "cicloplegia", label: "Bajo cicloplegia" },
];

export const AV_NOTATIONS: { value: AvNotation; label: string; example: string }[] = [
  { value: "snellen_pies", label: "Snellen en pies", example: "20/20" },
  { value: "snellen_metros", label: "Snellen en metros", example: "6/6" },
  { value: "decimal", label: "Decimal", example: "1.0" },
  { value: "logmar", label: "LogMAR", example: "0.0" },
];

export const PRISM_BASES = [
  { value: "arriba", label: "Arriba" },
  { value: "abajo", label: "Abajo" },
  { value: "nasal", label: "Nasal" },
  { value: "temporal", label: "Temporal" },
] as const;

export const LENS_TYPES = [
  { value: "monofocal", label: "Monofocal" },
  { value: "bifocal", label: "Bifocal" },
  { value: "progresivo", label: "Progresivo" },
  { value: "ocupacional", label: "Ocupacional" },
  { value: "otro", label: "Otro" },
] as const;

export const ENCOUNTER_STATUS: Record<EncounterStatus, string> = {
  borrador: "Borrador",
  finalizada: "Finalizada",
  anulada: "Anulada",
};

export const PRESCRIPTION_STATUS: Record<PrescriptionStatus, string> = {
  borrador: "Borrador",
  validada: "Vigente",
  reemplazada: "Reemplazada",
  anulada: "Anulada",
};

export const APPOINTMENT_STATUS: Record<AppointmentStatus, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  atendida: "Atendida",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

/** Muestra un valor dióptrico con signo explícito: "-1.50", "+0.75", "0.00". */
export function formatDiopter(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (n === 0) return "0.00";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}`;
}

export function patientName(p: { first_name: string; second_name?: string | null; first_surname: string; second_surname?: string | null }): string {
  return [p.first_name, p.second_name, p.first_surname, p.second_surname].filter(Boolean).join(" ");
}

export function ageFrom(birthDate: string | null, today: string): number | null {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return null;
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
