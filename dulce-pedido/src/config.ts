/**
 * Configuración de despliegue. Nada aquí es secreto: la URL y la clave publicable
 * de Supabase están pensadas para el navegador; la seguridad la dan las políticas
 * RLS y las funciones de la base de datos.
 */
export const BASE = import.meta.env.BASE_URL;

export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
export const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Con Supabase configurado la tienda es real; sin él, funciona en modo demostración local. */
export const CON_SERVIDOR = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Tienda por defecto. Se puede abrir otra con ?tienda=slug en el enlace. */
export function slugTienda(): string {
  try {
    const q = new URLSearchParams(window.location.search).get('tienda');
    if (q && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(q)) return q;
  } catch {
    /* sin window (pruebas) */
  }
  return import.meta.env.VITE_TIENDA ?? 'dulce-pedido-demo';
}
