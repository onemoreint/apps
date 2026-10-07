export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('TU-PROYECTO'));

/**
 * Hosting estático sin reescritura de rutas (GitHub Pages servido desde una rama):
 * el menú vive en "./?mesa=TOKEN" y el panel en "./#/dashboard".
 */
export const STATIC_HOSTING = import.meta.env.VITE_STATIC_HOSTING === '1';

/**
 * Modo demostración: sin Supabase configurado, el menú público funciona con el
 * menú incluido en la app (public/demo-data/menu.json). Los pedidos abren WhatsApp
 * pero no se guardan en una base de datos. El panel admin requiere Supabase.
 */
export const DEMO_MODE = !isConfigured && import.meta.env.VITE_DEMO === '1';

/** Ruta del menú de una mesa, según el tipo de hosting. */
export function menuPath(token: string): string {
  return STATIC_HOSTING ? `/?mesa=${token}` : `/menu?mesa=${token}`;
}

/** Ruta de entrada al panel, según el tipo de hosting. */
export const DASHBOARD_PATH = STATIC_HOSTING ? '/#/dashboard' : '/dashboard';
