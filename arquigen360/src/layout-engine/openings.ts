import type { Opening, Preferences, Room, RoomType, Site, WallSide } from '../geometry/types';
import { sharedEdge, wallLength, wallStart } from '../geometry/rect';
import { CATALOG } from './catalog';
import { isOpenPair } from './rules';
import { uid } from '../utils/id';
import { buildableRect, streetWall } from '../geometry/site';

const DOOR_TARGETS: Partial<Record<RoomType, RoomType[]>> = {
  master_bedroom: ['hall', 'living', 'dining'],
  bedroom: ['hall', 'living', 'dining', 'study'],
  bathroom: ['hall', 'living', 'dining', 'bedroom'],
  study: ['hall', 'living', 'dining'],
  office: ['hall', 'living', 'dining'],
  ensuite: ['master_bedroom', 'closet'],
  closet: ['master_bedroom', 'ensuite', 'hall'],
  kitchen: ['dining', 'living', 'hall'],
  laundry: ['kitchen', 'service', 'hall', 'garage', 'dining', 'living'],
  service: ['kitchen', 'laundry', 'hall', 'garage', 'dining'],
  storage: ['kitchen', 'laundry', 'service', 'garage', 'hall', 'dining'],
  garage: ['living', 'hall', 'dining', 'kitchen', 'laundry', 'service', 'storage'],
};

const WINDOW_WIDTH: Partial<Record<RoomType, number>> = {
  bathroom: 0.6, ensuite: 0.6, kitchen: 1.2, laundry: 1.0, service: 1.0,
  bedroom: 1.5, master_bedroom: 1.8, living: 2.0, dining: 1.6, study: 1.2, office: 1.4,
};

type Interval = [number, number];

function subtract(base: Interval, cuts: Interval[]): Interval[] {
  let parts: Interval[] = [base];
  for (const [cs, ce] of cuts) {
    const next: Interval[] = [];
    for (const [s, e] of parts) {
      if (ce <= s || cs >= e) next.push([s, e]);
      else {
        if (cs > s) next.push([s, cs]);
        if (ce < e) next.push([ce, e]);
      }
    }
    parts = next;
  }
  return parts;
}

export function doorInterval(o: Opening, room: Room): Interval {
  const s = wallStart(room, o.wall) + o.offset;
  return [s, s + o.width];
}

