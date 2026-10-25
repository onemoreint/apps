import { useSyncExternalStore } from 'react';

/**
 * Enrutado por hash (#/ruta): funciona en cualquier alojamiento estático (GitHub Pages incluido)
 * sin configurar redirecciones, y la PWA instalada abre siempre en la raíz.
 */
export type Route =
  | { name: 'home' }
  | { name: 'categories' }
  | { name: 'category'; id: string }
  | { name: 'search'; q: string }
  | { name: 'favorites' }
  | { name: 'mine' }
  | { name: 'spotify' }
  | { name: 'legal'; doc: 'privacidad' | 'condiciones' | 'fuentes' | 'seguridad' | 'cookies' | 'derechos' }
  | { name: 'legalHub' }
  | { name: 'admin' };

export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  switch (parts[0]) {
    case undefined:
    case '':
      return { name: 'home' };
    case 'categorias':
      return { name: 'categories' };
    case 'categoria':
      return parts[1] ? { name: 'category', id: parts[1] } : { name: 'categories' };
    case 'buscar':
      return { name: 'search', q: new URLSearchParams(query).get('q') ?? '' };
    case 'favoritos':
      return { name: 'favorites' };
    case 'mi-radio':
      return { name: 'mine' };
    case 'spotify':
      return { name: 'spotify' };
    case 'privacidad':
    case 'condiciones':
    case 'fuentes':
    case 'seguridad':
    case 'cookies':
    case 'derechos':
      return { name: 'legal', doc: parts[0] };
    case 'legal':
      return { name: 'legalHub' };
    case 'admin':
      return { name: 'admin' };
    default:
      return { name: 'home' };
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return parseHash(hash);
}

export function go(path: string) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (window.location.hash !== target) window.location.hash = target;
  window.scrollTo({ top: 0 });
}
