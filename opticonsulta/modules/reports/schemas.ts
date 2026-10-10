import { z } from "zod";
import { isValidDate } from "@/lib/tz";

export const EXPORT_KINDS = [
  { value: "ventas", label: "Ventas del periodo", permission: "reports.financial" },
  { value: "pagos", label: "Pagos y reversiones del periodo", permission: "reports.financial" },
  { value: "citas", label: "Citas del periodo", permission: "agenda.read" },
  { value: "pacientes", label: "Pacientes (datos de contacto, sin información clínica)", permission: "patients.read" },
  { value: "inventario", label: "Existencias actuales", permission: "inventory.read" },
] as const;

export type ExportKind = (typeof EXPORT_KINDS)[number]["value"];

const date = z.string().refine(isValidDate, "Fecha no válida");

export const periodSchema = z
  .object({ from: date, to: date })
  .refine((v) => v.from <= v.to, { path: ["to"], message: "La fecha final es anterior a la inicial" })
  .refine((v) => (Date.parse(v.to) - Date.parse(v.from)) / 86_400_000 < 366, { path: ["to"], message: "El periodo máximo es de un año" });

export const exportSchema = z.object({
  kind: z.enum(["ventas", "pagos", "citas", "pacientes", "inventario"]),
  from: date,
  to: date,
  reason: z.string().trim().min(10, "Indica para qué se exportan los datos (mínimo 10 caracteres)").max(300),
});
