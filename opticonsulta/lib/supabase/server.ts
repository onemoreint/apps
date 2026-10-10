import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Usa la clave pública y la sesión del usuario: toda consulta pasa por RLS.
 * Debe crearse uno nuevo por petición.
 */
export async function createClient() {
  // cookies() primero: marca la ruta como dinámica antes de leer el entorno.
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El refresco de sesión lo hace proxy.ts en cada petición.
        }
      },
    },
  });
}
