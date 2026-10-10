import { z } from "zod";

export const CONSENT_KINDS = [
  { value: "tratamiento_datos", label: "Tratamiento de datos personales (incluye datos de salud)" },
  { value: "atencion_optometrica", label: "Consentimiento para la atención optométrica" },
  { value: "otro", label: "Otro" },
] as const;

export const consentTextSchema = z.object({
  kind: z.enum(["tratamiento_datos", "atencion_optometrica", "otro"]),
  title: z.string().trim().min(3, "Escribe un título").max(160),
  body: z.string().trim().min(20, "El texto debe tener al menos 20 caracteres").max(20000),
});

export type ConsentTextInput = z.input<typeof consentTextSchema>;
