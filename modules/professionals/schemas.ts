import { z } from "zod";

export const PROFESSIONS = [
  { value: "optometra", label: "Optómetra" },
  { value: "oftalmologo", label: "Oftalmólogo" },
  { value: "otro", label: "Otro profesional de la salud" },
] as const;

export const professionalSchema = z.object({
  fullName: z.string().trim().min(3, "Escribe el nombre completo").max(120),
  docType: z.string().trim().min(1, "Elige el tipo de documento"),
  docNumber: z.string().trim().regex(/^[A-Za-z0-9]{3,20}$/, "Número sin puntos ni espacios"),
  profession: z.enum(["optometra", "oftalmologo", "otro"]),
  professionalCard: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z0-9-]{3,30}$/.test(v), "De 3 a 30 letras, números o guiones"),
  membershipId: z.string().trim(),
});

export type ProfessionalInput = z.input<typeof professionalSchema>;

export const verifySchema = z.object({
  note: z.string().trim().min(10, "Describe la verificación: fuente, fecha y resultado (mínimo 10 caracteres)").max(300),
});
