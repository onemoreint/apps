/**
 * La app puede publicarse en una subcarpeta (p. ej. GitHub Pages: /mesaqr/).
 * Las rutas locales guardadas en la base de datos ("/demo/x.svg") se resuelven
 * contra esa base; las URL completas (Supabase Storage) se usan tal cual.
 */
export const BASE = import.meta.env.BASE_URL; // siempre termina en "/"

export function asset(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.startsWith('/') && !src.startsWith('//')) return BASE + src.slice(1);
  return src;
}

/** URL absoluta de una ruta de la app (para QR y enlaces compartibles). */
export function appUrl(path: string): string {
  return window.location.origin + BASE + path.replace(/^\//, '');
}
