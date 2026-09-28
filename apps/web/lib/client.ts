import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Cliente de Supabase Auth en el navegador. Devuelve null si no está configurado. */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Llama a la API con el token de la sesión y la empresa activa. */
export async function api<T>(path: string, opts: { companyId?: string | null; method?: string; body?: unknown } = {}): Promise<T> {
  const sb = getSupabase();
  const session = sb ? (await sb.auth.getSession()).data.session : null;
  if (!session) throw new Error('Sesión no iniciada');
  const res = await fetch(`${API}${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(opts.companyId ? { 'X-Company-Id': opts.companyId } : {}),
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? `Error ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
