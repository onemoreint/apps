import type { Project, Rect, Room } from './types';
import { overlaps, roomRect, snapR, EPS } from './rect';
import { buildableRect } from './site';
import { CATALOG } from '../layout-engine/catalog';

export function boundsFor(p: Project, r: Room): Rect {
  return CATALOG[r.type].covered ? buildableRect(p.site) : { x: 0, y: 0, w: p.site.width, h: p.site.length };
}

export function collides(p: Project, r: Rect, ignore: Set<string>) {
  return p.rooms.some((o) => !ignore.has(o.id) && overlaps(roomRect(o), r, 0.005));
}

/** posición libre para un ambiente nuevo */
export function findFreeSpot(p: Project, w: number, l: number, covered: boolean): { x: number; y: number } {
  const b = covered ? buildableRect(p.site) : { x: 0, y: 0, w: p.site.width, h: p.site.length };
  for (let y = b.y; y + l <= b.y + b.h + EPS; y += 0.25)
    for (let x = b.x; x + w <= b.x + b.w + EPS; x += 0.25)
      if (!collides(p, { x, y, w, h: l }, new Set())) return { x: snapR(x), y: snapR(y) };
  return { x: b.x, y: b.y };
}

