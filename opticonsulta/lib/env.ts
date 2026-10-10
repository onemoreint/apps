import { z } from "zod";

// Variables públicas: disponibles en servidor y navegador.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL debe ser una URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, "Falta NEXT_PUBLIC_SUPABASE_ANON_KEY"),
});

// Variables de servidor. La clave service_role NO se valida aquí a propósito:
// la aplicación no la usa en las rutas de usuario (Fase B).
const serverSchema = z.object({
  APP_BASE_URL: z.url().default("http://localhost:3000"),
  DEFAULT_TIMEZONE: z.string().default("America/Bogota"),
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function publicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!parsed.success) {
    throw new Error(
      `Configuración incompleta: ${parsed.error.issues.map((i) => i.message).join("; ")}. Revisa .env.local (ver .env.example).`,
    );
  }
  return parsed.data;
}

export function serverEnv() {
  return serverSchema.parse({
    APP_BASE_URL: process.env.APP_BASE_URL,
    DEFAULT_TIMEZONE: process.env.DEFAULT_TIMEZONE,
  });
}
