import type { Rect, Site } from './types';


export function canonicalSize(site: Site) {
  const lateral = site.access === 'left' || site.access === 'right';
  return { cw: lateral ? site.length : site.width, cd: lateral ? site.width : site.length };
}

/** Rectángulo canónico → coordenadas del lote */
export function toLot(site: Site, u: number, v: number, w: number, d: number): Rect {
  const W = site.width;
  const L = site.length;
  switch (site.access) {
    case 'front':
      return { x: u, y: v, w, h: d };
    case 'back':
      return { x: W - u - w, y: L - v - d, w, h: d };
    case 'left':
      return { x: v, y: L - u - w, w: d, h: w };
    case 'right':
      return { x: W - v - d, y: u, w: d, h: w };
  }
}

export function buildableRect(site: Site): Rect {
  const { cw, cd } = canonicalSize(site);
  const s = site.setbacks;
  return toLot(site, s.side, s.front, Math.max(0, cw - 2 * s.side), Math.max(0, cd - s.front - s.back));
}

/** Muro del lote que da a la calle, expresado como lado de un ambiente */
export const streetWall = (site: Site) => ({ front: 'S', back: 'N', left: 'W', right: 'E' } as const)[site.access];

