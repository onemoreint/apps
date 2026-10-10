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

export const privacyRequestSchema = z.object({
  requesterName: z.string().trim().min(3, "Nombre de quien solicita").max(120),
  requesterDoc: z.string().trim().refine((v) => v === "" || /^[A-Za-z0-9]{3,20}$/.test(v), "Documento sin puntos ni espacios"),
  requesterContact: z.string().trim().max(160),
  kind: z.enum(["consulta", "rectificacion", "supresion", "revocatoria", "otro_reclamo"]),
  description: z.string().trim().min(10, "Describe la solicitud (mínimo 10 caracteres)").max(2000),
  patientId: z.string().trim().refine((v) => v === "" || z.uuid().safeParse(v).success, "Paciente no válido"),
});
export type PrivacyRequestInput = z.input<typeof privacyRequestSchema>;

export const privacyUpdateSchema = z
  .object({
    status: z.enum(["en_tramite", "respondida"]),
    response: z.string().trim().max(4000),
  })
  .refine((v) => v.status !== "respondida" || v.response.length >= 10, {
    path: ["response"],
    message: "Registra la respuesta dada al titular (mínimo 10 caracteres)",
  });
export type PrivacyUpdateInput = z.input<typeof privacyUpdateSchema>;
