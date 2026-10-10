import { z } from "zod";

// Mismas reglas que las restricciones CHECK de la base de datos.
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;
export const NIT_PATTERN = /^[0-9]{5,12}(-[0-9])?$/;
const PHONE_PATTERN = /^[0-9+() -]{7,20}$/;

export const TIMEZONES = [
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
] as const;

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).transform((v) => (v === "" ? null : v));

// Rutas de la aplicación; coincide con la restricción de la tabla organizations.
export const RESERVED_SLUGS = [
  "login", "registro", "recuperar", "restablecer", "auth", "api",
  "configuracion-inicial", "invitacion", "admin", "static", "manifest",
] as const;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, "Usa de 3 a 48 caracteres: letras minúsculas, números y guiones, sin guion al inicio ni al final")
  .refine((v) => !(RESERVED_SLUGS as readonly string[]).includes(v), "Esa dirección está reservada. Elige otra.");

export const nitSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || NIT_PATTERN.test(v), "Escribe el NIT sin puntos, con dígito de verificación opcional: 900123456-7")
  .transform((v) => (v === "" ? null : v));

export const timezoneSchema = z.enum(TIMEZONES.map((t) => t.value) as [string, ...string[]], {
  message: "Elige una zona horaria de la lista",
});

export const onboardingSchema = z.object({
  tradeName: z.string().trim().min(2, "Escribe el nombre comercial").max(120, "Máximo 120 caracteres"),
  slug: slugSchema,
  legalName: optionalText(160, "Máximo 160 caracteres"),
  nit: nitSchema,
  timezone: timezoneSchema,
  locationName: z.string().trim().min(2, "Escribe el nombre de la sede").max(120, "Máximo 120 caracteres"),
  locationCity: optionalText(80, "Máximo 80 caracteres"),
});

export const organizationUpdateSchema = onboardingSchema.pick({
  tradeName: true,
  legalName: true,
  nit: true,
  timezone: true,
});

export const settingsSchema = z.object({
  discountThresholdPct: z
    .string()
    .trim()
    .regex(/^\d{1,3}(?:[.,]\d{1,2})?$/, "Escribe un porcentaje entre 0 y 100, con hasta dos decimales")
    .transform((v) => v.replace(",", "."))
    .refine((v) => Number(v) >= 0 && Number(v) <= 100, "Escribe un porcentaje entre 0 y 100"),
  receiptFooter: optionalText(300, "Máximo 300 caracteres"),
});

export const repsSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || /^[0-9]{10,12}$/.test(v), "El código de habilitación REPS tiene de 10 a 12 dígitos")
  .transform((v) => (v === "" ? null : v));

export const locationSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre de la sede").max(120, "Máximo 120 caracteres"),
  repsCode: repsSchema,
  address: optionalText(200, "Máximo 200 caracteres"),
  city: optionalText(80, "Máximo 80 caracteres"),
  phone: z
    .string()
    .trim()
    .refine((v) => v === "" || PHONE_PATTERN.test(v), "Escribe un teléfono de 7 a 20 dígitos")
    .transform((v) => (v === "" ? null : v)),
});

/** Propone una dirección a partir del nombre comercial: "Óptica Visión Clara" → "optica-vision-clara". */
export function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export type OnboardingInput = z.input<typeof onboardingSchema>;
export type OrganizationUpdateInput = z.input<typeof organizationUpdateSchema>;
export type SettingsInput = z.input<typeof settingsSchema>;
export type LocationInput = z.input<typeof locationSchema>;
