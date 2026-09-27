import type { Preferences, Room } from './types';
import { CATALOG } from '../layout-engine/catalog';
import { isOpenPair } from '../layout-engine/rules';

export interface WallSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  orient: 'h' | 'v';
  /** ambiente abajo/izquierda y arriba/derecha */
  a?: Room;
  b?: Room;
  kind: 'exterior' | 'interior' | 'open';
  thick: number;
}

const key = (v: number) => Math.round(v * 1000);

interface EdgeRef { s: number; e: number; room: Room; side: 'a' | 'b' }

/** Deriva los tramos de muro desde los rectángulos de los ambientes. */
export function computeWalls(rooms: Room[], prefs: Preferences): WallSeg[] {
  const hLines = new Map<number, EdgeRef[]>();
  const vLines = new Map<number, EdgeRef[]>();
  const push = (m: Map<number, EdgeRef[]>, k: number, ref: EdgeRef) => {
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(ref);
  };
  for (const r of rooms) {
    push(hLines, key(r.y), { s: r.x, e: r.x + r.width, room: r, side: 'b' });
    push(hLines, key(r.y + r.length), { s: r.x, e: r.x + r.width, room: r, side: 'a' });
    push(vLines, key(r.x), { s: r.y, e: r.y + r.length, room: r, side: 'b' });
    push(vLines, key(r.x + r.width), { s: r.y, e: r.y + r.length, room: r, side: 'a' });
  }
  const out: WallSeg[] = [];
  const build = (lines: Map<number, EdgeRef[]>, orient: 'h' | 'v') => {
    for (const [k, refs] of lines) {
      const at = k / 1000;
      const pts = [...new Set(refs.flatMap((r) => [key(r.s), key(r.e)]))].sort((p, q) => p - q).map((p) => p / 1000);
      let cur: WallSeg | null = null;
      for (let i = 0; i < pts.length - 1; i++) {
        const s = pts[i];
        const e = pts[i + 1];
        if (e - s < 0.001) continue;
        const m = (s + e) / 2;
        const a = refs.find((r) => r.side === 'a' && r.s <= m && r.e >= m)?.room;
        const b = refs.find((r) => r.side === 'b' && r.s <= m && r.e >= m)?.room;
        const ca = a && CATALOG[a.type].covered;
        const cb = b && CATALOG[b.type].covered;
        let seg: WallSeg | null = null;
        if (ca || cb) {
          const kind = ca && cb ? (isOpenPair(a!.type, b!.type, prefs) ? 'open' : 'interior') : 'exterior';
          seg = orient === 'h'
            ? { x1: s, y1: at, x2: e, y2: at, orient, a, b, kind, thick: kind === 'exterior' ? 0.2 : 0.12 }
            : { x1: at, y1: s, x2: at, y2: e, orient, a, b, kind, thick: kind === 'exterior' ? 0.2 : 0.12 };
        }
        if (cur && seg && cur.a === seg.a && cur.b === seg.b && cur.kind === seg.kind) {
          if (orient === 'h') cur.x2 = e;
          else cur.y2 = e;
        } else {
          if (cur) out.push(cur);
          cur = seg;
        }
      }
      if (cur) out.push(cur);
    }
  };
  build(hLines, 'h');
  build(vLines, 'v');
  return out;
}
