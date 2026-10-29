import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@/config';

let cliente: SupabaseClient | null = null;

/** Cliente de Supabase del panel (solo se crea dentro del panel). */
export function db(): SupabaseClient {
  if (!cliente) {
    cliente = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'dulce-pedido-panel' },
    });
  }
  return cliente;
}

export const BUCKET = 'dulce-pedido';

/** Mensaje legible a partir de un error de Supabase. */
export function textoError(e: unknown): string {
  const m = (e as { message?: string } | null)?.message ?? String(e);
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Primero confirma tu correo con el enlace que te enviamos.';
  if (/row-level security|permission denied/i.test(m)) return 'No tienes permiso para hacer esto en esta tienda.';
  if (/duplicate key/i.test(m)) return 'Ya existe un registro igual.';
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Revisa tu internet.';
  if (/rate limit/i.test(m)) return 'Demasiados intentos. Espera unos minutos.';
  return m;
}
