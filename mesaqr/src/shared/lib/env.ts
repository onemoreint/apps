export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';
export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('TU-PROYECTO'));

/** Negocio cuyo menú muestra este enlace. */
export const BUSINESS_SLUG = (import.meta.env.VITE_BUSINESS_SLUG as string | undefined) || 'lorenz-express';

/**
 * Hosting estático sin reescritura de rutas (GitHub Pages servido desde una rama):
 * el menú vive en la raíz del enlace y el panel en "./#/dashboard".
 */
export const STATIC_HOSTING = import.meta.env.VITE_STATIC_HOSTING === '1';

/**
 * Modo demostración: sin Supabase configurado, el menú funciona con el menú incluido
 * en la app (public/demo-data/menu.json). Los pedidos abren WhatsApp pero no se guardan.
 */
export const DEMO_MODE = !isConfigured && import.meta.env.VITE_DEMO === '1';

/** Ruta de entrada al panel, según el tipo de hosting. */
export const DASHBOARD_PATH = STATIC_HOSTING ? '/#/dashboard' : '/dashboard';
