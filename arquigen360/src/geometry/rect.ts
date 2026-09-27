import type { Rect, Room, WallSide } from './types';

export const EPS = 0.001;
export const GRID = 0.05;

export const r2 = (v: number) => Math.round(v * 100) / 100;
export const snap = (v: number, step = GRID) => Math.round(v / step) * step;
export const snapR = (v: number) => r2(snap(v));

export const roomRect = (r: Room): Rect => ({ x: r.x, y: r.y, w: r.width, h: r.length });

export function overlaps(a: Rect, b: Rect, tol = EPS): boolean {
  return a.x + a.w > b.x + tol && b.x + b.w > a.x + tol && a.y + a.h > b.y + tol && b.y + b.h > a.y + tol;
}

export function inside(inner: Rect, outer: Rect, tol = EPS): boolean {
  return (
    inner.x >= outer.x - tol &&
    inner.y >= outer.y - tol &&
    inner.x + inner.w <= outer.x + outer.w + tol &&
    inner.y + inner.h <= outer.y + outer.h + tol
  );
}

export interface SharedEdge {
  /** muro de A que toca a B */
  wallA: WallSide;
  wallB: WallSide;
  /** tramo compartido en coordenadas globales sobre el eje del muro */
  start: number;
  end: number;
  /** coordenada fija de la línea */
  at: number;
}

const opp: Record<WallSide, WallSide> = { N: 'S', S: 'N', E: 'W', W: 'E' };

export function sharedEdge(a: Room, b: Room, minLen = 0.3): SharedEdge | null {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.length;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.length;
  const ov = (s1: number, e1: number, s2: number, e2: number) => [Math.max(s1, s2), Math.min(e1, e2)] as const;
  const test = (wall: WallSide, at: number, s: number, e: number): SharedEdge | null =>
    e - s >= minLen ? { wallA: wall, wallB: opp[wall], start: s, end: e, at } : null;

  if (Math.abs(ax2 - b.x) < EPS) {
    const [s, e] = ov(a.y, ay2, b.y, by2);
    return test('E', ax2, s, e);
  }
  if (Math.abs(bx2 - a.x) < EPS) {
    const [s, e] = ov(a.y, ay2, b.y, by2);
    return test('W', a.x, s, e);
  }
  if (Math.abs(ay2 - b.y) < EPS) {
    const [s, e] = ov(a.x, ax2, b.x, bx2);
    return test('N', ay2, s, e);
  }
  if (Math.abs(by2 - a.y) < EPS) {
    const [s, e] = ov(a.x, ax2, b.x, bx2);
    return test('S', a.y, s, e);
  }
  return null;
}

/** Longitud de un muro del ambiente */
export const wallLength = (r: Room, w: WallSide) => (w === 'N' || w === 'S' ? r.width : r.length);

/** Inicio global (en su eje) de un muro del ambiente */
export const wallStart = (r: Room, w: WallSide) => (w === 'N' || w === 'S' ? r.x : r.y);

/** Segmento global de un tramo del muro de un ambiente */
export function wallSegment(r: Room, w: WallSide, offset: number, width: number) {
  switch (w) {
    case 'S':
      return { x1: r.x + offset, y1: r.y, x2: r.x + offset + width, y2: r.y };
    case 'N':
      return { x1: r.x + offset, y1: r.y + r.length, x2: r.x + offset + width, y2: r.y + r.length };
    case 'W':
      return { x1: r.x, y1: r.y + offset, x2: r.x, y2: r.y + offset + width };
    case 'E':
      return { x1: r.x + r.width, y1: r.y + offset, x2: r.x + r.width, y2: r.y + offset + width };
  }
}

export const area = (r: Room) => r.width * r.length;
