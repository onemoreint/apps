/**
 * Cliente completo de Supabase. SOLO lo usa el panel admin (chunk diferido):
 * el menú público usa fetch directo (ver rpc.ts) para no descargar esta librería.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

export function db(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado (.env.local).');
  return supabase;
}
