/**
 * Navegación por "#/ruta" — funciona en GitHub Pages, en cualquier subcarpeta y en
 * dominio propio sin configurar el servidor.
 */
import { useSyncExternalStore } from 'react';

const oyentes = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => oyentes.forEach((o) => o()));
}

function suscribir(cb: () => void) {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

export type Ruta = { partes: string[]; q: URLSearchParams; crudo: string };

export function leerRuta(hash = window.location.hash): Ruta {
  const limpio = hash.replace(/^#/, '');
  const [camino = '', consulta = ''] = limpio.split('?');
  return {
    partes: camino.split('/').filter(Boolean).map((p) => decodeURIComponent(p)),
    q: new URLSearchParams(consulta),
    crudo: limpio,
  };
}

export function useRuta(): Ruta {
  const h = useSyncExternalStore(suscribir, () => window.location.hash, () => '');
  return leerRuta(h);
}

export function ir(a: string, opciones: { reemplazar?: boolean; arriba?: boolean } = {}): void {
  const destino = '#' + (a.startsWith('/') ? a : '/' + a);
  if (opciones.reemplazar) {
    history.replaceState(null, '', destino);
    oyentes.forEach((o) => o());
  } else {
    window.location.hash = destino;
  }
  if (opciones.arriba !== false) window.scrollTo({ top: 0 });
}

export function enlace(a: string): string {
  return '#' + (a.startsWith('/') ? a : '/' + a);
}
