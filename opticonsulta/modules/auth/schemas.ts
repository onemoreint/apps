import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Escribe tu correo")
  .max(254, "El correo es demasiado largo")
  .pipe(z.email({ message: "Escribe un correo válido, por ejemplo nombre@optica.com" }))
  .transform((v) => v.toLowerCase());

// Coincide con supabase/config.toml: mínimo 10, minúscula, mayúscula y número.
export const passwordSchema = z
  .string()
  .min(10, "La contraseña debe tener al menos 10 caracteres")
  .max(72, "La contraseña no puede superar 72 caracteres")
  .regex(/[a-z]/, "Incluye al menos una letra minúscula")
  .regex(/[A-Z]/, "Incluye al menos una letra mayúscula")
  .regex(/[0-9]/, "Incluye al menos un número");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña").max(72),
});

export const signupSchema = z
  .object({
    fullName: z.string().trim().min(3, "Escribe tu nombre completo").max(120, "Máximo 120 caracteres"),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

export const recoverSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Las contraseñas no coinciden" });

/** Acepta solo rutas internas como destino tras iniciar sesión. */
export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.length > 300) return fallback;
  return value;
}

export type LoginInput = z.input<typeof loginSchema>;
export type SignupInput = z.input<typeof signupSchema>;
export type RecoverInput = z.input<typeof recoverSchema>;
export type ResetInput = z.input<typeof resetSchema>;
