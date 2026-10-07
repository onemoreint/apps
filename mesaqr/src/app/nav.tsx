/**
 * Navegación mínima para la parte pública (3 rutas). React Router solo se
 * carga dentro del panel admin: así el menú del cliente pesa mucho menos.
 */
import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';
import { BASE } from '@/shared/lib/asset';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', notify);
  window.addEventListener('hashchange', notify);
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Ruta de la app sin la subcarpeta de publicación: "/menu", "/dashboard/…". */
export function appPath(): string {
  const p = window.location.pathname;
  const rest = p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\//, '');
  return '/' + rest;
}

export function href(to: string): string {
  return BASE + to.replace(/^\//, '');
}

export function navigate(to: string, opts: { replace?: boolean } = {}): void {
  const url = href(to);
  if (opts.replace) window.history.replaceState(null, '', url);
  else window.history.pushState(null, '', url);
  window.scrollTo(0, 0);
  notify();
}

/** Se vuelve a renderizar cuando cambia la URL (enlaces internos o botón atrás). */
export function useUrl(): { path: string; search: URLSearchParams; hash: string } {
  useSyncExternalStore(subscribe, () => window.location.href);
  return { path: appPath(), search: new URLSearchParams(window.location.search), hash: window.location.hash };
}

export function Link({ to, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
  return (
    <a
      {...rest}
      href={href(to)}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navigate(to);
      }}
    />
  );
}
