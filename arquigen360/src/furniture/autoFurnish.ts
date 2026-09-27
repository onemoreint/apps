import type { FurnitureItem, FurnitureKind, Opening, Rect, Room, WallSide } from '../geometry/types';
import { overlaps, sharedEdge, wallLength, wallStart } from '../geometry/rect';
import { FURNITURE, footprint } from './library';
import { uid } from '../utils/id';

const ROT: Record<WallSide, 0 | 90 | 180 | 270> = { N: 0, W: 90, S: 180, E: 270 };

/** Zonas libres obligatorias (barrido de puertas y paso) en coordenadas del ambiente */
function obstacles(room: Room, rooms: Room[], openings: Opening[]): Rect[] {
  const obs: Rect[] = [];
  const zone = (wall: WallSide, a: number, b: number, depth: number): Rect => {
    const s = a - wallStart(room, wall);
    const e = b - wallStart(room, wall);
    switch (wall) {
      case 'S': return { x: s, y: 0, w: e - s, h: depth };
      case 'N': return { x: s, y: room.length - depth, w: e - s, h: depth };
      case 'W': return { x: 0, y: s, w: depth, h: e - s };
      case 'E': return { x: room.width - depth, y: s, w: depth, h: e - s };
    }
  };
  for (const o of openings) {
    if (o.kind === 'window') continue;
    const host = rooms.find((r) => r.id === o.roomId);
    if (!host) continue;
    const a = wallStart(host, o.wall) + o.offset;
    const b = a + o.width;
    if (host.id === room.id) {
      obs.push(zone(o.wall, a, b, o.kind === 'garage_door' ? 0.3 : Math.max(o.width, 0.8)));
    } else {
      const e = sharedEdge(room, host, 0.01);
      if (e && e.wallB === o.wall && b > e.start && a < e.end) obs.push(zone(e.wallA, Math.max(a, e.start), Math.min(b, e.end), 0.7));
    }
  }
  return obs;
}

export function autoFurnish(rooms: Room[], openings: Opening[]): FurnitureItem[] {
  const all: FurnitureItem[] = [];
  for (const room of rooms) all.push(...furnishRoom(room, rooms, openings));
  return all;
}