export function generateOpenings(rooms: Room[], site: Site, prefs: Preferences): Opening[] {
  const openings: Opening[] = [];
  const covered = rooms.filter((r) => CATALOG[r.type].covered);
  const byType = (t: RoomType) => rooms.filter((r) => r.type === t);

  const addDoor = (host: Room, target: Room, width = 0.8, place: 'start' | 'center' = 'start'): boolean => {
    const e = sharedEdge(host, target, width + 0.2);
    if (!e) return false;
    const pos = place === 'center' ? (e.start + e.end) / 2 - width / 2 : e.start + 0.1;
    openings.push({
      id: uid(), kind: 'door', roomId: host.id, wall: e.wallA,
      offset: +(pos - wallStart(host, e.wallA)).toFixed(2), width, swing: 'in', hinge: 'start',
    });
    return true;
  };

  // puertas interiores por reglas
  for (const r of rooms) {
    const targets = DOOR_TARGETS[r.type];
    if (!targets) continue;
    if (r.type === 'kitchen' && prefs.openKitchen) continue;
    // si ya comparte espacio abierto con su destino, no necesita puerta
    if (rooms.some((o) => o !== r && isOpenPair(r.type, o.type, prefs) && sharedEdge(r, o, 0.9))) continue;
    let done = false;
    for (const t of targets) {
      for (const cand of byType(t)) {
        if (cand === r) continue;
        const width = r.type === 'garage' ? 0.9 : ['bathroom', 'ensuite', 'closet', 'storage'].includes(r.type) ? 0.7 : 0.8;
        if (addDoor(r, cand, width)) { done = true; break; }
      }
      if (done) break;
    }
    if (!done && r.type !== 'garage') {
      // último recurso: cualquier ambiente cubierto vecino
      for (const cand of covered) if (cand !== r && addDoor(r, cand, 0.8)) break;
    }
  }

  // pasillo sin espacio abierto contiguo: conectarlo con puerta
  for (const h of byType('hall')) {
    const open = rooms.some((o) => o !== h && isOpenPair('hall', o.type, prefs) && sharedEdge(h, o, 0.9));
    if (!open) {
      const n = covered.find((c) => c !== h && !['bathroom', 'ensuite', 'bedroom', 'master_bedroom'].includes(c.type) && sharedEdge(h, c, 1.0));
      if (n) addDoor(n, h, 0.9, 'center');
    }
  }

  // salidas a exteriores
  for (const ex of rooms.filter((r) => !CATALOG[r.type].covered)) {
    const order: RoomType[] = ['living', 'dining', 'kitchen', 'hall', 'laundry', 'service', 'master_bedroom', 'bedroom', 'study', 'office'];
    for (const t of order) {
      const host = byType(t).find((h) => sharedEdge(h, ex, 1.2));
      if (host) {
        addDoor(host, ex, ['living', 'dining'].includes(t) ? 1.5 : 0.9, 'center');
        break;
      }
    }
  }

  // acceso principal y portón de garaje sobre la fachada
  const ws: WallSide = streetWall(site);
  const br = buildableRect(site);
  const frontLine = { S: br.y, N: br.y + br.h, W: br.x, E: br.x + br.w }[ws];
  const wallCoord = (r: Room, w: WallSide) => ({ S: r.y, N: r.y + r.length, W: r.x, E: r.x + r.width })[w];
  const onFront = (r: Room) => Math.abs(wallCoord(r, ws) - frontLine) < 0.01;

  for (const g of byType('garage').filter(onFront)) {
    const len = wallLength(g, ws);
    const w = Math.min(len - 0.4, prefs.garageCars === 2 ? 4.8 : 2.6);
    if (w >= 2.0) openings.push({ id: uid(), kind: 'garage_door', roomId: g.id, wall: ws, offset: +((len - w) / 2).toFixed(2), width: +w.toFixed(2), swing: 'in', hinge: 'start' });
  }
  const mainOrder: RoomType[] = ['living', 'hall', 'dining', 'kitchen', 'study', 'office'];
  for (const t of mainOrder) {
    const host = byType(t).find((r) => onFront(r) && wallLength(r, ws) >= 1.3);
    if (host) {
      const len = wallLength(host, ws);
      const w = 1.0;
      const offset = t === 'hall' ? (len - w) / 2 : Math.max(0.15, Math.min(len - w - 0.15, 0.3));
      openings.push({ id: uid(), kind: 'door', roomId: host.id, wall: ws, offset: +offset.toFixed(2), width: w, swing: 'in', hinge: 'start' });
      break;
    }
  }

  // ventanas: solo en muros que dan a retiro/patio de al menos 0,9 m (no en medianeras)
  const W = site.width;
  const L = site.length;
  for (const r of covered) {
    const ww = WINDOW_WIDTH[r.type];
    if (!ww) continue;
    const sides: WallSide[] = ['N', 'S', 'E', 'W'];
    let best: { wall: WallSide; iv: Interval } | null = null;
    for (const s of sides) {
      const clearance = { S: r.y, N: L - r.y - r.length, W: r.x, E: W - r.x - r.width }[s];
      if (clearance < 0.9) continue;
      const start = wallStart(r, s);
      const base: Interval = [start, start + wallLength(r, s)];
      const cuts: Interval[] = [];
      for (const o of covered) {
        if (o === r) continue;
        const e = sharedEdge(r, o, 0.01);
        if (e && e.wallA === s) cuts.push([e.start, e.end]);
      }
      for (const op of openings.filter((op) => op.roomId === r.id && op.wall === s)) {
        const [a, b] = doorInterval(op, r);
        cuts.push([a - 0.2, b + 0.2]);
      }
      for (const iv of subtract(base, cuts)) {
        if (iv[1] - iv[0] >= Math.min(ww, 0.6) + 0.3 && (!best || iv[1] - iv[0] > best.iv[1] - best.iv[0])) best = { wall: s, iv };
      }
    }
    if (best) {
      const avail = best.iv[1] - best.iv[0];
      const w = Math.max(0.6, Math.min(ww, avail - 0.4));
      const pos = (best.iv[0] + best.iv[1]) / 2 - w / 2;
      openings.push({ id: uid(), kind: 'window', roomId: r.id, wall: best.wall, offset: +(pos - wallStart(r, best.wall)).toFixed(2), width: +w.toFixed(2), swing: 'in', hinge: 'start' });
    }
  }
  return openings;
}
