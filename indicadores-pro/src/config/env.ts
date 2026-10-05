/**
 * Lectura centralizada de variables de entorno. Ningún otro archivo lee import.meta.env.
 * Solo variables públicas (VITE_*). Los secretos nunca llegan al navegador.
 */
const read = (value: string | undefined) => (value && value.trim() !== '' ? value.trim() : undefined)

export const env = {
  supabaseUrl: read(import.meta.env.VITE_SUPABASE_URL as string | undefined),
  supabaseAnonKey: read(import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined),
  appName: read(import.meta.env.VITE_APP_NAME as string | undefined),
} as const

/** true cuando hay un proyecto Supabase configurado; si no, la app trabaja en modo local. */
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey)