export function furnishRoom(room: Room, rooms: Room[], openings: Opening[]): FurnitureItem[] {
  const items: FurnitureItem[] = [];
  const obs = obstacles(room, rooms, openings);
  const doorWalls = new Set(
    openings.filter((o) => o.roomId === room.id && o.kind !== 'window').map((o) => o.wall),
  );

  const fits = (f: FurnitureItem) => {
    const fp = footprint(f);
    const r: Rect = { x: fp.x, y: fp.y, w: fp.w, h: fp.h };
    if (r.x < -0.001 || r.y < -0.001 || r.x + r.w > room.width + 0.001 || r.y + r.h > room.length + 0.001) return false;
    if (obs.some((o) => overlaps(o, r))) return false;
    return !items.some((i) => {
      const q = footprint(i);
      return overlaps({ x: q.x, y: q.y, w: q.w, h: q.h }, r);
    });
  };

  /** coloca contra un muro; along = posición del centro sobre el muro (relativa al ambiente) */
  const make = (kind: FurnitureKind, wall: WallSide, along: number, w?: number, gap = 0.03): FurnitureItem => {
    const def = FURNITURE[kind];
    const d = def.d;
    const it: FurnitureItem = { id: uid(), roomId: room.id, kind, cx: 0, cy: 0, rotation: ROT[wall], w };
    if (wall === 'N') { it.cx = along; it.cy = room.length - d / 2 - gap; }
    if (wall === 'S') { it.cx = along; it.cy = d / 2 + gap; }
    if (wall === 'W') { it.cy = along; it.cx = d / 2 + gap; }
    if (wall === 'E') { it.cy = along; it.cx = room.width - d / 2 - gap; }
    return it;
  };

  const tryWall = (kind: FurnitureKind, wall: WallSide, where: ('center' | 'start' | 'end')[] = ['center', 'start', 'end'], w?: number) => {
    const len = wallLength(room, wall);
    const iw = w ?? FURNITURE[kind].w;
    for (const pos of where) {
      const along = pos === 'center' ? len / 2 : pos === 'start' ? iw / 2 + 0.05 : len - iw / 2 - 0.05;
      const it = make(kind, wall, along, w);
      if (fits(it)) { items.push(it); return it; }
    }
    return null;
  };

  const walls: WallSide[] = (['N', 'S', 'W', 'E'] as WallSide[]).sort(
    (a, b) => Number(doorWalls.has(a)) - Number(doorWalls.has(b)) || wallLength(room, b) - wallLength(room, a),
  );
  const tryAny = (kind: FurnitureKind, where?: ('center' | 'start' | 'end')[], w?: number) => {
    for (const wl of walls) {
      const it = tryWall(kind, wl, where, w);
      if (it) return it;
    }
    return null;
  };
  const short = Math.min(room.width, room.length);
  const area = room.width * room.length;

  const bedWithStands = (kind: FurnitureKind) => {
    for (const wl of walls) {
      const bed = tryWall(kind, wl, ['center', 'start', 'end']);
      if (!bed) continue;
      const bw = FURNITURE[kind].w;
      const along = wl === 'N' || wl === 'S' ? bed.cx : bed.cy;
      for (const side of [-1, 1]) {
        const ns = make('nightstand', wl, along + side * (bw / 2 + 0.25));
        if (fits(ns)) items.push(ns);
      }
      return bed;
    }
    return null;
  };

  switch (room.type) {
    case 'master_bedroom': {
      bedWithStands(short >= 3.2 ? 'bed_queen' : 'bed_double') ?? bedWithStands('bed_single');
      tryAny('wardrobe', ['start', 'end', 'center'], Math.min(2.0, short - 0.8));
      break;
    }
    case 'bedroom': {
      if (short >= 2.9) bedWithStands('bed_double') ?? bedWithStands('bed_single');
      else bedWithStands('bed_single');
      tryAny('wardrobe', ['start', 'end'], Math.min(1.5, short - 1.2));
      if (area > 9) tryAny('desk', ['end', 'start']);
      break;
    }
    case 'living': {
      const sofa = tryAny(short >= 3.2 ? 'sofa3' : 'sofa2', ['center']) ?? tryAny('sofa2');
      if (sofa) {
        const opp: Record<number, WallSide> = { 0: 'S', 180: 'N', 90: 'E', 270: 'W' };
        const tvWall = opp[sofa.rotation];
        const along = tvWall === 'N' || tvWall === 'S' ? sofa.cx : sofa.cy;
        const tv = make('tv_unit', tvWall, along);
        if (fits(tv)) items.push(tv);
        // mesa de centro frente al sofá
        const off = FURNITURE[sofa.kind].d / 2 + 0.45 + FURNITURE.coffee_table.d / 2;
        const dir = { 0: [0, -1], 180: [0, 1], 90: [1, 0], 270: [-1, 0] }[sofa.rotation]!;
        const ct: FurnitureItem = { id: uid(), roomId: room.id, kind: 'coffee_table', cx: sofa.cx + dir[0] * off, cy: sofa.cy + dir[1] * off, rotation: sofa.rotation };
        if (fits(ct)) items.push(ct);
      }
      break;
    }
    case 'dining': {
      const kind: FurnitureKind = area >= 14 && Math.max(room.width, room.length) >= 3.6 ? 'table6' : 'table4';
      const along = room.length >= room.width;
      const t: FurnitureItem = { id: uid(), roomId: room.id, kind, cx: room.width / 2, cy: room.length / 2, rotation: along ? 0 : 90 };
      if (fits(t)) items.push(t);
      else {
        const t4: FurnitureItem = { ...t, kind: 'table4' };
        if (fits(t4)) items.push(t4);
      }
      break;
    }
    case 'kitchen': {
      for (const wl of walls) {
        const len = wallLength(room, wl);
        const cw = Math.min(3.2, len - 0.9);
        if (cw < 1.4) continue;
        const counter = make('counter', wl, (cw) / 2 + 0.03, cw);
        if (!fits(counter)) continue;
        items.push(counter);
        const fridge = make('fridge', wl, cw + 0.06 + FURNITURE.fridge.w / 2);
        if (fits(fridge)) items.push(fridge);
        break;
      }
      if (area >= 13 && short >= 3.2) {
        const isl: FurnitureItem = { id: uid(), roomId: room.id, kind: 'island', cx: room.width / 2, cy: room.length / 2, rotation: room.width >= room.length ? 0 : 90 };
        if (fits(isl)) items.push(isl);
      }
      break;
    }
    case 'bathroom':
    case 'ensuite': {
      tryAny('shower', ['end', 'start']);
      tryAny('wc', ['start', 'end', 'center']);
      tryAny('basin', ['center', 'start', 'end']);
      break;
    }
    case 'laundry':
    case 'service': {
      tryAny('washer', ['start', 'end']);
      tryAny('sink', ['end', 'start', 'center']);
      break;
    }
    case 'closet': {
      tryAny('wardrobe', ['start', 'center'], Math.max(0.8, Math.max(room.width, room.length) - 0.3));
      break;
    }
    case 'study':
    case 'office': {
      tryAny('desk', ['center', 'start']);
      break;
    }
    case 'garage': {
      const rot = room.length >= room.width ? 0 : 90;
      const across = rot === 0 ? room.width : room.length;
      const along = rot === 0 ? room.length : room.width;
      const half = FURNITURE.car.w / 2 + 0.15;
      for (const a of [across / 2, half, across - half]) {
        for (const b of [along / 2, FURNITURE.car.d / 2 + 0.35, along - FURNITURE.car.d / 2 - 0.35]) {
          const car: FurnitureItem = { id: uid(), roomId: room.id, kind: 'car', cx: rot === 0 ? a : b, cy: rot === 0 ? b : a, rotation: rot };
          if (fits(car)) { items.push(car); break; }
        }
        if (items.some((i) => i.kind === 'car')) break;
      }
      break;
    }
    case 'garden': {
      const tree: FurnitureItem = { id: uid(), roomId: room.id, kind: 'tree', cx: Math.min(1.5, room.width / 2), cy: room.length - Math.min(1.5, room.length / 2), rotation: 0 };
      if (fits(tree)) items.push(tree);
      tryAny('plant', ['end', 'start']);
      break;
    }
    case 'patio':
    case 'terrace':
    case 'balcony': {
      tryAny('plant', ['end']);
      tryAny('plant', ['start']);
      break;
    }
  }
  return items;
}
